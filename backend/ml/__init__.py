from backend.ml.model_loader import (
    model_manager,
    CLASS_IDS,
    CLASS_NAMES,
    ANATOMICAL_SITES,
    SEX_CATEGORIES,
    DERMACLASS_CLASSES,
    DERMACLASS_CLASS_NAMES,
    DERMACLASS_SEVERITIES,
    DERMACLASS_COLORS,
)
from backend.ml.preprocessing import (
    validate_dermoscopic_skin_image,
    encode_clinical_metadata,
    preprocess_image_tensor,
)
from backend.ml.inference import (
    run_onnx_inference,
    run_dermaclass_inference,
)
from backend.ml.postprocessing import (
    compute_prediction_from_logits,
    compute_dermaclass_prediction,
    generate_model_comparison,
    calibrate_and_compute_evidential_distribution,  # legacy alias
)

__all__ = [
    "model_manager",
    "CLASS_IDS",
    "CLASS_NAMES",
    "ANATOMICAL_SITES",
    "SEX_CATEGORIES",
    "DERMACLASS_CLASSES",
    "DERMACLASS_CLASS_NAMES",
    "DERMACLASS_SEVERITIES",
    "DERMACLASS_COLORS",
    "validate_dermoscopic_skin_image",
    "encode_clinical_metadata",
    "preprocess_image_tensor",
    "run_onnx_inference",
    "run_dermaclass_inference",
    "compute_prediction_from_logits",
    "compute_dermaclass_prediction",
    "generate_model_comparison",
    "calibrate_and_compute_evidential_distribution",
]

