from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

class ShareReportRequest(BaseModel):
    recipient_email: Optional[EmailStr] = None
    recipient_name: Optional[str] = None
    expires_in_days: int = Field(7, ge=1, le=30)

class ShareReportResponse(BaseModel):
    id: str
    scan_id: str
    secure_token: str
    share_url: str
    recipient_email: Optional[str] = None
    recipient_name: Optional[str] = None
    expires_at: str
    is_revoked: bool
    created_at: str

class MedicalReportResponse(BaseModel):
    scan_id: str
    scan_code: str
    scan_date: str
    image_url: str
    anatomical_site: str
    
    # Patient Info
    patient_code: Optional[str] = None
    patient_name: Optional[str] = None
    patient_age: float
    patient_gender: Optional[str] = None
    doctor_name: Optional[str] = None
    
    # AI Analysis
    ai_predicted_class: str
    ai_predicted_class_name: str
    ai_confidence: float
    ai_uncertainty: float
    ai_risk_level: str
    ai_probabilities: Dict[str, float]
    ai_fusion_weights: Dict[str, float]
    model_version: str
    
    # Doctor Review (Distinguished)
    doctor_review_status: str # PENDING, REVIEWED, FOLLOW_UP_REQUIRED
    doctor_diagnosis: Optional[str] = None
    doctor_clinical_notes: Optional[str] = None
    doctor_recommended_action: Optional[str] = None
    doctor_reviewed_at: Optional[str] = None
    
    # PDF download link
    pdf_download_url: str
    created_at: str
    disclaimer: str = "This report contains AI-assisted analysis and is not a substitute for professional medical diagnosis. Clinical decisions should be made by a qualified healthcare professional."
