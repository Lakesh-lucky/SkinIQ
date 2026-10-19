import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. PAT01-DR001
    doctor_id = Column(String(36), ForeignKey("doctor_profiles.id"), nullable=False)
    patient_name = Column(String(255), nullable=False)
    date_of_birth = Column(String(50), nullable=False) # YYYY-MM-DD
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False) # Male, Female, Other
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    area = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    status = Column(String(50), default="ACTIVE") # ACTIVE, INACTIVE, ARCHIVED
    medical_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    doctor = relationship("DoctorProfile", back_populates="patients")
    scans = relationship("Scan", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
