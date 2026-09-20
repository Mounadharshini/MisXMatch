import os
import io
import logging
from typing import Optional, Dict, Any, List, Union
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torchvision.transforms as transforms

from .osnet import osnet_x1_0

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ReIDEmbedder")

class ReIDEmbedder:
    """
    Pretrained Person Re-Identification (Re-ID) Embedding Engine for MISXMATCH.
    
    Architecture: OSNet (Omni-Scale Network) x1_0 pretrained on Market-1501.
    Output: 512-dimensional L2-normalized appearance biometric vector.
    
    PRIVACY & LIFECYCLE:
    - In-memory transient decoding.
    - Zero local disk persistence of raw photos or body crops.
    - Explicit memory garbage collection post-inference.
    """

    def __init__(self, weights_path: Optional[str] = None, device: str = "cpu"):
        self.device = torch.device(device if torch.cuda.is_available() and device == "cuda" else "cpu")
        self.model_name = "torchreid_osnet_x1_0_market1501"

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if weights_path is None:
            weights_path = os.path.join(base_dir, "weights", "osnet_x1_0_market1501.pth")

        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"OSNet Market-1501 weights not found at: {weights_path}")

        self.model = osnet_x1_0(pretrained_path=weights_path).to(self.device)
        self.model.eval()

        # Standard Person Re-ID preprocessing pipeline (Height: 256, Width: 128)
        self.transform = transforms.Compose([
            transforms.Resize((256, 128)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        logger.info(f"ReIDEmbedder initialized with model={self.model_name} on device={self.device}")

    def compute_embedding(self, image_input: Union[bytes, str, Image.Image, np.ndarray]) -> Dict[str, Any]:
        """
        Computes 512-d unit normalized person Re-ID embedding from image bytes, PIL Image, or file path.
        
        Returns:
            Dict containing:
            - embedding: List[float] (512 dimensions, L2-normalized)
            - dimension: int (512)
            - model: str
        """
        import base64
        import urllib.request

        # 1. Load into transient PIL Image
        if isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, str):
            if image_input.startswith("data:image/") and ";base64," in image_input:
                b64_data = image_input.split(";base64,", 1)[1]
                raw_bytes = base64.b64decode(b64_data)
                image = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
            elif image_input.startswith("http://") or image_input.startswith("https://"):
                try:
                    req = urllib.request.Request(image_input, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        raw_bytes = resp.read()
                    image = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
                except Exception as e:
                    raise ValueError(f"Failed to fetch image from URL ({image_input}): {str(e)}")
            elif os.path.exists(image_input):
                image = Image.open(image_input).convert("RGB")
            else:
                try:
                    raw_bytes = base64.b64decode(image_input)
                    image = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
                except Exception:
                    raise ValueError(f"Failed to load image from string: {image_input[:100]}")
        elif isinstance(image_input, Image.Image):
            image = image_input.convert("RGB")
        elif isinstance(image_input, np.ndarray):
            image = Image.fromarray(image_input).convert("RGB")
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        # 2. Preprocess & Tensor forward pass (256x128)
        tensor = self.transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            feat = self.model(tensor) # (1, 512)
            norm_feat = nn.functional.normalize(feat, p=2, dim=1)
            embedding = norm_feat.squeeze(0).cpu().numpy().tolist()

        # 3. Immediate cleanup
        del tensor, feat, norm_feat, image

        return {
            "embedding": embedding,
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
