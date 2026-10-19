import os
import time
import io
from datetime import datetime
from typing import Optional
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.user import User, DoctorProfile, UserRole
from backend.models.patient import Patient
from backend.models.scan import Scan, Prediction, ModelVersion, DoctorReview
from backend.schemas.scan import DoctorReviewCreateRequest
from backend.routers.auth import get_current_user
from backend.services.storage_service import save_uploaded_scan
from backend.services.audit_service import log_audit_event
from backend.services.notification_service import create_in_app_notification
from backend.ml import (
    model_manager,
    validate_dermoscopic_skin_image,
    preprocess_image_tensor,
    encode_clinical_metadata,
    run_onnx_inference,
    run_dermaclass_inference,
    compute_prediction_from_logits,
    compute_dermaclass_prediction,
    generate_model_comparison,
)

router = APIRouter(tags=["Scans & Predictions"])

def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Helper to optionally extract authenticated user without rejecting unauthenticated requests."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        from backend.services.auth_service import decode_access_token
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            return db.query(User).filter(User.id == payload["sub"]).first()
    except Exception:
        return None
    return None


@router.get("/api/v1/models")
def get_available_models():
    """Returns the list and operational readiness of all loaded AI models."""
    return {
        "success": True,
        "models": model_manager.get_available_models(),
        "default_model": "both"
    }


