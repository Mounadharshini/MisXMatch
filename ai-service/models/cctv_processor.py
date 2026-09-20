import os
import cv2
import tempfile
import uuid
import logging
import numpy as np
from typing import Dict, Any, List, Optional, Union, Tuple
from PIL import Image

from .face_embedder import FaceEmbedder
from .reid_embedder import ReIDEmbedder

logger = logging.getLogger("RealCctvProcessor")

class RealCctvProcessor:
    """
    Real Computer Vision & Biometric CCTV Evidence Analysis Engine.
    
    Capability:
    1. Ingests CCTV photographs or recorded video evidence streams.
    2. Runs pretrained OpenCV HOG People Detector (SVM) & Haar/SFace cascades for real person detection.
    3. Performs configurable frame sampling for videos (CCTV_FRAME_INTERVAL).
    4. Extracts real bounding boxes (x, y, w, h), frame timestamps, and detection confidence scores.
    5. Runs face biometric extraction on detected person crops.
    6. Performs real cosine similarity candidate matching against authorized missing person records.
    7. Enforces volatile memory processing with strict temporary file deletion in try/finally blocks.
    """

    def __init__(self, face_embedder: Optional[FaceEmbedder] = None, reid_embedder: Optional[ReIDEmbedder] = None):
        self.face_embedder = face_embedder or FaceEmbedder()
        self.reid_embedder = reid_embedder or ReIDEmbedder()
        
        # Initialize OpenCV Pretrained HOG People Detector
        if hasattr(cv2, 'HOGDescriptor'):
            try:
                self.hog = cv2.HOGDescriptor()
                self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            except Exception:
                self.hog = None
        else:
            self.hog = None
        logger.info("Initialized RealCctvProcessor with SFace Embedders and HOG People Detector (if available).")

    def process_cctv_media(
        self,
        media_input: Union[bytes, str],
        candidate_records: Optional[List[Dict[str, Any]]] = None,
        sample_interval_sec: float = 1.0,
        max_sampled_frames: int = 30
    ) -> Dict[str, Any]:
        """
        Analyzes uploaded CCTV media (image or video bytes / path).
        Returns real person detections, bounding boxes, frame timestamps, and optional candidate match cards.
        """
        if not media_input:
            raise ValueError("Media input cannot be empty or null.")

        # Determine if input is image or video by checking header / bytes
        media_type = self._detect_media_type(media_input)

        if media_type == "image":
            return self._process_cctv_image(media_input, candidate_records)
        else:
            return self._process_cctv_video(media_input, candidate_records, sample_interval_sec, max_sampled_frames)

    def _detect_media_type(self, media_input: Union[bytes, str]) -> str:
        """Determines if media_input represents an image or video."""
        if isinstance(media_input, str):
            lower = media_input.lower()
            if lower.endswith((".mp4", ".avi", ".mov", ".mkv", ".webm")):
                return "video"
            if lower.endswith((".jpg", ".jpeg", ".png", ".webp", ".bmp")):
                return "image"

        if isinstance(media_input, bytes):
            # Check magic bytes for MP4 / AVI / MOV / WEBM video
            if len(media_input) > 12:
                header = media_input[:12]
                if b"ftyp" in header or b"RIFF" in header or b"matroska" in header:
                    return "video"
            return "image"

        return "image"

    def _process_cctv_image(
        self,
        image_input: Union[bytes, str],
        candidate_records: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Processes a single CCTV image frame."""
        img_bgr = self.face_embedder.decode_image_input(image_input)
        if img_bgr is None or img_bgr.size == 0:
            raise ValueError("Failed to decode CCTV image media.")

        h, w = img_bgr.shape[:2]
        
        # 1. Run real person detection via HOG SVM
        person_boxes, weights = self._detect_people(img_bgr)
        
        detections = []
        person_idx = 1

        # 2. For each detected person box, analyze crop for faces & candidate matching
        for box, weight in zip(person_boxes, weights):
            bx, by, bw, bh = [int(v) for v in box]
            conf = round(float(weight), 2)
            conf = min(0.99, max(0.45, conf)) # normalize confidence band

            crop = img_bgr[max(0, by):min(h, by + bh), max(0, bx):min(w, bx + bw)]
            
            face_info = self._analyze_person_crop(crop, candidate_records)

            det = {
                "personIndex": person_idx,
                "frameNumber": 1,
                "timestampSeconds": 0.0,
                "boundingBox": {"x": bx, "y": by, "width": bw, "height": bh},
                "confidence": conf,
                "hasUsableFace": face_info["hasUsableFace"],
            }
            if face_info.get("faceBoundingBox"):
                # Offset face box to full frame coordinates
                fb = face_info["faceBoundingBox"]
                det["faceBoundingBox"] = {
                    "x": bx + fb["x"],
                    "y": by + fb["y"],
                    "width": fb["width"],
                    "height": fb["height"]
                }
            if face_info.get("candidateMatch"):
                det["candidateMatch"] = face_info["candidateMatch"]

            detections.append(det)
            person_idx += 1

        # Fallback: if HOG detector missed direct full-body but face cascade finds face directly
        if not detections:
            face_res = self.face_embedder.compute_embedding(img_bgr)
            if face_res and face_res.get("face_detected"):
                bbox = face_res.get("bbox", [0, 0, w, h])
                bx, by, bw, bh = bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]
                
                crop_info = self._analyze_person_crop(img_bgr, candidate_records)
                det = {
                    "personIndex": 1,
                    "frameNumber": 1,
                    "timestampSeconds": 0.0,
                    "boundingBox": {"x": max(0, bx - 20), "y": max(0, by - 20), "width": bw + 40, "height": bh + 100},
                    "confidence": 0.82,
                    "hasUsableFace": True,
                    "faceBoundingBox": {"x": bx, "y": by, "width": bw, "height": bh}
                }
                if crop_info.get("candidateMatch"):
                    det["candidateMatch"] = crop_info["candidateMatch"]
                detections.append(det)

        return {
            "success": True,
            "mediaType": "image",
            "totalDetections": len(detections),
            "sampledFrameCount": 1,
            "durationSec": 0.0,
            "detections": detections,
            "disclaimer": "AI Candidate Suggestion — Requires Human Verification — not definitive identification"
        }

    def _process_cctv_video(
        self,
        video_input: Union[bytes, str],
        candidate_records: Optional[List[Dict[str, Any]]] = None,
        sample_interval_sec: float = 1.0,
        max_sampled_frames: int = 30
    ) -> Dict[str, Any]:
        """Processes video media with configurable frame sampling."""
        temp_file_path = None
        try:
            if isinstance(video_input, bytes):
                temp_dir = tempfile.gettempdir()
                temp_file_path = os.path.join(temp_dir, f"cctv_analysis_{uuid.uuid4().hex}.mp4")
                with open(temp_file_path, "wb") as f:
                    f.write(video_input)
                video_path = temp_file_path
            else:
                video_path = video_input

            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError("Unable to decode video format or video file stream is corrupted.")

            fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            duration_sec = total_frames / fps if fps > 0 else 0.0

            frame_step = max(1, int(fps * sample_interval_sec))
            
            detections = []
            curr_frame_idx = 0
            sampled_count = 0
            global_person_idx = 1

            while cap.isOpened() and sampled_count < max_sampled_frames:
                ret, frame = cap.read()
                if not ret:
                    break

                if curr_frame_idx % frame_step == 0:
                    t_sec = round(curr_frame_idx / fps, 2)
                    h, w = frame.shape[:2]

                    # Detect persons in frame
                    person_boxes, weights = self._detect_people(frame)
                    
                    for box, weight in zip(person_boxes, weights):
                        bx, by, bw, bh = [int(v) for v in box]
                        conf = round(float(weight), 2)
                        conf = min(0.99, max(0.45, conf))

                        crop = frame[max(0, by):min(h, by + bh), max(0, bx):min(w, bx + bw)]
                        face_info = self._analyze_person_crop(crop, candidate_records)

                        det = {
                            "personIndex": global_person_idx,
                            "frameNumber": curr_frame_idx,
                            "timestampSeconds": t_sec,
                            "boundingBox": {"x": bx, "y": by, "width": bw, "height": bh},
                            "confidence": conf,
                            "hasUsableFace": face_info["hasUsableFace"]
                        }
                        if face_info.get("faceBoundingBox"):
                            fb = face_info["faceBoundingBox"]
                            det["faceBoundingBox"] = {
                                "x": bx + fb["x"],
                                "y": by + fb["y"],
                                "width": fb["width"],
                                "height": fb["height"]
                            }
                        if face_info.get("candidateMatch"):
                            det["candidateMatch"] = face_info["candidateMatch"]

                        detections.append(det)
                        global_person_idx += 1

                    sampled_count += 1

                curr_frame_idx += 1

            cap.release()

            return {
                "success": True,
                "mediaType": "video",
                "totalDetections": len(detections),
                "sampledFrameCount": sampled_count,
                "durationSec": round(duration_sec, 2),
                "detections": detections,
                "disclaimer": "AI Candidate Suggestion — Requires Human Verification — not definitive identification"
            }

        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception:
                    pass

    def _detect_people(self, img_bgr: np.ndarray) -> Tuple[List[Tuple[int, int, int, int]], List[float]]:
        """Runs OpenCV HOG SVM People Detector."""
        if self.hog is None:
            return [], []
        h, w = img_bgr.shape[:2]
        # Resize image for faster HOG detection if frame is very large
        max_dim = 800
        scale = 1.0
        if max(h, w) > max_dim:
            scale = max_dim / float(max(h, w))
            resized = cv2.resize(img_bgr, (int(w * scale), int(h * scale)))
        else:
            resized = img_bgr

        try:
            boxes, weights = self.hog.detectMultiScale(
                resized,
                winStride=(8, 8),
                padding=(8, 8),
                scale=1.05
            )
        except Exception as e:
            logger.warning(f"HOG detectMultiScale failed or unsupported: {e}")
            return [], []

        scaled_boxes = []
        final_weights = []
        for box, w_val in zip(boxes, weights):
            x, y, bw, bh = box
            scaled_boxes.append((int(x / scale), int(y / scale), int(bw / scale), int(bh / scale)))
            # HOG returns raw weights (e.g. 0.2 - 2.5) -> scale to confidence 0.50 - 0.95
            conf = float(1.0 / (1.0 + np.exp(-w_val[0]))) if isinstance(w_val, np.ndarray) else float(w_val)
            final_weights.append(min(0.98, max(0.50, conf)))

        return scaled_boxes, final_weights

    def _analyze_person_crop(
        self,
        crop_bgr: np.ndarray,
        candidate_records: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Analyzes person crop for facial biometrics and candidate matching."""
        if crop_bgr is None or crop_bgr.size == 0:
            return {"hasUsableFace": False}

        h, w = crop_bgr.shape[:2]
        
        # 1. Attempt face biometric extraction
        try:
            face_res = self.face_embedder.compute_embedding(crop_bgr)
        except Exception:
            face_res = None

        has_face = False
        face_box = None
        crop_emb = None

        if face_res and face_res.get("face_detected"):
            has_face = True
            bbox = face_res.get("bbox", [0, 0, w, h])
            face_box = {"x": bbox[0], "y": bbox[1], "width": bbox[2] - bbox[0], "height": bbox[3] - bbox[1]}
            crop_emb = face_res.get("embedding")

        # 2. Compare against authorized candidate missing person records
        best_candidate_match = None
        if crop_emb and candidate_records:
            best_score = 0.0
            for cand in candidate_records:
                cand_photo = cand.get("photoUrl")
                cand_case = cand.get("caseNumber", cand.get("missingCaseNumber", "UNKNOWN"))
                cand_name = cand.get("name", cand.get("personName", "Unidentified Candidate"))

                if cand_photo:
                    try:
                        cand_face_res = self.face_embedder.compute_embedding(cand_photo)
                        if cand_face_res and cand_face_res.get("embedding"):
                            sim = self._compute_cosine_sim(crop_emb, cand_face_res["embedding"])
                            if sim > best_score:
                                best_score = sim
                                conf_level = "HIGH" if sim >= 0.75 else ("MEDIUM" if sim >= 0.55 else "LOW")
                                best_candidate_match = {
                                    "missingCaseNumber": cand_case,
                                    "personName": cand_name,
                                    "photoUrl": cand_photo,
                                    "overallSimilarityScore": round(sim, 3),
                                    "confidenceLevel": conf_level,
                                    "matchReason": f"Biometric Facial Alignment Score: {int(sim * 100)}%"
                                }
                    except Exception as e:
                        logger.debug(f"Candidate comparison failed for {cand_case}: {e}")

        return {
            "hasUsableFace": has_face,
            "faceBoundingBox": face_box,
            "candidateMatch": best_candidate_match
        }

    def _compute_cosine_sim(self, vec1: List[float], vec2: List[float]) -> float:
        """Computes cosine similarity between two float vectors."""
        a = np.array(vec1, dtype=np.float32)
        b = np.array(vec2, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        sim = float(np.dot(a, b) / (norm_a * norm_b))
        return float(min(1.0, max(0.0, sim)))
