import os
import sys
import time
import json
import argparse
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import pandas as pd
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import (
    densenet121, DenseNet121_Weights,
    efficientnet_b4, EfficientNet_B4_Weights
)
from sklearn.metrics import (
    roc_auc_score, accuracy_score, recall_score,
    precision_recall_fscore_support, confusion_matrix
)
from tqdm import tqdm
import onnx
import onnxruntime as ort

# Ensure UTF-8 stdout on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Configure PyTorch CPU multi-threading
num_cores = os.cpu_count() or 4
torch.set_num_threads(max(1, min(num_cores, 12)))

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from dataset import load_isic2019_data, CLASS_NAMES, NUM_CLASSES, METADATA_DIM
from model import DermaClassNet, DermaClassNetONNXWrapper, CrossAttentionFeatureWeighting, MetadataMLP
from loss import ClassWeightedDirichletEDLLoss

def load_and_transform_single(args):
    path, transform = args
    img = Image.open(path).convert('RGB')
    return transform(img)


def extract_features_incremental(image_paths, densenet, effnet, cache_key, cache_file, device, batch_size=128):
    """
    Extracts visual features in batches with multi-threaded image decoding and
    incremental disk checkpointing for instant resume capability.
    """
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    total_imgs = len(image_paths)
    dense_feats = np.zeros((total_imgs, 1024), dtype=np.float32)
    eff_feats = np.zeros((total_imgs, 1792), dtype=np.float32)
    start_idx = 0
    
    # Check for existing checkpoint
    if os.path.exists(cache_file):
        try:
            cached_data = torch.load(cache_file, map_location='cpu', weights_only=False)
            if cache_key in cached_data:
                cached_dense, cached_eff, completed_idx = cached_data[cache_key]
                if completed_idx >= total_imgs:
                    print(f"[{cache_key}] Loaded complete pre-extracted features ({completed_idx}/{total_imgs}).")
                    return cached_dense, cached_eff
                else:
                    dense_feats[:completed_idx] = cached_dense[:completed_idx]
                    eff_feats[:completed_idx] = cached_eff[:completed_idx]
                    start_idx = completed_idx
                    print(f"[{cache_key}] Resuming extraction from index {start_idx}/{total_imgs} ({(start_idx/total_imgs)*100:.1f}%)...")
        except Exception as e:
            print(f"[{cache_key}] Note on cache read: {e}. Starting fresh extraction.")
            
    num_batches = (total_imgs - start_idx + batch_size - 1) // batch_size
    print(f"[{cache_key}] Processing {total_imgs - start_idx} remaining images in {num_batches} batches (batch_size={batch_size})...")
    
    t0 = time.time()
    for b in range(num_batches):
        b_start = start_idx + b * batch_size
        b_end = min(b_start + batch_size, total_imgs)
        batch_paths = image_paths[b_start:b_end]
        
        # Parallel image loading and preprocessing
        args_list = [(p, transform) for p in batch_paths]
        with ThreadPoolExecutor(max_workers=8) as executor:
            tensors = list(executor.map(load_and_transform_single, args_list))
        batch_tensors = torch.stack(tensors, dim=0).to(device)
        
        # High-speed model inference
        with torch.inference_mode():
            fd = densenet.pool(F.relu(densenet.features(batch_tensors), inplace=False)).flatten(1)
            fe = effnet.pool(effnet.features(batch_tensors)).flatten(1)
            
        dense_feats[b_start:b_end] = fd.cpu().numpy()
        eff_feats[b_start:b_end] = fe.cpu().numpy()
        
        # Periodic incremental checkpointing every 5 batches (~640 images) or on final batch
        if (b + 1) % 5 == 0 or (b + 1) == num_batches:
            elapsed = time.time() - t0
            pct = (b_end / total_imgs) * 100
            rate = b_end / max(1e-3, elapsed)
            print(f"[{cache_key}] Processed {b_end}/{total_imgs} ({pct:.1f}%) | Speed: {rate:.1f} imgs/sec | Elapsed: {elapsed:.1f}s")
            
            # Save partial cache to disk
            try:
                full_cache = {}
                if os.path.exists(cache_file):
                    full_cache = torch.load(cache_file, map_location='cpu', weights_only=False)
                full_cache[cache_key] = (dense_feats, eff_feats, b_end)
                torch.save(full_cache, cache_file)
            except Exception as e:
                pass
                
    print(f"[{cache_key}] Completed extraction for all {total_imgs} images in {time.time() - t0:.1f}s.\n")
    return dense_feats, eff_feats


