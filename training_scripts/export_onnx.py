import os
import sys
import torch
import numpy as np
import onnx
import onnxruntime as ort

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from model import DermaClassNet, DermaClassNetONNXWrapper

def export_to_onnx(
    weights_path: str,
    output_onnx_path: str,
    num_classes: int = 8,
    metadata_dim: int = 13
):
    print("==================================================")
    print("  DermaClass-Net: ONNX Export & Parity Verification")
    print(f"  Source Weights: {weights_path}")
    print(f"  Output ONNX: {output_onnx_path}")
    print("==================================================")
    
    # 1. Load trained model
    model = DermaClassNet(
        num_classes=num_classes,
        metadata_dim=metadata_dim,
        visual_embed_dim=512,
        meta_embed_dim=128,
        pretrained=False
    )
    
    if os.path.exists(weights_path):
        checkpoint = torch.load(weights_path, map_location='cpu', weights_only=False)
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
            auc_val = checkpoint.get('val_macro_auc')
            auc_str = f"{auc_val:.4f}" if isinstance(auc_val, float) else str(auc_val)
            print(f"Loaded weights from checkpoint (Epoch {checkpoint.get('epoch', 'N/A')}, Best Metric: {auc_str})")
        else:
            model.load_state_dict(checkpoint)
            print("Loaded state dict directly.")
    else:
        raise FileNotFoundError(f"Weights file not found at {weights_path}")
        
    model.eval()
    wrapper = DermaClassNetONNXWrapper(model)
    wrapper.eval()
    
    # 2. Prepare dummy inputs
    dummy_image = torch.randn(1, 3, 224, 224, dtype=torch.float32)
    dummy_meta = torch.randn(1, metadata_dim, dtype=torch.float32)
    
    input_names = ['image', 'metadata']
    output_names = ['probabilities', 'evidence', 'uncertainty', 'fusion_weights']
    
    dynamic_axes = {
        'image': {0: 'batch_size'},
        'metadata': {0: 'batch_size'},
        'probabilities': {0: 'batch_size'},
        'evidence': {0: 'batch_size'},
        'uncertainty': {0: 'batch_size'},
        'fusion_weights': {0: 'batch_size'}
    }
    
    # 3. Export to ONNX with dynamic batch axes
    os.makedirs(os.path.dirname(output_onnx_path), exist_ok=True)
    print("Exporting PyTorch model to ONNX graph (dynamic batch support)...")
    torch.onnx.export(
        wrapper,
        (dummy_image, dummy_meta),
        output_onnx_path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=input_names,
        output_names=output_names,
        dynamic_axes=dynamic_axes,
        dynamo=False
    )
    print(f"Export completed: '{output_onnx_path}'")
    
    # 4. Check ONNX Model Structure
    onnx_model = onnx.load(output_onnx_path)
    onnx.checker.check_model(onnx_model)
    print("ONNX model structure validation: PASSED")
    
    # 5. Verify Parity with ONNX Runtime on multi-sample dynamic batch (B=4)
    print("\nRunning numerical parity verification with ONNX Runtime (dynamic batch B=4)...")
    ort_session = ort.InferenceSession(output_onnx_path, providers=['CPUExecutionProvider'])
    
    test_batch_size = 4
    test_image = torch.randn(test_batch_size, 3, 224, 224, dtype=torch.float32)
    test_meta = torch.randn(test_batch_size, metadata_dim, dtype=torch.float32)
    
    with torch.no_grad():
        pt_probs, pt_ev, pt_unc, pt_weights = wrapper(test_image, test_meta)
        
    ort_inputs = {
        'image': test_image.numpy(),
        'metadata': test_meta.numpy()
    }
    ort_outputs = ort_session.run(None, ort_inputs)
    ort_probs, ort_ev, ort_unc, ort_weights = ort_outputs
    
    max_prob_diff = np.max(np.abs(pt_probs.numpy() - ort_probs))
    max_ev_diff = np.max(np.abs(pt_ev.numpy() - ort_ev))
    max_unc_diff = np.max(np.abs(pt_unc.numpy() - ort_unc))
    max_w_diff = np.max(np.abs(pt_weights.numpy() - ort_weights))
    
    print(f"Parity Test Results (Batch Size = {test_batch_size}):")
    print(f"  - Max Probability Diff: {max_prob_diff:.6e}")
    print(f"  - Max Evidence Diff:    {max_ev_diff:.6e}")
    print(f"  - Max Uncertainty Diff: {max_unc_diff:.6e}")
    print(f"  - Max Fusion Weight Diff: {max_w_diff:.6e}")
    
    assert max_prob_diff < 1e-4, f"Parity mismatch in probabilities: {max_prob_diff}"
    print("\n>>> ONNX Numerical Parity Verification: SUCCESSFUL! Dynamic-batch model ready for web deployment.")
    return output_onnx_path

if __name__ == '__main__':
    default_dir = r"C:\Users\reddy\OneDrive\Desktop\Model ai model train folder For using website"
    weights = os.path.join(default_dir, "dermaclass_net_best.pth")
    onnx_out = os.path.join(default_dir, "dermaclass_net_final.onnx")
    export_to_onnx(weights, onnx_out)
