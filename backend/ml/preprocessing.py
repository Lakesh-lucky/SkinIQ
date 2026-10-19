import numpy as np
from PIL import Image


def validate_dermoscopic_skin_image(pil_img: Image.Image) -> tuple[bool, str, dict]:
    """
    Lightweight non-skin image filter.
    Rejects extreme synthetic/cartoon/blank images that cannot be dermoscopic skin.
    Returns (is_valid, reason, details_dict).
    """
    img_rgb = pil_img.convert('RGB')
    small = img_rgb.resize((160, 160))
    arr = np.array(small, dtype=np.float32) / 255.0  # [160, 160, 3]
    total_pixels = 160 * 160

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    # Saturation & value from HSV approximation
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    delta = max_c - min_c + 1e-6
    sat = np.where(max_c > 0, delta / max_c, 0.0)
    val = max_c

    # Biological cutaneous chrominance (YCbCr skin model)
    r_255 = arr[:, :, 0] * 255.0
    g_255 = arr[:, :, 1] * 255.0
    b_255 = arr[:, :, 2] * 255.0
    cb = -0.168736 * r_255 - 0.331264 * g_255 + 0.500000 * b_255 + 128
    cr =  0.500000 * r_255 - 0.418688 * g_255 - 0.081312 * b_255 + 128
    skin_pixels = (cr >= cb - 18) & (val >= 0.10) & (sat >= 0.04) & (sat <= 0.88)
    skin_ratio = float(np.sum(skin_pixels)) / total_pixels

    # Synthetic blue / costume detection
    comic_blue = (b > 0.30) & (b > 1.15 * r + 0.04) & (sat > 0.28)
    comic_blue_ratio = float(np.sum(comic_blue)) / total_pixels

    # Extreme synthetic red
    comic_red = (r > 0.52) & (g < 0.30) & (b < 0.30) & (sat > 0.45)
    comic_red_ratio = float(np.sum(comic_red)) / total_pixels

    # Synthetic green
    comic_green = (g > 0.35) & (g > 1.20 * r + 0.04) & (sat > 0.35)
    comic_green_ratio = float(np.sum(comic_green)) / total_pixels

    costume_combined = comic_blue_ratio + comic_red_ratio + comic_green_ratio
    color_std = float(np.std(arr))

    details = {
        "skin_tissue_ratio": round(skin_ratio, 4),
        "costume_combined_ratio": round(costume_combined, 4),
        "comic_blue_ratio": round(comic_blue_ratio, 4),
        "color_std": round(color_std, 4),
    }

    # Rejection rules
    if comic_blue_ratio > 0.45 and skin_ratio < 0.05:
        return False, (
            f"Non-skin synthetic blue graphics detected ({comic_blue_ratio * 100:.1f}%). "
            "Please upload a clinical dermoscopic photo."
        ), details

    if costume_combined > 0.50 and skin_ratio < 0.04:
        return False, (
            f"Non-skin costume/cartoon graphics detected ({costume_combined * 100:.1f}%). "
            "Please upload a clinical dermoscopic photo."
        ), details

    if comic_green_ratio > 0.45 and skin_ratio < 0.05:
        return False, f"Synthetic graphics detected ({comic_green_ratio * 100:.1f}%).", details

    if skin_ratio < 0.02 and color_std < 0.01:
        return False, "Uniform blank/non-skin document detected.", details

    return True, "VALID_DERMOSCOPIC_SKIN", details


def preprocess_image_tensor(pil_img: Image.Image) -> np.ndarray:
    """
    Preprocess image for SkinLesion-ResNet18:
      - Resize to 224×224
      - Normalize with ImageNet mean/std
      - Output shape: [1, 3, 224, 224] float32
    Matches model_config.json: image_size=224, mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]
    """
    img_rgb = pil_img.convert('RGB').resize((224, 224), Image.Resampling.BILINEAR)
    arr = np.array(img_rgb, dtype=np.float32) / 255.0  # [224, 224, 3]

    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    norm = (arr - mean) / std

    tensor = np.transpose(norm, (2, 0, 1))           # [3, 224, 224]
    tensor = np.expand_dims(tensor, axis=0)           # [1, 3, 224, 224]
    return tensor.astype(np.float32)


def encode_clinical_metadata(age: float, sex: str, anatom_site: str) -> np.ndarray:
    """
    Encodes clinical patient metadata into a 13-dimensional feature vector
    for DERMAClass-Net multimodal inference:
      - Feature 0: Normalized age: (age - 50.0) / 20.0 (or 0.0 if not specified)
      - Features 1..3: One-hot sex [female, male, unknown]
      - Features 4..12: One-hot anatomical site:
        [anterior torso, head/neck, lateral torso, lower extremity,
         oral/genital, palms/soles, posterior torso, upper extremity, unknown]

    Returns:
      np.ndarray of shape [1, 13], dtype float32
    """
    from backend.ml.model_loader import ANATOMICAL_SITES

    meta = np.zeros((1, 13), dtype=np.float32)

    # 1. Normalized Age
    try:
        age_val = float(age) if age is not None else 50.0
        if age_val > 0:
            meta[0, 0] = (age_val - 50.0) / 20.0
        else:
            meta[0, 0] = 0.0
    except (ValueError, TypeError):
        meta[0, 0] = 0.0

    # 2. Sex One-Hot (female=1, male=2, unknown=3)
    sex_clean = str(sex).lower().strip() if sex else 'unknown'
    if sex_clean == 'female':
        meta[0, 1] = 1.0
    elif sex_clean == 'male':
        meta[0, 2] = 1.0
    else:
        meta[0, 3] = 1.0

    # 3. Anatomical Site One-Hot (indices 4..12)
    site_clean = str(anatom_site).lower().strip() if anatom_site else 'unknown'
    if site_clean in ANATOMICAL_SITES:
        idx = ANATOMICAL_SITES.index(site_clean)
        meta[0, 4 + idx] = 1.0
    else:
        # Fallback to 'unknown' (last anatomical site bin)
        meta[0, 4 + 8] = 1.0

    return meta

