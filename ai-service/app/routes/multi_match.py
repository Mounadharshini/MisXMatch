from fastapi import APIRouter, HTTPException, status
from app.models.schemas import MultiMatchRequest, MultiMatchResponse, ErrorDetailResponse
from app.services.multi_match_service import MultiMatchService

router = APIRouter(
    prefix="/api/ai",
    tags=["Multi-Factor Matching"],
)

multi_match_service = MultiMatchService()

@router.post(
    "/multi-match",
    response_model=MultiMatchResponse,
    responses={
        400: {"model": ErrorDetailResponse, "description": "Invalid input or validation error"},
        500: {"model": ErrorDetailResponse, "description": "Internal server error"},
    },
    summary="Multi-Factor AI Matching Engine",
    description="Combines Face Similarity, NLP Text Similarity, Structured Attributes, Location Relevance, and Time Relevance into an overall explainable score.",
)
async def calculate_multi_match(payload: MultiMatchRequest):
    try:
        # Validate coordinates bounds if location is provided
        for p_name, p_rec in [("person1", payload.person1), ("person2", payload.person2)]:
            if p_rec and p_rec.location:
                loc = p_rec.location
                if loc.latitude is not None:
                    if not (-90.0 <= loc.latitude <= 90.0):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"'{p_name}.location.latitude' must be between -90.0 and 90.0 degrees."
                        )
                if loc.longitude is not None:
                    if not (-180.0 <= loc.longitude <= 180.0):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"'{p_name}.location.longitude' must be between -180.0 and 180.0 degrees."
                        )

        result = multi_match_service.evaluate_multi_match(payload.person1, payload.person2)
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
            detail=f"An unexpected error occurred during multi-factor AI matching: {str(e)}"
        )
