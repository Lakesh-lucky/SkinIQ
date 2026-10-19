"""
Automated Test Suite for OTP Email Delivery via Gmail SMTP
Tests Signup, Login, Resend, Expiry, Security (No OTP in API response), and SMTP Failure Handling.
"""

import os
import sys
import email
import re
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from backend.app import app
from backend.config import settings
from backend.database import SessionLocal
from backend.models.user import User, DoctorProfile, UserRole
from backend.models.otp import OtpToken, OtpPurpose
from backend.services.otp_service import hash_otp, verify_otp_hash

client = TestClient(app)

def extract_otp_from_sent_email(raw_email_str: str) -> str:
    """Decodes MIME message and extracts the 6-digit OTP code."""
    parsed = email.message_from_string(raw_email_str)
    body_text = ""
    for part in parsed.walk():
        if part.get_content_type() == 'text/plain':
            payload = part.get_payload(decode=True)
            if payload:
                body_text = payload.decode('utf-8', errors='ignore')
                break

    match = re.search(r'\b([0-9]{6})\b', body_text)
    if not match:
        # Fallback search across whole message decoded
        match = re.search(r'\b([0-9]{6})\b', raw_email_str)
    if match:
        return match.group(1)
    raise ValueError(f"Could not extract 6-digit OTP from email body:\n{body_text}")

