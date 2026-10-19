import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import bcrypt
import jwt
from sqlalchemy.orm import Session
from backend.config import settings
from backend.models.user import User, DoctorProfile, PatientProfile, UserRole
from backend.models.otp import OtpToken, OtpPurpose
from backend.services.otp_service import (
    generate_secure_otp,
    create_and_store_otp as otp_svc_create_and_store,
    verify_otp_code as otp_svc_verify_code,
    hash_otp,
    verify_otp_hash
)

def hash_password(password: str) -> str:
    """Hashes a password with bcrypt and unique salt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    to_encode = data.copy()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def create_and_store_otp(
    db: Session, 
    contact_target: str, 
    purpose: str, 
    user_id: Optional[str] = None
) -> Tuple[Optional[str], Optional[OtpToken]]:
    """
    Backwards-compatible wrapper delegating to otp_service.
    Generates a secure 6-digit OTP, stores bcrypt hash, and returns (plain_otp, None).
    """
    plain_otp, err = otp_svc_create_and_store(
        db=db,
        contact_target=contact_target,
        purpose=purpose,
        user_id=user_id,
        enforce_cooldown=False
    )
    return plain_otp, None

def verify_otp(
    db: Session, 
    contact_target: str, 
    plain_otp: str, 
    purpose: str
) -> Tuple[bool, str]:
    """
    Backwards-compatible wrapper delegating to otp_service.
    Enforces server-side bcrypt validation, 5-minute expiry, and max 5 attempts.
    """
    return otp_svc_verify_code(
        db=db,
        contact_target=contact_target,
        plain_otp=plain_otp,
        purpose=purpose
    )
