import os
import glob
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import pandas as pd
import numpy as np
from torchvision import transforms
from sklearn.model_selection import StratifiedShuffleSplit

# 8 Diagnostic Target Classes in ISIC 2019
CLASS_NAMES = ['MEL', 'NV', 'BCC', 'AK', 'BKL', 'DF', 'VASC', 'SCC']
NUM_CLASSES = len(CLASS_NAMES)

# Anatomical site categories (9 categories)
ANATOM_SITES = [
    'anterior torso',
    'posterior torso',
    'lateral torso',
    'head/neck',
    'upper extremity',
    'lower extremity',
    'palms/soles',
    'oral/genital',
    'unknown'
]

# Sex categories (3 categories)
SEX_CATEGORIES = ['female', 'male', 'unknown']

# Metadata vector total dimensions: 1 (age) + 3 (sex) + 9 (anatomical site) = 13
METADATA_DIM = 13

def encode_metadata(df_meta: pd.DataFrame) -> np.ndarray:
    """
    Encodes tabular metadata into a standardized [N, 13] float32 numpy array:
      - Feature 0: Normalized age (age / 100.0, NaN imputed with 0.5403)
      - Features 1..3: One-hot encoded sex [female, male, unknown]
      - Features 4..12: One-hot encoded anatomical site [9 categories]
    """
    num_samples = len(df_meta)
    encoded = np.zeros((num_samples, METADATA_DIM), dtype=np.float32)
    
    # 1. Age (normalized to [0, 1])
    age_mean = 54.0285
    ages = df_meta['age_approx'].fillna(age_mean).values.astype(np.float32)
    encoded[:, 0] = np.clip(ages / 100.0, 0.0, 1.0)
    
    # 2. Sex one-hot (female=1, male=2, unknown=3)
    sex_values = df_meta['sex'].fillna('unknown').astype(str).str.lower().values
    for i, sex in enumerate(sex_values):
        if sex == 'female':
            encoded[i, 1] = 1.0
        elif sex == 'male':
            encoded[i, 2] = 1.0
        else:
            encoded[i, 3] = 1.0
            
    # 3. Anatomical site one-hot (9 categories)
    site_values = df_meta['anatom_site_general'].fillna('unknown').astype(str).str.lower().values
    site_to_idx = {site: idx + 4 for idx, site in enumerate(ANATOM_SITES)}
    for i, site in enumerate(site_values):
        col_idx = site_to_idx.get(site, site_to_idx['unknown'])
        encoded[i, col_idx] = 1.0
        
    return encoded


def find_image_path(base_dir: str, image_id: str) -> str:
    """
    Robust image resolver searching across potential directory structures.
    """
    candidates = [
        os.path.join(base_dir, "ISIC_2019_Training_Input", "ISIC_2019_Training_Input", f"{image_id}.jpg"),
        os.path.join(base_dir, "ISIC_2019_Training_Input", f"{image_id}.jpg"),
        os.path.join(base_dir, f"{image_id}.jpg"),
        os.path.join(r"C:\Users\reddy\OneDrive\Desktop\Model Skin\ISIC_2019_Training_Input\ISIC_2019_Training_Input", f"{image_id}.jpg"),
        os.path.join(r"C:\Users\reddy\OneDrive\Desktop\Model Skin\ISIC_2019_Training_Input", f"{image_id}.jpg")
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return candidates[0]


class ISIC2019Dataset(Dataset):
    def __init__(self, image_paths, metadata_vectors, labels, transform=None):
        self.image_paths = image_paths
        self.metadata_vectors = torch.tensor(metadata_vectors, dtype=torch.float32)
        self.labels = torch.tensor(labels, dtype=torch.long)
        self.transform = transform

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert('RGB')
        
        if self.transform:
            image = self.transform(image)
            
        meta = self.metadata_vectors[idx]
        label = self.labels[idx]
        
        return image, meta, label


def get_transforms():
    """
    Standard dermoscopic image preprocessing with clinical-grade augmentation.
    """
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=30),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, val_transform


def load_isic2019_data(data_dir: str, val_split: float = 0.20, random_state: int = 42):
    """
    Loads all 25,331 ISIC 2019 samples and performs stratified train/val split.
    """
    # Locate CSV files
    gt_candidates = [
        os.path.join(data_dir, "ISIC_2019_Training_GroundTruth.csv"),
        os.path.join(r"C:\Users\reddy\OneDrive\Desktop\Model Skin", "ISIC_2019_Training_GroundTruth.csv")
    ]
    meta_candidates = [
        os.path.join(data_dir, "ISIC_2019_Training_Metadata.csv"),
        os.path.join(r"C:\Users\reddy\OneDrive\Desktop\Model Skin", "ISIC_2019_Training_Metadata.csv")
    ]
    
    gt_path = next((p for p in gt_candidates if os.path.exists(p)), gt_candidates[0])
    meta_path = next((p for p in meta_candidates if os.path.exists(p)), meta_candidates[0])
    
    df_gt = pd.read_csv(gt_path)
    df_meta = pd.read_csv(meta_path)
    
    # Merge on image ID to ensure strict row alignment
    df_merged = pd.merge(df_gt, df_meta, on='image', how='inner')
    print(f"Total dataset size loaded: {len(df_merged)} samples across all 8 classes.")
    
    # Extract labels (argmax across 8 target classes)
    label_matrix = df_merged[CLASS_NAMES].values
    labels = np.argmax(label_matrix, axis=1)
    
    # Extract 13-dim metadata vector
    metadata_vectors = encode_metadata(df_merged)
    
    # Resolve all image paths
    image_paths = [find_image_path(data_dir, img_id) for img_id in df_merged['image']]
    
    # Perform Stratified Train / Validation Split
    sss = StratifiedShuffleSplit(n_splits=1, test_size=val_split, random_state=random_state)
    train_idx, val_idx = next(sss.split(image_paths, labels))
    
    train_img = [image_paths[i] for i in train_idx]
    train_meta = metadata_vectors[train_idx]
    train_labels = labels[train_idx]
    
    val_img = [image_paths[i] for i in val_idx]
    val_meta = metadata_vectors[val_idx]
    val_labels = labels[val_idx]
    
    print(f"Stratified Split: {len(train_img)} Train samples | {len(val_img)} Validation samples.")
    
    train_transform, val_transform = get_transforms()
    
    train_dataset = ISIC2019Dataset(train_img, train_meta, train_labels, transform=train_transform)
    val_dataset = ISIC2019Dataset(val_img, val_meta, val_labels, transform=val_transform)
    
    # Compute inverse class frequencies on training set for balanced EDL loss
    class_counts = np.bincount(train_labels, minlength=NUM_CLASSES)
    total_train = len(train_labels)
    class_weights = total_train / (NUM_CLASSES * np.maximum(class_counts, 1.0))
    class_weights = class_weights / np.mean(class_weights) # normalize mean to 1.0
    
    print("Class distribution & computed loss weights:")
    for idx, name in enumerate(CLASS_NAMES):
        print(f"  [{name}] Count: {class_counts[idx]:5d} | Weight: {class_weights[idx]:.4f}")
        
    return train_dataset, val_dataset, torch.tensor(class_weights, dtype=torch.float32)
