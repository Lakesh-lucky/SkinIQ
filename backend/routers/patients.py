from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models.user import User, DoctorProfile, UserRole
from backend.models.patient import Patient
from backend.models.scan import Scan
from backend.schemas.patient import PatientCreateRequest
from backend.routers.auth import get_current_user
from backend.services.audit_service import log_audit_event

router = APIRouter(prefix="/patients", tags=["Doctor Patient Management"])

def generate_unique_patient_code(db: Session, doctor_code: str) -> str:
    """
    Generates a guaranteed unique patient ID formatted as PAT01-DR001, PAT02-DR001, etc.
    """
    # Find existing patient codes matching PAT%-[doctor_code]
    prefix = f"-{doctor_code}"
    existing_patients = db.query(Patient.patient_code).filter(
        Patient.patient_code.endswith(prefix)
    ).all()

    existing_numbers = set()
    for (code,) in existing_patients:
        try:
            # Code format PAT01-DR001
            parts = code.split("-")
            if parts[0].startswith("PAT"):
                num_str = parts[0][3:]
                existing_numbers.add(int(num_str))
        except Exception:
            pass

    next_num = 1
    while next_num in existing_numbers:
        next_num += 1

    return f"PAT{next_num:02d}-{doctor_code}"

@router.post("", status_code=status.HTTP_201_CREATED)
def create_patient_record(
    req: PatientCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Doctor creates a new patient record.
    Backend assigns a unique Patient ID (e.g. PAT01-DR001).
    """
    if current_user.role != UserRole.DOCTOR or not current_user.doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authenticated medical doctors can register patients."
        )

    doctor_code = current_user.doctor_profile.doctor_code or "DR001"
    patient_code = generate_unique_patient_code(db, doctor_code)

    new_patient = Patient(
        patient_code=patient_code,
        doctor_id=current_user.doctor_profile.id,
        patient_name=req.patient_name.strip(),
        date_of_birth=req.date_of_birth.strip(),
        age=req.age,
        gender=req.gender.strip(),
        phone=req.phone.strip(),
        email=req.email.strip() if req.email else None,
        area=req.area.strip(),
        city=req.city.strip(),
        district=req.district.strip(),
        medical_notes=req.medical_notes.strip() if req.medical_notes else None,
        status="ACTIVE"
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    log_audit_event(
        db,
        action="PATIENT_CREATED",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        entity_type="Patient",
        entity_id=new_patient.id,
        details=f"Created patient {new_patient.patient_name} ({patient_code})"
    )

    return {
        "success": True,
        "message": f"Patient registered successfully with ID: {patient_code}",
        "patient": {
            "id": new_patient.id,
            "patient_code": new_patient.patient_code,
            "doctor_id": new_patient.doctor_id,
            "doctor_name": current_user.full_name,
            "patient_name": new_patient.patient_name,
            "date_of_birth": new_patient.date_of_birth,
            "age": new_patient.age,
            "gender": new_patient.gender,
            "phone": new_patient.phone,
            "email": new_patient.email,
            "area": new_patient.area,
            "city": new_patient.city,
            "district": new_patient.district,
            "status": new_patient.status,
            "medical_notes": new_patient.medical_notes,
            "created_at": new_patient.created_at.isoformat() if new_patient.created_at else "",
            "scans_count": 0
        }
    }

@router.get("")
def list_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists all patients registered under the authenticated doctor."""
    if not current_user.doctor_profile:
        raise HTTPException(status_code=403, detail="Doctor profile required.")

    patients = db.query(Patient).filter(
        Patient.doctor_id == current_user.doctor_profile.id
    ).order_by(Patient.created_at.desc()).all()

    results = []
    for p in patients:
        scans = db.query(Scan).filter(Scan.patient_id == p.id).order_by(Scan.created_at.desc()).all()
        last_scan = scans[0] if scans else None
        
        last_scan_date = last_scan.created_at.strftime("%Y-%m-%d") if last_scan and last_scan.created_at else None
        last_scan_result = last_scan.prediction.predicted_class_name if last_scan and last_scan.prediction else None
        last_scan_code = last_scan.scan_code if last_scan else None
        review_status = last_scan.doctor_review.review_status if last_scan and last_scan.doctor_review else ("PENDING" if last_scan else "NO_SCANS")

        results.append({
            "id": p.id,
            "patient_code": p.patient_code,
            "patient_name": p.patient_name,
            "date_of_birth": p.date_of_birth,
            "age": p.age,
            "gender": p.gender,
            "phone": p.phone,
            "email": p.email,
            "area": p.area,
            "city": p.city,
            "district": p.district,
            "status": p.status,
            "medical_notes": p.medical_notes,
            "created_at": p.created_at.isoformat() if p.created_at else "",
            "scans_count": len(scans),
            "last_scan_code": last_scan_code,
            "last_scan_date": last_scan_date,
            "last_scan_result": last_scan_result,
            "review_status": review_status
        })

    return {
        "success": True,
        "patients": results
    }

@router.get("/{patient_id}")
def get_patient_profile(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns complete profile and history for a patient.
    Accessible only to the authenticated doctor managing this patient.
    """
    if not current_user.doctor_profile:
        raise HTTPException(status_code=403, detail="Doctor profile required.")

    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.doctor_profile.id
    ).first()

    if not patient:
        # Check by patient_code
        patient = db.query(Patient).filter(
            Patient.patient_code == patient_id,
            Patient.doctor_id == current_user.doctor_profile.id
        ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    scans = db.query(Scan).filter(Scan.patient_id == patient.id).order_by(Scan.created_at.desc()).all()
    scan_list = []
    reports_list = []

    for s in scans:
        pred_dict = None
        if s.prediction:
            pred_dict = {
                "id": s.prediction.id,
                "predicted_class": s.prediction.predicted_class,
                "predicted_class_name": s.prediction.predicted_class_name,
                "top_probability": s.prediction.top_probability,
                "epistemic_uncertainty": s.prediction.epistemic_uncertainty,
                "risk_level": s.prediction.risk_level,
                "probabilities": s.prediction.probabilities_json,
                "fusion_weights": s.prediction.fusion_weights_json,
                "processing_time_ms": s.prediction.processing_time_ms
            }

        doc_rev_dict = None
        if s.doctor_review:
            doc_rev_dict = {
                "id": s.doctor_review.id,
                "review_status": s.doctor_review.review_status,
                "doctor_diagnosis": s.doctor_review.doctor_diagnosis,
                "clinical_notes": s.doctor_review.clinical_notes,
                "recommended_action": s.doctor_review.recommended_action,
                "reviewed_at": s.doctor_review.reviewed_at.isoformat() if s.doctor_review.reviewed_at else ""
            }

        scan_data = {
            "id": s.id,
            "scan_code": s.scan_code,
            "image_url": f"/api/v1/scans/{s.id}/image",
            "anatomical_site": s.anatomical_site,
            "patient_age": s.patient_age,
            "patient_sex": s.patient_sex,
            "created_at": s.created_at.isoformat() if s.created_at else "",
            "prediction": pred_dict,
            "doctor_review": doc_rev_dict
        }
        scan_list.append(scan_data)

        if s.prediction:
            reports_list.append({
                "scan_id": s.id,
                "scan_code": s.scan_code,
                "date": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "",
                "prediction": s.prediction.predicted_class_name,
                "confidence": round(s.prediction.top_probability * 100, 1),
                "review_status": s.doctor_review.review_status if s.doctor_review else "PENDING",
                "pdf_url": f"/api/v1/reports/{s.id}/pdf"
            })

    # Fetch appointments
    apts = patient.appointments or []
    apt_list = [{
        "id": a.id,
        "appointment_code": a.appointment_code,
        "date": a.appointment_date,
        "time": a.appointment_time,
        "type": a.consultation_type,
        "urgency": a.urgency,
        "status": a.status,
        "doctor_notes": a.doctor_notes
    } for a in apts]

    log_audit_event(
        db,
        action="PATIENT_VIEWED",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        entity_type="Patient",
        entity_id=patient.id,
        details=f"Viewed profile for {patient.patient_code}"
    )

    return {
        "success": True,
        "patient": {
            "id": patient.id,
            "patient_code": patient.patient_code,
            "doctor_id": patient.doctor_id,
            "doctor_name": current_user.full_name,
            "patient_name": patient.patient_name,
            "date_of_birth": patient.date_of_birth,
            "age": patient.age,
            "gender": patient.gender,
            "phone": patient.phone,
            "email": patient.email,
            "area": patient.area,
            "city": patient.city,
            "district": patient.district,
            "status": patient.status,
            "medical_notes": patient.medical_notes,
            "created_at": patient.created_at.isoformat() if patient.created_at else ""
        },
        "scans": scan_list,
        "reports": reports_list,
        "appointments": apt_list
    }
