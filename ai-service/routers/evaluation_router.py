from fastapi import APIRouter, HTTPException, Query, status
from typing import Dict, Any, Optional

from app.evaluation.evaluator import AiEvaluator
from app.evaluation.calibration import THRESHOLDS_CONFIG, MODEL_VERSIONS, DEFAULT_MULTI_FACTOR_WEIGHTS, validate_weights, global_latency_tracker

router = APIRouter(prefix="/api/ai/evaluation", tags=["AI Model Evaluation & Calibration"])

@router.get("/all", summary="Get Complete AI System Evaluation Suite Report")
def get_full_evaluation_report(
    face_threshold: float = Query(0.75, ge=0.50, le=0.95),
    text_threshold: float = Query(0.65, ge=0.40, le=0.90)
):
    """
    Returns complete statistical evaluation report for Face, Text NLP, Attributes,
    Location/Time Calibration, Multi-Factor Fusion, Risk Model, and System Latency.
    """
    try:
        report = AiEvaluator.evaluate_full_suite()
        report["face_evaluation"] = AiEvaluator.evaluate_face_biometrics(face_threshold)
        report["text_nlp_evaluation"] = AiEvaluator.evaluate_text_nlp(text_threshold)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate evaluation report: {str(e)}"
        )

@router.get("/face", summary="Get Face Biometrics Model Evaluation Metrics")
def get_face_evaluation(threshold: float = Query(0.75, ge=0.50, le=0.95)):
    return AiEvaluator.evaluate_face_biometrics(threshold)

@router.get("/text", summary="Get NLP Text Model Evaluation Metrics")
def get_text_evaluation(threshold: float = Query(0.65, ge=0.40, le=0.90)):
    return AiEvaluator.evaluate_text_nlp(threshold)

@router.get("/attributes", summary="Get Structured Attribute Match Evaluation")
def get_attribute_evaluation():
    return AiEvaluator.evaluate_attributes()

@router.get("/location-time", summary="Get Location & Time Decay Calibration Functions")
def get_location_time_calibration():
    return AiEvaluator.evaluate_location_time()

@router.get("/multi-factor", summary="Get Multi-Factor Weight Calibration Metrics")
def get_multi_factor_calibration():
    return AiEvaluator.evaluate_multi_factor()

@router.get("/risk", summary="Get Vulnerability Risk Scoring Model Evaluation")
def get_risk_evaluation():
    return AiEvaluator.evaluate_risk_scoring()

@router.get("/calibration", summary="Get Threshold & Model Version Metadata")
def get_calibration_metadata():
    return {
        "model_versions": MODEL_VERSIONS,
        "thresholds_configuration": THRESHOLDS_CONFIG,
        "multi_factor_weights": DEFAULT_MULTI_FACTOR_WEIGHTS,
        "weight_validation": validate_weights(DEFAULT_MULTI_FACTOR_WEIGHTS)
    }

@router.get("/performance", summary="Get System AI Latency Telemetry Summary")
def get_performance_telemetry():
    return global_latency_tracker.get_performance_summary()
