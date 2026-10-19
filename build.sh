#!/usr/bin/env bash
set -e

echo "=== SkinIQ Backend: Starting Build Phase ==="

# Ensure Git LFS pulls the ONNX model files if git-lfs is available
if command -v git-lfs &> /dev/null; then
    echo "Configuring Git LFS..."
    git lfs install
    git lfs pull
elif command -v git &> /dev/null; then
    echo "Attempting git lfs pull..."
    git lfs pull || true
fi

# Upgrade pip & install Python dependencies
echo "Installing Python dependencies from requirements.txt..."
python -m pip install --upgrade pip
pip install -r requirements.txt

echo "=== SkinIQ Backend: Build Phase Completed Successfully ==="
