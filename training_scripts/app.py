import os
import io
import json
import numpy as np
from PIL import Image
import onnxruntime as ort
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from torchvision import transforms

import torch
import torch.nn.functional as F
import torchvision.models as models

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ONNX_PATH = os.path.join(BASE_DIR, "dermaclass_net_final.onnx")
METRICS_PATH = os.path.join(BASE_DIR, "evaluation_metrics.json")
CENTROID_PATH = os.path.join(BASE_DIR, "isic_skin_centroid.pt")
FRONTEND_DIST = r"C:\Users\reddy\OneDrive\Desktop\Multi-Model Skin Cancer Detection\dist"

CLASS_NAMES = ['MEL', 'NV', 'BCC', 'AK', 'BKL', 'DF', 'VASC', 'SCC']
CLASS_FULL_NAMES = {
    'MEL': 'Melanoma (Malignant)',
    'NV': 'Melanocytic Nevus (Benign)',
    'BCC': 'Basal Cell Carcinoma (Malignant)',
    'AK': 'Actinic Keratosis (Pre-malignant)',
    'BKL': 'Benign Keratosis (Benign)',
    'DF': 'Dermatofibroma (Benign)',
    'VASC': 'Vascular Lesion (Benign)',
    'SCC': 'Squamous Cell Carcinoma (Malignant)'
}
CLASS_COLORS = {
    'MEL': '#ef4444',
    'NV': '#10b981',
    'BCC': '#f97316',
    'AK': '#eab308',
    'BKL': '#3b82f6',
    'DF': '#8b5cf6',
    'VASC': '#ec4899',
    'SCC': '#dc2626'
}

SEX_CATEGORIES = ['female', 'male', 'unknown']
ANATOM_SITES = [
    'anterior torso', 'head/neck', 'lateral torso', 'lower extremity',
    'oral/genital', 'palms/soles', 'posterior torso', 'upper extremity', 'unknown'
]

# Initialize ONNX Runtime Session
print(f"Loading ONNX Model from '{ONNX_PATH}'...")
session_opts = ort.SessionOptions()
session_opts.intra_op_num_threads = 4
ort_session = ort.InferenceSession(ONNX_PATH, sess_options=session_opts, providers=['CPUExecutionProvider'])
print("ONNX Model loaded successfully into memory.")

# Initialize Deep Feature Centroid Gatekeeper
print("Loading ISIC Skin Centroid for OOD / Non-Skin Gatekeeper...")
centroid_data = torch.load(CENTROID_PATH, map_location='cpu', weights_only=False)
c_dense = centroid_data['norm_centroid_dense']
c_eff = centroid_data['norm_centroid_eff']

gatekeeper_dense = models.densenet121(weights=models.DenseNet121_Weights.DEFAULT)
gatekeeper_dense.classifier = torch.nn.Identity()
gatekeeper_dense.eval()

gatekeeper_eff = models.efficientnet_b4(weights=models.EfficientNet_B4_Weights.DEFAULT)
gatekeeper_eff.classifier = torch.nn.Identity()
gatekeeper_eff.eval()
print("Deep Feature Centroid Gatekeeper loaded successfully.")

img_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

