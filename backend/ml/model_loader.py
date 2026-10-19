import os
import json
import onnxruntime as ort
from backend.config import settings

# ============================================================
# SkinLesion-ResNet18 Model — 2-Class Binary Classification
# Classes as defined in model_config.json: ["BCC", "MEL"]
# ============================================================

CLASS_IDS = ['BCC', 'MEL']
CLASS_NAMES = {
    'BCC': 'Basal Cell Carcinoma (Malignant)',
    'MEL': 'Melanoma (Malignant)',
}

# Legacy stubs retained for import compatibility with non-ML modules
ANATOMICAL_SITES = [
    'anterior torso', 'head/neck', 'lateral torso', 'lower extremity',
    'oral/genital', 'palms/soles', 'posterior torso', 'upper extremity', 'unknown'
]

SEX_CATEGORIES = ['female', 'male', 'unknown']

# ============================================================
# DERMAClass-Net Model — 8-Class Multimodal Evidential Model
# Dynamic batch inputs: 'image' [B, 3, 224, 224], 'metadata' [B, 13]
# Outputs: 'probabilities' [B, 8], 'evidence' [B, 8], 'uncertainty' [B, 1], 'fusion_weights' [B, 2]
# ============================================================

DERMACLASS_CLASSES = ['MEL', 'NV', 'BCC', 'AK', 'BKL', 'DF', 'VASC', 'SCC']
DERMACLASS_CLASS_NAMES = {
    'MEL': 'Melanoma (Malignant)',
    'NV': 'Melanocytic Nevus (Benign)',
    'BCC': 'Basal Cell Carcinoma (Malignant)',
    'AK': 'Actinic Keratosis (Pre-malignant)',
    'BKL': 'Benign Keratosis (Benign)',
    'DF': 'Dermatofibroma (Benign)',
    'VASC': 'Vascular Lesion (Benign)',
    'SCC': 'Squamous Cell Carcinoma (Malignant)'
}
DERMACLASS_SEVERITIES = {
    'MEL': 'high',
    'BCC': 'high',
    'SCC': 'high',
    'AK': 'moderate',
    'NV': 'low',
    'BKL': 'low',
    'DF': 'low',
    'VASC': 'low'
}
DERMACLASS_COLORS = {
    'MEL': '#ef4444',
    'NV': '#10b981',
    'BCC': '#f97316',
    'AK': '#eab308',
    'BKL': '#3b82f6',
    'DF': '#8b5cf6',
    'VASC': '#ec4899',
    'SCC': '#dc2626'
}


