from fastapi import APIRouter, File, UploadFile, HTTPException, status
from app.models.schemas import ImageMatchResultResponse
from app.services.image_service import ImageMatchService

router = APIRouter(prefix="/api/ai", tags=["AI Face Matching Engine"])

@router.post(
    "/image-match",
    response_model=ImageMatchResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Real AI Face Detection & Similarity Matching",
)
async def match_faces(
    image1: UploadFile = File(..., description="First image file containing a face (e.g. missing person reference photo)"),
    image2: UploadFile = File(..., description="Second image file containing a face (e.g. sighting or hospital intake photo)"),
):
    """
    Analyzes two uploaded image files using real AI computer vision:
    1. Validates image inputs (formats JPG, PNG, WEBP, BMP, file size & header integrity).
    2. Detects face bounding boxes in both images.
    3. Extracts 512-dimensional L2-normalized spatial feature embeddings.
    4. Computes real Cosine Similarity score between normalized vectors.
    5. Evaluates match classification against configurable FACE_MATCH_THRESHOLD.

    NO mock AI scores, NO random similarity values, and NO fake candidate data are used.
    """
    try:
        result = await ImageMatchService.process_face_match(image1, image2)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during face AI similarity analysis: {str(e)}"
        )
