import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base

class SharedReport(Base):
    __tablename__ = "shared_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    shared_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    secure_token = Column(String(128), unique=True, index=True, nullable=False)
    recipient_email = Column(String(255), nullable=True)
    recipient_name = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    view_count = Column(String(50), default="0")
    created_at = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="shared_reports")
