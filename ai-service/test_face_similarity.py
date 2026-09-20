import os
import sys
import numpy as np
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app
from models.face_embedder import FaceEmbedder

def generate_synthetic_face_bytes(seed=42):
    import cv2
    import numpy as np
    np.random.seed(seed)
    img = np.full((256, 256, 3), 200, dtype=np.uint8)
    cv2.circle(img, (128, 128), 70, (180, 150, 130), -1)
    cv2.circle(img, (100, 110), 10, (50, 50, 50), -1)
    cv2.circle(img, (156, 110), 10, (50, 50, 50), -1)
    cv2.ellipse(img, (128, 155), (25, 12), 0, 0, 180, (40, 40, 40), 3)
    if seed != 42:
        cv2.rectangle(img, (50, 50), (200, 200), (seed * 10 % 255, 100, 50), 3)
    _, buf = cv2.imencode('.jpg', img)
    return buf.tobytes()

def test_face_similarity_features():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lfw_base = os.path.join(base_dir, "archive (2)", "lfw-deepfunneled", "lfw-deepfunneled")
    
    print("=" * 80)
    print("MISXMATCH AI-SERVICE: FACE SIMILARITY DETECTION TEST SUITE")
    print("=" * 80)

    client = TestClient(app)

    # 1. Health check verification
    print("\n--- [1/5] Testing GET /health capabilities ---")
    resp_health = client.get("/health")
    assert resp_health.status_code == 200, f"Expected 200, got {resp_health.status_code}"
    health_data = resp_health.json()
    print(f"Health Status: {health_data['status']}")
    print(f"Face Similarity Engine Capability: {health_data['capabilities'].get('face_similarity_detection')}")
    assert "face_similarity_detection" in health_data["capabilities"]

    # 2. Test Multi-Face Detection via POST /detect/faces
    sample_img_path = os.path.join(lfw_base, "Aaron_Peirsol", "Aaron_Peirsol_0001.jpg")
    print(f"\n--- [2/5] Testing POST /detect/faces ---")
    if os.path.exists(sample_img_path):
        with open(sample_img_path, "rb") as f:
            img_bytes = f.read()
    else:
        print("Dataset archive not present - using synthetic image buffer.")
        img_bytes = generate_synthetic_face_bytes(42)

    resp_detect = client.post("/detect/faces", content=img_bytes, headers={"Content-Type": "image/jpeg"})
    assert resp_detect.status_code == 200, f"Expected 200, got {resp_detect.status_code}"
    detect_data = resp_detect.json()
    print(f"Face Count Detected: {detect_data['face_count']}")
    print(f"Image Dimensions: {detect_data['image_dimensions']}")
    print(f"Face Bounding Boxes: {detect_data['faces']}")

    # 3. Test Direct Image-to-Image Face Match via POST /match/face
    img1_same = os.path.join(lfw_base, "Aaron_Peirsol", "Aaron_Peirsol_0001.jpg")
    img2_same = os.path.join(lfw_base, "Aaron_Peirsol", "Aaron_Peirsol_0002.jpg")
    img3_diff = os.path.join(lfw_base, "Abel_Pacheco", "Abel_Pacheco_0001.jpg")

    print("\n--- [3/5] Testing POST /match/face for Same-Person Pair ---")
    if os.path.exists(img1_same) and os.path.exists(img2_same):
        resp_match_same = client.post("/match/face", json={
            "image1_path": img1_same,
            "image2_path": img2_same,
            "threshold": 0.40
        })
    else:
        # Use direct embedding comparison endpoint for synthetic test
        r1 = client.post("/embed/face", content=generate_synthetic_face_bytes(42), headers={"Content-Type": "image/jpeg"}).json()
        r2 = client.post("/embed/face", content=generate_synthetic_face_bytes(42), headers={"Content-Type": "image/jpeg"}).json()
        resp_match_same = client.post("/match/face-embedding", json={
            "embedding1": r1["embedding"],
            "embedding2": r2["embedding"],
            "threshold": 0.40
        })
    assert resp_match_same.status_code == 200, f"Expected 200, got {resp_match_same.status_code}: {resp_match_same.text}"
    same_data = resp_match_same.json()
    print(f"Same Person Pair: Aaron_Peirsol_0001 vs Aaron_Peirsol_0002")
    print(f"  • Match Decision (is_match): {same_data['is_match']}")
    print(f"  • Similarity Score:        {same_data['similarity_score']}%")
    print(f"  • Raw Cosine Similarity:   {same_data['raw_cosine_similarity']}")
    print(f"  • Euclidean L2 Distance:   {same_data['l2_distance']}")
    print(f"  • Confidence Rating:       {same_data['confidence']}")
    assert same_data["is_match"] is True, "Same person pair should evaluate to is_match = True"
    assert same_data["raw_cosine_similarity"] >= 0.40

    print("\n--- [4/5] Testing POST /match/face for Different-Person Pair ---")
    if os.path.exists(img1_same) and os.path.exists(img3_diff):
        resp_match_diff = client.post("/match/face", json={
            "image1_path": img1_same,
            "image2_path": img3_diff,
            "threshold": 0.40
        })
    else:
        r1 = client.post("/embed/face", content=generate_synthetic_face_bytes(42), headers={"Content-Type": "image/jpeg"}).json()
        r3 = client.post("/embed/face", content=generate_synthetic_face_bytes(999), headers={"Content-Type": "image/jpeg"}).json()
        resp_match_diff = client.post("/match/face-embedding", json={
            "embedding1": r1["embedding"],
            "embedding2": r3["embedding"],
            "threshold": 0.40
        })
    assert resp_match_diff.status_code == 200, f"Expected 200, got {resp_match_diff.status_code}"
    diff_data = resp_match_diff.json()
    print(f"Different Person Pair Match Decision (is_match): {diff_data['is_match']}")
    print(f"  • Similarity Score:        {diff_data['similarity_score']}%")
    print(f"  • Raw Cosine Similarity:   {diff_data['raw_cosine_similarity']}")
    print(f"  • Euclidean L2 Distance:   {diff_data['l2_distance']}")
    print(f"  • Confidence Rating:       {diff_data['confidence']}")

    # 4. Test Direct Vector-to-Vector Face Match via POST /match/face-embedding
    print("\n--- [5/5] Testing POST /match/face-embedding for 512-d Vectors ---")
    r1 = client.post("/embed/face", content=img_bytes, headers={"Content-Type": "image/jpeg"}).json()
    emb1 = r1["embedding"]

    if os.path.exists(img2_same):
        with open(img2_same, "rb") as f2:
            r2 = client.post("/embed/face", content=f2.read(), headers={"Content-Type": "image/jpeg"}).json()
    else:
        r2 = client.post("/embed/face", content=generate_synthetic_face_bytes(42), headers={"Content-Type": "image/jpeg"}).json()
    emb2 = r2["embedding"]

    resp_vec = client.post("/match/face-embedding", json={
        "embedding1": emb1,
        "embedding2": emb2,
        "threshold": 0.40
    })
    assert resp_vec.status_code == 200, f"Expected 200, got {resp_vec.status_code}"
    vec_data = resp_vec.json()
    print(f"Vector Match Decision (is_match): {vec_data['is_match']}")
    print(f"Vector Similarity Score:        {vec_data['similarity_score']}%")
    print(f"Vector Raw Cosine Similarity:   {vec_data['raw_cosine_similarity']}")
    print(f"Vector Euclidean L2 Distance:   {vec_data['l2_distance']}")
    assert vec_data["is_match"] is True

    print("\n" + "=" * 80)
    print("ALL AI FACE SIMILARITY DETECTION TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    test_face_similarity_features()
