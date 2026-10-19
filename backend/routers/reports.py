import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.user import User, UserRole
from backend.models.scan import Scan
from backend.models.shared_report import SharedReport
from backend.schemas.report import ShareReportRequest
from backend.routers.auth import get_current_user
from backend.services.pdf_service import generate_medical_report_pdf
from backend.services.email_service import is_smtp_configured, send_report_shared_email
from backend.services.audit_service import log_audit_event

router = APIRouter(prefix="/reports", tags=["Medical Reports"])

def build_report_dictionary(scan: Scan) -> dict:
    pred = scan.prediction
    doc_rev = scan.doctor_review
    pat = scan.patient
    doc = pat.doctor if pat else None
    scan_date_iso = scan.created_at.strftime("%Y-%m-%d") if scan.created_at else datetime.utcnow().strftime("%Y-%m-%d")

    return {
        "scan_id": scan.id,
        "scan_code": scan.scan_code,
        "scan_date": scan.created_at.strftime("%Y-%m-%d %H:%M UTC") if scan.created_at else "",
        "scan_date_iso": scan_date_iso,
        "image_path": scan.image_path,
        "image_url": f"/api/v1/scans/{scan.id}/image",
        "anatomical_site": scan.anatomical_site,
        "patient_id": pat.id if pat else None,
        "patient_code": pat.patient_code if pat else "N/A",
        "patient_name": pat.patient_name if pat else "Anonymous Clinical Subject",
        "patient_age": scan.patient_age,
        "patient_gender": pat.gender if pat else scan.patient_sex,
        "doctor_name": doc.user.full_name if doc and doc.user else "Attending Clinician",
        "doctor_code": doc.doctor_code if doc else "DR001",
        "specialization": doc.specialization if doc else "Cutaneous Oncology & Dermoscopy",
        "ai_predicted_class": pred.predicted_class if pred else "UNKNOWN",
        "ai_predicted_class_name": pred.predicted_class_name if pred else "Unknown",
        "ai_confidence": pred.top_probability * 100 if pred else 0.0,
        "ai_uncertainty": pred.epistemic_uncertainty if pred else 0.0,
        "ai_risk_level": pred.risk_level if pred else "Standard Triaging",
        "ai_probabilities": pred.probabilities_json if pred else {},
        "ai_fusion_weights": pred.fusion_weights_json if pred else {},
        "model_version": pred.model_version.version if pred and pred.model_version else "v1.0.0-resnet18",
        "model_architecture": pred.model_version.model_name if pred and pred.model_version else "SkinLesion-ResNet18",
        "model_choice": pred.model_choice if pred else "both",
        "comparison": pred.comparison_json if pred else None,
        "doctor_review_status": doc_rev.review_status if doc_rev else "PENDING",
        "doctor_diagnosis": doc_rev.doctor_diagnosis if doc_rev else "Pending Clinician Review",
        "doctor_clinical_notes": doc_rev.clinical_notes if doc_rev else "Awaiting doctor examination.",
        "doctor_recommended_action": doc_rev.recommended_action if doc_rev else "Routine dermoscopic follow-up.",
        "doctor_reviewed_at": doc_rev.reviewed_at.strftime("%Y-%m-%d %H:%M UTC") if doc_rev and doc_rev.reviewed_at else None,
        "pdf_download_url": f"/api/v1/reports/{scan.id}/pdf",
        "created_at": scan.created_at.isoformat() if scan.created_at else "",
        "disclaimer": "This report contains AI-assisted analysis and is not a substitute for professional medical diagnosis. Clinical decisions must be made by a qualified healthcare professional."
    }

@router.get("")
def list_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all generated medical AI reports for the authenticated doctor's patients and scans.
    """
    if not current_user.doctor_profile:
        raise HTTPException(status_code=403, detail="Doctor profile required.")

    doctor_pat_ids = [p.id for p in current_user.doctor_profile.patients]
    scans = db.query(Scan).filter(
        (Scan.uploaded_by_user_id == current_user.id) | (Scan.patient_id.in_(doctor_pat_ids))
    ).order_by(Scan.created_at.desc()).all()

    reports = []
    for s in scans:
        if s.prediction: # Only scans with AI analysis form reports
            rep = build_report_dictionary(s)
            reports.append({
                "report_id": s.scan_code,
                "scan_id": s.id,
                "patient_name": rep["patient_name"],
                "patient_code": rep["patient_code"],
                "patient_id": rep["patient_id"],
                "scan_date": rep["scan_date"],
                "ai_result": f"{rep['ai_predicted_class_name']} ({rep['ai_confidence']:.1f}%)",
                "doctor_review": rep["doctor_review_status"],
                "doctor_diagnosis": rep["doctor_diagnosis"],
                "generated_date": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "",
                "pdf_url": rep["pdf_download_url"]
            })

    return {
        "success": True,
        "reports": reports
    }

@router.get("/{scan_id}")
def get_medical_report_data(scan_id: str, db: Session = Depends(get_db)):
    """Returns structured report data for display."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        scan = db.query(Scan).filter(Scan.scan_code == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")

    report_dict = build_report_dictionary(scan)
    return {"success": True, "report": report_dict}

