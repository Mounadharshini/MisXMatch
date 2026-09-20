from fastapi import APIRouter, HTTPException, status
from app.models.schemas import LocationMatchRequest, LocationMatchResponse, ErrorDetailResponse
from app.services.location_service import LocationMatchService

router = APIRouter(
    prefix="/api/ai",
    tags=["Location Matching"],
)

location_service = LocationMatchService()

@router.post(
    "/location-match",
    response_model=LocationMatchResponse,
    responses={
        400: {"model": ErrorDetailResponse, "description": "Invalid coordinates or bounds error"},
        500: {"model": ErrorDetailResponse, "description": "Internal server error"},
    },
    summary="Calculate Haversine Distance & Geographic Location Relevance",
    description="Accepts location coordinates for two reports, validates bounds, calculates Haversine distance, and computes continuous relevance score.",
)
async def calculate_location_match(payload: LocationMatchRequest):
    try:
        # Validate latitude and longitude bounds if provided
        for loc_name, loc_obj in [("location1", payload.location1), ("location2", payload.location2)]:
            if loc_obj is not None:
                if loc_obj.latitude is not None:
                    if not (-90.0 <= loc_obj.latitude <= 90.0):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"'{loc_name}.latitude' must be between -90.0 and 90.0 degrees. Received: {loc_obj.latitude}"
                        )
                if loc_obj.longitude is not None:
                    if not (-180.0 <= loc_obj.longitude <= 180.0):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"'{loc_name}.longitude' must be between -180.0 and 180.0 degrees. Received: {loc_obj.longitude}"
                        )

        # Evaluate location relevance
        result = location_service.evaluate_location_match(payload.location1, payload.location2)
        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during location relevance comparison: {str(e)}"
        )
