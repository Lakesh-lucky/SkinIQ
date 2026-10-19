"""
Gmail SMTP Diagnostic & Connectivity Verifier
Usage:
    python scripts/test_gmail_smtp_connection.py [recipient_email]

This script tests:
1. Loading SMTP settings from .env
2. TCP connectivity to smtp.gmail.com:587
3. STARTTLS cryptographic negotiation
4. Google App Password authentication (server.login)
5. Live test OTP delivery (if credentials configured)
"""

import os
import sys
import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Add repository root to path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.config import settings
from backend.services.email_service import is_smtp_configured, send_doctor_otp_email
from backend.services.otp_service import generate_secure_otp

def run_diagnostics(target_email: str = None):
    print("=" * 65)
    print("DERMAClass-Net Gmail SMTP Diagnostic & Verification Tool")
    print("=" * 65)

    host = settings.SMTP_HOST or "smtp.gmail.com"
    port = settings.SMTP_PORT or 587
    raw_user = settings.SMTP_USERNAME or ""
    raw_pass = settings.SMTP_PASSWORD or ""

    user = raw_user.strip()
    password = raw_pass.replace(" ", "").strip()

    print(f"[*] SMTP Host       : {host}")
    print(f"[*] SMTP Port       : {port}")
    print(f"[*] Security Mode   : {'SSL/TLS (Port 465)' if port == 465 else 'STARTTLS (Port 587)'}")
    print(f"[*] Gmail Account   : {user if user else '<NOT CONFIGURED - EMPTY>'}")
    masked_pw = f"{password[:2]}{'*' * max(0, len(password) - 4)}{password[-2:]}" if len(password) >= 4 else ('<NOT CONFIGURED>' if not password else '****')
    print(f"[*] Google App Pass : {masked_pw} ({len(password)} chars)")
    print("-" * 65)

    # Step 1: Network & Socket Check
    print("[Step 1/4] Testing TCP Socket Connection to smtp.gmail.com:587...")
    try:
        sock = socket.create_connection((host, port), timeout=10)
        sock.close()
        print("  [SUCCESS] Network connectivity established. Port is open and reachable.")
    except Exception as e:
        print(f"  [FAILURE] Cannot connect to {host}:{port}: {e}")
        return False

    # Step 2: STARTTLS Handshake
    print("\n[Step 2/4] Testing SMTP Handshake & STARTTLS Negotiation...")
    server = None
    try:
        server = smtplib.SMTP(host, port, timeout=15)
        server.set_debuglevel(0)
        code, msg = server.ehlo()
        print(f"  [SUCCESS] Initial EHLO accepted: code {code}")
        
        code, msg = server.starttls()
        print(f"  [SUCCESS] STARTTLS negotiation completed: code {code} ({msg.decode('utf-8', errors='ignore')})")
        
        code, msg = server.ehlo()
        print(f"  [SUCCESS] Post-TLS EHLO accepted: code {code}")
    except Exception as e:
        print(f"  [FAILURE] TLS Handshake failed: {e}")
        if server:
            try:
                server.quit()
            except Exception:
                pass
        return False

    # Step 3: Authentication Check
    print("\n[Step 3/4] Testing Gmail SMTP Authentication...")
    if not user or not password:
        print("  [WARNING] Credentials missing in .env:")
        if not user:
            print("    -> SMTP_USERNAME is empty.")
        if not password:
            print("    -> SMTP_PASSWORD (16-char Google App Password) is empty.")
        print("\n  To enable live email dispatch:")
        print("    1. Go to Google Account Settings -> Security -> 2-Step Verification.")
        print("    2. Navigate to 'App passwords' (https://myaccount.google.com/apppasswords).")
        print("    3. Generate an App Password for 'DermaClass-Net'.")
        print("    4. Save in .env:")
        print("         SMTP_USERNAME=your.email@gmail.com")
        print("         SMTP_PASSWORD=xxxx xxxx xxxx xxxx")
        try:
            server.quit()
        except Exception:
            pass
        return False

    try:
        server.login(user, password)
        print(f"  [SUCCESS] Authenticated successfully with Gmail as '{user}'!")
    except smtplib.SMTPAuthenticationError as e:
        err = e.smtp_error.decode('utf-8', errors='ignore') if hasattr(e, 'smtp_error') and isinstance(e.smtp_error, bytes) else str(e)
        print(f"  [FAILURE] Gmail SMTP Authentication Failed: {err}")
        print("\n  Troubleshooting Tips:")
        print("    - Verify your Google Account has 2-Step Verification turned ON.")
        print("    - You MUST use a 16-character 'Google App Password', NOT your standard Gmail password.")
        print("    - Verify the Gmail address in SMTP_USERNAME matches the account that generated the App Password.")
        try:
            server.quit()
        except Exception:
            pass
        return False
    except Exception as e:
        print(f"  [FAILURE] Unexpected error during login: {e}")
        try:
            server.quit()
        except Exception:
            pass
        return False

    # Step 4: Test Email Dispatch
    recipient = target_email or user
    print(f"\n[Step 4/4] Sending Clean SkinIQ Test Verification OTP Email to '{recipient}'...")
    test_otp = generate_secure_otp()
    try:
        server.quit()
    except Exception:
        pass

    sent, msg = send_doctor_otp_email("Test Clinician", recipient, test_otp)
    if sent:
        print(f"  [SUCCESS] Verification email with OTP successfully delivered to '{recipient}'!")
        print(f"  [INFO] OTP Code: {test_otp} (dispatched via SkinIQ clean template)")
        print("=" * 65)
        print("ALL TESTS PASSED: Gmail SMTP + STARTTLS + SkinIQ App Password are fully functional.")
        print("=" * 65)
        return True
    else:
        print(f"  [FAILURE] Error sending email: {msg}")
        return False

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    success = run_diagnostics(target)
    sys.exit(0 if success else 1)
