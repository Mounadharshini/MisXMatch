from fastapi import APIRouter, HTTPException, status
from app.models.schemas import AttributeMatchRequest, AttributeMatchResponse
from app.services.attribute_service import AttributeMatchService

router = APIRouter(prefix="/api/ai", tags=["AI Structured Attribute Matching Engine"])

@router.post(
    "/attribute-match",
    response_model=AttributeMatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Structured Person Attribute Similarity Comparison",
)
async def match_person_attributes(req: AttributeMatchRequest):
    """
    Compares structured person records (age, gender, height, clothing, hair, skinTone):
    1. Validates numerical values (age [0..130], height [0..250] cm).
    2. Calculates continuous tolerance decay scores for age and height.
    3. Normalizes categorical values for gender and skin tone.
    4. Reuses Step 3 NLP SentenceTransformer embeddings for clothing & hair text comparisons.
    5. Excludes missing/unknown fields ('UNKNOWN') from weighted score denominator without penalty.
    6. Calculates overall weighted similarity score against ATTRIBUTE_MATCH_THRESHOLD.

    NO mock AI scores, NO random similarity values, and NO fake candidate data are used.
    """
    if not req or not req.person1 or not req.person2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required request body with 'person1' and 'person2' attribute records."
        )

    # Validate numerical boundaries
    if req.person1.age is not None and (req.person1.age < 0 or req.person1.age > 130):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid age value {req.person1.age} for person1. Age must be between 0 and 130 years."
        )
    if req.person2.age is not None and (req.person2.age < 0 or req.person2.age > 130):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid age value {req.person2.age} for person2. Age must be between 0 and 130 years."
        )

    if req.person1.height is not None and (req.person1.height < 0 or req.person1.height > 250):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid height value {req.person1.height} cm for person1. Height must be between 0 and 250 cm."
        )
    if req.person2.height is not None and (req.person2.height < 0 or req.person2.height > 250):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid height value {req.person2.height} cm for person2. Height must be between 0 and 250 cm."
        )

    try:
        result = AttributeMatchService.evaluate_attribute_match(req.person1, req.person2)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during structured attribute matching: {str(e)}"
        )
