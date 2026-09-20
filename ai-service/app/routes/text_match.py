import os
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import TextMatchRequest, TextMatchResponse
from app.services.text_service import text_engine

router = APIRouter(prefix="/api/ai", tags=["AI NLP Text Semantic Matching Engine"])

@router.post(
    "/text-match",
    response_model=TextMatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Real NLP Semantic Text Similarity Comparison",
)
async def match_text_descriptions(req: TextMatchRequest):
    """
    Analyzes two text descriptions using a pretrained SentenceTransformer NLP model ('all-MiniLM-L6-v2'):
    1. Validates text inputs (non-empty, non-null, maximum length 5000 characters).
    2. Generates 384-dimensional L2-normalized dense semantic vector embeddings.
    3. Computes real Cosine Similarity score between sentence embeddings.
    4. Evaluates semantic match classification against configurable TEXT_MATCH_THRESHOLD.

    NO mock AI scores, NO random similarity values, and NO fake candidate data are used.
    """
    # 1. Validate Input Text 1
    if not req.text1 or not req.text1.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Description text 1 ('text1') cannot be empty or whitespace-only."
        )

    if len(req.text1) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Description text 1 ('text1') exceeds maximum length of 5000 characters ({len(req.text1)} chars)."
        )

    # 2. Validate Input Text 2
    if not req.text2 or not req.text2.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Description text 2 ('text2') cannot be empty or whitespace-only."
        )

    if len(req.text2) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Description text 2 ('text2') exceeds maximum length of 5000 characters ({len(req.text2)} chars)."
        )

    # 3. Generate 384-dimensional dense semantic embeddings & compute Cosine Similarity
    try:
        emb1 = text_engine.extract_text_embedding(req.text1)
        emb2 = text_engine.extract_text_embedding(req.text2)

        similarity_score = text_engine.compute_cosine_similarity(emb1, emb2)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during NLP semantic embedding extraction: {str(e)}"
        )

    # 4. Evaluate Threshold & Match Classification
    threshold = float(os.getenv("TEXT_MATCH_THRESHOLD", "0.70"))
    possible_match = similarity_score >= threshold
    match_status = "POSSIBLE_SEMANTIC_MATCH" if possible_match else "UNLIKELY_SEMANTIC_MATCH"

    return TextMatchResponse(
        success=True,
        similarityScore=similarity_score,
        possibleMatch=possible_match,
        matchStatus=match_status,
        threshold=threshold,
        text1Length=len(req.text1),
        text2Length=len(req.text2),
        message="Real NLP semantic text similarity comparison completed successfully."
    )