app = FastAPI(
    title="DermaClass-Net: Clinical AI Diagnostic Platform",
    description="Full-scale multimodal skin lesion diagnosis with strict OOD / non-skin image gatekeeper.",
    version="2.5.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def validate_dermoscopic_skin_image(pil_img: Image.Image) -> tuple[bool, str]:
    """
    Dual-Tier Precision Skin & Dermoscopy Gatekeeper.
    Tier 1: Flat vector / Clipart check.
    Tier 2: Deep Feature Centroid Cosine Similarity across 25,331 ISIC skin embeddings.
    """
    img_rgb = pil_img.convert('RGB').resize((224, 224))
    arr = np.array(img_rgb, dtype=np.float32)
    R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # Tier 1: Flat Clipart / Solid Color check
    q_r = (R // 20).astype(np.int32)
    q_g = (G // 20).astype(np.int32)
    q_b = (B // 20).astype(np.int32)
    q_index = q_r * 256 + q_g * 16 + q_b
    unique_counts = np.bincount(q_index.flatten(), minlength=4096)
    top_color_dominance = float(np.max(unique_counts)) / (224.0 * 224.0)
    
    if top_color_dominance > 0.85:
        return False, f"REJECTED: Flat synthetic graphic or solid clipart detected (Dominance: {top_color_dominance*100:.1f}%). Please upload a genuine dermoscopic skin photograph."
        
    # Tier 2: Deep Feature Centroid Similarity
    t = img_transform(pil_img).unsqueeze(0)
    with torch.no_grad():
        f_d = F.normalize(gatekeeper_dense(t), p=2, dim=-1).squeeze(0)
        f_e = F.normalize(gatekeeper_eff(t), p=2, dim=-1).squeeze(0)
        sim_d = float(torch.dot(f_d, c_dense))
        sim_e = float(torch.dot(f_e, c_eff))
        sim = (sim_d + sim_e) / 2.0
        
    SIM_THRESHOLD = 0.53
    if sim < SIM_THRESHOLD:
        return False, f"REJECTED: Non-skin / Out-of-Distribution image detected (Skin feature similarity: {sim*100:.1f}% < {SIM_THRESHOLD*100:.1f}%, e.g., Spider-Man, cartoon, superhero suit, anime, clothing, objects). Please upload a genuine dermoscopic skin cancer photograph."
        
    return True, "VALID_DERMOSCOPIC_SKIN"

def build_metadata_vector(age: float, sex: str, anatom_site: str) -> np.ndarray:
    meta = np.zeros(13, dtype=np.float32)
    if age is not None and age > 0:
        meta[0] = (age - 50.0) / 20.0
    else:
        meta[0] = 0.0
    
    sex_clean = str(sex).lower().strip()
    if sex_clean == 'female':
        meta[1] = 1.0
    elif sex_clean == 'male':
        meta[2] = 1.0
    else:
        meta[3] = 1.0
        
    site_clean = str(anatom_site).lower().strip()
    if site_clean in ANATOM_SITES:
        idx = ANATOM_SITES.index(site_clean)
        meta[4 + idx] = 1.0
    else:
        meta[4 + 8] = 1.0
        
    return meta

@app.post("/api/predict")
async def predict(
    image: UploadFile = File(...),
    age: float = Form(50.0),
    sex: str = Form("unknown"),
    anatom_site: str = Form("unknown")
):
    try:
        contents = await image.read()
        pil_img = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # 1. Gatekeeper: Validate whether input is genuine skin/dermoscopic tissue
        is_valid_skin, validation_message = validate_dermoscopic_skin_image(pil_img)
        if not is_valid_skin:
            return JSONResponse(
                status_code=200,
                content={
                    "is_valid_skin": False,
                    "status": "rejected",
                    "error": validation_message,
                    "predicted_class": None,
                    "predicted_class_name": "REJECTED (Non-Skin Image)",
                    "top_probability": 0.0,
                    "epistemic_uncertainty": 1.0,
                    "probabilities": {c: 0.0 for c in CLASS_NAMES}
                }
            )
        
        # 2. Run multimodal ONNX inference
        img_tensor = img_transform(pil_img).unsqueeze(0).numpy().astype(np.float32)
        meta_tensor = build_metadata_vector(age, sex, anatom_site).reshape(1, 13).astype(np.float32)
        
        ort_inputs = {'image': img_tensor, 'metadata': meta_tensor}
        ort_outs = ort_session.run(None, ort_inputs)
        probs, evidence, uncertainty, fusion_weights = ort_outs
        
        probs_1d = probs[0].tolist()
        top_idx = int(np.argmax(probs_1d))
        top_class = CLASS_NAMES[top_idx]
        
        top_prob = float(probs_1d[top_idx])
        unc_val = float(np.squeeze(uncertainty))
        dense_w = float(fusion_weights[0][0])
        eff_w = float(fusion_weights[0][1])
        
        prob_dict = {CLASS_NAMES[i]: float(probs_1d[i]) for i in range(len(CLASS_NAMES))}
        
        return {
            "is_valid_skin": True,
            "status": "success",
            "predicted_class": top_class,
            "predicted_class_name": CLASS_FULL_NAMES[top_class],
            "top_probability": top_prob,
            "epistemic_uncertainty": unc_val,
            "probabilities": prob_dict,
            "class_full_names": CLASS_FULL_NAMES,
            "class_colors": CLASS_COLORS,
            "fusion_weights": {
                "densenet121": dense_w,
                "efficientnet_b4": eff_w
            }
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

FEDERATED_METRICS_PATH = os.path.join(BASE_DIR, "federated_metrics.json")

@app.get("/api/metrics")
async def get_metrics():
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r") as f:
            return json.load(f)
    return {"message": "Metrics not available"}

@app.get("/api/federated/metrics")
async def get_federated_metrics():
    if os.path.exists(FEDERATED_METRICS_PATH):
        with open(FEDERATED_METRICS_PATH, "r") as f:
            return json.load(f)
    return {"message": "Federated metrics not yet generated"}

# Mount static React frontend
if os.path.exists(FRONTEND_DIST):
    print(f"Mounting React frontend from '{FRONTEND_DIST}'...")
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    print(f"Warning: Frontend dist not found at '{FRONTEND_DIST}'")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