class ModelManager:
    _instance = None

    def __init__(self):
        # 1. Existing Model: SkinLesion-ResNet18 (2-class image-only)
        self.ort_session = None
        self.model_loaded = False

        # 2. New Model: DERMAClass-Net Final (8-class multimodal evidential deep learning)
        self.ort_session_dermaclass = None
        self.dermaclass_loaded = False

        self.metrics_cache = {}
        self.federated_cache = {}

        # Legacy centroid fields kept as stubs so existing code importing
        # model_manager.skin_centroid doesn't crash.
        self.skin_centroid = None
        self.centroid_loaded = False
        self.centroid_threshold = 0.0

        self.load_all()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ModelManager()
        return cls._instance

    def load_all(self):
        self.load_onnx_model()
        self.load_dermaclass_model()
        self.load_metrics()
        self.load_federated()

    def load_onnx_model(self):
        """Loads baseline SkinLesion-ResNet18 ONNX model (2 classes: BCC, MEL)."""
        if os.path.exists(settings.ONNX_MODEL_PATH):
            try:
                self.ort_session = ort.InferenceSession(
                    settings.ONNX_MODEL_PATH,
                    providers=['CPUExecutionProvider']
                )
                self.model_loaded = True
                size_mb = os.path.getsize(settings.ONNX_MODEL_PATH) / (1024 * 1024)
                inp = self.ort_session.get_inputs()[0]
                out = self.ort_session.get_outputs()[0]
                print(
                    f"[ModelManager] Loaded SkinLesion-ResNet18 ONNX model "
                    f"({size_mb:.1f} MB) — "
                    f"Input: {inp.name}{inp.shape}, "
                    f"Output: {out.name}{out.shape}, "
                    f"Classes: {CLASS_IDS}"
                )
            except Exception as e:
                print(f"[ModelManager] ERROR loading ResNet-18 ONNX session: {e}")
                self.model_loaded = False
        else:
            print(f"[ModelManager] WARNING: SkinLesion-ResNet18 ONNX model not found at {settings.ONNX_MODEL_PATH}")

    def load_dermaclass_model(self):
        """Loads DERMAClass-Net multimodal ONNX model (8 classes + evidential uncertainty)."""
        path = settings.DERMACLASS_ONNX_PATH
        if os.path.exists(path):
            try:
                session_opts = ort.SessionOptions()
                session_opts.intra_op_num_threads = 4
                self.ort_session_dermaclass = ort.InferenceSession(
                    path,
                    sess_options=session_opts,
                    providers=['CPUExecutionProvider']
                )
                self.dermaclass_loaded = True
                size_mb = os.path.getsize(path) / (1024 * 1024)
                inputs = [f"{i.name}{i.shape}" for i in self.ort_session_dermaclass.get_inputs()]
                outputs = [f"{o.name}{o.shape}" for o in self.ort_session_dermaclass.get_outputs()]
                print(
                    f"[ModelManager] Loaded DERMAClass-Net Multi-Modal ONNX model "
                    f"({size_mb:.1f} MB) — "
                    f"Inputs: {inputs}, "
                    f"Outputs: {outputs}, "
                    f"Classes: {DERMACLASS_CLASSES}"
                )
            except Exception as e:
                print(f"[ModelManager] ERROR loading DERMAClass-Net ONNX session: {e}")
                self.dermaclass_loaded = False
        else:
            print(f"[ModelManager] WARNING: DERMAClass-Net ONNX model not found at {path}")

    def is_resnet18_available(self) -> bool:
        return self.model_loaded and self.ort_session is not None

    def is_dermaclass_available(self) -> bool:
        return self.dermaclass_loaded and self.ort_session_dermaclass is not None

    def get_available_models(self) -> list[dict]:
        models = []
        if self.is_resnet18_available():
            models.append({
                "id": "resnet18",
                "name": "SkinLesion-ResNet18",
                "version": "v1.0.0-resnet18",
                "classes": CLASS_IDS,
                "num_classes": len(CLASS_IDS),
                "type": "Image-Only Binary Classifier",
                "description": "Baseline deep convolutional model for BCC vs. MEL triage."
            })
        if self.is_dermaclass_available():
            models.append({
                "id": "dermaclass_final",
                "name": "DERMAClass-Net Multi-Modal EDL",
                "version": "v2.5.0-dermaclass-net",
                "classes": DERMACLASS_CLASSES,
                "num_classes": len(DERMACLASS_CLASSES),
                "type": "Multimodal Evidential Deep Learning (Image + Clinical Metadata)",
                "description": "8-class comprehensive diagnosis with epistemic uncertainty and dual backbone adaptive fusion."
            })
        return models

    def load_metrics(self):
        if os.path.exists(settings.EVAL_METRICS_PATH):
            try:
                with open(settings.EVAL_METRICS_PATH, "r", encoding="utf-8") as f:
                    self.metrics_cache = json.load(f)
            except Exception as e:
                print(f"[ModelManager] Warning loading evaluation metrics: {e}")

    def load_federated(self):
        if os.path.exists(settings.FEDERATED_METRICS_PATH):
            try:
                with open(settings.FEDERATED_METRICS_PATH, "r", encoding="utf-8") as f:
                    self.federated_cache = json.load(f)
            except Exception as e:
                print(f"[ModelManager] Warning loading federated metrics: {e}")


model_manager = ModelManager.get_instance()
