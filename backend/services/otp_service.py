import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
import bcrypt

from backend.config import settings
from backend.models.otp import OtpToken, OtpPurpose

def utc_now() -> datetime:
    """Returns current UTC datetime as a naive datetime object for database compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

def generate_secure_otp() -> str:
    """
    Generates a cryptographically random 6-digit numeric OTP.
    Never returns a fixed or hardcoded value.
    """
    return f"{secrets.randbelow(900000) + 100000}"

def hash_otp(plain_otp: str) -> str:
    """Hashes the OTP code using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_otp.encode('utf-8'), salt).decode('utf-8')

def verify_otp_hash(plain_otp: str, hashed_otp: str) -> bool:
    """Verifies plain OTP against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_otp.encode('utf-8'), hashed_otp.encode('utf-8'))
    except Exception:
        return False

def check_resend_cooldown(db: Session, contact_target: str, purpose: str) -> Optional[int]:
    """
    Checks if a recent OTP was created within the cooldown period.
    Returns remaining seconds if in cooldown, or None if clear.
    """
    cooldown_seconds = settings.OTP_RESEND_COOLDOWN
    latest = db.query(OtpToken).filter(
        OtpToken.contact_target == contact_target,
        OtpToken.purpose == purpose
    ).order_by(OtpToken.created_at.desc()).first()

    if not latest or not latest.created_at:
        return None

    elapsed = (utc_now() - latest.created_at).total_seconds()
    if elapsed < cooldown_seconds:
        return int(cooldown_seconds - elapsed)
    return None

def create_and_store_otp(
    db: Session,
    contact_target: str,
    purpose: str,
    user_id: Optional[str] = None,
    enforce_cooldown: bool = True
) -> Tuple[Optional[str], Optional[str]]:
    """
    Generates a new 6-digit OTP, checks resend cooldown, hashes it, and persists it.
    Returns: (plain_otp, None) on success, or (None, error_message) on cooldown.
    """
    contact_clean = contact_target.strip().lower()

    if enforce_cooldown:
        remaining = check_resend_cooldown(db, contact_clean, purpose)
        if remaining is not None and remaining > 0:
            return None, f"Resend cooldown active. Please wait {remaining} seconds before requesting a new code."

    # Invalidate older unverified tokens for this target and purpose
    db.query(OtpToken).filter(
        OtpToken.contact_target == contact_clean,
        OtpToken.purpose == purpose,
        OtpToken.is_used == False
    ).update({"is_used": True})

    plain_otp = generate_secure_otp()
    hashed = hash_otp(plain_otp)
    expires_at = utc_now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    token_record = OtpToken(
        user_id=user_id,
        contact_target=contact_clean,
        otp_hash=hashed,
        purpose=purpose,
        expires_at=expires_at,
        attempt_count=0,
        is_used=False
    )
    db.add(token_record)
    db.commit()
    db.refresh(token_record)

    return plain_otp, None

def verify_otp_code(
    db: Session,
    contact_target: str,
    plain_otp: str,
    purpose: str
) -> Tuple[bool, str]:
    """
    Validates a submitted OTP against the active database token.
    Enforces maximum attempts (5) and expiration (5 minutes).
    """
    contact_clean = contact_target.strip().lower()
    plain_clean = plain_otp.strip()

    otp_record = db.query(OtpToken).filter(
        OtpToken.contact_target == contact_clean,
        OtpToken.purpose == purpose,
        OtpToken.is_used == False
    ).order_by(OtpToken.created_at.desc()).first()

    if not otp_record:
        return False, "No active verification code found or code already used. Please request a new code."

    # Check expiry
    if utc_now() > otp_record.expires_at:
        otp_record.is_used = True
        db.commit()
        return False, "OTP has expired. Please request a new code."

    # Check max attempts
    max_attempts = settings.OTP_MAX_ATTEMPTS
    if otp_record.attempt_count >= max_attempts:
        otp_record.is_used = True
        db.commit()
        return False, "Too many attempts. Maximum attempts exceeded. Please request a new code."

    otp_record.attempt_count += 1
    db.commit()

    # Compare hashes
    if not verify_otp_hash(plain_clean, otp_record.otp_hash):
        remaining = max_attempts - otp_record.attempt_count
        if remaining <= 0:
            otp_record.is_used = True
            db.commit()
            return False, "Too many attempts. Verification code invalidated. Please request a new code."
        return False, f"Invalid OTP. {remaining} attempt(s) remaining."

    # Mark as successfully verified
    otp_record.is_used = True
    db.commit()
    return True, "Verification successful."
