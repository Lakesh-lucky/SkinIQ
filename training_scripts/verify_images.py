import os
import pandas as pd
from PIL import Image

data_dir = r"C:\Users\reddy\OneDrive\Desktop\Model Skin"
input_dir = os.path.join(data_dir, "ISIC_2019_Training_Input", "ISIC_2019_Training_Input")
gt_path = os.path.join(data_dir, "ISIC_2019_Training_GroundTruth.csv")
meta_path = os.path.join(data_dir, "ISIC_2019_Training_Metadata.csv")

df_gt = pd.read_csv(gt_path)
df_meta = pd.read_csv(meta_path)

print(f"Ground truth rows: {len(df_gt)}")
print(f"Metadata rows: {len(df_meta)}")

# Check image existence
missing_imgs = 0
for idx, img_id in enumerate(df_gt['image']):
    img_path = os.path.join(input_dir, f"{img_id}.jpg")
    if not os.path.exists(img_path):
        missing_imgs += 1
        if missing_imgs <= 5:
            print(f"Missing image: {img_path}")

print(f"Total missing images: {missing_imgs} / {len(df_gt)}")

# Test opening first image
sample_img_path = os.path.join(input_dir, f"{df_gt['image'].iloc[0]}.jpg")
with Image.open(sample_img_path) as img:
    print(f"Successfully loaded sample image: {sample_img_path}, size={img.size}, mode={img.mode}")
