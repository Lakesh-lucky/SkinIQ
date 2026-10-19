import torch
import torch.nn as nn
import torch.nn.functional as F

class ClassWeightedDirichletEDLLoss(nn.Module):
    """
    Dirichlet Evidential Deep Learning (EDL) Loss Function with Class Imbalance Weighting.
    
    References:
      - Sensoy et al. "Evidential Deep Learning to Quantify Classification Uncertainty" (NeurIPS 2018).
      - Dirichlet-based evidential uncertainty modeling with digamma expected risk.
    """
    def __init__(self, class_weights: torch.Tensor = None, num_classes: int = 8, kl_annealing_epochs: int = 10):
        super(ClassWeightedDirichletEDLLoss, self).__init__()
        self.num_classes = num_classes
        self.kl_annealing_epochs = kl_annealing_epochs
        if class_weights is not None:
            self.register_buffer('class_weights', class_weights.view(1, -1))
        else:
            self.register_buffer('class_weights', torch.ones(1, num_classes))

    def kl_divergence(self, alpha: torch.Tensor) -> torch.Tensor:
        """
        Computes KL divergence between Dir(alpha) and non-informative uniform prior Dir(1).
        KL(Dir(alpha) || Dir(1)) = ln(Gamma(sum(alpha)) / prod(Gamma(alpha)))
                                  - ln(Gamma(K) / (Gamma(1)^K))
                                  + sum((alpha_k - 1) * (psi(alpha_k) - psi(sum(alpha))))
        """
        ones = torch.ones_like(alpha)
        sum_alpha = torch.sum(alpha, dim=-1, keepdim=True)
        
        # log Gamma terms
        first_term = (
            torch.lgamma(sum_alpha)
            - torch.lgamma(torch.tensor(float(self.num_classes), device=alpha.device))
            - torch.sum(torch.lgamma(alpha), dim=-1, keepdim=True)
            + torch.sum(torch.lgamma(ones), dim=-1, keepdim=True)
        )
        
        # digamma terms
        second_term = torch.sum(
            (alpha - 1.0) * (torch.digamma(alpha) - torch.digamma(sum_alpha)),
            dim=-1,
            keepdim=True
        )
        
        kl = first_term + second_term
        return kl.squeeze(-1)

    def forward(self, logits: torch.Tensor, targets: torch.Tensor, epoch: int = 0) -> torch.Tensor:
        """
        Args:
          logits: Model output logits [B, K]
          targets: Ground truth class indices [B] or one-hot [B, K]
          epoch: Current training epoch index for KL annealing
        """
        if targets.dim() == 1:
            y_one_hot = F.one_hot(targets, num_classes=self.num_classes).float()
        else:
            y_one_hot = targets.float()
            
        # 1. Non-negative Evidence via Softplus
        evidence = F.softplus(logits)
        alpha = evidence + 1.0
        S = torch.sum(alpha, dim=-1, keepdim=True) # Dirichlet strength
        
        # 2. Expected Bayes Risk (Class-weighted digamma cross-entropy)
        weights = self.class_weights.to(logits.device)
        digamma_loss = torch.sum(
            weights * y_one_hot * (torch.digamma(S) - torch.digamma(alpha)),
            dim=-1
        )
        
        # 3. KL Divergence Regularization on non-ground truth classes
        # Remove ground truth evidence from regularization: tilde_alpha = y + (1 - y) * alpha
        tilde_alpha = y_one_hot + (1.0 - y_one_hot) * alpha
        kl_loss = self.kl_divergence(tilde_alpha)
        
        # Annealing coefficient lambda_t
        lambda_t = min(1.0, float(epoch) / float(max(1, self.kl_annealing_epochs)))
        
        total_loss = torch.mean(digamma_loss + lambda_t * kl_loss)
        return total_loss
