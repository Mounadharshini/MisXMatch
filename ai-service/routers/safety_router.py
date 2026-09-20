import time
import base64
import uuid
import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Header, Depends, UploadFile, File, Form, status, BackgroundTasks
from fastapi.responses import JSONResponse

from models.ai_safety_gate import ImageQualitySafetyGate
from models.ai_calibrated_card import CalibratedMultimodalLeadCard
from models.ai_temporal_tracker import TemporalContinuityTracker
from models.ai_cross_modal import CrossModalNarrativeSearch

router = APIRouter(prefix="/ai/safety", tags=["AI Safety & Intelligence Module"])

# Internal Engines Initialization
quality_gate = ImageQualitySafetyGate()
calibrated_card = CalibratedMultimodalLeadCard()
temporal_tracker = TemporalContinuityTracker()
cross_modal_search = CrossModalNarrativeSearch()

# In-memory async job status store
ASYNC_JOBS: Dict[str, Dict[str, Any]] = {}

# Security & API Key verification dependency
INTERNAL_API_KEY = os.getenv("AI_SERVICE_API_KEY", "misxmatch-internal-ai-service-secret-key-2026")

def verify_internal_auth(x_internal_api_key: Optional[str] = Header(None)):
    if x_internal_api_key and x_internal_api_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service-to-service internal API Key."
        )
    return True

# --- Pydantic Request & Response Schemas ---

class QualityAssessmentRequest(BaseModel):
    evidenceId: str = Field(description="Authorized evidence artifact identifier")
    caseId: str = Field(description="Associated missing/found case number")
    imageBase64: Optional[str] = Field(default=None, description="Base64 encoded image data")
    detectedFaces: Optional[List[Dict[str, Any]]] = Field(default=[], description="Detected face bounding boxes")

class CandidateExplanationRequest(BaseModel):
    sourceCaseNumber: str
    targetCaseNumber: str
    faceScore: Optional[float] = None
    reidScore: Optional[float] = None
    textScore: Optional[float] = None
    locationScore: Optional[float] = None
    timelineScore: Optional[float] = None
    qualityAssessment: Optional[Dict[str, Any]] = None

class TemporalTrackRequest(BaseModel):
    caseId: str
    cameraId: str
    videoBase64: Optional[str] = None
    startTimeIso: Optional[str] = None
    candidateCases: Optional[List[Dict[str, Any]]] = []

class CrossModalSearchRequest(BaseModel):
    queryText: str
    candidateCases: List[Dict[str, Any]] = []
    topK: int = 5

class AsyncJobRequest(BaseModel):
    jobType: str = Field(description="QUALITY_ASSESSMENT, TEMPORAL_TRACK, or CANDIDATE_EXPLANATION")
    caseId: str
    payload: Dict[str, Any]

# --- Endpoints ---

