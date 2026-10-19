import os
import sys
import json
import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    roc_auc_score, confusion_matrix, recall_score
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from dataset import load_isic2019_data, CLASS_NAMES, NUM_CLASSES
from model import DermaClassNet

def compute_multiclass_specificity(y_true, y_pred, num_classes):
    cm = confusion_matrix(y_true, y_pred, labels=list(range(num_classes)))
    specificities = []
    for i in range(num_classes):
        mask = np.ones((num_classes, num_classes), dtype=bool)
        mask[i, :] = False
        mask[:, i] = False
        tn = cm[mask].sum()
        fp = cm[:, i].sum() - cm[i, i]
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        specificities.append(spec)
    return specificities, cm


def run_evaluation(
    data_dir: str,
    weights_path: str,
    output_dir: str,
    cache_path: str = None
):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("==================================================")
    print("  DermaClass-Net: Clinical Evaluation Report")
    print(f"  Model Weights: {weights_path}")
    print(f"  Dataset: {data_dir}")
    print("==================================================")
    
    # Load validation labels and metadata
    _, val_dataset, _ = load_isic2019_data(data_dir=data_dir, val_split=0.20)
    
    # Load model
    model = DermaClassNet(
        num_classes=NUM_CLASSES,
        metadata_dim=13,
        visual_embed_dim=512,
        meta_embed_dim=128,
        pretrained=False
    ).to(device)
    
    checkpoint = torch.load(weights_path, map_location=device, weights_only=False)
    if 'model_state_dict' in checkpoint:
        model.load_state_dict(checkpoint['model_state_dict'])
        auc_val = checkpoint.get('val_macro_auc')
        auc_str = f"{auc_val:.4f}" if isinstance(auc_val, float) else str(auc_val)
        print(f"Loaded checkpoint from epoch {checkpoint.get('epoch', 'N/A')} (Best Metric: {auc_str})")
    else:
        model.load_state_dict(checkpoint)
        
    model.eval()
    
    if cache_path is None:
        cache_path = os.path.join(output_dir, "isic2019_features_cache.pt")
        
    all_probs = []
    all_preds = []
    all_targets = []
    all_uncertainties = []
    all_gating = []
    
    if os.path.exists(cache_path):
        print(f"Using pre-extracted validation embeddings from '{cache_path}' for fast evaluation...")
        cache_data = torch.load(cache_path, map_location='cpu', weights_only=False)
        val_dense, val_eff, _ = cache_data['val']
        val_dense = torch.as_tensor(val_dense, dtype=torch.float32)
        val_eff = torch.as_tensor(val_eff, dtype=torch.float32)
        val_meta = val_dataset.metadata_vectors
        val_labels = val_dataset.labels
        
        loader = DataLoader(TensorDataset(val_dense, val_eff, val_meta, val_labels), batch_size=128, shuffle=False)
        with torch.no_grad():
            for fd, fe, meta, labels in loader:
                fd = fd.to(device)
                fe = fe.to(device)
                meta = meta.to(device)
                
                f_vis, gating = model.cross_attention(fd, fe)
                f_meta = model.metadata_mlp(meta)
                multimodal = torch.cat([f_vis, f_meta], dim=-1)
                logits = model.classifier(multimodal)
                
                evidence = F.softplus(logits)
                alpha = evidence + 1.0
                S = torch.sum(alpha, dim=-1, keepdim=True)
                probs = alpha / S
                unc = NUM_CLASSES / S.squeeze(-1)
                preds = torch.argmax(probs, dim=-1)
                
                all_probs.append(probs.cpu().numpy())
                all_preds.append(preds.cpu().numpy())
                all_targets.append(labels.numpy())
                all_uncertainties.append(unc.cpu().numpy())
                all_gating.append(gating.cpu().numpy())
    else:
        val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)
        with torch.no_grad():
            for images, meta, labels in val_loader:
                images = images.to(device)
                meta = meta.to(device)
                
                probs, evidence, unc, gating = model.predict_evidential(images, meta)
                preds = torch.argmax(probs, dim=-1)
                
                all_probs.append(probs.cpu().numpy())
                all_preds.append(preds.cpu().numpy())
                all_targets.append(labels.numpy())
                all_uncertainties.append(unc.cpu().numpy())
                all_gating.append(gating.cpu().numpy())
                
    all_probs = np.concatenate(all_probs, axis=0)
    all_preds = np.concatenate(all_preds, axis=0)
    all_targets = np.concatenate(all_targets, axis=0)
    all_uncertainties = np.concatenate(all_uncertainties, axis=0)
    all_gating = np.concatenate(all_gating, axis=0)
    
    # 3. Overall Metrics
    overall_accuracy = accuracy_score(all_targets, all_preds)
    macro_sensitivity = recall_score(all_targets, all_preds, average='macro', zero_division=0)
    
    per_class_spec, cm = compute_multiclass_specificity(all_targets, all_preds, NUM_CLASSES)
    macro_specificity = np.mean(per_class_spec)
    
    precisions, recalls, f1s, supports = precision_recall_fscore_support(
        all_targets, all_preds, labels=list(range(NUM_CLASSES)), zero_division=0
    )
    macro_precision = np.mean(precisions)
    macro_f1 = np.mean(f1s)
    
    # 4. Per-Class ROC-AUC
    y_val_one_hot = np.eye(NUM_CLASSES)[all_targets]
    per_class_auc = []
    for k in range(NUM_CLASSES):
        try:
            auc = roc_auc_score(y_val_one_hot[:, k], all_probs[:, k])
        except Exception:
            auc = 0.5
        per_class_auc.append(auc)
        
    macro_roc_auc = np.mean(per_class_auc)
    
    mean_densenet_weight = float(np.mean(all_gating[:, 0]))
    mean_effnet_weight = float(np.mean(all_gating[:, 1]))
    mean_uncertainty = float(np.mean(all_uncertainties))
    
    # Print formatted clinical diagnostic table
    print("\n" + "="*80)
    print("                      DERMACLASS-NET VALIDATION PERFORMANCE")
    print("="*80)
    print(f"Overall Accuracy:       {overall_accuracy*100:.2f}%")
    print(f"Macro Sensitivity:      {macro_sensitivity*100:.2f}%")
    print(f"Macro Specificity:      {macro_specificity*100:.2f}%")
    print(f"Macro Precision:        {macro_precision*100:.2f}%")
    print(f"Macro F1-Score:         {macro_f1:.4f}")
    print(f"Macro ROC-AUC:          {macro_roc_auc:.4f}")
    print(f"Mean Epistemic Vacuity: {mean_uncertainty:.4f}")
    print(f"Feature Gating:         DenseNet121: {mean_densenet_weight*100:.1f}% | EfficientNet-B4: {mean_effnet_weight*100:.1f}%")
    print("-"*80)
    print(f"{'Class':<8} {'Support':<8} {'Sensitivity':<14} {'Specificity':<14} {'Precision':<12} {'F1-Score':<10} {'ROC-AUC':<10}")
    print("-"*80)
    
    class_metrics_dict = {}
    for idx, name in enumerate(CLASS_NAMES):
        print(f"{name:<8} {supports[idx]:<8d} {recalls[idx]*100:>6.2f}%        {per_class_spec[idx]*100:>6.2f}%        {precisions[idx]*100:>6.2f}%      {f1s[idx]:>6.4f}     {per_class_auc[idx]:>6.4f}")
        class_metrics_dict[name] = {
            'support': int(supports[idx]),
            'sensitivity': float(recalls[idx]),
            'specificity': float(per_class_spec[idx]),
            'precision': float(precisions[idx]),
            'f1_score': float(f1s[idx]),
            'roc_auc': float(per_class_auc[idx])
        }
    print("="*80)
    
    print("\nConfusion Matrix (8x8):")
    print("Predicted -> " + "  ".join([f"{c:>5}" for c in CLASS_NAMES]))
    for i, name in enumerate(CLASS_NAMES):
        row_str = "  ".join([f"{cm[i, j]:5d}" for j in range(NUM_CLASSES)])
        print(f"Actual {name:<4}: {row_str}")
        
    # Save full JSON report
    report = {
        'overall_accuracy': float(overall_accuracy),
        'macro_sensitivity': float(macro_sensitivity),
        'macro_specificity': float(macro_specificity),
        'macro_precision': float(macro_precision),
        'macro_f1': float(macro_f1),
        'macro_roc_auc': float(macro_roc_auc),
        'mean_epistemic_uncertainty': mean_uncertainty,
        'mean_densenet_weight': mean_densenet_weight,
        'mean_effnet_weight': mean_effnet_weight,
        'per_class_metrics': class_metrics_dict,
        'confusion_matrix': cm.tolist(),
        'classes': CLASS_NAMES
    }
    
    report_path = os.path.join(output_dir, "evaluation_metrics.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nFull evaluation metrics saved to: '{report_path}'")
    return report

if __name__ == '__main__':
    default_dir = r"C:\Users\reddy\OneDrive\Desktop\Model ai model train folder For using website"
    data_dir = os.path.join(default_dir, "data")
    weights = os.path.join(default_dir, "dermaclass_net_best.pth")
    run_evaluation(data_dir=data_dir, weights_path=weights, output_dir=default_dir)
