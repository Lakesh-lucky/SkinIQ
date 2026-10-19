import os
import glob
import pandas as pd

possible_paths = [
    r"C:\Users\reddy\OneDrive\Desktop\Model ai model train folder For using website\data",
    r"C:\Users\reddy\OneDrive\Desktop\Model ai model train folder For using website",
    r"C:\Users\reddy\OneDrive\Desktop\Model Skin",
    r"C:\Users\reddy\Downloads"
]

print("=== Checking Paths ===")
for p in possible_paths:
    exists = os.path.exists(p)
    print(f"Path: '{p}' -> Exists: {exists}")
    if exists:
        files = os.listdir(p)
        print(f"  Contents ({len(files)} items): {files[:10]}")

# If Model Skin exists, check ISIC_2019_Training_Input
model_skin = r"C:\Users\reddy\OneDrive\Desktop\Model Skin"
if os.path.exists(model_skin):
    input_dir = os.path.join(model_skin, "ISIC_2019_Training_Input")
    if os.path.exists(input_dir):
        sub_items = os.listdir(input_dir)
        print(f"\nISIC_2019_Training_Input contains {len(sub_items)} items.")
        if len(sub_items) < 10:
            print("Items inside ISIC_2019_Training_Input:", sub_items)
            for item in sub_items:
                subpath = os.path.join(input_dir, item)
                if os.path.isdir(subpath):
                    print(f"  Subdirectory '{item}' contains {len(os.listdir(subpath))} files")

    gt_path = os.path.join(model_skin, "ISIC_2019_Training_GroundTruth.csv")
    meta_path = os.path.join(model_skin, "ISIC_2019_Training_Metadata.csv")
    if os.path.exists(gt_path):
        df_gt = pd.read_csv(gt_path)
        print("\nGroundTruth shape:", df_gt.shape)
        print("GroundTruth columns:", list(df_gt.columns))
        print("Class distributions:")
        print(df_gt.iloc[:, 1:].sum())
    if os.path.exists(meta_path):
        df_meta = pd.read_csv(meta_path)
        print("\nMetadata shape:", df_meta.shape)
        print("Metadata columns:", list(df_meta.columns))
        print(df_meta.head())