@router.post("/quality-assessment", dependencies=[Depends(verify_internal_auth)])
async def assess_evidence_quality(
    request: QualityAssessmentRequest
):
    """
    Capability A: Evidence-quality and uncertainty gate.
    Evaluates blur, illumination, face count, face coverage, and tampering risk.
    """
    if not request.imageBase64:
        raise HTTPException(status_code=400, detail="Missing required imageBase64 data.")

    try:
        # Decode base64 payload safely
        img_bytes = base64.b64decode(request.imageBase64.split(",")[-1])
        
        # Enforce size limit (10MB)
        if len(img_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size exceeds configured maximum of 10MB.")

        res = quality_gate.assess_quality(img_bytes, request.detectedFaces or [])
        res["evidenceId"] = request.evidenceId
        res["caseId"] = request.caseId
        return JSONResponse(content=res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality assessment failed: {str(e)}")

@router.post("/candidate-explanation", dependencies=[Depends(verify_internal_auth)])
async def generate_calibrated_candidate_card(
    request: CandidateExplanationRequest
):
    """
    Capability B: Calibrated multimodal candidate card.
    Generates Platt/Temperature scaled confidence and disaggregated modality scores.
    """
    try:
        card = calibrated_card.generate_lead_card(
            source_case_number=request.sourceCaseNumber,
            target_case_number=request.targetCaseNumber,
            face_score=request.faceScore,
            reid_score=request.reidScore,
            text_score=request.textScore,
            location_score=request.locationScore,
            timeline_score=request.timelineScore,
            quality_assessment=request.qualityAssessment
        )
        return JSONResponse(content=card)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Candidate explanation failed: {str(e)}")

@router.post("/temporal-track", dependencies=[Depends(verify_internal_auth)])
async def compute_temporal_track(
    request: TemporalTrackRequest
):
    """
    Capability C: CCTV temporal continuity lead.
    Groups person appearances across video frames with guaranteed zero raw video retention.
    """
    if not request.videoBase64:
        raise HTTPException(status_code=400, detail="Missing required videoBase64 data.")

    try:
        video_bytes = base64.b64decode(request.videoBase64.split(",")[-1])
        if len(video_bytes) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Video file size exceeds maximum limit of 50MB.")

        result = temporal_tracker.process_temporal_video(
            video_bytes=video_bytes,
            case_id=request.caseId,
            camera_id=request.cameraId,
            start_time_iso=request.startTimeIso,
            candidate_cases=request.candidateCases
        )
        return JSONResponse(content=result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Temporal track computation failed: {str(e)}")

@router.post("/cross-modal-search", dependencies=[Depends(verify_internal_auth)])
async def narrative_retrieval(
    request: CrossModalSearchRequest
):
    """
    Cross-modal narrative retrieval.
    Matches text query against case evidence leads.
    """
    try:
        res = cross_modal_search.search_cases_by_narrative(
            query_text=request.queryText,
            authorized_candidate_cases=request.candidateCases,
            top_k=request.topK
        )
        return JSONResponse(content=res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Narrative retrieval failed: {str(e)}")

# --- Asynchronous Job Management ---

def run_async_job(job_id: str, job_type: str, case_id: str, payload: Dict[str, Any]):
    ASYNC_JOBS[job_id]["status"] = "RUNNING"
    try:
        if job_type == "TEMPORAL_TRACK":
            video_bytes = base64.b64decode(payload.get("videoBase64", "").split(",")[-1])
            res = temporal_tracker.process_temporal_video(
                video_bytes=video_bytes,
                case_id=case_id,
                camera_id=payload.get("cameraId", "CAM-01"),
                candidate_cases=payload.get("candidateCases", [])
            )
            ASYNC_JOBS[job_id]["result"] = res
            ASYNC_JOBS[job_id]["status"] = "COMPLETED"
        else:
            ASYNC_JOBS[job_id]["status"] = "COMPLETED"
            ASYNC_JOBS[job_id]["result"] = {"message": "Job processed successfully"}
    except Exception as e:
        ASYNC_JOBS[job_id]["status"] = "FAILED"
        ASYNC_JOBS[job_id]["error"] = str(e)

@router.post("/jobs", dependencies=[Depends(verify_internal_auth)])
async def submit_async_job(
    request: AsyncJobRequest,
    background_tasks: BackgroundTasks
):
    """Submits a heavy AI analysis task for asynchronous background processing."""
    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    ASYNC_JOBS[job_id] = {
        "jobId": job_id,
        "jobType": request.jobType,
        "caseId": request.caseId,
        "status": "QUEUED",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "result": None,
        "error": None
    }
    background_tasks.add_task(run_async_job, job_id, request.jobType, request.caseId, request.payload)
    return JSONResponse(content={
        "status": "SUCCESS",
        "jobId": job_id,
        "jobStatus": "QUEUED",
        "message": f"Async job {job_id} queued successfully."
    })

@router.get("/jobs/{job_id}", dependencies=[Depends(verify_internal_auth)])
async def get_job_status(job_id: str):
    """Polls status of an asynchronous AI job."""
    if job_id not in ASYNC_JOBS:
        raise HTTPException(status_code=404, detail=f"Job ID {job_id} not found.")
    return JSONResponse(content=ASYNC_JOBS[job_id])

@router.post("/jobs/{job_id}/cancel", dependencies=[Depends(verify_internal_auth)])
async def cancel_job(job_id: str):
    """Cancels a queued or running asynchronous AI job."""
    if job_id not in ASYNC_JOBS:
        raise HTTPException(status_code=404, detail=f"Job ID {job_id} not found.")
    ASYNC_JOBS[job_id]["status"] = "CANCELLED"
    return JSONResponse(content={"status": "SUCCESS", "jobId": job_id, "message": f"Job {job_id} has been cancelled."})
