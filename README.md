# SkinLesion-ResNet18: AI-Powered Skin Lesion Diagnostic Support Platform

A clinical-grade artificial intelligence platform for dermoscopic skin cancer detection and classification between **Basal Cell Carcinoma (BCC)** and **Melanoma (MEL)** using a fine-tuned ResNet-18 visual backbone deployed via ONNX Runtime.

---

## 🔬 AI Architecture & Scientific Methodology

1. **Deep Learning Visual Backbone**:
   - **ResNet-18** (`skinlesion_resnet18.onnx`): 18-layer residual convolutional neural network with 4 residual stage blocks, global average pooling, and a 2-class classification head.
   - **Input Resolution**: `224 × 224 × 3` (RGB), float32 tensor shape `[batch_size, 3, 224, 224]`.
   - **Preprocessing**: Normalized using standard ImageNet mean `[0.485, 0.456, 0.406]` and std `[0.229, 0.224, 0.225]`.

2. **Diagnostic Classes**:
   - **BCC (Basal Cell Carcinoma)**: Index 0 — Malignant basal cell cutaneous carcinoma.
   - **MEL (Melanoma)**: Index 1 — High-risk malignant melanocytic lesion.

3. **Inference & Decision Support Pipeline**:
   - High-throughput ONNX Runtime CPU execution provider.
   - Numerically stable Softmax probability computation over raw model logits.
   - Epistemic uncertainty estimation: $u = 1 - \max(P(\text{BCC}), P(\text{MEL}))$.

4. **Strict Non-Skin & OOD Gatekeeper**:
   - Real-time pigment and color-space analysis rejecting synthetic artwork, flat graphics, non-cutaneous objects, and out-of-distribution uploads.
   - Rejects non-skin images before inference with descriptive feedback.

---

## 🚀 Quick Start & Deployment

### 1. Install Dependencies
```bash
# Python backend
pip install -r requirements.txt

# Frontend web app
npm install
```

### 2. Build the Production Web Application
```bash
npm run build
```

### 3. Start the Backend API Server
```bash
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
```
Or use the launcher script:
```bash
run_app.bat
```

### 4. Access Platform
- **Web App**: `http://localhost:8000` (or `http://localhost:5173` in frontend dev mode)
- **Interactive API Docs**: `http://localhost:8000/docs`

---

## 📡 API Endpoints

- `POST /api/predict`: Fast inference endpoint accepting `image` multipart upload. Returns predicted class, probabilities (`BCC`, `MEL`), uncertainty, and latency.
- `POST /api/scans/analyze`: Full clinical workspace upload with database persistence, patient linking, and gatekeeper validation.
- `GET /api/info`: Model metadata, version info (`v1.0.0-resnet18`), architecture details, and supported classes.
- `GET /api/health`: System health check, ONNX runtime status, and database connectivity.
- `GET /api/metrics`: Performance metrics and class details.

---

## ⚠️ Medical & Simulation Disclaimers

> **Medical Disclaimer:** This application is intended strictly for AI-assisted clinical decision support and educational demonstration. It is not a standalone diagnostic device. Final medical diagnosis and treatment decisions must always be made by a qualified healthcare professional.

> **Federated Learning Disclaimer:** Any federated learning metrics and coordination displayed in the platform represent a simulated research prototype designed for demonstration purposes.
