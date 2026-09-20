import os
import json
import base64
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Header, Depends, UploadFile, File, Form, status
from fastapi.responses import JSONResponse

from models.cctv_processor import RealCctvProcessor

logger = logging.getLogger("CctvRouter")

router = APIRouter(tags=["Real CCTV / Video Evidence Analysis Module"])

# Initialize CCTV processor instance (loads models once at startup)
cctv_processor = RealCctvProcessor()

INTERNAL_API_KEY = os.getenv("AI_SERVICE_API_KEY", "misxmatch-internal-ai-service-secret-key-2026")

def verify_internal_auth(x_internal_api_key: Optional[str] = Header(None)):
    if x_internal_api_key and x_internal_api_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service-to-service internal API Key."
        )
    return True

class CctvAnalysisRequest(BaseModel):
    caseId: Optional[str] = Field(default=None, description="Source case number")
    mediaType: Optional[str] = Field(default="video", description="image or video")
    mediaBase64: Optional[str] = Field(default=None, description="Base64 encoded media data")
    mediaUrl: Optional[str] = Field(default=None, description="URL to media artifact")
    candidateRecords: Optional[List[Dict[str, Any]]] = Field(default=[], description="Authorized candidate missing person records")
    sampleIntervalSec: Optional[float] = Field(default=1.0, description="Sampling interval in seconds for video processing")

@router.post("/api/ai/cctv/analyze", dependencies=[Depends(verify_internal_auth)])
@router.post("/ai/cctv/analyze", dependencies=[Depends(verify_internal_auth)])
async def analyze_cctv_media(
    request: Optional[CctvAnalysisRequest] = None,
    file: Optional[UploadFile] = File(None),
    caseId: Optional[str] = Form(None),
    candidateRecordsJson: Optional[str] = Form(None),
    sampleIntervalSec: Optional[float] = Form(1.0)
):
    """
    Real CCTV / Video Evidence AI Analysis Endpoint.
    
    Processes uploaded CCTV image or video media with pretrained OpenCV computer vision person detection,
    frame sampling, face biometrics, and candidate matching against authorized missing-person records.
    """
    candidate_records = []
    sample_interval = 1.0

    media_input = None

    # Option 1: File Upload (Multipart Form Data)
    if file:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded CCTV media file is empty.")
        if len(file_bytes) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="CCTV media file size exceeds maximum limit of 50MB.")
        media_input = file_bytes
        if candidateRecordsJson:
            try:
                candidate_records = json.loads(candidateRecordsJson)
            except Exception:
                pass
        if sampleIntervalSec:
            sample_interval = sampleIntervalSec

    # Option 2: JSON Payload (Base64 or URL)
    elif request:
        if request.candidateRecords:
            candidate_records = request.candidateRecords
        if request.sampleIntervalSec:
            sample_interval = request.sampleIntervalSec

        if request.mediaBase64:
            try:
                raw_b64 = request.mediaBase64.split(",")[-1]
                media_input = base64.b64decode(raw_b64)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid base64 media encoding: {str(e)}")
        elif request.mediaUrl:
            media_input = request.mediaUrl

    if not media_input:
        raise HTTPException(status_code=400, detail="Missing required CCTV media input (file, mediaBase64, or mediaUrl).")

    try:
        # Configurable frame interval from environment or parameter
        env_interval = os.getenv("CCTV_FRAME_INTERVAL")
        if env_interval:
            try:
                sample_interval = float(env_interval)
            except Exception:
                pass

        result = cctv_processor.process_cctv_media(
            media_input=media_input,
            candidate_records=candidate_records,
            sample_interval_sec=sample_interval
        )
        return JSONResponse(content=result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"CCTV AI media analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CCTV AI analysis service error: {str(e)}")
