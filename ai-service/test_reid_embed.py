import os
import sys
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app
from loaders.market1501_loader import load_market1501_split
from models.reid_embedder import ReIDEmbedder

def test_reid_embeddings_manual():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    market_dir = os.path.join(base_dir, "archive (1)", "Market-1501-v15.09.15", "bounding_box_test")

    print("=" * 75)
    print("MISXMATCH AI-SERVICE: PHASE 5 PERSON RE-ID & COSINE SIMILARITY TEST")
    print("=" * 75)

    client = TestClient(app)

    # 1. Load Market-1501 records from Phase 0.5 Loader
    records = load_market1501_split(market_dir, verify_images=False)
    
    # Filter for valid person IDs (> 0)
    valid_records = [r for r in records if r[1] != "-1" and r[1] != "0000" and int(r[1]) > 0]
    print(f"Loaded {len(valid_records)} labeled person records.")

    # Group by person ID
    pid_to_records = {}
    for r in valid_records:
        pid = r[1]
        if pid not in pid_to_records:
            pid_to_records[pid] = []
        pid_to_records[pid].append(r)

    # Find people with images across different cameras
    multi_cam_pids = [pid for pid, recs in pid_to_records.items() if len(set(r[2] for r in recs)) > 1]
    print(f"Found {len(multi_cam_pids)} person IDs appearing across multiple camera viewpoints.")

    # 2. Test POST /embed/reid endpoint on sample image
    sample_img = valid_records[0][0]
    print(f"\n--- [1/3] Testing POST /embed/reid on: {os.path.basename(sample_img)} ---")
    with open(sample_img, "rb") as f:
        resp = client.post("/embed/reid", content=f.read(), headers={"Content-Type": "image/jpeg"})
    
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    print(f"HTTP Status: {resp.status_code}")
    print(f"Extraction Status: {data['status']}")
    print(f"Model ID: {data['model']}")
    print(f"Embedding Vector Length: {data['dimension']} dimensions")
    print(f"Inference Latency: {data['execution_time_ms']} ms")
    print(f"Sample Embedding Values (first 6): {data['embedding'][:6]} ...")

    # 3. Setup Same-Person (Cross-Camera) vs Different-Person Test Pairs
    print("\n--- [2/3] Extracting Re-ID Embeddings for Same vs Different Identity Pairs ---")
    
    test_pids = multi_cam_pids[:3]
    pairs_to_test = []

    # Same person across different cameras
    for pid in test_pids:
        recs = pid_to_records[pid]
        # Pick 2 images from distinct cameras
        cams = {}
        for r in recs:
            if r[2] not in cams:
                cams[r[2]] = r
        cam_list = list(cams.values())
        if len(cam_list) >= 2:
            pairs_to_test.append({
                "type": "SAME PERSON (CROSS-CAM)",
                "desc": f"Person {pid} (Cam {cam_list[0][2]} vs Cam {cam_list[1][2]})",
                "img1": cam_list[0][0],
                "img2": cam_list[1][0]
            })

    # Different persons
    for i in range(len(test_pids)):
        p1 = test_pids[i]
        p2 = test_pids[(i + 1) % len(test_pids)]
        img1 = pid_to_records[p1][0][0]
        img2 = pid_to_records[p2][0][0]
        pairs_to_test.append({
            "type": "DIFFERENT PERSON",
            "desc": f"Person {p1} vs Person {p2}",
            "img1": img1,
            "img2": img2
        })

    results = []
    for pair in pairs_to_test:
        with open(pair["img1"], "rb") as f1, open(pair["img2"], "rb") as f2:
            r1 = client.post("/embed/reid", content=f1.read(), headers={"Content-Type": "image/jpeg"}).json()
            r2 = client.post("/embed/reid", content=f2.read(), headers={"Content-Type": "image/jpeg"}).json()

        emb1 = r1["embedding"]
        emb2 = r2["embedding"]
        sim = ReIDEmbedder.cosine_similarity(emb1, emb2)
        results.append({
            "type": pair["type"],
            "desc": pair["desc"],
            "cosine_sim": round(sim, 4)
        })

    # 4. Display Results Table
    print("\n--- [3/3] Re-ID Cosine Similarity Verification Table ---")
    print(f"{'Pair Type':<26} | {'Comparison Pair':<35} | {'Cosine Sim':<10}")
    print("-" * 75)
    for r in results:
        print(f"{r['type']:<26} | {r['desc']:<35} | {r['cosine_sim']:<10}")

    same_sims = [r["cosine_sim"] for r in results if "SAME PERSON" in r["type"]]
    diff_sims = [r["cosine_sim"] for r in results if "DIFFERENT PERSON" in r["type"]]

    avg_same = np.mean(same_sims)
    avg_diff = np.mean(diff_sims)

    print("-" * 75)
    print(f"Average SAME-PERSON (Cross-Camera) similarity: {avg_same:.4f}")
    print(f"Average DIFFERENT-PERSON similarity:          {avg_diff:.4f}")
    print(f"Re-ID Separation Margin:                      {avg_same - avg_diff:.4f}")
    print("=" * 75)
    print("PHASE 5 RE-ID SANITY TEST COMPLETE!")

if __name__ == "__main__":
    test_reid_embeddings_manual()
