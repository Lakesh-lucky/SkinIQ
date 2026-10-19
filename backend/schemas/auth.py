from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class DoctorLoginVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class DoctorResendOtpRequest(BaseModel):
    email: EmailStr

class DoctorRegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    phone: Optional[str] = None
    license_number: Optional[str] = None
    specialization: Optional[str] = "Cutaneous Oncology & Dermoscopy"
    hospital_affiliation: Optional[str] = "Pacific Coast Dermatology Institute"
    department: Optional[str] = "Cutaneous Oncology"

class DoctorSignupVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class DoctorResendSignupOtpRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyResetOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., min_length=6)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class DoctorProfileResponse(BaseModel):
    doctor_code: str
    license_number: str
    specialization: str
    hospital_affiliation: str
    department: str
    verification_status: str

class UserResponse(BaseModel):
    id: str
    email: str
    phone: Optional[str] = None
    full_name: str
    role: str
    is_verified: bool
    is_active: bool
    created_at: str
    doctor_profile: Optional[DoctorProfileResponse] = None