class TestOtpSmtpDelivery(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.test_email = "test.doctor.smtp@dermaclass.med"
        self.test_password = "SecurePassword@2026"
        self.cleanup_test_data()

    def tearDown(self):
        self.cleanup_test_data()
        self.db.close()

    def cleanup_test_data(self):
        user = self.db.query(User).filter(User.email == self.test_email).first()
        if user:
            self.db.delete(user)
        self.db.query(OtpToken).filter(OtpToken.contact_target == self.test_email).delete()

        signup_email = "new.clinician.signup@dermaclass.med"
        su_user = self.db.query(User).filter(User.email == signup_email).first()
        if su_user:
            self.db.delete(su_user)
        self.db.query(OtpToken).filter(OtpToken.contact_target == signup_email).delete()
        self.db.commit()

    def test_01_smtp_unconfigured_rejection(self):
        """When SMTP is not configured, requesting login/signup OTP must return 503."""
        with patch.object(settings, 'SMTP_HOST', ''), \
             patch.object(settings, 'SMTP_USERNAME', ''), \
             patch.object(settings, 'SMTP_PASSWORD', ''):

            # Doctor login with pre-seeded doctor
            res = client.post("/api/v1/auth/login", json={
                "email": "dr.evelyn.vance@dermaclass.med",
                "password": "Doctor@2026"
            })
            self.assertEqual(res.status_code, 503)
            self.assertIn("Email service is not configured", res.json()["detail"])

            # Doctor signup
            su_res = client.post("/api/v1/auth/doctor/signup", json={
                "email": "unconfigured.test@dermaclass.med",
                "full_name": "Dr. Unconfigured Test",
                "password": "Doctor@2026",
                "license_number": "MD-TEST-999"
            })
            self.assertEqual(su_res.status_code, 503)

    @patch("smtplib.SMTP")
    def test_02_doctor_login_dispatches_real_otp_via_smtp(self, mock_smtp_cls):
        """Doctor login step 1 generates secure OTP, sends via SMTP, never exposes OTP in response."""
        mock_server = MagicMock()
        mock_smtp_cls.return_value = mock_server

        from backend.services.auth_service import hash_password
        doc = User(
            email=self.test_email,
            full_name="Dr. Test SMTP Clinician",
            phone="+1 (555) 777-8888",
            role=UserRole.DOCTOR,
            hashed_password=hash_password(self.test_password),
            is_verified=True,
            is_active=True
        )
        self.db.add(doc)
        self.db.commit()

        with patch.object(settings, 'SMTP_HOST', 'smtp.gmail.com'), \
             patch.object(settings, 'SMTP_PORT', 587), \
             patch.object(settings, 'SMTP_USERNAME', 'smtp.test@gmail.com'), \
             patch.object(settings, 'SMTP_PASSWORD', 'testapppassword16'):

            res = client.post("/api/v1/auth/login", json={
                "email": self.test_email,
                "password": self.test_password
            })

            self.assertEqual(res.status_code, 200)
            data = res.json()

            # CRITICAL SECURITY CHECKS: No OTP in response
            self.assertTrue(data.get("requires_otp"))
            self.assertNotIn("otp", data, "CRITICAL: Plaintext OTP exposed in response!")
            self.assertNotIn("dev_otp", data, "CRITICAL: dev_otp exposed in response!")
            self.assertIn("masked_email", data)
            self.assertEqual(data["masked_email"], f"t******@{self.test_email.split('@')[1]}")

            # Verify SMTP interactions
            mock_smtp_cls.assert_called_with("smtp.gmail.com", 587, timeout=20)
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_with('smtp.test@gmail.com', 'testapppassword16')
            mock_server.sendmail.assert_called_once()
            args = mock_server.sendmail.call_args[0]
            self.assertEqual(args[1], [self.test_email])
            sent_message_content = args[2]
            self.assertTrue("SkinIQ Verification Code" in sent_message_content or "DermaClass-Net" in sent_message_content)

            # Verify OTP record in DB is hashed with bcrypt, NOT plaintext
            token_rec = self.db.query(OtpToken).filter(
                OtpToken.contact_target == self.test_email,
                OtpToken.purpose == OtpPurpose.LOGIN,
                OtpToken.is_used == False
            ).order_by(OtpToken.created_at.desc()).first()

            self.assertIsNotNone(token_rec)
            self.assertTrue(token_rec.otp_hash.startswith("$2b$") or token_rec.otp_hash.startswith("$2a$"))
            self.assertFalse(token_rec.is_used)
            self.assertEqual(token_rec.attempt_count, 0)

    @patch("smtplib.SMTP")
    def test_03_login_otp_verification_success_and_invalidation(self, mock_smtp_cls):
        """Testing correct OTP verification, attempt tracking, and invalidation."""
        mock_server = MagicMock()
        mock_smtp_cls.return_value = mock_server

        from backend.services.auth_service import hash_password
        doc = User(
            email=self.test_email,
            full_name="Dr. Test Verification",
            phone="+1 (555) 777-8888",
            role=UserRole.DOCTOR,
            hashed_password=hash_password(self.test_password),
            is_verified=True,
            is_active=True
        )
        self.db.add(doc)
        self.db.commit()

        with patch.object(settings, 'SMTP_HOST', 'smtp.gmail.com'), \
             patch.object(settings, 'SMTP_PORT', 587), \
             patch.object(settings, 'SMTP_USERNAME', 'smtp.test@gmail.com'), \
             patch.object(settings, 'SMTP_PASSWORD', 'testapppassword16'):

            # Step 1: Request Login OTP
            login_res = client.post("/api/v1/auth/login", json={
                "email": self.test_email,
                "password": self.test_password
            })
            self.assertEqual(login_res.status_code, 200)

            # Retrieve sent OTP from email decoded
            sent_raw_msg = mock_server.sendmail.call_args[0][2]
            real_otp = extract_otp_from_sent_email(sent_raw_msg)
            self.assertEqual(len(real_otp), 6)

            # Step 2: Try invalid OTP first
            bad_res = client.post("/api/v1/auth/verify-login-otp", json={
                "email": self.test_email,
                "otp": "000000"
            })
            self.assertEqual(bad_res.status_code, 400)
            self.assertIn("Invalid OTP", bad_res.json()["detail"])

            # Verify attempt counter incremented
            token_rec = self.db.query(OtpToken).filter(
                OtpToken.contact_target == self.test_email,
                OtpToken.purpose == OtpPurpose.LOGIN
            ).order_by(OtpToken.created_at.desc()).first()
            self.assertEqual(token_rec.attempt_count, 1)

            # Step 3: Submit Correct OTP
            good_res = client.post("/api/v1/auth/verify-login-otp", json={
                "email": self.test_email,
                "otp": real_otp
            })
            self.assertEqual(good_res.status_code, 200)
            good_data = good_res.json()
            self.assertTrue(good_data["success"])
            self.assertIn("access_token", good_data)
            self.assertEqual(good_data["user"]["email"], self.test_email)

            # Step 4: Confirm OTP is now marked used and cannot be reused
            self.db.refresh(token_rec)
            self.assertTrue(token_rec.is_used)

            reuse_res = client.post("/api/v1/auth/verify-login-otp", json={
                "email": self.test_email,
                "otp": real_otp
            })
            self.assertEqual(reuse_res.status_code, 400)
            self.assertIn("No active verification code found", reuse_res.json()["detail"])

    @patch("smtplib.SMTP")
    def test_04_signup_flow_with_otp_verification(self, mock_smtp_cls):
        """Testing user registration step 1 (dispatches OTP) and step 2 (verifies OTP and activates user)."""
        mock_server = MagicMock()
        mock_smtp_cls.return_value = mock_server

        signup_email = "new.clinician.signup@dermaclass.med"

        with patch.object(settings, 'SMTP_HOST', 'smtp.gmail.com'), \
             patch.object(settings, 'SMTP_PORT', 587), \
             patch.object(settings, 'SMTP_USERNAME', 'smtp.test@gmail.com'), \
             patch.object(settings, 'SMTP_PASSWORD', 'testapppassword16'):

            # Step 1: Submit Registration Form
            reg_payload = {
                "email": signup_email,
                "full_name": "Dr. Sarah Lin, MD",
                "password": "SarahPassword@2026",
                "phone": "+1 (555) 321-9988",
                "license_number": "MD-LIN-8849",
                "specialization": "Dermatologic Surgery"
            }
            res = client.post("/api/v1/auth/doctor/signup", json=reg_payload)
            self.assertEqual(res.status_code, 201)
            data = res.json()

            # Confirm response requires OTP and does NOT contain the OTP
            self.assertTrue(data.get("requires_otp"))
            self.assertNotIn("otp", data)
            self.assertNotIn("dev_otp", data)
            self.assertEqual(data.get("email"), signup_email)

            # Verify email sent via mock SMTP
            mock_server.sendmail.assert_called_once()
            sent_raw_msg = mock_server.sendmail.call_args[0][2]
            signup_otp = extract_otp_from_sent_email(sent_raw_msg)
            self.assertEqual(len(signup_otp), 6)

            # Verify user exists in database but is_verified is False
            user = self.db.query(User).filter(User.email == signup_email).first()
            self.assertIsNotNone(user)
            self.assertFalse(user.is_verified, "User must NOT be verified before OTP confirmation!")
            self.assertEqual(user.doctor_profile.verification_status, "PENDING")

            # Step 2: Verify Registration with Correct OTP
            verify_payload = {
                "email": signup_email,
                "otp": signup_otp
            }
            verify_res = client.post("/api/v1/auth/doctor/verify-signup", json=verify_payload)
            self.assertEqual(verify_res.status_code, 200)
            verify_data = verify_res.json()
            self.assertTrue(verify_data["success"])
            self.assertIn("access_token", verify_data)
            self.assertEqual(verify_data["user"]["email"], signup_email)

            # Verify user is now marked verified
            self.db.refresh(user)
            self.assertTrue(user.is_verified)
            self.assertEqual(user.doctor_profile.verification_status, "VERIFIED")

    @patch("smtplib.SMTP")
    def test_05_otp_cooldown_and_resend(self, mock_smtp_cls):
        """Resending OTP immediately must trigger cooldown (429 Too Many Requests)."""
        mock_server = MagicMock()
        mock_smtp_cls.return_value = mock_server

        from backend.services.auth_service import hash_password
        doc = User(
            email=self.test_email,
            full_name="Dr. Cooldown Test",
            role=UserRole.DOCTOR,
            hashed_password=hash_password(self.test_password),
            is_verified=True,
            is_active=True
        )
        self.db.add(doc)
        self.db.commit()

        with patch.object(settings, 'SMTP_HOST', 'smtp.gmail.com'), \
             patch.object(settings, 'SMTP_PORT', 587), \
             patch.object(settings, 'SMTP_USERNAME', 'smtp.test@gmail.com'), \
             patch.object(settings, 'SMTP_PASSWORD', 'testapppassword16'):

            # Step 1: Initial Login OTP
            client.post("/api/v1/auth/login", json={"email": self.test_email, "password": self.test_password})

            # Step 2: Attempt Immediate Resend (should be blocked by 60s cooldown)
            resend_res = client.post("/api/v1/auth/resend-login-otp", json={"email": self.test_email})
            self.assertEqual(resend_res.status_code, 429)
            self.assertIn("cooldown active", resend_res.json()["detail"].lower())

    def test_06_expired_otp_rejection(self):
        """OTP past 5 minutes expiration must be rejected."""
        from backend.services.auth_service import hash_password
        doc = User(
            email=self.test_email,
            full_name="Dr. Expired OTP Test",
            role=UserRole.DOCTOR,
            hashed_password=hash_password(self.test_password),
            is_verified=True,
            is_active=True
        )
        self.db.add(doc)
        self.db.commit()

        # Create an expired OTP token directly in DB
        expired_otp = "839201"
        token_record = OtpToken(
            contact_target=self.test_email,
            otp_hash=hash_otp(expired_otp),
            purpose=OtpPurpose.LOGIN,
            expires_at=datetime.utcnow() - timedelta(minutes=1), # Expired 1 min ago
            attempt_count=0,
            is_used=False
        )
        self.db.add(token_record)
        self.db.commit()

        verify_res = client.post("/api/v1/auth/verify-login-otp", json={
            "email": self.test_email,
            "otp": expired_otp
        })
        self.assertEqual(verify_res.status_code, 400)
        self.assertIn("expired", verify_res.json()["detail"].lower())

    @patch("smtplib.SMTP")
    def test_07_smtp_authentication_failure_handling(self, mock_smtp_cls):
        """SMTP authentication failure must return user-friendly 500 error."""
        import smtplib
        mock_server = MagicMock()
        mock_server.login.side_effect = smtplib.SMTPAuthenticationError(535, b"5.7.8 Username and Password not accepted")
        mock_smtp_cls.return_value = mock_server

        from backend.services.auth_service import hash_password
        doc = User(
            email=self.test_email,
            full_name="Dr. SMTP Auth Failure Test",
            role=UserRole.DOCTOR,
            hashed_password=hash_password(self.test_password),
            is_verified=True,
            is_active=True
        )
        self.db.add(doc)
        self.db.commit()

        with patch.object(settings, 'SMTP_HOST', 'smtp.gmail.com'), \
             patch.object(settings, 'SMTP_PORT', 587), \
             patch.object(settings, 'SMTP_USERNAME', 'baduser@gmail.com'), \
             patch.object(settings, 'SMTP_PASSWORD', 'badpassword'):

            res = client.post("/api/v1/auth/login", json={
                "email": self.test_email,
                "password": self.test_password
            })
            self.assertEqual(res.status_code, 500)
            self.assertIn("Gmail SMTP authentication failed", res.json()["detail"])


if __name__ == "__main__":
    unittest.main()
