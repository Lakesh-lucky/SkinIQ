"""
Multi-Model Integration Test Suite
Validates:
1. Loading of both models in ModelManager (ResNet-18 & DERMAClass-Net).
2. Input shapes and metadata preprocessing (224x224x3 image + 13-dim clinical metadata).
3. ResNet-18 single inference (2 classes: BCC, MEL).
4. DERMAClass-Net single inference (8 classes, evidential uncertainty, fusion weights).
5. Dual-Model comparative inference (both models, automated concordance, consensus metrics).
6. End-to-end FastAPI endpoint validation via TestClient.
"""

import os
import io
import json
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from backend.app import app
from backend.ml import (
    model_manager,
    preprocess_image_tensor,
    encode_clinical_metadata,
    run_onnx_inference,
    run_dermaclass_inference,
    compute_prediction_from_logits,
    compute_dermaclass_prediction,
    generate_model_comparison,
    CLASS_IDS,
    DERMACLASS_CLASSES,
)

client = TestClient(app)

def create_synthetic_dermoscopy_image(color=(160, 95, 60)) -> bytes:
    """Creates an in-memory realistic dermoscopic lesion sample."""
    img = Image.new('RGB', (224, 224), color=(210, 160, 120)) # skin tone
    # draw center lesion
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    draw.ellipse([50, 50, 174, 174], fill=color, outline=(90, 45, 25))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()

