import io
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from typing import Dict, Any

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
}

ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP", "BMP"}

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

async def validate_image_file(file: UploadFile, file_param_name: str) -> Dict[str, Any]:
    """
    Validates uploaded image file for presence, size, MIME type, and Pillow binary integrity.
    Returns metadata dictionary upon successful verification.
    Raises HTTPException(400) on validation errors.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required image input parameter: '{file_param_name}'."
        )

    # Read binary content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read input stream for '{file_param_name}': {str(e)}"
        )

    # Check for empty file
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Empty image file provided for '{file_param_name}' (0 bytes)."
        )

    # Check file size limit
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size for '{file_param_name}' exceeds maximum limit of 15MB."
        )

    # Validate image header and integrity using Pillow
    try:
        image_stream = io.BytesIO(content)
        with Image.open(image_stream) as img:
            img.verify()  # Verifies file header & data integrity
            format_name = (img.format or "").upper()
            width, height = img.size

        # Re-open stream for dimension reading (verify closes stream)
        image_stream.seek(0)
        with Image.open(image_stream) as img:
            width, height = img.size

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted image file provided for '{file_param_name}'. Format could not be decoded."
        )

    # Validate format against allowed set
    if format_name not in ALLOWED_PIL_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{format_name}' for '{file_param_name}'. Supported formats are: JPEG, PNG, WEBP, BMP."
        )

    return {
        "filename": file.filename,
        "content_type": file.content_type or f"image/{format_name.lower()}",
        "size_bytes": len(content),
        "format": format_name,
        "dimensions": (width, height),
    }
