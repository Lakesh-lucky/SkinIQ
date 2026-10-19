import pandas as pd
import numpy as np

meta_path = r"C:\Users\reddy\OneDrive\Desktop\Model Skin\ISIC_2019_Training_Metadata.csv"
df_meta = pd.read_csv(meta_path)

print("Columns:", df_meta.columns.tolist())
print("\nSex values:")
print(df_meta['sex'].value_counts(dropna=False))

print("\nAnatomical Site values:")
print(df_meta['anatom_site_general'].value_counts(dropna=False))

print("\nAge stats:")
print(df_meta['age_approx'].describe())
print("Age null count:", df_meta['age_approx'].isna().sum())
