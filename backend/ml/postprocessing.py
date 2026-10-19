import numpy as np
from backend.ml.model_loader import CLASS_IDS, CLASS_NAMES


def compute_prediction_from_logits(logits: np.ndarray) -> dict:
    """
    Post-processes raw logits from SkinLesion-ResNet18.

    Model output: [2] float32 raw logits, class order: ['BCC', 'MEL']

    Steps:
      1. Softmax → probabilities [BCC, MEL]
      2. Argmax  → predicted class index
      3. Map index → CLASS_IDS label
      4. Risk stratification (both BCC and MEL are malignant → High risk)
      5. Uncertainty estimate as 1 - max_probability (simple confidence gap)

    Returns a dict with fields consumed by the scans router and frontend.
    """
    # Numerically-stable softmax
    logits = np.asarray(logits, dtype=np.float64)
    shifted = logits - np.max(logits)
    exp_vals = np.exp(shifted)
    probs = exp_vals / np.sum(exp_vals)          # shape [2], sums to 1.0

    top_idx = int(np.argmax(probs))
    top_class = CLASS_IDS[top_idx]               # 'BCC' or 'MEL'
    top_prob = float(probs[top_idx])

    # Probabilities dict — matches frontend Record<LesionClassId, number>
    prob_dict = {CLASS_IDS[i]: round(float(probs[i]), 4) for i in range(len(CLASS_IDS))}

    # Simple uncertainty: 1.0 − max_prob  (0 = certain, 1 = maximally uncertain)
    epistemic_uncertainty = round(1.0 - top_prob, 4)

    # Risk level — both classes are malignant; no benign class in this model
    risk_level = "High (Atypical / Biopsy Recommended)"

    # No fusion backbone weights for single-model ResNet-18
    fusion_weights = {
        "resnet18": 1.0
    }

    return {
        "model_name": "SkinLesion-ResNet18",
        "model_version": "v1.0.0-resnet18",
        "predicted_class": top_class,
        "predicted_class_name": CLASS_NAMES[top_class],
        "top_probability": round(top_prob, 4),
        "epistemic_uncertainty": epistemic_uncertainty,
        "probabilities": prob_dict,
        "fusion_weights": fusion_weights,
        "risk_level": risk_level,
        "severity": "high",
        "is_malignant": True
    }


def compute_dermaclass_prediction(
    probs: np.ndarray,
    evidence: np.ndarray,
    uncertainty: np.ndarray,
    fusion_weights: np.ndarray
) -> dict:
    """
    Post-processes outputs from DERMAClass-Net multimodal evidential model:
      - 8 classes: ['MEL', 'NV', 'BCC', 'AK', 'BKL', 'DF', 'VASC', 'SCC']
      - Dirichlet evidential uncertainty
      - Dual-backbone adaptive fusion weights (DenseNet121 vs EfficientNet-B4)
    """
    from backend.ml.model_loader import (
        DERMACLASS_CLASSES,
        DERMACLASS_CLASS_NAMES,
        DERMACLASS_SEVERITIES,
    )

    probs = np.asarray(probs, dtype=np.float64)
    top_idx = int(np.argmax(probs))
    top_class = DERMACLASS_CLASSES[top_idx]
    top_prob = float(probs[top_idx])

    unc_val = float(np.squeeze(uncertainty))
    dense_w = float(fusion_weights[0])
    eff_w = float(fusion_weights[1])

    prob_dict = {
        DERMACLASS_CLASSES[i]: round(float(probs[i]), 4)
        for i in range(len(DERMACLASS_CLASSES))
    }
    evidence_dict = {
        DERMACLASS_CLASSES[i]: round(float(evidence[i]), 4)
        for i in range(len(DERMACLASS_CLASSES))
    }

    # Clinical risk stratification across 8 classes
    if top_class in ['MEL', 'BCC', 'SCC']:
        risk_level = "High (Atypical / Biopsy Recommended)"
        is_malignant = True
    elif top_class == 'AK':
        risk_level = "Moderate (Clinical Follow-up)"
        is_malignant = False
    else:
        risk_level = "Low (Benign Indication)"
        is_malignant = False

    return {
        "model_name": "DERMAClass-Net Multi-Modal EDL",
        "model_version": "v2.5.0-dermaclass-net",
        "predicted_class": top_class,
        "predicted_class_name": DERMACLASS_CLASS_NAMES[top_class],
        "top_probability": round(top_prob, 4),
        "epistemic_uncertainty": round(unc_val, 4),
        "probabilities": prob_dict,
        "evidence": evidence_dict,
        "fusion_weights": {
            "densenet121": round(dense_w, 4),
            "efficientnet_b4": round(eff_w, 4)
        },
        "risk_level": risk_level,
        "severity": DERMACLASS_SEVERITIES.get(top_class, "moderate"),
        "is_malignant": is_malignant
    }