@router.post("/api/v1/predictions")
@router.post("/api/predict")
async def execute_lesion_prediction(
    image: UploadFile = File(...),
    age: float = Form(55.0),
    sex: str = Form("male"),
    anatom_site: str = Form("posterior torso"),
    model_choice: str = Form("both"),  # 'resnet18' | 'dermaclass_final' | 'both'
    patient_id: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Multimodal Skin Lesion Prediction Workflow:
    1. Validates and stores uploaded dermoscopy image.
    2. Runs strict non-skin / out-of-distribution gatekeeper filter.
    3. Preprocesses 224x224 ImageNet tensor & encodes 13-dim clinical metadata.
    4. Executes chosen model:
       - 'resnet18': Baseline 2-class binary model (BCC vs. MEL)
       - 'dermaclass_final': DERMAClass-Net multimodal EDL (8 classes + epistemic uncertainty)
       - 'both': Dual-model simultaneous inference with comparative clinical agreement synthesis
    5. Records scan & prediction in database with audit logging.
    """
    start_time = time.time()

    # Normalize model choice
    chosen_mode = str(model_choice).lower().strip()
    if chosen_mode not in ["resnet18", "dermaclass_final", "both"]:
        chosen_mode = "both"

    # 1. Save uploaded file to disk
    saved_path, orig_filename, file_size = await save_uploaded_scan(image)

    # 2. Open image for gatekeeper & preprocessing
    try:
        pil_img = Image.open(saved_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Corrupted or invalid image file: {str(e)}")

    # 3. Strict Non-Skin / OOD Gatekeeper Check
    is_valid, reason, details = validate_dermoscopic_skin_image(pil_img)
    if not is_valid:
        return {
            "is_valid_skin": False,
            "status": "REJECTED",
            "error": reason,
            "predicted_class": None,
            "predicted_class_name": "REJECTED: Non-Skin / Invalid Image",
            "top_probability": 0.0,
            "epistemic_uncertainty": 1.0,
            "probabilities": {},
            "fusion_weights": {},
            "gatekeeper_details": details,
            "disclaimer": "The uploaded image was rejected by the clinical skin gatekeeper."
        }

    # 4. Preprocessing: Image Tensor & 13-dim Clinical Metadata
    img_tensor = preprocess_image_tensor(pil_img)
    meta_tensor = encode_clinical_metadata(age, sex, anatom_site)

    # 5. Run ONNX Inference according to model_choice
    resnet_result = None
    derma_result = None
    comparison = None

    # Execute ResNet-18 if requested or in both mode
    if chosen_mode in ["resnet18", "both"]:
        if model_manager.is_resnet18_available():
            logits = run_onnx_inference(img_tensor)
            resnet_result = compute_prediction_from_logits(logits)
        else:
            if chosen_mode == "resnet18":
                raise HTTPException(status_code=503, detail="SkinLesion-ResNet18 model is currently unavailable.")

    # Execute DERMAClass-Net if requested or in both mode
    if chosen_mode in ["dermaclass_final", "both"]:
        if model_manager.is_dermaclass_available():
            probs, ev, unc, weights = run_dermaclass_inference(img_tensor, meta_tensor)
            derma_result = compute_dermaclass_prediction(probs, ev, unc, weights)
        else:
            if chosen_mode == "dermaclass_final":
                raise HTTPException(status_code=503, detail="DERMAClass-Net model is currently unavailable.")

    # Synthesize results based on mode
    if chosen_mode == "resnet18":
        primary_results = resnet_result
        ver_tag = "v1.0.0-resnet18"
        ver_name = "SkinLesion-ResNet18"
        ver_desc = "ISIC Skin Lesion Dataset (BCC / MEL binary classification)"
    elif chosen_mode == "dermaclass_final":
        primary_results = derma_result
        ver_tag = "v2.5.0-dermaclass-net"
        ver_name = "DERMAClass-Net Multi-Modal EDL"
        ver_desc = "ISIC 2019 / HAM10000 8-Class Multimodal Evidential Dataset"
    else:  # 'both'
        if resnet_result and derma_result:
            comparison = generate_model_comparison(resnet_result, derma_result)
            primary_results = derma_result  # Primary full 8-class fine-grained diagnosis
            ver_tag = "v3.0.0-dual-ensemble"
            ver_name = "Dual-Model Comparative Consensus (ResNet18 + DERMAClass-Net)"
            ver_desc = "Simultaneous Dual Inference: 2-Class ResNet18 + 8-Class Multimodal DERMAClass-Net"
        elif derma_result:
            primary_results = derma_result
            ver_tag = "v2.5.0-dermaclass-net"
            ver_name = "DERMAClass-Net Multi-Modal EDL"
            ver_desc = "ISIC 2019 / HAM10000 8-Class Multimodal Evidential Dataset"
        elif resnet_result:
            primary_results = resnet_result
            ver_tag = "v1.0.0-resnet18"
            ver_name = "SkinLesion-ResNet18"
            ver_desc = "ISIC Skin Lesion Dataset (BCC / MEL binary classification)"
        else:
            raise HTTPException(status_code=500, detail="No AI model sessions could be executed.")

    processing_time_ms = round((time.time() - start_time) * 1000, 2)

    # 6. Ensure active ModelVersion in DB
    model_ver = db.query(ModelVersion).filter(ModelVersion.version == ver_tag).first()
    if not model_ver:
        model_ver = ModelVersion(
            model_name=ver_name,
            version=ver_tag,
            input_size="224x224x3 (image) + 13-D (clinical metadata)",
            training_dataset=ver_desc,
            is_active=True
        )
        db.add(model_ver)
        db.flush()

    # 7. Generate Unique Scan Code & Save to Database
    scan_count = db.query(Scan).count() + 1
    scan_code = f"SCN-2026-{scan_count:04d}"

    matched_patient = None
    if patient_id:
        matched_patient = db.query(Patient).filter(Patient.id == patient_id).first()

    new_scan = Scan(
        scan_code=scan_code,
        patient_id=matched_patient.id if matched_patient else None,
        uploaded_by_user_id=current_user.id if current_user else None,
        image_path=saved_path,
        original_filename=orig_filename,
        mime_type=image.content_type or "image/jpeg",
        file_size_bytes=file_size,
        anatomical_site=anatom_site,
        patient_age=age,
        patient_sex=sex
    )
    db.add(new_scan)
    db.flush()

    new_prediction = Prediction(
        scan_id=new_scan.id,
        model_version_id=model_ver.id,
        predicted_class=primary_results["predicted_class"],
        predicted_class_name=primary_results["predicted_class_name"],
        top_probability=primary_results["top_probability"],
        epistemic_uncertainty=primary_results["epistemic_uncertainty"],
        probabilities_json=primary_results["probabilities"],
        fusion_weights_json=primary_results.get("fusion_weights", {}),
        risk_level=primary_results["risk_level"],
        processing_time_ms=processing_time_ms,
        gatekeeper_passed=True,
        model_choice=chosen_mode,
        comparison_json=comparison
    )
    db.add(new_prediction)
    db.commit()
    db.refresh(new_scan)

    log_audit_event(
        db,
        action="PREDICTION_CREATED",
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "anonymous",
        entity_type="Scan",
        entity_id=new_scan.id,
        details=f"Model: {ver_name} ({chosen_mode}), Class: {primary_results['predicted_class']} ({primary_results['top_probability']*100:.1f}%), Uncertainty: {primary_results['epistemic_uncertainty']:.4f}"
    )

    return {
        "is_valid_skin": True,
        "status": "SUCCESS",
        "scan_id": new_scan.id,
        "scan_code": new_scan.scan_code,
        "model_choice": chosen_mode,
        "model_version": model_ver.version,
        "model_architecture": ver_name,
        "predicted_class": primary_results["predicted_class"],
        "predicted_class_name": primary_results["predicted_class_name"],
        "top_probability": primary_results["top_probability"],
        "epistemic_uncertainty": primary_results["epistemic_uncertainty"],
        "risk_level": primary_results["risk_level"],
        "probabilities": primary_results["probabilities"],
        "evidence": primary_results.get("evidence"),
        "fusion_weights": primary_results.get("fusion_weights", {}),
        "comparison": comparison,
        "gatekeeper_details": details,
        "processing_time_ms": processing_time_ms,
        "image_url": f"/api/v1/scans/{new_scan.id}/image",
        "created_at": new_scan.created_at.isoformat(),
        "disclaimer": "AI-generated decision support. Final diagnosis must be made by a qualified healthcare professional."
    }



@router.get("/api/v1/scans")
def list_user_scans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists scans for the authenticated user or all scans for admin."""
    if current_user.role == UserRole.DOCTOR:
        # Scans uploaded by doctor or belonging to doctor's patients
        doctor_pat_ids = [p.id for p in (current_user.doctor_profile.patients if current_user.doctor_profile else [])]
        scans = db.query(Scan).filter(
            (Scan.uploaded_by_user_id == current_user.id) | (Scan.patient_id.in_(doctor_pat_ids))
        ).order_by(Scan.created_at.desc()).all()
    elif current_user.role == UserRole.PATIENT:
        scans = db.query(Scan).filter(Scan.uploaded_by_user_id == current_user.id).order_by(Scan.created_at.desc()).all()
    else:
        scans = db.query(Scan).order_by(Scan.created_at.desc()).all()

    results = []
    for s in scans:
        pred = s.prediction
        doc_rev = s.doctor_review
        results.append({
            "id": s.id,
            "scan_code": s.scan_code,
            "patient_name": s.patient.patient_name if s.patient else "Direct Scan",
            "patient_code": s.patient.patient_code if s.patient else "N/A",
            "image_url": f"/api/v1/scans/{s.id}/image",
            "original_filename": s.original_filename,
            "anatomical_site": s.anatomical_site,
            "patient_age": s.patient_age,
            "patient_sex": s.patient_sex,
            "created_at": s.created_at.isoformat() if s.created_at else "",
            "prediction": {
                "id": pred.id,
                "predicted_class": pred.predicted_class,
                "predicted_class_name": pred.predicted_class_name,
                "top_probability": pred.top_probability,
                "epistemic_uncertainty": pred.epistemic_uncertainty,
                "risk_level": pred.risk_level,
                "probabilities": pred.probabilities_json,
                "fusion_weights": pred.fusion_weights_json,
                "processing_time_ms": pred.processing_time_ms,
                "model_choice": pred.model_choice or "resnet18",
                "comparison": pred.comparison_json
            } if pred else None,
            "doctor_review": {
                "id": doc_rev.id,
                "review_status": doc_rev.review_status,
                "doctor_diagnosis": doc_rev.doctor_diagnosis,
                "clinical_notes": doc_rev.clinical_notes,
                "recommended_action": doc_rev.recommended_action,
                "reviewed_at": doc_rev.reviewed_at.isoformat() if doc_rev.reviewed_at else ""
            } if doc_rev else None
        })

    return {"success": True, "scans": results}


@router.get("/api/v1/doctor/dashboard-overview")
def get_doctor_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns real statistics and recent records for the doctor's dashboard.
    No fake or hardcoded numbers!
    """
    if not current_user.doctor_profile:
        raise HTTPException(status_code=403, detail="Doctor profile required.")

    doctor_pat_ids = [p.id for p in current_user.doctor_profile.patients]
    total_patients = len(doctor_pat_ids)

    # Scans for this doctor or doctor's patients
    filter_clause = (Scan.uploaded_by_user_id == current_user.id)
    if doctor_pat_ids:
        filter_clause = filter_clause | (Scan.patient_id.in_(doctor_pat_ids))
    scans = db.query(Scan).filter(filter_clause).order_by(Scan.created_at.desc()).all()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_scans = sum(1 for s in scans if s.created_at and s.created_at >= today_start)
    pending_reviews_count = sum(1 for s in scans if not s.doctor_review or s.doctor_review.review_status == 'PENDING')
    reports_generated_count = sum(1 for s in scans if s.prediction is not None)

    # Recent patients (from db)
    patients = current_user.doctor_profile.patients
    recent_patients = []
    for p in sorted(patients, key=lambda x: x.created_at, reverse=True)[:5]:
        p_scans = [s for s in scans if s.patient_id == p.id]
        latest_s = p_scans[0] if p_scans else None
        recent_patients.append({
            "id": p.id,
            "patient_code": p.patient_code,
            "patient_name": p.patient_name,
            "age": p.age,
            "gender": p.gender,
            "last_scan": latest_s.scan_code if latest_s else "No Scans",
            "last_result": latest_s.prediction.predicted_class_name if latest_s and latest_s.prediction else "—",
            "status": p.status,
            "review_status": latest_s.doctor_review.review_status if latest_s and latest_s.doctor_review else ("PENDING" if latest_s else "NO_SCANS")
        })

    # Recent analyses (from db)
    recent_analyses = []
    for s in scans[:6]:
        pred = s.prediction
        doc_rev = s.doctor_review
        recent_analyses.append({
            "scan_id": s.id,
            "scan_code": s.scan_code,
            "patient_name": s.patient.patient_name if s.patient else "Clinical Subject",
            "patient_code": s.patient.patient_code if s.patient else "N/A",
            "date": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "",
            "ai_result": pred.predicted_class_name if pred else "Incomplete",
            "predicted_class": pred.predicted_class if pred else "NV",
            "confidence": round(pred.top_probability * 100, 1) if pred else 0.0,
            "uncertainty": round(pred.epistemic_uncertainty, 4) if pred else 0.0,
            "doctor_review": doc_rev.review_status if doc_rev else "PENDING",
            "status": doc_rev.review_status if doc_rev else "PENDING"
        })

    # Pending reviews (from db)
    pending_reviews_list = []
    for s in scans:
        if not s.doctor_review or s.doctor_review.review_status == 'PENDING':
            pred = s.prediction
            pending_reviews_list.append({
                "scan_id": s.id,
                "scan_code": s.scan_code,
                "patient_name": s.patient.patient_name if s.patient else "Clinical Subject",
                "patient_code": s.patient.patient_code if s.patient else "N/A",
                "date": s.created_at.strftime("%Y-%m-%d") if s.created_at else "",
                "prediction": pred.predicted_class_name if pred else "Pending",
                "predicted_class": pred.predicted_class if pred else "NV",
                "confidence": round(pred.top_probability * 100, 1) if pred else 0.0,
                "image_url": f"/api/v1/scans/{s.id}/image"
            })
            if len(pending_reviews_list) >= 5:
                break

    return {
        "success": True,
        "overview": {
            "total_patients": total_patients,
            "today_scans": today_scans,
            "pending_reviews": pending_reviews_count,
            "reports_generated": reports_generated_count
        },
        "recent_patients": recent_patients,
        "recent_analyses": recent_analyses,
        "pending_reviews": pending_reviews_list
    }


@router.get("/api/v1/scans/{scan_id}")
def get_single_scan_details(scan_id: str, db: Session = Depends(get_db)):
    """Returns detailed information for a single scan."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        scan = db.query(Scan).filter(Scan.scan_code == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")

    pred = scan.prediction
    doc_rev = scan.doctor_review
    pat = scan.patient

    return {
        "success": True,
        "scan": {
            "id": scan.id,
            "scan_code": scan.scan_code,
            "image_url": f"/api/v1/scans/{scan.id}/image",
            "original_filename": scan.original_filename,
            "file_size_bytes": scan.file_size_bytes,
            "anatomical_site": scan.anatomical_site,
            "patient_age": scan.patient_age,
            "patient_sex": scan.patient_sex,
            "created_at": scan.created_at.isoformat() if scan.created_at else "",
            "patient": {
                "id": pat.id,
                "patient_code": pat.patient_code,
                "patient_name": pat.patient_name,
                "age": pat.age,
                "gender": pat.gender,
                "city": pat.city
            } if pat else None,
            "prediction": {
                "id": pred.id,
                "predicted_class": pred.predicted_class,
                "predicted_class_name": pred.predicted_class_name,
                "top_probability": pred.top_probability,
                "epistemic_uncertainty": pred.epistemic_uncertainty,
                "risk_level": pred.risk_level,
                "probabilities": pred.probabilities_json,
                "fusion_weights": pred.fusion_weights_json,
                "processing_time_ms": pred.processing_time_ms,
                "model_version": pred.model_version.version if pred.model_version else "v1.0.0-resnet18",
                "model_architecture": pred.model_version.model_name if pred.model_version else "SkinLesion-ResNet18",
                "model_choice": pred.model_choice or "resnet18",
                "comparison": pred.comparison_json
            } if pred else None,
            "doctor_review": {
                "id": doc_rev.id,
                "review_status": doc_rev.review_status,
                "doctor_diagnosis": doc_rev.doctor_diagnosis,
                "clinical_notes": doc_rev.clinical_notes,
                "recommended_action": doc_rev.recommended_action,
                "reviewed_at": doc_rev.reviewed_at.isoformat() if doc_rev.reviewed_at else ""
            } if doc_rev else None
        }
    }



