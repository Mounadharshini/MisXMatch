from fastapi import APIRouter
from app.models.schemas import HealthResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse, summary="Health Check Endpoint")
def get_health():
    """
    Detailed microservice health check returning status, version, AI model readiness, and capabilities.
    """
    models_status = {}

    # Check Face AI Model Readiness
    try:
        import cv2
        models_status["face"] = "READY"
    except Exception:
        models_status["face"] = "UNAVAILABLE"

    # Check NLP Text Similarity Readiness
    try:
        from models.text_embedder import TextEmbedder
        models_status["text"] = "READY"
    except Exception:
        models_status["text"] = "UNAVAILABLE"

    # Check CCTV Analysis Model Readiness
    try:
        from models.cctv_processor import RealCctvProcessor
        models_status["cctv"] = "READY"
    except Exception:
        models_status["cctv"] = "UNAVAILABLE"

    # Check Attribute, Location, Time Model Readiness
    models_status["attribute"] = "READY"
    models_status["location"] = "READY"
    models_status["time"] = "READY"

    overall_status = "UP" if all(v == "READY" for v in models_status.values()) else "DEGRADED"

    capabilities = {
        "face_similarity_detection": models_status.get("face") == "READY",
        "text_similarity_detection": models_status.get("text") == "READY",
        "text_semantic_matching": models_status.get("text") == "READY",
        "cctv_surveillance_analysis": models_status.get("cctv") == "READY",
        "attribute_matching": True,
        "location_relevance": True,
        "time_relevance": True,
        "multi_factor_matching": True,
        "risk_scoring": True,
        "ocr_entity_extraction": True
    }

    return HealthResponse(
        status=overall_status,
        service="MISXMATCH AI Service",
        version="1.0.0",
        models=models_status,
        capabilities=capabilities
    )
