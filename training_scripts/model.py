import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
from torchvision.models import (
    densenet121, DenseNet121_Weights,
    efficientnet_b4, EfficientNet_B4_Weights
)

class CrossAttentionFeatureWeighting(nn.Module):
    """
    Bidirectional Cross-Attention and Dynamic Softmax Gating Module between
    DenseNet121 and EfficientNet-B4 feature representations.
    """
    def __init__(self, d_dense: int = 1024, d_eff: int = 1792, embed_dim: int = 512, num_heads: int = 4):
        super(CrossAttentionFeatureWeighting, self).__init__()
        self.embed_dim = embed_dim
        
        # Linear projections to shared embedding dimension
        self.proj_dense = nn.Sequential(
            nn.Linear(d_dense, embed_dim),
            nn.LayerNorm(embed_dim),
            nn.GELU()
        )
        self.proj_eff = nn.Sequential(
            nn.Linear(d_eff, embed_dim),
            nn.LayerNorm(embed_dim),
            nn.GELU()
        )
        
        # Multihead Attention: Dense attends to Eff, and Eff attends to Dense
        self.mha_dense_to_eff = nn.MultiheadAttention(embed_dim=embed_dim, num_heads=num_heads, batch_first=True)
        self.mha_eff_to_dense = nn.MultiheadAttention(embed_dim=embed_dim, num_heads=num_heads, batch_first=True)
        
        self.norm_dense = nn.LayerNorm(embed_dim)
        self.norm_eff = nn.LayerNorm(embed_dim)
        
        # Gating network computing dynamic attention weights [alpha_1, alpha_2]
        self.gating_net = nn.Sequential(
            nn.Linear(embed_dim * 2, 128),
            nn.GELU(),
            nn.Linear(128, 2)
        )

    def forward(self, f_dense: torch.Tensor, f_eff: torch.Tensor):
        """
        Args:
          f_dense: [B, 1024]
          f_eff: [B, 1792]
        Returns:
          f_fused: [B, 512]
          gating_weights: [B, 2] (alpha_1 for DenseNet, alpha_2 for EfficientNet)
        """
        # [B, 1, embed_dim]
        h_dense = self.proj_dense(f_dense).unsqueeze(1)
        h_eff = self.proj_eff(f_eff).unsqueeze(1)
        
        # Cross Attention
        attn_dense, _ = self.mha_dense_to_eff(query=h_dense, key=h_eff, value=h_eff)
        attn_eff, _ = self.mha_eff_to_dense(query=h_eff, key=h_dense, value=h_dense)
        
        # Residual connection & norm
        out_dense = self.norm_dense((h_dense + attn_dense).squeeze(1)) # [B, embed_dim]
        out_eff = self.norm_eff((h_eff + attn_eff).squeeze(1))       # [B, embed_dim]
        
        # Softmax gating weights [B, 2]
        concat_feats = torch.cat([out_dense, out_eff], dim=-1) # [B, 2 * embed_dim]
        gating_logits = self.gating_net(concat_feats)
        gating_weights = F.softmax(gating_logits, dim=-1) # [B, 2]
        
        alpha_dense = gating_weights[:, 0:1]
        alpha_eff = gating_weights[:, 1:2]
        
        # Calibrated visual fusion representation
        f_fused = alpha_dense * out_dense + alpha_eff * out_eff # [B, embed_dim]
        return f_fused, gating_weights


