import time
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Body
from typing import Optional, Dict, Any, List
from models.face_embedder import FaceEmbedder
from models.reid_embedder import ReIDEmbedder
from models.text_embedder import TextEmbedder

router = APIRouter(tags=["Biometric Embedding & Detection"])

_face_embedder: Optional[FaceEmbedder] = None
_reid_embedder: Optional[ReIDEmbedder] = None
_text_embedder: Optional[TextEmbedder] = None

def get_face_embedder() -> FaceEmbedder:
    global _face_embedder
    if _face_embedder is None:
        _face_embedder = FaceEmbedder()
    return _face_embedder

def get_reid_embedder() -> ReIDEmbedder:
    global _reid_embedder
    if _reid_embedder is None:
        _reid_embedder = ReIDEmbedder()
    return _reid_embedder

def get_text_embedder() -> TextEmbedder:
    global _text_embedder
    if _text_embedder is None:
        _text_embedder = TextEmbedder()
    return _text_embedder

@router.post("/embed/face", summary="Extract 512-d Facial Embedding")
async def extract_face_embedding(request: Request, file: Optional[UploadFile] = File(None)):
    start_time = time.time()
    try:
        if file is not None:
            img_input = await file.read()
        else:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                payload = await request.json()
                img_input = payload.get("image_path") or payload.get("image_base64") or payload.get("image") or payload.get("imageUrl") or payload.get("photo_url")
                if not img_input:
                    raise HTTPException(status_code=400, detail="Empty image payload received in JSON.")
            else:
                img_bytes = await request.body()
                if not img_bytes:
                    raise HTTPException(status_code=400, detail="Empty image payload received.")
                img_input = img_bytes
        
        embedder = get_face_embedder()
        res = embedder.compute_embedding(img_input)
        res["status"] = "SUCCESS"
        res["execution_time_ms"] = round((time.time() - start_time) * 1000.0, 2)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face embedding failed: {str(e)}")

@router.post("/embed/reid", summary="Extract 512-d Person Re-ID Embedding")
async def extract_reid_embedding(request: Request, file: Optional[UploadFile] = File(None)):
    start_time = time.time()
    try:
        if file is not None:
            img_input = await file.read()
        else:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                payload = await request.json()
                img_input = payload.get("image_path") or payload.get("image_base64") or payload.get("image") or payload.get("imageUrl") or payload.get("photo_url")
                if not img_input:
                    raise HTTPException(status_code=400, detail="Empty image payload received in JSON.")
            else:
                img_bytes = await request.body()
                if not img_bytes:
                    raise HTTPException(status_code=400, detail="Empty image payload received.")
                img_input = img_bytes

        embedder = get_reid_embedder()
        res = embedder.compute_embedding(img_input)
        res["status"] = "SUCCESS"
        res["execution_time_ms"] = round((time.time() - start_time) * 1000.0, 2)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Person Re-ID embedding failed: {str(e)}")

@router.post("/detect/faces", summary="Detect All Face Bounding Boxes")
async def detect_faces(request: Request, file: Optional[UploadFile] = File(None)):
    try:
        if file is not None:
            img_input = await file.read()
        else:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                payload = await request.json()
                img_input = payload.get("image_path") or payload.get("image_base64") or payload.get("image") or payload.get("imageUrl") or payload.get("photo_url")
                if not img_input:
                    raise HTTPException(status_code=400, detail="Empty image payload received in JSON.")
            else:
                img_bytes = await request.body()
                if not img_bytes:
                    raise HTTPException(status_code=400, detail="Empty image payload received.")
                img_input = img_bytes

        embedder = get_face_embedder()
        res = embedder.detect_all_faces(img_input)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face detection failed: {str(e)}")

@router.post("/match/face", summary="Direct Image-to-Image Face Similarity Match")
async def match_face_images(payload: Dict[str, Any] = Body(...)):
    try:
        img1 = payload.get("image1_path") or payload.get("image1")
        img2 = payload.get("image2_path") or payload.get("image2")
        threshold = float(payload.get("threshold", 0.40))
        if not img1 or not img2:
            raise HTTPException(status_code=400, detail="Both image1 and image2 must be provided.")

        embedder = get_face_embedder()
        res = embedder.compare_faces(img1, img2, threshold=threshold)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face comparison failed: {str(e)}")

@router.post("/match/face-embedding", summary="Direct Vector-to-Vector Face Embedding Match")
async def match_face_embeddings(payload: Dict[str, Any] = Body(...)):
    try:
        emb1 = payload.get("embedding1")
        emb2 = payload.get("embedding2")
        threshold = float(payload.get("threshold", 0.40))
        if not emb1 or not emb2:
            raise HTTPException(status_code=400, detail="Both embedding1 and embedding2 must be provided.")

        embedder = get_face_embedder()
        res = embedder.compare_embeddings(emb1, emb2, threshold=threshold)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding comparison failed: {str(e)}")

@router.post("/embed/text", summary="Extract NLP Text Embedding")
async def extract_text_embedding(payload: Dict[str, Any] = Body(...)):
    try:
        text = payload.get("text", "")
        embedder = get_text_embedder()
        emb = embedder.compute_embedding(text)
        return {
            "status": "SUCCESS",
            "embedding": emb,
            "dimension": len(emb),
            "model": embedder.model_name if embedder.model is not None else "hash_vector_fallback"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text embedding failed: {str(e)}")

@router.post("/match/text", summary="Direct Hybrid Text Similarity Match")
async def match_text(payload: Dict[str, Any] = Body(...)):
    try:
        text1 = payload.get("text1", "")
        text2 = payload.get("text2", "")
        threshold = float(payload.get("threshold", 0.40))
        embedder = get_text_embedder()
        res = embedder.compare_texts(text1, text2, threshold=threshold)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text comparison failed: {str(e)}")

@router.post("/match/text-embedding", summary="Direct Vector-to-Vector Text Embedding Match")
async def match_text_embeddings(payload: Dict[str, Any] = Body(...)):
    try:
        emb1 = payload.get("embedding1")
        emb2 = payload.get("embedding2")
        threshold = float(payload.get("threshold", 0.40))
        if not emb1 or not emb2:
            raise HTTPException(status_code=400, detail="Both embedding1 and embedding2 must be provided.")

        embedder = get_text_embedder()
        res = embedder.compare_text_embeddings(emb1, emb2, threshold=threshold)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text embedding comparison failed: {str(e)}")

@router.post("/match/text-batch", summary="Batch Text Candidate Ranking")
async def match_text_batch(payload: Dict[str, Any] = Body(...)):
    try:
        query_text = payload.get("query_text", "")
        candidate_texts = payload.get("candidate_texts", [])
        top_k = int(payload.get("top_k", 5))

        embedder = get_text_embedder()
        res = embedder.rank_candidates(query_text, candidate_texts, top_k=top_k)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch text candidate ranking failed: {str(e)}")
