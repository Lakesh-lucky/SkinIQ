import torch
import sys
import os

sys.path.append(r"C:\Users\reddy\.gemini\antigravity\brain\4f5d4253-6956-4256-819e-9b301fc3bcd8\scratch")
from model import DermaClassNet, DermaClassNetONNXWrapper
from loss import ClassWeightedDirichletEDLLoss

print("=== Running DermaClass-Net Unit Sanity Check ===")
model = DermaClassNet(num_classes=8, metadata_dim=13, visual_embed_dim=512, meta_embed_dim=128, pretrained=False)
model.eval()

dummy_img = torch.randn(2, 3, 224, 224)
dummy_meta = torch.randn(2, 13)
dummy_targets = torch.tensor([0, 3], dtype=torch.long)

# 1. Forward pass
logits, gating = model(dummy_img, dummy_meta)
print(f"Logits shape: {logits.shape} (expected [2, 8])")
print(f"Gating shape: {gating.shape} (expected [2, 2])")
print(f"Gating sum: {gating.sum(dim=-1)}")

# 2. Evidential inference
probs, ev, unc, weights = model.predict_evidential(dummy_img, dummy_meta)
print(f"Probabilities shape: {probs.shape}, sum={probs.sum(dim=-1)}")
print(f"Evidence shape: {ev.shape}")
print(f"Uncertainty shape: {unc.shape}, values={unc.squeeze().tolist()}")

# 3. Loss & Backward
model.train()
criterion = ClassWeightedDirichletEDLLoss(num_classes=8)
loss = criterion(logits, dummy_targets, epoch=1)
print(f"Computed loss: {loss.item():.4f}")
loss.backward()
print("Backward gradient check: SUCCESS!")