class MetadataMLP(nn.Module):
    """
    Clinical Metadata MLP Projector transforming 13-dim clinical vector into 128-dim embedding.
    """
    def __init__(self, in_features: int = 13, hidden_dim: int = 64, out_dim: int = 128, dropout: float = 0.2):
        super(MetadataMLP, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, out_dim),
            nn.LayerNorm(out_dim),
            nn.GELU()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class DermaClassNet(nn.Module):
    """
    DermaClass-Net Multimodal Dermoscopic Lesion Diagnostic Model.
    
    Components:
      - Pretrained DenseNet121 Backbone
      - Pretrained EfficientNet-B4 Backbone
      - Cross-Attention Feature Weighting & Softmax Gating Module
      - Metadata MLP Projection (13-dim vector)
      - Multimodal Classification Head
      - Dirichlet Evidential Deep Learning Uncertainty Unit
    """
    def __init__(
        self,
        num_classes: int = 8,
        metadata_dim: int = 13,
        visual_embed_dim: int = 512,
        meta_embed_dim: int = 128,
        pretrained: bool = True
    ):
        super(DermaClassNet, self).__init__()
        self.num_classes = num_classes
        
        # 1. Dual Backbones
        if pretrained:
            densenet = densenet121(weights=DenseNet121_Weights.DEFAULT)
            effnet = efficientnet_b4(weights=EfficientNet_B4_Weights.DEFAULT)
        else:
            densenet = densenet121(weights=None)
            effnet = efficientnet_b4(weights=None)
            
        # DenseNet feature extractor (1024 dim)
        self.densenet_features = densenet.features
        self.densenet_pool = nn.AdaptiveAvgPool2d((1, 1))
        
        # EfficientNet feature extractor (1792 dim)
        self.effnet_features = effnet.features
        self.effnet_pool = nn.AdaptiveAvgPool2d((1, 1))
        
        # 2. Cross-Attention Feature Fusion
        self.cross_attention = CrossAttentionFeatureWeighting(
            d_dense=1024,
            d_eff=1792,
            embed_dim=visual_embed_dim
        )
        
        # 3. Metadata MLP Projector
        self.metadata_mlp = MetadataMLP(
            in_features=metadata_dim,
            hidden_dim=64,
            out_dim=meta_embed_dim,
            dropout=0.2
        )
        
        # 4. Multimodal Fusion Classification Head (512 + 128 = 640 dim)
        fused_dim = visual_embed_dim + meta_embed_dim
        self.classifier = nn.Sequential(
            nn.Linear(fused_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )

    def extract_visual_features(self, images: torch.Tensor):
        # DenseNet
        feat_d = self.densenet_features(images)
        feat_d = F.relu(feat_d, inplace=False)
        feat_d = self.densenet_pool(feat_d)
        f_dense = torch.flatten(feat_d, 1) # [B, 1024]
        
        # EfficientNet
        feat_e = self.effnet_features(images)
        feat_e = self.effnet_pool(feat_e)
        f_eff = torch.flatten(feat_e, 1)   # [B, 1792]
        
        return f_dense, f_eff

    def forward(self, images: torch.Tensor, metadata: torch.Tensor):
        """
        Standard training forward pass returning logits and gating weights.
        """
        f_dense, f_eff = self.extract_visual_features(images)
        f_vis, gating_weights = self.cross_attention(f_dense, f_eff)
        f_meta = self.metadata_mlp(metadata)
        
        multimodal_feats = torch.cat([f_vis, f_meta], dim=-1)
        logits = self.classifier(multimodal_feats)
        return logits, gating_weights

    def predict_evidential(self, images: torch.Tensor, metadata: torch.Tensor):
        """
        Full evidential inference returning:
          - probabilities [B, 8] (Dirichlet mean alpha_k / S)
          - evidence [B, 8] (non-negative evidence e_k)
          - uncertainty [B, 1] (epistemic vacuity K / S)
          - fusion_weights [B, 2] (alpha_1, alpha_2)
        """
        logits, gating_weights = self.forward(images, metadata)
        evidence = F.softplus(logits)
        alpha = evidence + 1.0
        S = torch.sum(alpha, dim=-1, keepdim=True)
        probabilities = alpha / S
        uncertainty = float(self.num_classes) / S
        
        return probabilities, evidence, uncertainty, gating_weights


class DermaClassNetONNXWrapper(nn.Module):
    """
    Inference-ready ONNX export wrapper matching deployment signature requirements.
    """
    def __init__(self, model: DermaClassNet):
        super(DermaClassNetONNXWrapper, self).__init__()
        self.model = model

    def forward(self, images: torch.Tensor, metadata: torch.Tensor):
        return self.model.predict_evidential(images, metadata)
