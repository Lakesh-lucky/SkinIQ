import numpy as np
from backend.ml.model_loader import model_manager


def run_onnx_inference(img_tensor: np.ndarray, meta_tensor=None) -> np.ndarray:
    """
    Executes SkinLesion-ResNet18 ONNX inference.

    Model specs (from model_config.json):
      - Input  : 'input'  → [1, 3, 224, 224] float32
      - Output : 'output' → [1, 2] float32  (raw logits for [BCC, MEL])
      - meta_tensor is ignored (image-only model)

    Returns:
      logits: np.ndarray of shape [2] — raw logits for [BCC, MEL]
    """
    if model_manager.ort_session is None:
        raise RuntimeError("SkinLesion-ResNet18 ONNX inference session is not initialized. Check model path.")

    session = model_manager.ort_session
    input_name = session.get_inputs()[0].name  # 'input'

    raw_outputs = session.run(None, {input_name: img_tensor})
    logits = raw_outputs[0][0]  # shape [2]
    return logits


def run_dermaclass_inference(
    img_tensor: np.ndarray,
    meta_tensor: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Executes DERMAClass-Net multimodal ONNX inference.

    Model specs:
      - Inputs:
          'image': [1, 3, 224, 224] float32
          'metadata': [1, 13] float32
      - Outputs:
          'probabilities': [1, 8] float32 (Dirichlet expected probabilities)
          'evidence': [1, 8] float32 (Evidential masses per class)
          'uncertainty': [1, 1] float32 (Dirichlet epistemic uncertainty)
          'fusion_weights': [1, 2] float32 (DenseNet121 vs EfficientNet-B4 weights)

    Returns:
      (probs, evidence, uncertainty, fusion_weights) as 1D/2D numpy arrays
    """
    if model_manager.ort_session_dermaclass is None:
        raise RuntimeError("DERMAClass-Net ONNX inference session is not initialized. Check model path.")

    session = model_manager.ort_session_dermaclass
    ort_inputs = {
        'image': img_tensor,
        'metadata': meta_tensor
    }

    raw_outputs = session.run(None, ort_inputs)
    probs, evidence, uncertainty, fusion_weights = raw_outputs
    return probs[0], evidence[0], uncertainty[0], fusion_weights[0]

