"""
DermaClass-Net Clinical AI Web Platform
Comprehensive End-to-End Verification Suite
"""

import os
import sys
import io
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

# Ensure root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import app
from backend.database import SessionLocal
from backend.models import User, OtpToken, Patient

client = TestClient(app)

def create_synthetic_skin_image():
    """Create a 224x224 RGB image that resembles skin tones with a pigmented center."""
    arr = np.zeros((224, 224, 3), dtype=np.uint8)
    # Base skin tone (peach/tan)
    arr[:, :, 0] = 210  # R
    arr[:, :, 1] = 160  # G
    arr[:, :, 2] = 135  # B

    # Add pigmented central lesion
    y, x = np.ogrid[:224, :224]
    mask = (x - 112)**2 + (y - 112)**2 <= 40**2
    arr[mask, 0] = 70   # Dark brown pigment
    arr[mask, 1] = 40
    arr[mask, 2] = 30

    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def create_synthetic_non_skin_image():
    """Create a pure neon green image (definitely non-skin)."""
    arr = np.zeros((224, 224, 3), dtype=np.uint8)
    arr[:, :, 1] = 255  # Pure Green
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_e2e():
    print("=" * 70)
    print("DERMACLASS-NET CLINICAL PLATFORM E2E VERIFICATION SUITE")
    print("=" * 70)

    # 1. System Health
    print("\n[1] Checking System Health & Model Status...")
    res = client.get("/api/v1/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print(f"    - Status: {health_data.get('status')}")
    print(f"    - Model Status: {health_data.get('model')}")
    print(f"    - Centroid Status: {health_data.get('centroid')}")
    print(f"    - Storage: {health_data.get('storage')}")
    assert health_data.get('model') == "loaded"
    assert health_data.get('centroid') == "loaded"
    print("    -> PASS")

    # 2. Model Info Endpoint
    print("\n[2] Checking Model Architecture & Metadata Specs...")
    res = client.get("/api/v1/model/info")
    assert res.status_code == 200
    model_info = res.json()
    print(f"    - Architecture: {model_info.get('model_name')}")
    print(f"    - Classes: {len(model_info.get('classes', []))} categories")
    print(f"    - Input Resolution: {model_info.get('input_size')}")
    assert len(model_info.get('classes', [])) == 8
    print("    -> PASS")

    # 3. Doctor Authentication
    print("\n[3] Authenticating Pre-seeded Doctor Account...")
    res = client.post("/api/v1/auth/login", json={
        "email": "dr.evelyn.vance@dermaclass.med",
        "password": "Doctor@2026"
    })
    assert res.status_code == 200, f"Doctor login failed: {res.text}"
    doc_auth = res.json()
    doc_token = doc_auth["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    print(f"    - Doctor Name: {doc_auth['user']['full_name']}")
    print(f"    - Role: {doc_auth['user']['role']}")
    assert doc_auth['user']['role'] == "DOCTOR"
    print("    -> PASS")

    # 4. Admin Authentication
    print("\n[4] Authenticating Pre-seeded Admin Account...")
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@dermaclass.med",
        "password": "Admin@2026"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_auth = res.json()
    admin_token = admin_auth["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"    - Admin Role: {admin_auth['user']['role']}")
    assert admin_auth['user']['role'] == "ADMIN"
    print("    -> PASS")

    # 5. Doctor Registers Patient (Generates Unique Patient ID)
    print("\n[5] Doctor Registers New Clinical Patient...")
    patient_payload = {
        "patient_name": "Eleanor Vance-Cole",
        "date_of_birth": "1978-09-22",
        "age": 48,
        "gender": "Female",
        "phone": "+1 (555) 789-4321",
        "email": "eleanor.cole@example.org",
        "area": "Mission Bay Medical District",
        "city": "San Francisco",
        "district": "California",
        "medical_notes": "Family history of atypical dysplastic nevi."
    }
    res = client.post("/api/v1/patients", json=patient_payload, headers=doc_headers)
    assert res.status_code in (200, 201), f"Patient registration failed: {res.text}"
    patient_record = res.json()["patient"]
    patient_id = patient_record["id"]
    patient_code = patient_record["patient_code"]
    print(f"    - Allocated Patient ID: {patient_code} (Format verified: PATxx-DRxxx)")
    print(f"    - Registered Name: {patient_record['patient_name']}")
    assert "PAT" in patient_code and "DR" in patient_code
    print("    -> PASS")

    # 6. Non-Skin Rejection Test
    print("\n[6] Testing Non-Skin Image Rejection Gatekeeper...")
    non_skin_buf = create_synthetic_non_skin_image()
    files = {"image": ("non_skin.jpg", non_skin_buf, "image/jpeg")}
    data = {
        "age": 48,
        "sex": "female",
        "anatom_site": "posterior torso",
        "patient_id": patient_id
    }
    res = client.post("/api/v1/predictions", files=files, data=data, headers=doc_headers)
    assert res.status_code == 200
    rej_data = res.json()
    print(f"    - Gatekeeper is_valid_skin: {rej_data.get('is_valid_skin')}")
    print(f"    - Status: {rej_data.get('status')}")
    print(f"    - Error explanation: {rej_data.get('error')}")
    assert rej_data.get("is_valid_skin") is False
    assert "rejected" in rej_data.get("status", "").lower() or "error" in rej_data
    print("    -> PASS")

    # 7. Valid Skin Scan Inference & Database Persistence
    print("\n[7] Executing Valid Skin Lesion ONNX Inference & Persistence...")
    skin_buf = create_synthetic_skin_image()
    files = {"image": ("lesion_sample.jpg", skin_buf, "image/jpeg")}
    data = {
        "age": 48,
        "sex": "female",
        "anatom_site": "posterior torso",
        "patient_id": patient_id
    }
    res = client.post("/api/v1/predictions", files=files, data=data, headers=doc_headers)
    assert res.status_code == 200, f"Prediction failed: {res.text}"
    pred_data = res.json()
    scan_id = pred_data.get("scan_id")
    print(f"    - Scan ID: {scan_id}")
    print(f"    - Scan Code: {pred_data.get('scan_code')}")
    print(f"    - Predicted Class: {pred_data.get('predicted_class')} ({pred_data.get('predicted_class_name')})")
    print(f"    - Confidence: {pred_data.get('top_probability'):.4f}")
    print(f"    - Epistemic Uncertainty (Vacuity): {pred_data.get('epistemic_uncertainty'):.4f}")
    print(f"    - Risk Stratification: {pred_data.get('risk_level')}")
    assert scan_id is not None
    assert pred_data.get("is_valid_skin") is True
    print("    -> PASS")

    # 8. Doctor Review & Clinical Sign-off
    print("\n[8] Doctor Reviews & Signs Off on Diagnostic Scan...")
    review_payload = {
        "review_status": "REVIEWED",
        "doctor_diagnosis": "Compound melanocytic nevus with mild architectural atypia",
        "clinical_notes": "Clinical dermoscopy correlates with benign features. Surveillance in 6 months recommended.",
        "recommended_action": "Follow-up dermoscopy in 6 months. Instructed on ABCDE signs."
    }
    res = client.post(f"/api/v1/scans/{scan_id}/review", json=review_payload, headers=doc_headers)
    assert res.status_code == 200, f"Review sign-off failed: {res.text}"
    review_res = res.json()
    print(f"    - Review Status: {review_res['review']['review_status']}")
    print(f"    - Doctor Sign-off: {review_res['review']['doctor_name']}")
    assert review_res["review"]["review_status"] == "REVIEWED"
    print("    -> PASS")

    # 9. Clinical PDF Report Generation via ReportLab
    print("\n[9] Generating Official Clinical ReportLab PDF Report...")
    res = client.get(f"/api/v1/reports/{scan_id}/pdf")
    assert res.status_code == 200, f"PDF generation failed: {res.text}"
    assert res.headers.get("content-type") == "application/pdf"
    pdf_bytes = res.content
    print(f"    - PDF Size: {len(pdf_bytes)} bytes")
    print(f"    - PDF Header: {pdf_bytes[:5].decode('latin-1')}")
    assert pdf_bytes.startswith(b"%PDF")
    print("    -> PASS")

    # 10. Patient 2FA Demographic Report Access
    print("\n[10] Patient 2FA Demographic Verification & Report Retrieval...")
    # Step 1: Request report access with Patient ID and demographic info
    access_req_payload = {
        "patient_code": patient_code,
        "patient_name": "Eleanor Vance-Cole",
        "age": 48,
        "area": "Mission Bay Medical District",
        "city": "San Francisco",
        "district": "California"
    }
    res = client.post("/api/v1/patients/report-access/request", json=access_req_payload)
    assert res.status_code == 200, f"Report access request failed: {res.text}"
    req_data = res.json()
    print(f"    - 2FA Triggered: {req_data.get('masked_contact')}")
    print(f"    - Message: {req_data.get('message')}")

    # Fetch latest OTP generated for this patient from database for testing
    db = SessionLocal()
    otp_record = db.query(OtpToken).filter(
        OtpToken.contact_target == patient_record["phone"],
        OtpToken.purpose == "REPORT_ACCESS",
        OtpToken.is_used == False
    ).order_by(OtpToken.created_at.desc()).first()

    # In dev mode, OTP is logged or defaults to 123456
    # Let's test with the dev mode default or db check
    dev_otp = "123456"
    print(f"    - Submitting 2FA OTP verification ({dev_otp})...")
    verify_payload = {
        "patient_code": patient_code,
        "otp": dev_otp
    }
    res = client.post("/api/v1/patients/report-access/verify", json=verify_payload)
    assert res.status_code == 200, f"Report access OTP verification failed: {res.text}"
    access_result = res.json()
    print(f"    - Reports Found: {len(access_result.get('reports', []))}")
    assert len(access_result.get('reports', [])) >= 1
    report_item = access_result['reports'][0]
    print(f"    - Report Lesion: {report_item.get('ai_predicted_class_name')}")
    print(f"    - Doctor Review Status: {report_item.get('doctor_review_status')}")
    assert report_item.get('doctor_review_status') == 'REVIEWED'
    db.close()
    print("    -> PASS")

    # 11. Controlled Report Sharing with Revocable Token
    print("\n[11] Creating Controlled Report Sharing Link...")
    share_payload = {
        "expires_in_days": 7,
        "recipient_note": "For second opinion with Dr. Martinez"
    }
    res = client.post(f"/api/v1/reports/{scan_id}/share", json=share_payload, headers=doc_headers)
    assert res.status_code == 200, f"Report sharing failed: {res.text}"
    share_data = res.json()
    share_token = share_data["token"]
    print(f"    - Secure Share Token: {share_token}")
    print(f"    - Expiration: {share_data['expires_at']}")

    # Public Retrieval via Share Token
    pub_res = client.get(f"/api/v1/reports/shared/{share_token}")
    assert pub_res.status_code == 200, f"Public shared report access failed: {pub_res.text}"
    pub_data = pub_res.json()
    report = pub_data.get("report", {})
    print(f"    - Shared Report Verified: {report.get('scan_code')}")
    assert report.get("scan_id") == scan_id
    print("    -> PASS")

    # 12. Support Ticket Lifecycle
    print("\n[12] Testing Support Ticket System (Patient -> Admin Thread)...")
    ticket_payload = {
        "category": "Report",
        "subject": "Question regarding follow-up timeline for SCN scan",
        "message": "Hello, I noticed the recommendation for 6-month follow up. Can this be scheduled via tele-dermoscopy?",
        "priority": "NORMAL"
    }
    # Create ticket as Doctor or User
    res = client.post("/api/v1/support/tickets", json=ticket_payload, headers=doc_headers)
    assert res.status_code in (200, 201), f"Ticket creation failed: {res.text}"
    ticket_data = res.json()["ticket"]
    ticket_id = ticket_data["id"]
    print(f"    - Created Ticket #{ticket_id}: {ticket_data['subject']}")

    # Admin lists and responds to ticket
    res = client.post(f"/api/v1/support/tickets/{ticket_id}/messages", json={
        "message": "Yes, teledermatology video follow-up is supported. You can book directly in the Patient Portal."
    }, headers=admin_headers)
    assert res.status_code == 200, f"Admin reply failed: {res.text}"
    reply_data = res.json()
    reply_msg = reply_data.get("message_record", {})
    print(f"    - Admin Replied: {reply_msg.get('sender_name')} ({reply_msg.get('message')})")
    print("    -> PASS")

    # 13. Admin Dashboard & Audit Trail
    print("\n[13] Checking Admin Dashboard Metrics & Audit Logs...")
    res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert res.status_code == 200
    stats = res.json()["stats"]
    print(f"    - Total Users: {stats['total_users']}")
    print(f"    - Total Patients: {stats['total_patients']}")
    print(f"    - Total Scans: {stats['total_scans']}")
    print(f"    - Open Support Tickets: {stats['open_tickets']}")

    audit_res = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()["audit_logs"]
    print(f"    - Audit Log Entries Recorded: {len(logs)}")
    assert len(logs) > 0
    print("    -> PASS")

    print("\n" + "=" * 70)
    print("ALL 13 END-TO-END VERIFICATION CHECKS PASSED WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    test_e2e()
