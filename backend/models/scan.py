import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from backend.database import Base

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name = Column(String(100), nullable=False) # e.g. SkinLesion-ResNet18
    version = Column(String(50), nullable=False) # e.g. v1.0.0-resnet18
    file_hash = Column(String(64), nullable=True) # SHA-256
    input_size = Column(String(50), default="224x224x3")
    training_dataset = Column(String(255), default="ISIC Dataset (BCC & MEL)")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    predictions = relationship("Prediction", back_populates="model_version")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. SCN-2026-9842
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=True) # If linked to patient
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    image_path = Column(String(500), nullable=False)
    image_base64 = Column(Text, nullable=True)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), default="image/jpeg")
    file_size_bytes = Column(Integer, default=0)
    anatomical_site = Column(String(100), default="unknown")
    patient_age = Column(Float, default=50.0)
    patient_sex = Column(String(20), default="unknown")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="scans")
    prediction = relationship("Prediction", back_populates="scan", uselist=False, cascade="all, delete-orphan")
    doctor_review = relationship("DoctorReview", back_populates="scan", uselist=False, cascade="all, delete-orphan")
    shared_reports = relationship("SharedReport", back_populates="scan", cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), unique=True, nullable=False)
    model_version_id = Column(String(36), ForeignKey("model_versions.id"), nullable=True)
    predicted_class = Column(String(20), nullable=False) # BCC, MEL
    predicted_class_name = Column(String(100), nullable=False)
    top_probability = Column(Float, nullable=False)
    epistemic_uncertainty = Column(Float, nullable=False) # Uncertainty u = 1 - max(p)
    probabilities_json = Column(JSON, nullable=False) # Dict of class probabilities {BCC: ..., MEL: ...}
    fusion_weights_json = Column(JSON, nullable=False) # {resnet18: 1.0}
    risk_level = Column(String(100), nullable=False)
    processing_time_ms = Column(Float, default=0.0)
    gatekeeper_passed = Column(Boolean, default=True)
    model_choice = Column(String(50), default="both") # 'resnet18', 'dermaclass_final', 'both'
    comparison_json = Column(JSON, nullable=True) # Full dual-model comparison telemetry when model_choice='both'
    created_at = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="prediction")
    model_version = relationship("ModelVersion", back_populates="predictions")

class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), unique=True, nullable=False)
    doctor_id = Column(String(36), ForeignKey("doctor_profiles.id"), nullable=False)
    review_status = Column(String(50), default="PENDING") # PENDING, REVIEWED, FOLLOW_UP_REQUIRED
    clinical_notes = Column(Text, nullable=True)
    doctor_diagnosis = Column(String(255), nullable=True)
    recommended_action = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="doctor_review")
