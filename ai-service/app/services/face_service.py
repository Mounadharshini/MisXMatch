import os
import io
import cv2
import numpy as np
from PIL import Image
from typing import Tuple, List, Dict, Any, Optional
from fastapi import UploadFile, HTTPException, status

class FaceFeatureEngine:
    """
    Singleton AI Computer Vision Engine for Face Detection, Feature Embedding Extraction,
    and Cosine Similarity Match Calculation.
    Loaded ONCE at service startup.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceFeatureEngine, cls).__new__(cls)
            cls._instance._initialize_models()
        return cls._instance

    def _initialize_models(self):
        """Initializes OpenCV face detection cascade classifiers once in memory."""
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        alt_path = cv2.data.haarcascades + 'haarcascade_frontalface_alt.xml'
        alt2_path = cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml'

        self.face_cascades = []
        for path in [cascade_path, alt_path, alt2_path]:
            if hasattr(cv2, 'CascadeClassifier') and os.path.exists(path):
                c = cv2.CascadeClassifier(path)
                if not c.empty():
                    self.face_cascades.append(c)

        if not self.face_cascades:
            print("⚠ Warning: OpenCV face detection cascade classifiers not found in cv2.data. Using HSV & full-crop fallback detector.")
        else:
            print(f"✔ AI Face Feature Engine initialized successfully ({len(self.face_cascades)} OpenCV Cascades + 512-D L2 Spatial Feature Extractor).")

    def decode_image_bytes(self, image_bytes: bytes) -> np.ndarray:
        """Converts raw image bytes to OpenCV BGR numpy array."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Unable to decode image binary bytes into valid OpenCV image matrix.")
        return img_bgr

    def detect_faces(self, img_bgr: np.ndarray) -> Tuple[int, List[Tuple[int, int, int, int]]]:
        """
        Detects faces in BGR image matrix using multi-stage Haar Cascades and spatial/skin-tone fallback analysis.
        Returns total face count and list of bounding boxes [(x, y, w, h), ...].
        """
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        gray_equalized = cv2.equalizeHist(gray)
        h_img, w_img = img_bgr.shape[:2]

        all_boxes = []
        for cascade in self.face_cascades:
            faces = cascade.detectMultiScale(
                gray_equalized,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(24, 24),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            for (x, y, w, h) in faces:
                all_boxes.append((int(x), int(y), int(w), int(h)))

        # Non-maximum suppression / merge overlapping boxes
        if all_boxes:
            merged_boxes = []
            for b in all_boxes:
                overlap = False
                for m in merged_boxes:
                    cx1, cy1 = b[0] + b[2]/2, b[1] + b[3]/2
                    cx2, cy2 = m[0] + m[2]/2, m[1] + m[3]/2
                    if abs(cx1 - cx2) < max(b[2], m[2]) * 0.5 and abs(cy1 - cy2) < max(b[3], m[3]) * 0.5:
                        overlap = True
                        break
                if not overlap:
                    merged_boxes.append(b)
            return len(merged_boxes), merged_boxes

        # Fallback 1: Skin-tone HSV + contour analysis for stylized/synthetic or tight face crops
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        lower_skin = np.array([0, 15, 40], dtype=np.uint8)
        upper_skin = np.array([25, 255, 255], dtype=np.uint8)
        mask = cv2.inRange(hsv, lower_skin, upper_skin)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid_boxes = []
        for c in contours:
            area = cv2.contourArea(c)
            if area > (w_img * h_img * 0.05):  # At least 5% of image area
                bx, by, bw, bh = cv2.boundingRect(c)
                aspect = bw / float(bh)
                if 0.4 <= aspect <= 1.6:
                    valid_boxes.append((int(bx), int(by), int(bw), int(bh)))

        if valid_boxes:
            return len(valid_boxes), valid_boxes

        # Fallback 2: Full-crop image bounding box fallback (for synthetic avatar / tight crops)
        if h_img > 10 and w_img > 10:
            return 1, [(0, 0, int(w_img), int(h_img))]

        return 0, []

    def extract_face_embedding(self, img_bgr: np.ndarray, bbox: Tuple[int, int, int, int]) -> np.ndarray:
        """
        Crops face region, resizes to 128x128, extracts 512-dimensional spatial & texture feature vector,
        and applies L2 normalization (||vec||_2 = 1.0).
        """
        x, y, w, h = bbox
        h_img, w_img = img_bgr.shape[:2]
        pad_x = int(w * 0.05)
        pad_y = int(h * 0.05)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(w_img, x + w + pad_x)
        y2 = min(h_img, y + h + pad_y)

        face_crop = img_bgr[y1:y2, x1:x2]
        if face_crop.size == 0:
            face_crop = img_bgr[y:y+h, x:x+w]

        # Resize face crop to standard 128x128 resolution
        face_resized = cv2.resize(face_crop, (128, 128), interpolation=cv2.INTER_AREA)
        gray_face = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
        gray_face = cv2.equalizeHist(gray_face)

        # 1. Multi-scale HOG / Gradient Descriptors (256 dimensions)
        hog_features = None
        if hasattr(cv2, 'HOGDescriptor'):
            try:
                win_size = (128, 128)
                block_size = (32, 32)
                block_stride = (16, 16)
                cell_size = (16, 16)
                nbins = 8
                hog = cv2.HOGDescriptor(win_size, block_size, block_stride, cell_size, nbins)
                computed = hog.compute(gray_face)
                if computed is not None:
                    hog_features = computed.flatten()
            except Exception:
                hog_features = None

        if hog_features is None or len(hog_features) == 0:
            gx = cv2.Sobel(gray_face, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(gray_face, cv2.CV_32F, 0, 1, ksize=3)
            mag, _ = cv2.cartToPolar(gx, gy, angleInDegrees=True)
            hog_features = cv2.resize(mag, (16, 16), interpolation=cv2.INTER_AREA).flatten()

        if len(hog_features) >= 256:
            hog_256 = hog_features[:256]
        else:
            hog_256 = np.pad(hog_features, (0, 256 - len(hog_features)), 'constant')

        # 2. Spatial Grid Intensity & Texture Moments (256 dimensions)
        # Divide 128x128 face into 16 sub-regions (4x4 grid of 32x32 tiles)
        grid_features = []
        for row in range(4):
            for col in range(4):
                tile = gray_face[row*32:(row+1)*32, col*32:(col+1)*32]
                mean_val = np.mean(tile)
                std_val = np.std(tile)
                hist, _ = np.histogram(tile, bins=14, range=(0, 256))
                grid_features.extend([mean_val, std_val] + list(hist))

        grid_256 = np.array(grid_features[:256], dtype=np.float32)

        # Combine into 512-dimensional feature vector
        combined_vector = np.concatenate([hog_256, grid_256]).astype(np.float32)

        # L2 Normalization
        norm = np.linalg.norm(combined_vector)
        if norm > 1e-12:
            embedding = combined_vector / norm
        else:
            embedding = combined_vector

        return embedding

    def compute_cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Computes Cosine Similarity between two L2-normalized 512-D vectors:
        Cosine Similarity = (vec1 . vec2) / (||vec1|| * ||vec2||)
        """
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 < 1e-12 or norm2 < 1e-12:
            return 0.0

        dot_product = float(np.dot(vec1, vec2))
        cosine_sim = dot_product / (norm1 * norm2)

        # Clamp score to [0.0, 1.0] range
        similarity_score = max(0.0, min(1.0, float(cosine_sim)))
        return round(similarity_score, 4)

# Global Singleton Instance
face_engine = FaceFeatureEngine()
