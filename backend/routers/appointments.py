from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.user import User, DoctorProfile, UserRole
from backend.models.patient import Patient
from backend.models.appointment import Appointment, AppointmentStatus
from backend.schemas.appointment import AppointmentCreateRequest, AppointmentStatusUpdateRequest
from backend.routers.auth import get_current_user
from backend.services.notification_service import create_in_app_notification, send_email_notification
from backend.services.audit_service import log_audit_event

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.post("", status_code=status.HTTP_201_CREATED)
def create_appointment(
    req: AppointmentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Books a new clinical follow-up appointment."""
    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    # Determine attending doctor
    doctor_profile = None
    if req.doctor_id:
        doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.id == req.doctor_id).first()
    if not doctor_profile:
        doctor_profile = patient.doctor
    if not doctor_profile:
        doctor_profile = db.query(DoctorProfile).first()

    if not doctor_profile:
        raise HTTPException(status_code=400, detail="No registered clinicians available for booking.")

    apt_count = db.query(Appointment).count() + 1
    apt_code = f"APT-2026-{apt_count:04d}"

    new_apt = Appointment(
        appointment_code=apt_code,
        patient_id=patient.id,
        doctor_id=doctor_profile.id,
        booked_by_user_id=current_user.id,
        booker_name=req.booker_name,
        booker_relation=req.booker_relation,
        contact_phone=req.contact_phone,
        patient_email=req.patient_email,
        appointment_date=req.appointment_date,
        appointment_time=req.appointment_time,
        consultation_type=req.consultation_type,
        urgency=req.urgency,
        status=AppointmentStatus.CONFIRMED,
        patient_notes=req.patient_notes
    )
    db.add(new_apt)
    db.commit()
    db.refresh(new_apt)

    # In-app notification for doctor
    create_in_app_notification(
        db,
        user_id=doctor_profile.user_id,
        title="New Appointment Scheduled",
        message=f"{req.booker_name} booked a {req.consultation_type} for patient {patient.patient_name} on {req.appointment_date} at {req.appointment_time}.",
        notification_type="APPOINTMENT",
        reference_id=new_apt.id
    )

    # In-app notification for patient
    create_in_app_notification(
        db,
        user_id=current_user.id,
        title="Appointment Confirmed",
        message=f"Your consultation with {doctor_profile.user.full_name} is confirmed for {req.appointment_date} at {req.appointment_time}.",
        notification_type="APPOINTMENT",
        reference_id=new_apt.id
    )

    log_audit_event(
        db,
        action="APPOINTMENT_BOOKED",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        entity_type="Appointment",
        entity_id=new_apt.id,
        details=f"Code: {apt_code}, Date: {req.appointment_date}, Doctor: {doctor_profile.user.full_name}"
    )

    return {
        "success": True,
        "message": f"Appointment successfully scheduled. Confirmation Code: {apt_code}",
        "appointment": {
            "id": new_apt.id,
            "appointment_code": new_apt.appointment_code,
            "patient_id": patient.id,
            "patient_name": patient.patient_name,
            "patient_code": patient.patient_code,
            "doctor_id": doctor_profile.id,
            "doctor_name": doctor_profile.user.full_name,
            "doctor_email": doctor_profile.user.email,
            "booker_name": new_apt.booker_name,
            "booker_relation": new_apt.booker_relation,
            "contact_phone": new_apt.contact_phone,
            "patient_email": new_apt.patient_email,
            "appointment_date": new_apt.appointment_date,
            "appointment_time": new_apt.appointment_time,
            "consultation_type": new_apt.consultation_type,
            "urgency": new_apt.urgency,
            "status": new_apt.status,
            "patient_notes": new_apt.patient_notes,
            "created_at": new_apt.created_at.isoformat()
        }
    }


@router.get("")
def list_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists appointments for the authenticated user or clinician."""
    if current_user.role == UserRole.DOCTOR and current_user.doctor_profile:
        apts = db.query(Appointment).filter(Appointment.doctor_id == current_user.doctor_profile.id).order_by(Appointment.created_at.desc()).all()
    elif current_user.role == UserRole.PATIENT:
        apts = db.query(Appointment).filter(Appointment.booked_by_user_id == current_user.id).order_by(Appointment.created_at.desc()).all()
    else:
        apts = db.query(Appointment).order_by(Appointment.created_at.desc()).all()

    results = []
    for a in apts:
        results.append({
            "id": a.id,
            "appointment_code": a.appointment_code,
            "patient_id": a.patient.id if a.patient else "",
            "patient_name": a.patient.patient_name if a.patient else "Patient",
            "patient_code": a.patient.patient_code if a.patient else "N/A",
            "doctor_id": a.doctor.id if a.doctor else "",
            "doctor_name": a.doctor.user.full_name if a.doctor and a.doctor.user else "Attending Clinician",
            "doctor_email": a.doctor.user.email if a.doctor and a.doctor.user else "",
            "booker_name": a.booker_name,
            "booker_relation": a.booker_relation,
            "contact_phone": a.contact_phone,
            "patient_email": a.patient_email,
            "appointment_date": a.appointment_date,
            "appointment_time": a.appointment_time,
            "consultation_type": a.consultation_type,
            "urgency": a.urgency,
            "status": a.status,
            "patient_notes": a.patient_notes,
            "doctor_notes": a.doctor_notes,
            "created_at": a.created_at.isoformat() if a.created_at else ""
        })

    return {"success": True, "appointments": results}


@router.put("/{appointment_id}/status")
def update_appointment_status(
    appointment_id: str,
    req: AppointmentStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    apt.status = req.status
    if req.doctor_notes:
        apt.doctor_notes = req.doctor_notes
    apt.updated_at = datetime.utcnow()
    db.commit()

    if apt.booked_by_user_id:
        create_in_app_notification(
            db,
            user_id=apt.booked_by_user_id,
            title=f"Appointment {req.status}",
            message=f"Your appointment ({apt.appointment_code}) on {apt.appointment_date} status has been updated to: {req.status}.",
            notification_type="APPOINTMENT",
            reference_id=apt.id
        )

    log_audit_event(
        db,
        action="APPOINTMENT_STATUS_UPDATED",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        entity_type="Appointment",
        entity_id=apt.id,
        details=f"Status: {req.status}"
    )

    return {"success": True, "message": f"Appointment status updated to {req.status}."}
