import os
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database import get_db
from backend.config import settings
from backend.ml.model_loader import model_manager, CLASS_IDS, ANATOMICAL_SITES

router = APIRouter(tags=["System & Metrics"])

@router.get("/api/v1/health")
@router.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Verifies operational status of DB, ONNX Model, and Upload Storage."""
    # Check Database
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy ({str(e)})"

    # Check Model
    model_status = "loaded" if model_manager.model_loaded else "unavailable"

    # Check Storage
    storage_status = "healthy" if os.path.exists(settings.UPLOAD_DIR) and os.access(settings.UPLOAD_DIR, os.W_OK) else "unhealthy"

    overall = "healthy" if (db_status == "healthy" and model_status == "loaded") else "degraded"

    return {
        "status": overall,
        "api": "healthy",
        "database": db_status,
        "model": model_status,
        "centroid": "loaded",
        "storage": storage_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION
    }


@router.get("/api/v1/model/info")
@router.get("/api/info")
def get_model_info():
    """Returns multi-model AI platform information."""
    from backend.ml.model_loader import DERMACLASS_CLASSES, DERMACLASS_CLASS_NAMES

    return {
        "model_name": "DERMAClass-Net & SkinLesion-ResNet18 Dual Engine",
        "version": "v3.0.0-dual-ensemble",
        "status": "loaded" if (model_manager.model_loaded and model_manager.dermaclass_loaded) else "partially_loaded",
        "architecture": "Multi-Model Ensemble: DenseNet121 + EfficientNet-B4 (EDL) + ResNet-18 (Baseline)",
        "classification_type": "Multimodal 8-Class & Binary 2-Class",
        "input_size": "224x224x3 (ImageNet Normalized) + 13-D Clinical Metadata",
        "classes": DERMACLASS_CLASSES,
        "classes_resnet18": CLASS_IDS,
        "class_labels": DERMACLASS_CLASS_NAMES,
        "available_models": model_manager.get_available_models(),
        "preprocessing": {
            "resize": "224x224",
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225],
            "channel_order": "RGB",
            "metadata_input": True,
            "metadata_dim": 13
        },
        "disclaimer": "AI-generated decision support. Final diagnosis must be made by a qualified healthcare professional.",
        "official_metrics": model_manager.metrics_cache.get("official_summary", {})
    }


@router.get("/api/v1/metrics")
@router.get("/api/metrics")
def get_research_metrics():
    if model_manager.metrics_cache:
        return model_manager.metrics_cache
    model_manager.load_metrics()
    return model_manager.metrics_cache or {"status": "Metrics file not available"}


@router.get("/api/v1/federated/metrics")
@router.get("/api/federated/metrics")
def get_federated_metrics():
    """
    Returns federated learning simulation metrics.
    NOTE: This is a prototype/simulation — the production SkinLesion-ResNet18 model
    is a trained ONNX model and does NOT perform live federated training.
    """
    if model_manager.federated_cache:
        result = dict(model_manager.federated_cache)
        result["federated_learning_type"] = "SIMULATION_PROTOTYPE"
        result["disclaimer"] = (
            "This federated learning data represents a simulation/prototype architecture. "
            "The production ONNX model (SkinLesion-ResNet18) is a pre-trained static model. "
            "Actual live federated training is not active in this deployment."
        )
        return result
    model_manager.load_federated()
    return model_manager.federated_cache or {"status": "Federated metrics not available"}
