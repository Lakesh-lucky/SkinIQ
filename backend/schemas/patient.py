from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

class PatientCreateRequest(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=100)
    date_of_birth: str = Field(..., description="YYYY-MM-DD")
    age: int = Field(..., ge=0, le=130)
    gender: str = Field(..., description="Male, Female, Other")
    phone: str = Field(..., min_length=5, max_length=50)
    email: Optional[EmailStr] = None
    area: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    district: str = Field(..., min_length=2, max_length=100)
    medical_notes: Optional[str] = None

class PatientResponse(BaseModel):
    id: str
    patient_code: str # e.g. PAT01-DR001
    doctor_id: str
    doctor_name: Optional[str] = None
    patient_name: str
    date_of_birth: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = None
    area: str
    city: str
    district: str
    status: str
    medical_notes: Optional[str] = None
    created_at: str
    scans_count: int = 0

class PatientReportAccessRequest(BaseModel):
    patient_code: str = Field(..., description="e.g. PAT01-DR001")
    patient_name: str
    age: int
    area: str
    city: str
    district: str

class PatientReportAccessVerifyRequest(BaseModel):
    patient_code: str
    otp: str
