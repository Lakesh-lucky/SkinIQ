import os
import psutil
import multiprocessing

print("CPU Count (physical/logical):", os.cpu_count())
try:
    ram_gb = psutil.virtual_memory().total / (1024**3)
    ram_avail_gb = psutil.virtual_memory().available / (1024**3)
    print(f"Total RAM: {ram_gb:.2f} GB | Available RAM: {ram_avail_gb:.2f} GB")
except Exception as e:
    print("psutil error:", e)