@router.get("/{scan_id}/pdf")
def download_medical_report_pdf(
    scan_id: str,
    db: Session = Depends(get_db)
):
    """
    Generates and returns the official clinical PDF report.
    Filename: DERMAClass_Report_PAT01-DR001_2026-10-03.pdf
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        scan = db.query(Scan).filter(Scan.scan_code == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")

    report_dict = build_report_dictionary(scan)
    pdf_path = generate_medical_report_pdf(report_dict)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=500, detail="Failed to generate clinical PDF report.")

    patient_code = report_dict.get("patient_code", "PAT01-DR001").replace("/", "-")
    scan_date = report_dict.get("scan_date_iso") or datetime.utcnow().strftime("%Y-%m-%d")
    filename = f"DERMAClass_Report_{patient_code}_{scan_date}.pdf"

    log_audit_event(
        db,
        action="REPORT_DOWNLOADED",
        entity_type="Scan",
        entity_id=scan.id,
        details=f"Downloaded PDF report for {scan.scan_code} ({patient_code})"
    )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=filename
    )

@router.post("/{scan_id}/share")
def create_shared_report(
    scan_id: str,
    req: ShareReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Doctor shares report via email or generates a secure revocable link.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        scan = db.query(Scan).filter(Scan.scan_code == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")

    secure_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=req.expires_in_days or 7)

    shared = SharedReport(
        scan_id=scan.id,
        shared_by_user_id=current_user.id,
        secure_token=secure_token,
        recipient_email=req.recipient_email,
        recipient_name=req.recipient_name,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(shared)
    db.commit()

    share_url = f"/shared-report/{secure_token}"

    # If recipient email is provided, send real email via SMTP
    email_dispatched = False
    if req.recipient_email and req.recipient_email.strip():
        if not is_smtp_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Email service is not configured. Configure SMTP credentials in the backend environment."
            )

        report_dict = build_report_dictionary(scan)
        pdf_path = generate_medical_report_pdf(report_dict)

        patient_code = report_dict.get("patient_code", "Patient Record")
        sent, err = send_report_shared_email(
            recipient_name=req.recipient_name or "Colleague / Patient",
            to_email=req.recipient_email.strip(),
            doctor_name=current_user.full_name,
            patient_code=patient_code,
            share_url=f"http://localhost:5173{share_url}",
            attachment_pdf_path=pdf_path if os.path.exists(pdf_path) else None
        )

        if not sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unable to dispatch email: {err}"
            )
        email_dispatched = True

    log_audit_event(
        db,
        action="REPORT_SHARED",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        entity_type="Scan",
        entity_id=scan.id,
        details=f"Shared token created. Email sent: {email_dispatched}. Recipient: {req.recipient_email or 'Link only'}"
    )

    return {
        "success": True,
        "message": "Report shared successfully via email." if email_dispatched else "Secure report link generated successfully.",
        "share_token": secure_token,
        "share_url": share_url,
        "expires_at": expires_at.isoformat(),
        "email_dispatched": email_dispatched
    }

@router.delete("/shared/{secure_token}")
def revoke_shared_report(
    secure_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Doctor revokes a shared report link."""
    shared = db.query(SharedReport).filter(SharedReport.secure_token == secure_token).first()
    if not shared:
        raise HTTPException(status_code=404, detail="Shared report link not found.")

    shared.is_revoked = True
    db.commit()

    log_audit_event(
        db,
        action="REPORT_LINK_REVOKED",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_type="SharedReport",
        entity_id=shared.id,
        details=f"Revoked token for scan {shared.scan.scan_code if shared.scan else ''}"
    )

    return {"success": True, "message": "Shared report link has been revoked."}

@router.get("/shared/{secure_token}")
def view_shared_medical_report(secure_token: str, db: Session = Depends(get_db)):
    """Public access route for recipient with cryptographically secure token."""
    shared = db.query(SharedReport).filter(
        SharedReport.secure_token == secure_token,
        SharedReport.is_revoked == False
    ).first()

    if not shared:
        raise HTTPException(status_code=404, detail="Shared report link is invalid or has been revoked by the doctor.")

    if datetime.utcnow() > shared.expires_at:
        raise HTTPException(status_code=410, detail="This shared medical report link has expired.")

    scan = shared.scan
    report_dict = build_report_dictionary(scan)

    log_audit_event(
        db,
        action="SHARED_REPORT_ACCESSED",
        entity_type="SharedReport",
        entity_id=shared.id,
        details=f"Access via token for scan {scan.scan_code}"
    )

    return {
        "success": True,
        "shared_info": {
            "recipient_name": shared.recipient_name,
            "expires_at": shared.expires_at.isoformat(),
            "is_revoked": shared.is_revoked
        },
        "report": report_dict
    }
