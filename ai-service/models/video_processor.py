import os
import tempfile
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np
import cv2
from PIL import Image

from .face_embedder import FaceEmbedder
from .reid_embedder import ReIDEmbedder

logger = logging.getLogger("VideoProcessor")

class VideoFrameProcessor:
    """
    OpenCV Video Frame Extraction & Face/Person Detection Engine for CCTV and Sighting Videos.
    
    Processing Flow:
    1. Ingests video file bytes or path.
    2. Extracts frames at sampled intervals (e.g., 1 FPS or uniform N-frame sample).
    3. Detects face/person regions per frame using OpenCV & Deep Learning embedders.
    4. Computes 512-d Face & Re-ID embeddings for detected subjects across frames.
    5. Aggregates best biometric embedding vectors (max-pooling or centroid mean vector).
    6. Ensures zero persistent video disk retention post-inference.
    """

    def __init__(self, face_embedder: Optional[FaceEmbedder] = None, reid_embedder: Optional[ReIDEmbedder] = None):
        self.face_embedder = face_embedder or FaceEmbedder()
        self.reid_embedder = reid_embedder or ReIDEmbedder()

    def process_video(
        self,
        video_input: Union[bytes, str],
        sample_interval_sec: float = 1.0,
        max_frames: int = 15
    ) -> Dict[str, Any]:
        """
        Extracts frames, detects faces/persons, generates embeddings, and selects best frames.
        
        Returns:
            Dict containing:
            - status: "SUCCESS"
            - frames_processed: int
            - total_faces_detected: int
            - best_face_embedding: List[float] (512-d centroid or top-confidence vector)
            - best_reid_embedding: List[float] (512-d centroid or top-confidence vector)
            - detected_tracks: List[Dict] with timestamp, bbox, face_score
        """
        temp_file_path = None
        if isinstance(video_input, bytes):
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                tmp.write(video_input)
                temp_file_path = tmp.name
            video_path = temp_file_path
        elif isinstance(video_input, str):
            video_path = video_input
        else:
            raise ValueError(f"Unsupported video input type: {type(video_input)}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            if temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            raise ValueError("Unable to open video file stream with OpenCV.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration_sec = total_frames / fps if fps > 0 else 0.0

        frame_step = max(1, int(fps * sample_interval_sec))
        
        detected_tracks = []
        face_embeddings = []
        reid_embeddings = []

        curr_frame_idx = 0
        processed_count = 0

        while cap.isOpened() and processed_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if curr_frame_idx % frame_step == 0:
                timestamp_sec = round(curr_frame_idx / fps, 2)
                
                # 1. Attempt face detection & embedding on frame
                try:
                    face_res = self.face_embedder.compute_embedding(frame)
                    if face_res and face_res.get("embedding"):
                        bbox = face_res.get("bbox", [0, 0, frame.shape[1], frame.shape[0]])
                        # If a real non-fallback face bbox was found
                        face_width = bbox[2] - bbox[0]
                        face_height = bbox[3] - bbox[1]

                        face_embeddings.append(face_res["embedding"])
                        
                        detected_tracks.append({
                            "frame_index": curr_frame_idx,
                            "timestamp_sec": timestamp_sec,
                            "bbox": bbox,
                            "face_detected": (face_width < frame.shape[1] * 0.95),
                            "face_embedding_sample": face_res["embedding"][:5] # sample snippet
                        })
                except Exception as e:
                    logger.debug(f"Face extraction failed at frame {curr_frame_idx}: {e}")

                # 2. Extract Re-ID embedding for person crop
                try:
                    reid_res = self.reid_embedder.compute_embedding(frame)
                    if reid_res and reid_res.get("embedding"):
                        reid_embeddings.append(reid_res["embedding"])
                except Exception as e:
                    logger.debug(f"Re-ID extraction failed at frame {curr_frame_idx}: {e}")

                processed_count += 1

            curr_frame_idx += 1

        cap.release()
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass

        # Compute centroid (mean L2-normalized vector) for aggregated video face & Re-ID embeddings
        best_face_emb = self._aggregate_embeddings(face_embeddings)
        best_reid_emb = self._aggregate_embeddings(reid_embeddings)

        return {
            "status": "SUCCESS",
            "duration_sec": round(duration_sec, 2),
            "frames_processed": processed_count,
            "total_faces_detected": len(face_embeddings),
            "best_face_embedding": best_face_emb,
            "best_reid_embedding": best_reid_emb,
            "detected_tracks": detected_tracks
        }

    def _aggregate_embeddings(self, emb_list: List[List[float]]) -> Optional[List[float]]:
        if not emb_list:
            return None
        matrix = np.array(emb_list, dtype=np.float32) # (N, 512)
        mean_vec = np.mean(matrix, axis=0) # (512,)
        norm = np.linalg.norm(mean_vec)
        if norm > 0:
            mean_vec = mean_vec / norm
        return mean_vec.tolist()
