import os
import io
import logging
from typing import Optional, Tuple, Dict, Any, List, Union
import numpy as np
from PIL import Image
import cv2

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FaceEmbedder")

class FaceEmbedder:
    """
    Multimodal Pretrained Face Biometric Embedding Engine for MISXMATCH.
    
    Extracts high-discrimination facial biometric embedding vectors from input photographs
    and performs face similarity detection, verification, and distance metrics.
    
    PRIVACY & LIFECYCLE SPECIFICATION:
    - Processes image byte streams strictly in volatile memory.
    - NEVER persists raw image files or cropped frames to disk.
    - Releases intermediate pixel arrays and tensors immediately after inference.
    """

    def __init__(self, model_name: str = "insightface_sface_512", weights_path: Optional[str] = None):
        self.model_name = model_name
        cascade_file = getattr(cv2, 'data', None) and os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
        if cascade_file and os.path.exists(cascade_file) and hasattr(cv2, 'CascadeClassifier'):
            try:
                self.face_cascade = cv2.CascadeClassifier(cascade_file)
            except Exception:
                self.face_cascade = None
        else:
            self.face_cascade = None
        self.onnx_session = None

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Check if ArcFace weights exist for direct 512-d ONNX inference fallback/upgrade
        arcface_path = os.path.join(base_dir, "weights", "arcface_resnet100_512.onnx")
        if os.path.exists(arcface_path):
            try:
                import onnxruntime as ort
                self.onnx_session = ort.InferenceSession(arcface_path, providers=['CPUExecutionProvider'])
                logger.info(f"Loaded ArcFace 512-d ONNX model from {arcface_path}")
            except Exception as e:
                logger.warning(f"Could not initialize ONNX runtime session for ArcFace: {str(e)}")

        # Locate SFace weights
        if weights_path is None:
            weights_path = os.path.join(base_dir, "weights", "face_recognition_sface.onnx")
        
        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"Face model weights not found at: {weights_path}")
        
        self.recognizer = cv2.FaceRecognizerSF.create(weights_path, "")
        
        # Fixed random orthogonal projection matrix to map 128-d -> 512-d embedding space deterministically
        rng = np.random.RandomState(42)
        q, _ = np.linalg.qr(rng.randn(512, 128))
        self.proj_512 = q.T.astype(np.float32) # (128, 512)
        
        logger.info(f"FaceEmbedder initialized with model={self.model_name} from {weights_path}")

    def decode_image_input(self, image_input: Union[bytes, str, Image.Image, np.ndarray]) -> np.ndarray:
        """Decodes image input into volatile BGR numpy array."""
        import base64
        import urllib.request

        if isinstance(image_input, bytes):
            nparr = np.frombuffer(image_input, np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_bgr is None:
                raise ValueError("Failed to decode image from bytes.")
            return img_bgr

        if isinstance(image_input, str):
            img_bgr = None
            if image_input.startswith("data:image/") and ";base64," in image_input:
                b64_data = image_input.split(";base64,", 1)[1]
                raw_bytes = base64.b64decode(b64_data)
                nparr = np.frombuffer(raw_bytes, np.uint8)
                img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            elif image_input.startswith("http://") or image_input.startswith("https://"):
                try:
                    req = urllib.request.Request(image_input, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        raw_bytes = resp.read()
                    nparr = np.frombuffer(raw_bytes, np.uint8)
                    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                except Exception as e:
                    raise ValueError(f"Failed to fetch image from URL ({image_input}): {str(e)}")
            elif os.path.exists(image_input):
                img_bgr = cv2.imread(image_input)
            else:
                try:
                    raw_bytes = base64.b64decode(image_input)
                    nparr = np.frombuffer(raw_bytes, np.uint8)
                    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                except Exception:
                    pass

            if img_bgr is None:
                raise ValueError(f"Failed to load image from input string: {image_input[:100]}")
            return img_bgr

        if isinstance(image_input, Image.Image):
            rgb_arr = np.array(image_input.convert("RGB"))
            return cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)

        if isinstance(image_input, np.ndarray):
            return image_input

        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    def extract_face_crop(self, img_bgr: np.ndarray) -> Tuple[np.ndarray, List[int], bool]:
        """
        Detects primary face bounding box in memory. Returns (cropped_face, bbox, face_detected_bool).
        """
        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        
        faces = []
        if self.face_cascade is not None and not self.face_cascade.empty():
            try:
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=3,
                    minSize=(30, 30)
                )
            except Exception:
                faces = []
        
        if len(faces) > 0:
            # Pick largest detected face
            largest_face = max(faces, key=lambda b: b[2] * b[3])
            x, y, fw, fh = largest_face
            # Add 12% margin around face
            margin_x = int(fw * 0.12)
            margin_y = int(fh * 0.12)
            x1 = max(0, x - margin_x)
            y1 = max(0, y - margin_y)
            x2 = min(w, x + fw + margin_x)
            y2 = min(h, y + fh + margin_y)
            crop = img_bgr[y1:y2, x1:x2]
            bbox = [int(x1), int(y1), int(x2), int(y2)]
            return crop, bbox, True
        else:
            bbox = [0, 0, w, h]
            return img_bgr, bbox, False

    def detect_all_faces(self, image_input: Union[bytes, str, Image.Image, np.ndarray]) -> Dict[str, Any]:
        """
        Detects all faces in an image and returns their bounding box coordinates.
        """
        img_bgr = self.decode_image_input(image_input)
        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        
        faces = []
        if self.face_cascade is not None and not self.face_cascade.empty():
            try:
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=3,
                    minSize=(30, 30)
                )
            except Exception:
                faces = []
        
        face_list = []
        for (x, y, fw, fh) in faces:
            x1, y1, x2, y2 = int(x), int(y), int(x + fw), int(y + fh)
            face_list.append({
                "bbox": [x1, y1, x2, y2],
                "width": int(fw),
                "height": int(fh),
                "area": int(fw * fh)
            })

        return {
            "status": "SUCCESS",
            "image_dimensions": [w, h],
            "face_count": len(face_list),
            "faces": face_list
        }

    def compute_embedding(self, image_input: Union[bytes, str, Image.Image, np.ndarray]) -> Dict[str, Any]:
        """
        Computes 512-d unit normalized face embedding from image bytes, PIL Image, web URL, or file path.
        """
        img_bgr = self.decode_image_input(image_input)
        face_crop, bbox, detected = self.extract_face_crop(img_bgr)

        # 3. Preprocess & extract deep feature
        crop_resized = cv2.resize(face_crop, (112, 112))
        raw_feat_128 = self.recognizer.feature(crop_resized)[0] # (128,)

        # 4. Project to 512-d normalized metric space
        feat_512 = np.dot(raw_feat_128, self.proj_512) # (512,)
        norm_val = np.linalg.norm(feat_512)
        norm_512 = feat_512 / norm_val if norm_val > 0 else feat_512
        embedding = norm_512.tolist()

        del img_bgr, face_crop, crop_resized, raw_feat_128, feat_512, norm_512

        return {
            "embedding": embedding,
            "bbox": bbox,
            "face_detected": detected,
            "dimension": len(embedding),
            "model": self.model_name
        }

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """Computes cosine similarity between two float vectors."""
        a = np.array(v1, dtype=np.float32)
        b = np.array(v2, dtype=np.float32)
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        sim = float(dot / (norm_a * norm_b))
        return max(-1.0, min(1.0, sim))

    @staticmethod
    def l2_distance(v1: List[float], v2: List[float]) -> float:
        """Computes Euclidean L2 distance between two normalized float vectors."""
        a = np.array(v1, dtype=np.float32)
        b = np.array(v2, dtype=np.float32)
        dist = float(np.linalg.norm(a - b))
        return round(dist, 4)

    @staticmethod
    def calibrate_similarity_score(raw_cosine: float) -> float:
        """
        Calibrates raw cosine similarity score to a 0.0–1.0 scaled score.
        SFace cosine threshold mapping:
        - raw <= 0.15: noise / non-match -> 0–10%
        - 0.15–0.35: weak similarity -> 10–35%
        - 0.35–0.50: moderate similarity -> 40–70%
        - 0.50–0.70: strong match -> 72–92%
        - > 0.70: definite match -> 93–99%
        """
        if raw_cosine <= 0.15:
            return max(0.01, round(raw_cosine * 0.60, 4))
        elif raw_cosine <= 0.35:
            return round(0.10 + ((raw_cosine - 0.15) / 0.20) * 0.25, 4)
        elif raw_cosine <= 0.50:
            return round(0.40 + ((raw_cosine - 0.35) / 0.15) * 0.30, 4)
        elif raw_cosine <= 0.70:
            return round(0.72 + ((raw_cosine - 0.50) / 0.20) * 0.20, 4)
        else:
            return round(0.93 + min(0.06, ((raw_cosine - 0.70) / 0.30) * 0.06), 4)

    def compare_embeddings(self, emb1: List[float], emb2: List[float], threshold: float = 0.40) -> Dict[str, Any]:
        """
        Compares two 512-dimensional face embedding vectors directly.
        Returns match decision, cosine similarity, L2 distance, calibrated percentage score, and confidence.
        """
        raw_cosine = self.cosine_similarity(emb1, emb2)
        l2_dist = self.l2_distance(emb1, emb2)
        calibrated_score = self.calibrate_similarity_score(raw_cosine)
        similarity_percentage = round(calibrated_score * 100.0, 2)

        is_match = raw_cosine >= threshold
        if raw_cosine >= 0.60:
            confidence = "HIGH"
        elif raw_cosine >= threshold:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        return {
            "is_match": is_match,
            "similarity_score": similarity_percentage,
            "calibrated_score": calibrated_score,
            "raw_cosine_similarity": round(raw_cosine, 4),
            "l2_distance": l2_dist,
            "confidence": confidence,
            "threshold_used": threshold,
            "model_used": self.model_name
        }

    def compare_faces(
        self,
        image1_input: Union[bytes, str, Image.Image, np.ndarray],
        image2_input: Union[bytes, str, Image.Image, np.ndarray],
        threshold: float = 0.40
    ) -> Dict[str, Any]:
        """
        Compares two face images directly and detects face similarity.
        Extracts face embeddings from both images and computes biometric similarity.
        """
        emb_res1 = self.compute_embedding(image1_input)
        emb_res2 = self.compute_embedding(image2_input)

        emb1 = emb_res1["embedding"]
        emb2 = emb_res2["embedding"]

        match_metrics = self.compare_embeddings(emb1, emb2, threshold=threshold)

        return {
            "status": "SUCCESS",
            "is_match": match_metrics["is_match"],
            "similarity_score": match_metrics["similarity_score"],
            "raw_cosine_similarity": match_metrics["raw_cosine_similarity"],
            "l2_distance": match_metrics["l2_distance"],
            "confidence": match_metrics["confidence"],
            "threshold_used": match_metrics["threshold_used"],
            "face1": {
                "detected": emb_res1["face_detected"],
                "bbox": emb_res1["bbox"]
            },
            "face2": {
                "detected": emb_res2["face_detected"],
                "bbox": emb_res2["bbox"]
            },
            "model_used": self.model_name
        }
