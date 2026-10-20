import os
import uuid
from fastapi import UploadFile, HTTPException
from backend.config import settings

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/bmp": ".bmp"
}

import base64

async def save_uploaded_scan(file: UploadFile) -> tuple[str, str, int, str]:
    """
    Validates and saves an uploaded scan image to disk and generates a persistent base64 representation.
    Returns: (saved_relative_path, original_filename, file_size_bytes, base64_uri)
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image MIME type: '{file.content_type}'. Allowed types: JPG, PNG, WEBP, BMP."
        )

    ext = ALLOWED_MIME_TYPES[file.content_type]
    unique_filename = f"scan_{uuid.uuid4().hex[:16]}{ext}"
    target_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES / (1024*1024):.1f} MB."
        )

    # Save to disk
    with open(target_path, "wb") as f:
        f.write(content)

    # Generate persistent base64 data URI so images survive container restarts
    b64_str = base64.b64encode(content).decode("utf-8")
    base64_uri = f"data:{file.content_type};base64,{b64_str}"

    return target_path, file.filename or "lesion_scan.jpg", file_size, base64_uri
