from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class AppointmentCreateRequest(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    booker_name: str = Field(..., min_length=2)
    booker_relation: str = "Self (Patient)"
    contact_phone: str
    patient_email: Optional[EmailStr] = None
    appointment_date: str # YYYY-MM-DD
    appointment_time: str # HH:MM AM/PM
    consultation_type: str = "In-Person Dermoscopy Review"
    urgency: str = "Routine Follow-Up"
    patient_notes: Optional[str] = None

class AppointmentStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="REQUESTED, CONFIRMED, COMPLETED, CANCELLED")
    doctor_notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    appointment_code: str
    patient_id: str
    patient_name: str
    patient_code: str
    doctor_id: str
    doctor_name: str
    doctor_email: str
    booker_name: str
    booker_relation: str
    contact_phone: str
    patient_email: Optional[str] = None
    appointment_date: str
    appointment_time: str
    consultation_type: str
    urgency: str
    status: str
    patient_notes: Optional[str] = None
    doctor_notes: Optional[str] = None
    created_at: str
