import os
import sys
import unittest
import numpy as np
from PIL import Image
import io

# Add root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from backend.app import app
from backend.database import SessionLocal
from backend.models import User, DoctorProfile, Patient, Scan, Prediction, DoctorReview, SharedReport, AuditLog
from backend.services.email_service import is_smtp_configured
from backend.config import settings

client = TestClient(app)

def run_doctor_platform_checks():
    print("==================================================")
    print("STARTING DERMACLASS-NET DOCTOR PLATFORM VERIFICATION")
    print("==================================================")

    db = SessionLocal()
    try:
        # 1. Check Default Doctor in DB
        doctor = db.query(User).filter(User.role == "DOCTOR").first()
        assert doctor is not None, "Doctor account not found in DB"
        print(f"[PASS] Doctor account verified: {doctor.email} (ID: {doctor.id})")

        profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == doctor.id).first()
        assert profile is not None, "Doctor profile missing"
        print(f"[PASS] Doctor profile verified: Code {profile.doctor_code}, Specialization: {profile.specialization}")

        # 2. Test Doctor Login Endpoint
        print("\n--- Testing Doctor Authentication ---")
        # Invalid password
        bad_login = client.post("/api/v1/auth/login", json={"email": doctor.email, "password": "wrongpassword"})
        assert bad_login.status_code == 401, f"Expected 401 on bad password, got {bad_login.status_code}"
        print("[PASS] Invalid password correctly rejected with 401")

        # Valid credentials with SMTP check
        login_res = client.post("/api/v1/auth/login", json={"email": doctor.email, "password": "Doctor@2026"})
        if not is_smtp_configured():
            assert login_res.status_code == 503, f"Expected 503 when SMTP not configured, got {login_res.status_code}"
            assert "Email service is not configured" in login_res.json()["detail"]
            print("[PASS] Correctly returns 503 with 'Email service is not configured' when SMTP is unconfigured")
        else:
            assert login_res.status_code == 200
            data = login_res.json()
            assert "otp" not in data, "CRITICAL SECURITY FLAW: OTP MUST NEVER BE IN API RESPONSE"
            assert data["requires_otp"] is True
            print(f"[PASS] Real OTP dispatched via SMTP to {data['masked_email']}, OTP omitted from response")

        # 3. Test Patient Code Generation
        print("\n--- Testing Patient ID Generation ---")
        patient_payload = {
            "patient_name": "Eleanor Vance",
            "date_of_birth": "1982-04-14",
            "age": 44,
            "gender": "Female",
            "phone": "+1-555-0199",
            "email": "eleanor.vance@example.com",
            "area": "Hillcrest Ridge",
            "city": "Seattle",
            "district": "King County",
            "medical_notes": "History of dysplastic nevi, primary lesion left forearm."
        }

        # Create patient directly using backend router logic / database with doctor ownership
        from backend.routers.patients import generate_unique_patient_code
        patient_code_1 = generate_unique_patient_code(db, profile.doctor_code)
        print(f"[PASS] Generated Patient ID format: {patient_code_1}")
        assert patient_code_1.startswith("PAT") and f"-{profile.doctor_code}" in patient_code_1

        # Insert a real test patient
        test_patient = Patient(
            patient_code=patient_code_1,
            doctor_id=profile.id,
            patient_name=patient_payload["patient_name"],
            date_of_birth=patient_payload["date_of_birth"],
            age=patient_payload["age"],
            gender=patient_payload["gender"],
            phone=patient_payload["phone"],
            email=patient_payload["email"],
            area=patient_payload["area"],
            city=patient_payload["city"],
            district=patient_payload["district"],
            medical_notes=patient_payload["medical_notes"]
        )
        db.add(test_patient)
        db.commit()
        db.refresh(test_patient)
        print(f"[PASS] Patient registered in DB: {test_patient.patient_code} - {test_patient.patient_name}")

        # Next patient code
        patient_code_2 = generate_unique_patient_code(db, profile.doctor_code)
        print(f"[PASS] Second sequential Patient ID: {patient_code_2}")
        assert patient_code_2 != patient_code_1

        # 4. Test Model Inference & Evidential Uncertainty
        print("\n--- Testing Model Inference & Evidential Uncertainty ---")
        from backend.ml.preprocessing import preprocess_image_tensor, encode_clinical_metadata
        from backend.ml.inference import run_onnx_inference
        from backend.ml.postprocessing import calibrate_and_compute_evidential_distribution
        from backend.ml.model_loader import CLASS_NAMES

        # Create a synthetic dermoscopic skin lesion image
        img_arr = np.full((224, 224, 3), 195, dtype=np.uint8)
        img_arr[:, :, 0] = 210 # warm reddish-beige skin tone
        img_arr[:, :, 1] = 160
        img_arr[:, :, 2] = 135
        img_arr[80:144, 80:144] = [70, 35, 25] # pigmented lesion center
        img = Image.fromarray(img_arr)

        img_tensor = preprocess_image_tensor(img)
        meta_tensor = encode_clinical_metadata(55.0, "female", "left forearm")
        logits = run_onnx_inference(img_tensor, meta_tensor)
        edl_results = calibrate_and_compute_evidential_distribution(logits)

        assert "predicted_class" in edl_results
        assert "top_probability" in edl_results
        assert "epistemic_uncertainty" in edl_results
        assert "probabilities" in edl_results
        predicted_name = CLASS_NAMES.get(edl_results["predicted_class"], edl_results["predicted_class"])
        print(f"[PASS] Inference result: Class={edl_results['predicted_class']} ({predicted_name})")
        print(f"[PASS] Confidence: {edl_results['top_probability']:.2%}, Evidential Dirichlet Uncertainty: {edl_results['epistemic_uncertainty']:.4f}")
        print(f"[PASS] Probabilities distribution sum: {sum(edl_results['probabilities'].values()):.4f}")

        # 5. Create Scan Record in DB
        test_scan = Scan(
            scan_code=f"SCN-VERIFY-{db.query(Scan).count() + 1:04d}",
            patient_id=test_patient.id,
            uploaded_by_user_id=doctor.id,
            image_path="test_lesion.jpg",
            original_filename="clinical_lesion_dermatoscopy.jpg",
            mime_type="image/jpeg",
            file_size_bytes=1024 * 45,
            anatomical_site="Left Forearm",
            patient_age=55.0,
            patient_sex="female"
        )
        db.add(test_scan)
        db.commit()
        db.refresh(test_scan)

        test_pred = Prediction(
            scan_id=test_scan.id,
            predicted_class=edl_results["predicted_class"],
            predicted_class_name=predicted_name,
            top_probability=edl_results["top_probability"],
            epistemic_uncertainty=edl_results["epistemic_uncertainty"],
            probabilities_json=edl_results["probabilities"],
            fusion_weights_json={"densenet121": 0.62, "efficientnet_b4": 0.38},
            risk_level="Low Risk (Benign vascular structure)",
            processing_time_ms=124.5,
            gatekeeper_passed=True
        )
        db.add(test_pred)
        db.commit()
        print(f"[PASS] Scan & Prediction stored with Scan ID: {test_scan.id}")

        # 6. Test Doctor Review Submission
        print("\n--- Testing Doctor Clinical Review ---")
        review = DoctorReview(
            scan_id=test_scan.id,
            doctor_id=profile.id,
            review_status="FOLLOW_UP_REQUIRED",
            clinical_notes="Dermoscopic examination reveals vascular lacunae. Reticular pattern consistent with ISIC benchmarks.",
            doctor_diagnosis="Benign Vascular Lesion with slight vascular ectasia",
            recommended_action="Follow-up examination in 90 days. Serial digital dermoscopy indicated."
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        print(f"[PASS] Doctor review recorded: Status={review.review_status}, ID={review.id}")

        # 7. Test PDF Report Generation with ReportLab
        print("\n--- Testing ReportLab PDF Generation ---")
        from backend.services.pdf_service import generate_medical_report_pdf
        report_meta = {
            "report_id": f"REP-{test_scan.id[:8].upper()}",
            "generated_date": "2026-10-04",
            "patient_code": test_patient.patient_code,
            "patient_name": test_patient.patient_name,
            "age": test_patient.age,
            "gender": test_patient.gender,
            "phone": test_patient.phone,
            "area": test_patient.area,
            "city": test_patient.city,
            "district": test_patient.district,
            "doctor_name": doctor.full_name,
            "doctor_code": profile.doctor_code,
            "specialization": profile.specialization,
            "hospital_affiliation": profile.hospital_affiliation,
            "scan_id": test_scan.id,
            "scan_date": "2026-10-04",
            "anatomical_site": test_scan.anatomical_site,
            "predicted_class": test_pred.predicted_class,
            "predicted_name": test_pred.predicted_class_name,
            "confidence": test_pred.top_probability,
            "uncertainty": test_pred.epistemic_uncertainty,
            "probabilities": test_pred.probabilities_json,
            "model_version": "v2.4.0-production",
            "review_status": review.review_status,
            "clinical_notes": review.clinical_notes,
            "dermoscopy_notes": "Vascular lacunae visible under polarized dermoscopy.",
            "assessment": review.doctor_diagnosis,
            "recommended_follow_up": review.recommended_action,
            "reviewed_at": "2026-10-04 14:00"
        }

        pdf_filepath = generate_medical_report_pdf(report_meta)
        assert os.path.exists(pdf_filepath), f"PDF file not found at {pdf_filepath}"
        file_size = os.path.getsize(pdf_filepath)
        assert file_size > 1000, "PDF file too small or empty"
        print(f"[PASS] Clinical ReportLab PDF successfully compiled! File: {os.path.basename(pdf_filepath)} ({file_size:,} bytes)")

        # 8. Check Dashboard Overview Metrics from Database
        print("\n--- Testing Real Database Dashboard Metrics ---")
        from backend.routers.scans import get_doctor_dashboard_overview
        overview = get_doctor_dashboard_overview(current_user=doctor, db=db)
        assert overview["success"] is True
        metrics = overview["overview"]
        print(f"[PASS] Real DB Dashboard Metrics: Patients={metrics['total_patients']}, Today's Scans={metrics['today_scans']}, Pending Reviews={metrics['pending_reviews']}, Reports Generated={metrics['reports_generated']}")
        assert metrics['total_patients'] >= 1
        assert len(overview["recent_patients"]) >= 1

        print("\n==================================================")
        print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
        print("==================================================")
        return True
    finally:
        db.close()

if __name__ == "__main__":
    success = run_doctor_platform_checks()
    if not success:
        sys.exit(1)
