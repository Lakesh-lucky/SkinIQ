import os
import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, Tuple
from backend.config import settings

import json
import urllib.request
import urllib.error

def is_smtp_configured() -> bool:
    """
    Checks if SMTP host and credentials, HTTPS email relay, or Resend API key are configured.
    """
    if os.getenv("RESEND_API_KEY", "").strip():
        return True
    if (getattr(settings, "EMAIL_RELAY_URL", "") or "").strip():
        return True
    host = (settings.SMTP_HOST or "").strip()
    username = (settings.SMTP_USERNAME or "").strip()
    password = (settings.SMTP_PASSWORD or "").strip()
    return bool(host and username and password)

def send_via_resend(
    api_key: str,
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Dispatches a real email through Resend's HTTPS REST API (Port 443).
    Strictly sends ONLY to the requested recipient. Never redirects or forwards.
    """
    clean_to = to_email.strip()
    try:
        url = "https://api.resend.com/emails"
        from_name = settings.SMTP_FROM_NAME or "SkinIQ"
        payload = {
            "from": f"{from_name} <onboarding@resend.dev>",
            "to": [clean_to],
            "subject": subject,
            "text": body_text,
            "html": body_html or body_text
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
                "User-Agent": "SkinIQ-Cloud/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return True, f"Real email dispatched via Resend HTTPS to {clean_to} (ID: {data.get('id', '')})"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        return False, f"Resend API error ({e.code}): {err_body}"
    except Exception as e:
        return False, f"Resend dispatch error: {str(e)}"

def send_via_relay(
    relay_url: str,
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Dispatches email via HTTPS (Port 443) through our secure Vercel Serverless Function relay.
    Bypasses cloud provider SMTP port firewalls (Render Free Tier) using the user's Google App Password.
    Strictly sends ONLY to the requested recipient.
    """
    clean_to = to_email.strip()
    target_url = relay_url.strip()
    if "skin-iq.vercel.app" in target_url:
        target_url = target_url.replace("skin-iq.vercel.app", "skin-iq-rho.vercel.app")
    if not target_url.startswith("http"):
        target_url = "https://skin-iq-rho.vercel.app/api/send-email"

    try:
        payload = {
            "to": clean_to,
            "subject": subject,
            "text": body_text,
            "html": body_html or body_text,
            "secret": getattr(settings, "EMAIL_RELAY_SECRET", "")
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            target_url,
            data=data_bytes,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "SkinIQ-Relay/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success"):
                return True, f"Email dispatched successfully via HTTPS relay to {clean_to}"
            return False, data.get("error", "Email relay dispatch failed")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        return False, f"Email relay HTTP error ({e.code}): {err_body}"
    except Exception as e:
        return False, f"Email relay network error: {str(e)}"

def send_via_smtp_direct(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    attachment_path: Optional[str] = None,
    attachment_filename: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Direct Gmail SMTP delivery with STARTTLS on Port 587 and SSL fallback on Port 465.
    Strictly delivers to the dynamically provided to_email.
    """
    clean_to = to_email.strip()
    host = settings.SMTP_HOST or "smtp.gmail.com"
    configured_port = settings.SMTP_PORT or 587
    username = settings.SMTP_USERNAME
    password = settings.SMTP_PASSWORD
    from_email = settings.SMTP_FROM_EMAIL or username
    from_name = settings.SMTP_FROM_NAME or "SkinIQ"

    clean_user = username.strip()
    clean_pw = (password or "").replace(" ", "").strip()

    # Build MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = clean_to

    part_text = MIMEText(body_text, "plain", "utf-8")
    msg.attach(part_text)

    if body_html:
        part_html = MIMEText(body_html, "html", "utf-8")
        msg.attach(part_html)

    if attachment_path and os.path.exists(attachment_path):
        filename = attachment_filename or os.path.basename(attachment_path)
        with open(attachment_path, "rb") as f:
            part_file = MIMEBase("application", "octet-stream")
            part_file.set_payload(f.read())
        encoders.encode_base64(part_file)
        part_file.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        msg.attach(part_file)

    ports_to_try = [configured_port]
    if configured_port == 587:
        ports_to_try.append(465)
    elif configured_port == 465:
        ports_to_try.append(587)

    last_error = ""
    for try_port in ports_to_try:
        server = None
        try:
            if try_port == 465:
                server = smtplib.SMTP_SSL(host, try_port, timeout=6)
            else:
                server = smtplib.SMTP(host, try_port, timeout=6)
                server.ehlo()
                server.starttls()
                server.ehlo()

            if clean_user and clean_pw:
                server.login(clean_user, clean_pw)

            server.sendmail(from_email, [clean_to], msg.as_string())
            return True, f"Email dispatched successfully to {clean_to} via Gmail SMTP (Port {try_port})"
        except smtplib.SMTPAuthenticationError as e:
            err_detail = e.smtp_error.decode("utf-8", errors="ignore") if hasattr(e, "smtp_error") and isinstance(e.smtp_error, bytes) else str(e)
            return False, f"Gmail SMTP authentication failed. Please verify your Gmail address and 16-character Google App Password in .env. ({err_detail})"
        except (smtplib.SMTPConnectError, socket.timeout, TimeoutError, OSError) as e:
            last_error = str(e)
            # Try alternate port or let relay take over
            continue
        except Exception as e:
            last_error = str(e)
            break
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    pass

    return False, f"SMTP connection error ({host}): {last_error}"

def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    attachment_path: Optional[str] = None,
    attachment_filename: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Dispatches a real verification email directly to the user's registered email address.
    Priority Strategy:
      1. Direct Gmail SMTP (Port 587 STARTTLS / Port 465 SSL)
      2. HTTPS Email Relay (Port 443 via Vercel serverless function, bypassing cloud firewalls)
      3. Resend HTTPS API (if explicitly configured)
    Guarantees:
      - Recipient is ALWAYS to_email (the address entered by the user).
      - NEVER redirects, forwards, or intercepts OTP codes to any other address.
      - Returns (True, msg) or (False, error).
    """
    clean_to = (to_email or "").strip()
    if not clean_to or "@" not in clean_to:
        return False, f"Invalid recipient email address: '{clean_to}'."

    # Priority 1: Vercel Serverless HTTPS Relay (Port 443)
    # Render's free tier host network firewall drops raw outbound TCP traffic to ports 25, 465, and 587
    # ([Errno 101] Network is unreachable). The Vercel relay function runs on unrestricted serverless infrastructure
    # and delivers the email directly to Google SMTP using the authenticated Google App Password.
    relay_url = (getattr(settings, "EMAIL_RELAY_URL", "") or "https://skin-iq-rho.vercel.app/api/send-email").strip()
    if "skin-iq.vercel.app" in relay_url:
        relay_url = relay_url.replace("skin-iq.vercel.app", "skin-iq-rho.vercel.app")

    relay_err = None
    if relay_url:
        relay_ok, relay_msg = send_via_relay(
            relay_url=relay_url,
            to_email=clean_to,
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )
        if relay_ok:
            return True, relay_msg
        relay_err = relay_msg

    # Priority 2: Direct Gmail SMTP (Port 587 STARTTLS / Port 465 SSL)
    # Used when running locally or on self-hosted instances with open SMTP ports
    direct_ok, direct_msg = send_via_smtp_direct(
        to_email=clean_to,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        attachment_path=attachment_path,
        attachment_filename=attachment_filename
    )
    if direct_ok:
        return True, direct_msg

    # Priority 3: Resend HTTPS API (Port 443, if configured)
    resend_key = (os.getenv("RESEND_API_KEY") or getattr(settings, "RESEND_API_KEY", "") or "").strip()
    if resend_key:
        resend_ok, resend_msg = send_via_resend(resend_key, clean_to, subject, body_text, body_html)
        if resend_ok:
            return True, resend_msg

    failure_msg = relay_err or direct_msg
    return False, f"Failed to dispatch verification email to {clean_to}: {failure_msg}"

def build_clean_email_html(
    title: str,
    greeting: str,
    message: str,
    otp_code: Optional[str] = None,
    expiry_minutes: Optional[int] = None,
    action_url: Optional[str] = None,
    action_text: Optional[str] = None,
    sub_note: Optional[str] = None
) -> str:
    """
    Renders an ultra-clean, modern, minimalist email template without clutter or clumsy borders.
    """
    otp_block = ""
    if otp_code:
        expiry_text = f"This code expires in <strong>{expiry_minutes or settings.OTP_EXPIRY_MINUTES} minutes</strong>." if expiry_minutes or settings.OTP_EXPIRY_MINUTES else ""
        otp_block = f"""
              <!-- Verification Code Box -->
              <div style="margin: 28px 0; text-align: center;">
                <div style="display: inline-block; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 12px; padding: 16px 32px;">
                  <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 700; color: #0284c7; letter-spacing: 8px; margin-left: 8px;">
                    {otp_code}
                  </span>
                </div>
                {f'<p style="margin: 14px 0 0; font-size: 13px; color: #64748b;">{expiry_text}</p>' if expiry_text else ''}
              </div>
        """

    action_button = ""
    if action_url and action_text:
        action_button = f"""
              <div style="margin: 28px 0; text-align: center;">
                <a href="{action_url}" target="_blank" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
                  {action_text}
                </a>
              </div>
        """

    notice = sub_note or "If you didn't request this verification code, you can safely disregard this email."

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); overflow: hidden;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Clean Brand Header -->
          <tr>
            <td style="padding: 36px 32px 16px; text-align: center;">
              <div style="display: inline-block; margin-bottom: 6px;">
                <span style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                  Skin<span style="color: #0284c7;">IQ</span>
                </span>
              </div>
              <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 500;">
                Clinical AI Dermatology
              </p>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 12px 36px 28px; text-align: center;">
              <h2 style="margin: 0 0 10px; font-size: 17px; font-weight: 600; color: #0f172a;">
                {greeting}
              </h2>
              <p style="margin: 0 0 16px; font-size: 14px; color: #475569; line-height: 1.55;">
                {message}
              </p>

              {otp_block}
              {action_button}

              <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8; line-height: 1.45;">
                {notice}
              </p>
            </td>
          </tr>

          <!-- Minimalist Footer -->
          <tr>
            <td style="padding: 16px 32px; background: #fafafa; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
              SkinIQ • Clinical AI Diagnostic Platform
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

def send_doctor_otp_email(doctor_name: str, to_email: str, otp_code: str) -> Tuple[bool, str]:
    """
    Sends the 6-digit Doctor Login Verification OTP via Gmail SMTP with clean SkinIQ template.
    """
    subject = f"SkinIQ Verification Code: {otp_code}"
    clean_name = doctor_name.replace("Dr. ", "").replace("Dr.", "").strip()

    body_text = f"""SkinIQ Verification Code: {otp_code}

Hello Dr. {clean_name},

Your SkinIQ sign-in verification code is: {otp_code}

This code expires in {settings.OTP_EXPIRY_MINUTES} minutes.
If you did not attempt to sign in, please disregard this email.

— SkinIQ Security Team
"""
    body_html = build_clean_email_html(
        title="SkinIQ Verification Code",
        greeting=f"Hello Dr. {clean_name},",
        message="Enter the one-time code below to sign in to your SkinIQ clinical account:",
        otp_code=otp_code,
        expiry_minutes=settings.OTP_EXPIRY_MINUTES,
        sub_note="If you didn't attempt to sign in, you can safely disregard this email."
    )
    return send_email(to_email, subject, body_text, body_html)

def send_signup_otp_email(full_name: str, to_email: str, otp_code: str) -> Tuple[bool, str]:
    """
    Sends the 6-digit Registration Verification OTP via Gmail SMTP with clean SkinIQ template.
    """
    subject = f"SkinIQ Registration Code: {otp_code}"
    clean_name = full_name.replace("Dr. ", "").replace("Dr.", "").strip()

    body_text = f"""Welcome to SkinIQ

Hello Dr. {clean_name},

Thank you for registering with SkinIQ. Your registration verification code is: {otp_code}

This code expires in {settings.OTP_EXPIRY_MINUTES} minutes.
Enter this code on the registration page to activate your clinician profile.

— SkinIQ Security Team
"""
    body_html = build_clean_email_html(
        title="Welcome to SkinIQ",
        greeting=f"Welcome, Dr. {clean_name}",
        message="Thank you for registering with SkinIQ. Enter the one-time code below to verify your email and activate your clinician profile:",
        otp_code=otp_code,
        expiry_minutes=settings.OTP_EXPIRY_MINUTES,
        sub_note="If you didn't create an account, you can safely disregard this email."
    )
    return send_email(to_email, subject, body_text, body_html)

def send_password_reset_otp_email(doctor_name: str, to_email: str, otp_code: str) -> Tuple[bool, str]:
    """
    Sends the 6-digit Password Reset OTP via Gmail SMTP with clean SkinIQ template.
    """
    subject = f"SkinIQ Password Reset Code: {otp_code}"
    clean_name = doctor_name.replace("Dr. ", "").replace("Dr.", "").strip()

    body_text = f"""SkinIQ Password Reset

Hello Dr. {clean_name},

Your password recovery verification code is: {otp_code}

This code expires in {settings.OTP_EXPIRY_MINUTES} minutes.
If you did not request a password reset, please disregard this email.

— SkinIQ Security Team
"""
    body_html = build_clean_email_html(
        title="SkinIQ Password Reset",
        greeting=f"Hello Dr. {clean_name},",
        message="We received a request to reset your password. Use the verification code below to set a new password:",
        otp_code=otp_code,
        expiry_minutes=settings.OTP_EXPIRY_MINUTES,
        sub_note="If you did not request a password reset, you can safely disregard this email."
    )
    return send_email(to_email, subject, body_text, body_html)

def send_report_shared_email(
    recipient_name: str,
    to_email: str,
    doctor_name: str,
    patient_code: str,
    share_url: str,
    attachment_pdf_path: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Sends notification when a doctor shares an AI diagnostic report.
    """
    clean_recip = (recipient_name or "Colleague / Patient").strip()
    clean_doc = doctor_name.replace("Dr. ", "").replace("Dr.", "").strip()
    subject = f"SkinIQ Diagnostic Report: Patient {patient_code}"

    body_text = f"""SkinIQ Diagnostic Report

Dear {clean_recip},

Dr. {clean_doc} has shared a skin lesion diagnostic report with you (Patient: {patient_code}).

You can securely view the report at:
{share_url}

— SkinIQ Clinical Intelligence
"""
    body_html = build_clean_email_html(
        title="SkinIQ Diagnostic Report",
        greeting=f"Dear {clean_recip},",
        message=f"Dr. {clean_doc} has shared a clinical skin lesion analysis report with you (Patient ID: <strong>{patient_code}</strong>).",
        action_url=share_url,
        action_text="View Diagnostic Report",
        sub_note="This secure medical report link may expire after 7 days."
    )
    return send_email(
        to_email=to_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        attachment_path=attachment_pdf_path
    )
