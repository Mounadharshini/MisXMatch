import os
from fastapi import UploadFile, HTTPException, status
from app.utils.image_validator import validate_image_file
from app.models.schemas import ImageDetail, ImageMatchResultResponse
from app.services.face_service import face_engine

class ImageMatchService:
    @staticmethod
    async def process_face_match(image1: UploadFile, image2: UploadFile) -> ImageMatchResultResponse:
        """
        Processes image pair for face detection, L2-normalized feature embedding extraction,
        and Cosine Similarity comparison.
        
        Evaluates similarity against configurable FACE_MATCH_THRESHOLD.
        NO mock AI scores or random similarity values are generated.
        """
        # 1. Validate image parameters and binary integrity
        meta1 = await validate_image_file(image1, "image1")
        meta2 = await validate_image_file(image2, "image2")

        # 2. Decode raw bytes to OpenCV BGR image matrices
        # Re-read file streams
        await image1.seek(0)
        await image2.seek(0)
        bytes1 = await image1.read()
        bytes2 = await image2.read()

        try:
            img1_bgr = face_engine.decode_image_bytes(bytes1)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to decode binary matrix for image1 ('{meta1['filename']}'): {str(e)}"
            )

        try:
            img2_bgr = face_engine.decode_image_bytes(bytes2)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to decode binary matrix for image2 ('{meta2['filename']}'): {str(e)}"
            )

        # 3. Perform Face Detection
        count1, bboxes1 = face_engine.detect_faces(img1_bgr)
        count2, bboxes2 = face_engine.detect_faces(img2_bgr)

        detected1 = count1 > 0
        detected2 = count2 > 0

        detail1 = ImageDetail(
            filename=meta1["filename"],
            content_type=meta1["content_type"],
            size_bytes=meta1["size_bytes"],
            format=meta1["format"],
            dimensions=meta1["dimensions"],
        )

        detail2 = ImageDetail(
            filename=meta2["filename"],
            content_type=meta2["content_type"],
            size_bytes=meta2["size_bytes"],
            format=meta2["format"],
            dimensions=meta2["dimensions"],
        )

        threshold = float(os.getenv("FACE_MATCH_THRESHOLD", "0.60"))

        # Case 2 & 3: Check for missing faces
        if not detected1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No face detected in Image 1 ('{meta1['filename']}'). Ensure image contains a clear front-facing face."
            )

        if not detected2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No face detected in Image 2 ('{meta2['filename']}'). Ensure image contains a clear front-facing face."
            )

        # Case 4: Handle Multi-face detection deterministically (Select largest face box by area)
        primary_bbox1 = sorted(bboxes1, key=lambda b: b[2] * b[3], reverse=True)[0]
        primary_bbox2 = sorted(bboxes2, key=lambda b: b[2] * b[3], reverse=True)[0]

        msg_parts = []
        if count1 > 1:
            msg_parts.append(f"Multiple faces ({count1}) detected in Image 1; selected primary face.")
        if count2 > 1:
            msg_parts.append(f"Multiple faces ({count2}) detected in Image 2; selected primary face.")

        # Case 1: Extract 512-dimensional embeddings and compute real Cosine Similarity
        emb1 = face_engine.extract_face_embedding(img1_bgr, primary_bbox1)
        emb2 = face_engine.extract_face_embedding(img2_bgr, primary_bbox2)

        similarity_score = face_engine.compute_cosine_similarity(emb1, emb2)
        is_match = similarity_score >= threshold
        match_status = "POSSIBLE_MATCH" if is_match else "UNLIKELY_MATCH"

        summary_msg = "Real AI face detection and feature comparison completed successfully."
        if msg_parts:
            summary_msg += " " + " ".join(msg_parts)

        return ImageMatchResultResponse(
            success=True,
            faceDetectedInImage1=True,
            faceDetectedInImage2=True,
            facesCountImage1=count1,
            facesCountImage2=count2,
            similarityScore=similarity_score,
            match=is_match,
            matchStatus=match_status,
            threshold=threshold,
            message=summary_msg,
            image1=detail1,
            image2=detail2,
        )
