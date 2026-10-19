from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class HealthCheckResponse(BaseModel):
    api: str
    database: str
    model: str
    storage: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None

class ModelInfoResponse(BaseModel):
    model_name: str
    version: str
    status: str
    input_size: str
    backbones: List[str]
    fusion_mechanism: str
    classes: List[str]
    metadata_features: List[str]
    official_metrics: Dict[str, Any]
