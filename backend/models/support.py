import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. SUP-1024
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    category = Column(String(50), default="General") # Account, Login/OTP, Report, Scan, Appointment, Technical Issue, Other
    subject = Column(String(255), nullable=False)
    status = Column(String(50), default="OPEN") # OPEN, IN_PROGRESS, WAITING_FOR_USER, RESOLVED, CLOSED
    priority = Column(String(50), default="NORMAL") # LOW, NORMAL, HIGH, URGENT
    assigned_admin_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="support_tickets")
    assigned_admin = relationship("User", foreign_keys=[assigned_admin_id])
    messages = relationship("SupportMessage", back_populates="ticket", cascade="all, delete-orphan")

class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    sender_name = Column(String(255), nullable=False)
    sender_role = Column(String(50), nullable=False) # PATIENT, DOCTOR, ADMIN
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("SupportTicket", back_populates="messages")
