import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class AppointmentStatus(str):
    REQUESTED = "REQUESTED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    appointment_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. APT-2026-9841
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("doctor_profiles.id"), nullable=False)
    booked_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    booker_name = Column(String(255), nullable=False)
    booker_relation = Column(String(100), default="Self (Patient)")
    contact_phone = Column(String(50), nullable=False)
    patient_email = Column(String(255), nullable=True)
    
    appointment_date = Column(String(50), nullable=False) # YYYY-MM-DD
    appointment_time = Column(String(50), nullable=False) # HH:MM AM/PM
    consultation_type = Column(String(100), default="In-Person Dermoscopy Review")
    urgency = Column(String(50), default="Routine Follow-Up") # Routine Follow-Up, High Priority, Urgent Clinical Review
    status = Column(String(50), default=AppointmentStatus.CONFIRMED)
    reason = Column(String(255), nullable=True)
    patient_notes = Column(Text, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("DoctorProfile", back_populates="appointments")
