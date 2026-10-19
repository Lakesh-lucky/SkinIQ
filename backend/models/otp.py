import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from backend.database import Base

class OtpPurpose(str):
    SIGNUP = "SIGNUP"
    LOGIN = "LOGIN"
    REPORT_ACCESS = "REPORT_ACCESS"
    PASSWORD_RESET = "PASSWORD_RESET"

class OtpToken(Base):
    __tablename__ = "otp_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    contact_target = Column(String(255), index=True, nullable=False) # Email or Phone number
    otp_hash = Column(String(255), nullable=False) # Bcrypt hash of OTP
    purpose = Column(String(50), nullable=False) # SIGNUP, LOGIN, REPORT_ACCESS, PASSWORD_RESET
    attempt_count = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
