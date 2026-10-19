"""
Root Entrypoint for DermaClass-Net Unified Application.
Delegates to backend.app.
"""
import sys
import uvicorn
from backend.app import app
from backend.config import settings

if __name__ == "__main__":
    print(f"Starting {settings.PROJECT_NAME} on http://0.0.0.0:{settings.PORT} ...")
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
