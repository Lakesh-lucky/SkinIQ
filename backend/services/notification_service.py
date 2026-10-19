import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.orm import Session
from backend.config import settings
from backend.models.notification import Notification

def create_in_app_notification(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "INFO",
    reference_id: Optional[str] = None
) -> Notification:
    """Creates and persists an in-app notification in the database."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=reference_id,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def send_email_notification(
    to_email: str,
    subject: str,
    html_content: str,
    plain_text_content: Optional[str] = None
) -> tuple[bool, str]:
    """
    Sends an email using configured SMTP credentials.
    If SMTP is unconfigured, returns (False, 'Email service is not configured.').
    """
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        return False, "Email service is not configured on this server."

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email

        if plain_text_content:
            msg.attach(MIMEText(plain_text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

        return True, "Email dispatched successfully via SMTP."
    except Exception as e:
        return False, f"SMTP delivery failed: {str(e)}"