@router.get("/api/v1/scans/{scan_id}/image")
def get_scan_image(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan or not os.path.exists(scan.image_path):
        raise HTTPException(status_code=404, detail="Scan image not found.")
    return FileResponse(scan.image_path, media_type=scan.mime_type)


@router.post("/api/v1/scans/{scan_id}/review")
def add_doctor_review(
    scan_id: str,
    req: DoctorReviewCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows a clinician to record an official professional diagnosis & notes for a scan."""
    if current_user.role != UserRole.DOCTOR or not current_user.doctor_profile:
        raise HTTPException(status_code=403, detail="Only licensed medical doctors can submit clinical reviews.")

    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")

    review = db.query(DoctorReview).filter(DoctorReview.scan_id == scan.id).first()
    if not review:
        review = DoctorReview(
            scan_id=scan.id,
            doctor_id=current_user.doctor_profile.id,
            review_status=req.review_status,
            clinical_notes=req.clinical_notes,
            doctor_diagnosis=req.doctor_diagnosis,
            recommended_action=req.recommended_action
        )
        db.add(review)
    else:
        review.doctor_id = current_user.doctor_profile.id
        review.review_status = req.review_status
        review.clinical_notes = req.clinical_notes
        review.doctor_diagnosis = req.doctor_diagnosis
        review.recommended_action = req.recommended_action
        review.reviewed_at = datetime.utcnow()

    db.commit()

    # Notify patient if scan is linked
    if scan.uploaded_by_user_id:
        create_in_app_notification(
            db,
            user_id=scan.uploaded_by_user_id,
            title="Doctor Review Completed",
            message=f"{current_user.full_name} has reviewed your scan ({scan.scan_code}). Status: {req.review_status}.",
            notification_type="DOCTOR_REVIEW",
            reference_id=scan.id
        )

    log_audit_event(
        db,
        action="DOCTOR_REVIEW_SUBMITTED",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        entity_type="Scan",
        entity_id=scan.id,
        details=f"Status: {req.review_status}, Diagnosis: {req.doctor_diagnosis}"
    )

    return {
        "success": True,
        "message": "Doctor clinical review recorded successfully.",
        "review": {
            "id": review.id,
            "scan_id": review.scan_id,
            "doctor_name": current_user.full_name,
            "review_status": review.review_status,
            "doctor_diagnosis": review.doctor_diagnosis,
            "clinical_notes": review.clinical_notes,
            "recommended_action": review.recommended_action,
            "reviewed_at": review.reviewed_at.isoformat()
        }
    }
