from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class PredictionResponse(BaseModel):
    id: str
    scan_id: str
    scan_code: str
    model_version: str
    predicted_class: str # MEL, NV, BCC, AK, BKL, DF, VASC, SCC
    predicted_class_name: str
    top_probability: float
    epistemic_uncertainty: float
    risk_level: str
    probabilities: Dict[str, float]
    fusion_weights: Dict[str, float]
    processing_time_ms: float
    gatekeeper_passed: bool
    created_at: str
    disclaimer: str = "AI-assisted result for clinical decision support. Not a standalone medical diagnosis."

class DoctorReviewCreateRequest(BaseModel):
    review_status: str = Field(..., description="REVIEWED, FOLLOW_UP_REQUIRED, PENDING")
    doctor_diagnosis: Optional[str] = None
    clinical_notes: str = Field(..., min_length=2)
    recommended_action: Optional[str] = None

class DoctorReviewResponse(BaseModel):
    id: str
    scan_id: str
    doctor_id: str
    doctor_name: Optional[str] = None
    review_status: str
    doctor_diagnosis: Optional[str] = None
    clinical_notes: str
    recommended_action: Optional[str] = None
    reviewed_at: str

class ScanResponse(BaseModel):
    id: str
    scan_code: str
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    patient_code: Optional[str] = None
    image_url: str
    original_filename: str
    anatomical_site: str
    patient_age: float
    patient_sex: str
    created_at: str
    prediction: Optional[PredictionResponse] = None
    doctor_review: Optional[DoctorReviewResponse] = None
