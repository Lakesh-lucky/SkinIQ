from backend.database import Base, engine
from backend.models.user import User, DoctorProfile, PatientProfile, UserRole
from backend.models.patient import Patient
from backend.models.scan import ModelVersion, Scan, Prediction, DoctorReview
from backend.models.appointment import Appointment, AppointmentStatus
from backend.models.notification import Notification
from backend.models.support import SupportTicket, SupportMessage
from backend.models.shared_report import SharedReport
from backend.models.otp import OtpToken, OtpPurpose
from backend.models.audit import AuditLog

def init_db():
    """
    Creates all database tables in the configured database engine.
    """
    Base.metadata.create_all(bind=engine)

__all__ = [
    "Base",
    "init_db",
    "User",
    "DoctorProfile",
    "PatientProfile",
    "UserRole",
    "Patient",
    "ModelVersion",
    "Scan",
    "Prediction",
    "DoctorReview",
    "Appointment",
    "AppointmentStatus",
    "Notification",
    "SupportTicket",
    "SupportMessage",
    "SharedReport",
    "OtpToken",
    "OtpPurpose",
    "AuditLog"
]
