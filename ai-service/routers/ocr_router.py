import time
from fastapi import APIRouter, Request, HTTPException, UploadFile, File
from typing import Optional
from models.ocr_engine import OCREngine

router = APIRouter(tags=["OCR & Document Processing"])
ocr_engine = OCREngine()

@router.post("/ocr", summary="Extract OCR Text and Structured Entities from Intake Document")
async def process_ocr_document(request: Request, file: Optional[UploadFile] = File(None)):
    """
    Accepts scanned missing person intake document image (JPEG, PNG, WebP)
    and extracts raw text and structured case entities (FIR, Name, Age, Gender, Location, Date).
    """
    start_time = time.time()
    try:
        if file is not None:
            doc_bytes = await file.read()
        else:
            doc_bytes = await request.body()

        if not doc_bytes:
            raise HTTPException(status_code=400, detail="Empty image payload received.")

        result = ocr_engine.extract_text_and_entities(doc_bytes)
        execution_time_ms = round((time.time() - start_time) * 1000.0, 2)
        result["execution_time_ms"] = execution_time_ms
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
