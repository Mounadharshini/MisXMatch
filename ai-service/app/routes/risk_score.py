from fastapi import APIRouter, HTTPException, status
from app.models.schemas import RiskScoreRequest, RiskScoreResponse, ErrorDetailResponse
from app.services.risk_service import RiskScoringService

router = APIRouter(
    prefix="/api/ai",
    tags=["Risk Scoring & Case Prioritization"],
)

risk_service = RiskScoringService()

@router.post(
    "/risk-score",
    response_model=RiskScoreResponse,
    responses={
        400: {"model": ErrorDetailResponse, "description": "Invalid case parameters or numerical bounds error"},
        500: {"model": ErrorDetailResponse, "description": "Internal server error"},
    },
    summary="Calculate AI-Based Case Risk & Prioritization Score",
    description="Accepts missing-person dossier details, evaluates age vulnerability, case duration, medical conditions, danger indicators, and sighting recency to produce an explainable risk score and priority classification.",
)
async def calculate_risk_score(payload: RiskScoreRequest):
    try:
        result = risk_service.evaluate_risk(payload)
        return result

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during risk scoring assessment: {str(e)}"
        )