def run_tests():
    print("=" * 60)
    print("DERMAClass-Net + ResNet-18 Multi-Model Integration Tests")
    print("=" * 60)

    # Test 1: Model Manager Availability
    print("\n[Test 1] Checking ModelManager sessions...")
    assert model_manager.is_resnet18_available(), "ResNet-18 session should be loaded"
    assert model_manager.is_dermaclass_available(), "DERMAClass-Net session should be loaded"
    print("  ✓ ResNet-18: LOADED & OPERATIONAL")
    print("  ✓ DERMAClass-Net Final: LOADED & OPERATIONAL")

    available = model_manager.get_available_models()
    print(f"  ✓ Available Models Count: {len(available)}")
    for m in available:
        print(f"    - {m['id']}: {m['name']} ({m['num_classes']} classes: {m['classes']})")
    assert len(available) == 2, "Expected 2 models in get_available_models()"

    # Test 2: Preprocessing and Metadata Encoding
    print("\n[Test 2] Testing Preprocessing & Metadata Vectors...")
    raw_img = Image.open(io.BytesIO(create_synthetic_dermoscopy_image()))
    img_tensor = preprocess_image_tensor(raw_img)
    assert img_tensor.shape == (1, 3, 224, 224), f"Unexpected img_tensor shape: {img_tensor.shape}"
    assert img_tensor.dtype == np.float32, f"Unexpected dtype: {img_tensor.dtype}"
    print(f"  ✓ Image tensor shape: {img_tensor.shape}, dtype: {img_tensor.dtype}")

    meta_tensor = encode_clinical_metadata(62.0, "female", "head/neck")
    assert meta_tensor.shape == (1, 13), f"Unexpected meta_tensor shape: {meta_tensor.shape}"
    assert meta_tensor[0, 1] == 1.0, "Female one-hot mismatch"
    assert meta_tensor[0, 4 + 1] == 1.0, "Head/neck one-hot mismatch"
    expected_norm_age = (62.0 - 50.0) / 20.0
    assert abs(meta_tensor[0, 0] - expected_norm_age) < 1e-5, "Age normalization mismatch"
    print(f"  ✓ Metadata vector (13-D): age={meta_tensor[0, 0]:.2f}, sex_onehot={meta_tensor[0, 1:4]}, site_onehot={meta_tensor[0, 4:]}")

    # Test 3: Standalone ResNet-18 Inference
    print("\n[Test 3] Testing SkinLesion-ResNet18 Inference...")
    res_logits = run_onnx_inference(img_tensor)
    assert res_logits.shape == (2,), f"Unexpected logits shape: {res_logits.shape}"
    res_pred = compute_prediction_from_logits(res_logits)
    print(f"  ✓ ResNet-18 Prediction: {res_pred['predicted_class']} ({res_pred['predicted_class_name']})")
    print(f"  ✓ Confidence: {res_pred['top_probability'] * 100:.1f}%, Uncertainty: {res_pred['epistemic_uncertainty']}")
    print(f"  ✓ Class Probabilities: {res_pred['probabilities']}")
    assert res_pred['predicted_class'] in CLASS_IDS, "Predicted class must be in CLASS_IDS"
    assert len(res_pred['probabilities']) == 2, "ResNet-18 must output 2 class probabilities"

    # Test 4: Standalone DERMAClass-Net Inference
    print("\n[Test 4] Testing DERMAClass-Net Final Multimodal Inference...")
    probs, evidence, uncertainty, weights = run_dermaclass_inference(img_tensor, meta_tensor)
    assert probs.shape == (8,), f"Unexpected probs shape: {probs.shape}"
    assert evidence.shape == (8,), f"Unexpected evidence shape: {evidence.shape}"
    assert uncertainty.shape == (1,), f"Unexpected uncertainty shape: {uncertainty.shape}"
    assert weights.shape == (2,), f"Unexpected weights shape: {weights.shape}"

    derma_pred = compute_dermaclass_prediction(probs, evidence, uncertainty, weights)
    print(f"  ✓ DERMAClass-Net Prediction: {derma_pred['predicted_class']} ({derma_pred['predicted_class_name']})")
    print(f"  ✓ Confidence: {derma_pred['top_probability'] * 100:.1f}%, Epistemic Uncertainty: {derma_pred['epistemic_uncertainty']}")
    print(f"  ✓ Dual Backbone Fusion Weights: DenseNet121={derma_pred['fusion_weights']['densenet121']*100:.1f}%, EfficientNet_B4={derma_pred['fusion_weights']['efficientnet_b4']*100:.1f}%")
    print(f"  ✓ 8-Class Probabilities: {derma_pred['probabilities']}")
    assert derma_pred['predicted_class'] in DERMACLASS_CLASSES, "Predicted class must be in DERMACLASS_CLASSES"
    assert len(derma_pred['probabilities']) == 8, "DERMAClass-Net must output 8 class probabilities"
    assert abs(sum(derma_pred['probabilities'].values()) - 1.0) < 1e-2, "Probabilities should sum to ~1.0"

    # Test 5: Model Comparison & Consensus Synthesis
    print("\n[Test 5] Testing Cross-Model Comparison & Concordance Synthesis...")
    comparison = generate_model_comparison(res_pred, derma_pred)
    print(f"  ✓ Concordance Type: {comparison['concordance_type']}")
    print(f"  ✓ Exact Class Match: {comparison['exact_class_match']}")
    print(f"  ✓ Risk Concordance: {comparison['risk_concordance']}")
    print(f"  ✓ Confidence Delta: {comparison['confidence_delta'] * 100:.1f}%")
    print(f"  ✓ Consensus Summary: {comparison['consensus_summary']}")
    assert "models" in comparison, "Comparison must include sub-models"
    assert "resnet18" in comparison["models"] and "dermaclass_final" in comparison["models"]

    # Test 6: API Endpoints Validation
    print("\n[Test 6] Testing FastAPI Endpoints via TestClient...")
    
    # 6a. GET /api/v1/models
    resp_models = client.get("/api/v1/models")
    assert resp_models.status_code == 200, f"GET /api/v1/models returned {resp_models.status_code}"
    models_data = resp_models.json()
    assert models_data["success"] is True
    assert len(models_data["models"]) == 2
    print(f"  ✓ GET /api/v1/models OK (Found {len(models_data['models'])} models)")

    # 6b. POST /api/v1/predictions with model_choice='both'
    sample_bytes = create_synthetic_dermoscopy_image((120, 60, 30))
    resp_pred_both = client.post(
        "/api/v1/predictions",
        files={"image": ("test_lesion.jpg", sample_bytes, "image/jpeg")},
        data={"age": "58", "sex": "female", "anatom_site": "head/neck", "model_choice": "both"}
    )
    assert resp_pred_both.status_code == 200, f"POST /api/v1/predictions returned {resp_pred_both.status_code}: {resp_pred_both.text}"
    both_json = resp_pred_both.json()
    assert both_json["status"] == "SUCCESS", f"Expected SUCCESS, got: {both_json}"
    assert both_json["model_choice"] == "both"
    assert "comparison" in both_json and both_json["comparison"] is not None
    assert len(both_json["probabilities"]) == 8, "Primary model in dual mode should provide 8 classes"
    scan_id = both_json["scan_id"]
    print(f"  ✓ POST /api/v1/predictions (model_choice='both') OK")
    print(f"    - Scan Code: {both_json['scan_code']}")
    print(f"    - Primary Result: {both_json['predicted_class']} ({both_json['predicted_class_name']}) at {both_json['top_probability']*100:.1f}%")
    print(f"    - Dual Comparison Concordance: {both_json['comparison']['concordance_type']}")

    # 6c. POST /api/v1/predictions with model_choice='resnet18'
    resp_pred_res = client.post(
        "/api/v1/predictions",
        files={"image": ("test_lesion.jpg", sample_bytes, "image/jpeg")},
        data={"age": "58", "sex": "female", "anatom_site": "head/neck", "model_choice": "resnet18"}
    )
    assert resp_pred_res.status_code == 200
    res_json = resp_pred_res.json()
    assert res_json["model_choice"] == "resnet18"
    assert len(res_json["probabilities"]) == 2, "ResNet-18 should return 2 class probabilities"
    print(f"  ✓ POST /api/v1/predictions (model_choice='resnet18') OK: {res_json['predicted_class']} ({len(res_json['probabilities'])} classes)")

    # 6d. POST /api/v1/predictions with model_choice='dermaclass_final'
    resp_pred_derma = client.post(
        "/api/v1/predictions",
        files={"image": ("test_lesion.jpg", sample_bytes, "image/jpeg")},
        data={"age": "58", "sex": "female", "anatom_site": "head/neck", "model_choice": "dermaclass_final"}
    )
    assert resp_pred_derma.status_code == 200
    derma_json = resp_pred_derma.json()
    assert derma_json["model_choice"] == "dermaclass_final"
    assert len(derma_json["probabilities"]) == 8, "DERMAClass-Net should return 8 class probabilities"
    print(f"  ✓ POST /api/v1/predictions (model_choice='dermaclass_final') OK: {derma_json['predicted_class']} ({len(derma_json['probabilities'])} classes)")

    # 6e. GET /api/v1/scans/{scan_id} to verify database persistence of comparison
    resp_get_scan = client.get(f"/api/v1/scans/{scan_id}")
    assert resp_get_scan.status_code == 200
    scan_detail = resp_get_scan.json()["scan"]
    assert scan_detail["prediction"]["model_choice"] == "both"
    assert scan_detail["prediction"]["comparison"] is not None
    print(f"  ✓ GET /api/v1/scans/{scan_id} persisted comparison telemetry successfully!")

    print("\n" + "=" * 60)
    print("ALL 6 MULTI-MODEL INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