class MultimodalEmbeddedDataset(Dataset):
    def __init__(self, f_dense, f_eff, metadata_vectors, labels):
        self.f_dense = torch.as_tensor(f_dense, dtype=torch.float32)
        self.f_eff = torch.as_tensor(f_eff, dtype=torch.float32)
        self.meta = torch.as_tensor(metadata_vectors, dtype=torch.float32)
        self.labels = torch.as_tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return self.f_dense[idx], self.f_eff[idx], self.meta[idx], self.labels[idx]


class DermaClassFusionNetwork(nn.Module):
    def __init__(self, num_classes=8, metadata_dim=13, visual_embed_dim=512, meta_embed_dim=128):
        super(DermaClassFusionNetwork, self).__init__()
        self.num_classes = num_classes
        
        self.cross_attention = CrossAttentionFeatureWeighting(
            d_dense=1024,
            d_eff=1792,
            embed_dim=visual_embed_dim
        )
        self.metadata_mlp = MetadataMLP(
            in_features=metadata_dim,
            hidden_dim=64,
            out_dim=meta_embed_dim,
            dropout=0.2
        )
        fused_dim = visual_embed_dim + meta_embed_dim
        self.classifier = nn.Sequential(
            nn.Linear(fused_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )

    def forward(self, f_dense, f_eff, metadata):
        f_vis, gating_weights = self.cross_attention(f_dense, f_eff)
        f_meta = self.metadata_mlp(metadata)
        multimodal = torch.cat([f_vis, f_meta], dim=-1)
        logits = self.classifier(multimodal)
        return logits, gating_weights


def evaluate_embedded_model(model, val_loader, criterion, epoch, device):
    model.eval()
    val_loss = 0.0
    all_preds = []
    all_targets = []
    all_probs = []
    
    with torch.no_grad():
        for fd, fe, meta, labels in val_loader:
            fd = fd.to(device)
            fe = fe.to(device)
            meta = meta.to(device)
            labels = labels.to(device)
            
            logits, _ = model(fd, fe, meta)
            loss = criterion(logits, labels)
            val_loss += loss.item() * fd.size(0)
            
            probs = F.softmax(logits, dim=-1)
            preds = torch.argmax(probs, dim=-1)
            
            all_probs.append(probs.cpu().numpy())
            all_preds.append(preds.cpu().numpy())
            all_targets.append(labels.cpu().numpy())
            
    val_loss = val_loss / len(val_loader.dataset)
    all_probs = np.concatenate(all_probs, axis=0)
    all_preds = np.concatenate(all_preds, axis=0)
    all_targets = np.concatenate(all_targets, axis=0)
    
    acc = accuracy_score(all_targets, all_preds)
    try:
        y_val_one_hot = np.eye(NUM_CLASSES)[all_targets]
        macro_roc_auc = roc_auc_score(y_val_one_hot, all_probs, average='macro', multi_class='ovr')
    except Exception as e:
        macro_roc_auc = 0.5
        print(f"Warning calculating ROC-AUC: {e}")
        
    macro_sens = recall_score(all_targets, all_preds, average='macro', zero_division=0)
    _, _, f1s, _ = precision_recall_fscore_support(all_targets, all_preds, average='macro', zero_division=0)
    
    return val_loss, acc, macro_roc_auc, macro_sens, f1s


def train_production_cycle(
    data_dir: str,
    output_dir: str,
    epochs: int = 30,
    batch_size: int = 64,
    lr: float = 1e-4,
    weight_decay: float = 1e-2,
    patience: int = 5
):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("==================================================")
    print("  DermaClass-Net: Full-Scale Production Training")
    print(f"  Device: {device} | CPU Cores: {os.cpu_count()}")
    print(f"  Dataset: {data_dir}")
    print(f"  Max Epochs: {epochs} | Early Stopping Patience: {patience}")
    print(f"  Optimizer: AdamW (LR={lr}, Weight Decay={weight_decay})")
    print("==================================================")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Load full 25,331 ISIC 2019 dataset
    train_dataset_raw, val_dataset_raw, class_weights = load_isic2019_data(data_dir=data_dir, val_split=0.20)
    
    cache_path = os.path.join(output_dir, "isic2019_features_cache.pt")
    
    # 2. Pretrained Backbones
    print("\nInstantiating pretrained DenseNet-121 and EfficientNet-B4...")
    densenet_model = densenet121(weights=DenseNet121_Weights.DEFAULT).to(device).eval()
    effnet_model = efficientnet_b4(weights=EfficientNet_B4_Weights.DEFAULT).to(device).eval()
    densenet_model.pool = nn.AdaptiveAvgPool2d((1, 1))
    effnet_model.pool = nn.AdaptiveAvgPool2d((1, 1))
    
    # Extract features with incremental checkpointing
    print("\n>>> Extracting Dual-Backbone Visual Features for Training Cohort (20,264 Images)...")
    train_dense, train_eff = extract_features_incremental(
        train_dataset_raw.image_paths, densenet_model, effnet_model,
        cache_key="train", cache_file=cache_path, device=device, batch_size=128
    )
    
    print(">>> Extracting Dual-Backbone Visual Features for Validation Cohort (5,067 Images)...")
    val_dense, val_eff = extract_features_incremental(
        val_dataset_raw.image_paths, densenet_model, effnet_model,
        cache_key="val", cache_file=cache_path, device=device, batch_size=128
    )
    
    # Free memory of standalone backbones before training
    del densenet_model, effnet_model
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        
    # 3. Create Embedded DataLoaders
    train_dataset = MultimodalEmbeddedDataset(
        train_dense, train_eff, train_dataset_raw.metadata_vectors.numpy(), train_dataset_raw.labels.numpy()
    )
    val_dataset = MultimodalEmbeddedDataset(
        val_dense, val_eff, val_dataset_raw.metadata_vectors.numpy(), val_dataset_raw.labels.numpy()
    )
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, drop_last=False)
    
    # 4. Model & Loss Setup
    fusion_net = DermaClassFusionNetwork(
        num_classes=NUM_CLASSES,
        metadata_dim=METADATA_DIM,
        visual_embed_dim=512,
        meta_embed_dim=128
    ).to(device)
    
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
    
    optimizer = torch.optim.AdamW(
        fusion_net.parameters(),
        lr=1e-3,
        weight_decay=1e-4
    )
    
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=epochs,
        eta_min=1e-6
    )
    
    best_val_auc = 0.0
    best_epoch = 0
    patience_counter = 0
    best_fusion_weights = None
    best_weights_path = os.path.join(output_dir, "dermaclass_net_best.pth")
    history = []
    
    print("\n==================================================")
    print("  Starting 30-Epoch Multimodal Evidential Training")
    print("==================================================")
    start_train_time = time.time()
    
    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        fusion_net.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0
        
        for fd, fe, meta, labels in train_loader:
            fd = fd.to(device)
            fe = fe.to(device)
            meta = meta.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            logits, _ = fusion_net(fd, fe, meta)
            loss = criterion(logits, labels)
            loss.backward()
            
            torch.nn.utils.clip_grad_norm_(fusion_net.parameters(), max_norm=5.0)
            optimizer.step()
            
            bs = fd.size(0)
            running_loss += loss.item() * bs
            preds = torch.argmax(logits, dim=-1)
            correct_train += (preds == labels).sum().item()
            total_train += bs
            
        scheduler.step()
        train_loss = running_loss / total_train
        train_acc = correct_train / total_train
        
        val_loss, val_acc, val_auc, val_sens, val_f1 = evaluate_embedded_model(
            fusion_net, val_loader, criterion, epoch, device
        )
        
        epoch_dur = time.time() - epoch_start
        print(f"Epoch {epoch:02d}/{epochs:02d} [{epoch_dur:4.1f}s] | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc*100:.2f}% | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc*100:.2f}% | "
              f"Macro ROC-AUC: {val_auc:.4f} | Sens: {val_sens*100:.2f}% | F1: {val_f1:.4f}")
        
        history.append({
            'epoch': epoch,
            'train_loss': train_loss,
            'train_acc': train_acc,
            'val_loss': val_loss,
            'val_acc': val_acc,
            'val_macro_auc': val_auc,
            'val_sensitivity': val_sens,
            'val_f1': val_f1,
            'lr': optimizer.param_groups[0]['lr']
        })
        
        if val_auc > best_val_auc:
            best_val_auc = val_auc
            best_epoch = epoch
            patience_counter = 0
            best_fusion_weights = fusion_net.state_dict()
            print(f"  >>> Checkpoint Saved: Best Validation Macro ROC-AUC improved to {val_auc:.4f}")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\n[Early Stopping Triggered] No improvement in validation ROC-AUC for {patience} consecutive epochs.")
                break
                
    total_training_time = time.time() - start_train_time
    print(f"\nTraining Complete in {total_training_time:.1f} seconds! Best Val Macro ROC-AUC: {best_val_auc:.4f} (Epoch {best_epoch})")
    
    # 5. Assemble Unified End-to-End DermaClassNet Architecture
    print("\n==================================================")
    print("  Assembling Unified End-to-End DermaClassNet...")
    print("==================================================")
    
    full_model = DermaClassNet(
        num_classes=NUM_CLASSES,
        metadata_dim=METADATA_DIM,
        visual_embed_dim=512,
        meta_embed_dim=128,
        pretrained=True
    ).to(device)
    
    if best_fusion_weights is not None:
        full_model.cross_attention.load_state_dict(
            {k.replace('cross_attention.', ''): v for k, v in best_fusion_weights.items() if k.startswith('cross_attention.')}
        )
        full_model.metadata_mlp.load_state_dict(
            {k.replace('metadata_mlp.', ''): v for k, v in best_fusion_weights.items() if k.startswith('metadata_mlp.')}
        )
        full_model.classifier.load_state_dict(
            {k.replace('classifier.', ''): v for k, v in best_fusion_weights.items() if k.startswith('classifier.')}
        )
        
    torch.save({
        'epoch': best_epoch,
        'model_state_dict': full_model.state_dict(),
        'val_macro_auc': best_val_auc,
        'class_names': CLASS_NAMES,
        'num_classes': NUM_CLASSES
    }, best_weights_path)
    print(f">>> Full End-to-End Weights Saved to: '{best_weights_path}'")
    
    # Save training history CSV
    df_hist = pd.DataFrame(history)
    df_hist.to_csv(os.path.join(output_dir, "training_history.csv"), index=False)
    
    # 6. Export to Dynamic-Batch ONNX Model
    onnx_path = os.path.join(output_dir, "dermaclass_net_final.onnx")
    print(f"\n>>> Exporting Full DermaClass-Net to ONNX: '{onnx_path}'...")
    wrapper = DermaClassNetONNXWrapper(full_model).to(device)
    wrapper.eval()
    
    dummy_img = torch.randn(1, 3, 224, 224, device=device)
    dummy_meta = torch.randn(1, METADATA_DIM, device=device)
    
    torch.onnx.export(
        wrapper,
        (dummy_img, dummy_meta),
        onnx_path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=['image', 'metadata'],
        output_names=['probabilities', 'evidence', 'uncertainty', 'fusion_weights'],
        dynamic_axes={
            'image': {0: 'batch_size'},
            'metadata': {0: 'batch_size'},
            'probabilities': {0: 'batch_size'},
            'evidence': {0: 'batch_size'},
            'uncertainty': {0: 'batch_size'},
            'fusion_weights': {0: 'batch_size'}
        },
        dynamo=False
    )
    
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    print(">>> ONNX Model Structure Validated Successfully!")
    
    # Test ONNX Runtime parity
    ort_session = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
    test_img = torch.randn(2, 3, 224, 224)
    test_meta = torch.randn(2, METADATA_DIM)
    
    with torch.no_grad():
        pt_probs, pt_ev, pt_unc, pt_w = wrapper(test_img.to(device), test_meta.to(device))
        
    ort_outs = ort_session.run(None, {'image': test_img.numpy(), 'metadata': test_meta.numpy()})
    max_diff = np.max(np.abs(pt_probs.cpu().numpy() - ort_outs[0]))
    print(f">>> ONNX Runtime Parity Difference: {max_diff:.6e} (< 1e-4) -> PASS")
    
    # 7. Generate Full Clinical Evaluation Metrics
    print("\n==================================================")
    print("  Generating Comprehensive Clinical Metrics...")
    print("==================================================")
    from evaluate import run_evaluation
    eval_report = run_evaluation(data_dir=data_dir, weights_path=best_weights_path, output_dir=output_dir, cache_path=cache_path)
    
    print("\n>>> Full-Scale Production Training, ONNX Export, and Evaluation Finished Successfully!")
    return best_weights_path, onnx_path, eval_report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="DermaClass-Net Full-Scale Production Pipeline")
    parser.add_argument("--data_dir", type=str, default=r"C:\Users\reddy\OneDrive\Desktop\Model ai model train folder For using website\data")
    parser.add_argument("--output_dir", type=str, default=r"C:\Users\reddy\OneDrive\Desktop\Model ai model train folder For using website")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch_size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--weight_decay", type=float, default=1e-2)
    parser.add_argument("--patience", type=int, default=5)
    
    args = parser.parse_args()
    train_production_cycle(
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        weight_decay=args.weight_decay,
        patience=args.patience
    )
