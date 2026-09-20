import os
import sys
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app
from models.face_embedder import FaceEmbedder

def test_face_embeddings_manual():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lfw_base = os.path.join(base_dir, "archive (2)", "lfw-deepfunneled", "lfw-deepfunneled")
    
    print("=" * 75)
    print("MISXMATCH AI-SERVICE: PHASE 2 FACE EMBEDDING & COSINE SIMILARITY TEST")
    print("=" * 75)

    client = TestClient(app)

    # 1. Test POST /embed/face via direct binary image upload
    sample_img_path = os.path.join(lfw_base, "Aaron_Peirsol", "Aaron_Peirsol_0001.jpg")
    print(f"\n--- [1/3] Testing POST /embed/face with real image: {os.path.basename(sample_img_path)} ---")
    
    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()
    
    response = client.post(
        "/embed/face",
        content=img_bytes,
        headers={"Content-Type": "image/jpeg"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    print(f"HTTP Status: {response.status_code}")
    print(f"Extraction Status: {data['status']}")
    print(f"Biometric Model: {data['model']}")
    print(f"Embedding Vector Length: {data['dimension']} dimensions")
    print(f"Detected Bounding Box [x1, y1, x2, y2]: {data['bbox']}")
    print(f"Inference Latency: {data['execution_time_ms']} ms")
    print(f"Sample Embedding Values: {data['embedding'][:6]} ...")

    # 2. Setup same-person vs different-person pairs from real LFW dataset
    print("\n--- [2/3] Extracting Embeddings for Same vs Different Person Pairs ---")
    
    pairs_to_test = [
        # SAME-PERSON PAIRS
        {
            "type": "SAME PERSON",
            "person1": "Aaron_Peirsol",
            "img1": os.path.join(lfw_base, "Aaron_Peirsol", "Aaron_Peirsol_0001.jpg"),
            "person2": "Aaron_Peirsol",
            "img2": os.path.join(lfw_base, "Aaron_Peirsol", "Aaron_Peirsol_0002.jpg")
        },
        {
            "type": "SAME PERSON",
            "person1": "Abdullah_Gul",
            "img1": os.path.join(lfw_base, "Abdullah_Gul", "Abdullah_Gul_0001.jpg"),
            "person2": "Abdullah_Gul",
            "img2": os.path.join(lfw_base, "Abdullah_Gul", "Abdullah_Gul_0006.jpg")
        },
        {
            "type": "SAME PERSON",
            "person1": "Abel_Pacheco",
            "img1": os.path.join(lfw_base, "Abel_Pacheco", "Abel_Pacheco_0001.jpg"),
            "person2": "Abel_Pacheco",
            "img2": os.path.join(lfw_base, "Abel_Pacheco", "Abel_Pacheco_0004.jpg")
        },
        # DIFFERENT-PERSON PAIRS
        {
            "type": "DIFFERENT PERSON",
            "person1": "Aaron_Peirsol",
            "img1": os.path.join(lfw_base, "Aaron_Peirsol", "Aaron_Peirsol_0001.jpg"),
            "person2": "Abel_Pacheco",
            "img2": os.path.join(lfw_base, "Abel_Pacheco", "Abel_Pacheco_0001.jpg")
        },
        {
            "type": "DIFFERENT PERSON",
            "person1": "Abdullah_Gul",
            "img1": os.path.join(lfw_base, "Abdullah_Gul", "Abdullah_Gul_0001.jpg"),
            "person2": "Aaron_Sorkin",
            "img2": os.path.join(lfw_base, "Aaron_Sorkin", "Aaron_Sorkin_0001.jpg")
        },
        {
            "type": "DIFFERENT PERSON",
            "person1": "Aaron_Eckhart",
            "img1": os.path.join(lfw_base, "Aaron_Eckhart", "Aaron_Eckhart_0001.jpg"),
            "person2": "Adam_Sandler",
            "img2": os.path.join(lfw_base, "Adam_Sandler", "Adam_Sandler_0001.jpg")
        }
    ]

    results = []
    for pair in pairs_to_test:
        with open(pair["img1"], "rb") as f1, open(pair["img2"], "rb") as f2:
            r1 = client.post("/embed/face", content=f1.read(), headers={"Content-Type": "image/jpeg"}).json()
            r2 = client.post("/embed/face", content=f2.read(), headers={"Content-Type": "image/jpeg"}).json()
        
        emb1 = r1["embedding"]
        emb2 = r2["embedding"]
        sim = FaceEmbedder.cosine_similarity(emb1, emb2)
        results.append({
            "type": pair["type"],
            "pair": f"{pair['person1']} vs {pair['person2']}",
            "file1": os.path.basename(pair["img1"]),
            "file2": os.path.basename(pair["img2"]),
            "cosine_sim": round(sim, 4)
        })

    # 3. Print Results Table
    print("\n--- [3/3] Cosine Similarity Verification Table ---")
    print(f"{'Pair Type':<18} | {'Individual 1 vs Individual 2':<35} | {'Cosine Sim':<10}")
    print("-" * 75)
    for r in results:
        print(f"{r['type']:<18} | {r['pair']:<35} | {r['cosine_sim']:<10}")

    same_sims = [r["cosine_sim"] for r in results if r["type"] == "SAME PERSON"]
    diff_sims = [r["cosine_sim"] for r in results if r["type"] == "DIFFERENT PERSON"]
    
    avg_same = np.mean(same_sims)
    avg_diff = np.mean(diff_sims)
    
    print("-" * 75)
    print(f"Average SAME-PERSON similarity:      {avg_same:.4f}")
    print(f"Average DIFFERENT-PERSON similarity: {avg_diff:.4f}")
    print(f"Biometric Separation Margin:         {avg_same - avg_diff:.4f}")
    print("=" * 75)
    print("PHASE 2 VERIFICATION COMPLETE!")

if __name__ == "__main__":
    test_face_embeddings_manual()