def generate_model_comparison(resnet_result: dict, dermaclass_result: dict) -> dict:
    """
    Produces a clinically valid cross-model comparison between:
      1. SkinLesion-ResNet18 (2-Class binary screening: BCC vs. MEL)
      2. DERMAClass-Net (8-Class multimodal evidential diagnostic model)
    """
    res_class = resnet_result["predicted_class"]
    derma_class = dermaclass_result["predicted_class"]

    res_prob = resnet_result["top_probability"]
    derma_prob = dermaclass_result["top_probability"]

    is_exact_match = (res_class == derma_class)
    both_malignant = resnet_result["is_malignant"] and dermaclass_result["is_malignant"]

    if is_exact_match:
        concordance_type = "FULL_CONCORDANCE"
        consensus_text = (
            f"Both models unanimously identified {dermaclass_result['predicted_class_name']} ({derma_class}). "
            f"ResNet-18 confidence: {res_prob * 100:.1f}%, DERMAClass-Net confidence: {derma_prob * 100:.1f}%."
        )
    elif both_malignant:
        concordance_type = "MALIGNANCY_CONCORDANCE"
        consensus_text = (
            f"Both models concur on a malignant lesion triage, though with differing subclassifications "
            f"(ResNet-18: {res_class}, DERMAClass-Net: {derma_class}). Clinical histological confirmation is advised."
        )
    elif not dermaclass_result["is_malignant"]:
        concordance_type = "BENIGN_RESOLUTION"
        consensus_text = (
            f"DERMAClass-Net identified a benign diagnosis ({dermaclass_result['predicted_class_name']} - {derma_class}), "
            f"resolving the baseline binary ResNet-18 model's forced choice ({res_class})."
        )
    else:
        concordance_type = "DISCORDANT_FINDINGS"
        consensus_text = (
            f"Model discrepancy detected: ResNet-18 indicated {res_class} while DERMAClass-Net indicated {derma_class}. "
            f"Clinician in-person review is recommended."
        )

    return {
        "concordance": is_exact_match or both_malignant,
        "concordance_type": concordance_type,
        "exact_class_match": is_exact_match,
        "risk_concordance": (resnet_result["risk_level"] == dermaclass_result["risk_level"]),
        "consensus_summary": consensus_text,
        "confidence_delta": round(abs(res_prob - derma_prob), 4),
        "uncertainty_comparison": {
            "resnet18": resnet_result["epistemic_uncertainty"],
            "dermaclass_final": dermaclass_result["epistemic_uncertainty"]
        },
        "models": {
            "resnet18": resnet_result,
            "dermaclass_final": dermaclass_result
        }
    }


# ---------------------------------------------------------------------------
# Legacy alias — kept so any code that still imports the old name doesn't
# break during transition.  New code should call compute_prediction_from_logits.
# ---------------------------------------------------------------------------
def calibrate_and_compute_evidential_distribution(
    logits: np.ndarray,
    branch_weights=None,    # ignored for ResNet-18
    pil_img=None,           # ignored for ResNet-18
) -> dict:
    """Legacy wrapper — delegates to compute_prediction_from_logits."""
    return compute_prediction_from_logits(logits)

