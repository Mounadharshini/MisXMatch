from fastapi import APIRouter, HTTPException, status
from app.models.schemas import TimeMatchRequest, TimeMatchResponse, ErrorDetailResponse
from app.services.time_service import TimeMatchService

router = APIRouter(
    prefix="/api/ai",
    tags=["Time Matching"],
)

time_service = TimeMatchService()

@router.post(
    "/time-match",
    response_model=TimeMatchResponse,
    responses={
        400: {"model": ErrorDetailResponse, "description": "Invalid timestamp format error"},
        500: {"model": ErrorDetailResponse, "description": "Internal server error"},
    },
    summary="Calculate Time Difference & Temporal Proximity Relevance",
    description="Accepts ISO 8601 timestamps for two reports, normalizes timezones to UTC, calculates time difference, and computes continuous relevance score.",
)
async def calculate_time_match(payload: TimeMatchRequest):
    try:
        result = time_service.evaluate_time_match(payload.time1, payload.time2)
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
            detail=f"An unexpected error occurred during time relevance comparison: {str(e)}"
        )
