import os
import sys
import numpy as np
from typing import List, Tuple, Dict
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app
from loaders.market1501_loader import load_market1501_split
from models.reid_embedder import ReIDEmbedder

def evaluate_market1501_protocol(max_queries: int = 100, max_gallery: int = 1500):
    print("=" * 80)
    print("MISXMATCH AI-SERVICE: PHASE 5 MARKET-1501 RE-ID EVALUATION (Rank-1 / mAP)")
    print("=" * 80)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    market_dir = os.path.join(base_dir, "archive (1)", "Market-1501-v15.09.15", "bounding_box_test")

    client = TestClient(app)

    # 1. Load Market-1501 records from Phase 0.5 Loader
    print(f"Loading Market-1501 images from: {market_dir}")
    all_records = load_market1501_split(market_dir, verify_images=False)
    
    # Filter valid identities (person_id > 0 and not distractor -1/0000)
    valid_records = [r for r in all_records if r[1] != "-1" and r[1] != "0000" and int(r[1]) > 0]
    print(f"Total labeled records: {len(valid_records)} across {len(set(r[1] for r in valid_records))} unique identities.")

    # 2. Build Query & Gallery Sets (Market-1501 Cross-Camera Evaluation Protocol)
    pid_to_recs = {}
    for r in valid_records:
        pid = r[1]
        if pid not in pid_to_recs:
            pid_to_recs[pid] = []
        pid_to_recs[pid].append(r)

    # Select query probes (1 probe image per camera per person for identities with multiple cameras)
    queries = []
    gallery = []

    for pid, recs in pid_to_recs.items():
        cams_seen = {}
        for r in recs:
            c = r[2]
            if c not in cams_seen:
                cams_seen[c] = []
            cams_seen[c].append(r)
        
        if len(cams_seen) >= 2:
            # First image of first camera is query probe
            first_cam = list(cams_seen.keys())[0]
            queries.append(cams_seen[first_cam][0])
            
            # Remaining images across all cameras go into gallery
            for c, c_recs in cams_seen.items():
                if c == first_cam:
                    gallery.extend(c_recs[1:])
                else:
                    gallery.extend(c_recs)
        else:
            gallery.extend(recs)

    # Subsample for fast evaluation run if large
    if len(queries) > max_queries:
        queries = queries[:max_queries]
    if len(gallery) > max_gallery:
        gallery = gallery[:max_gallery]

    print(f"Evaluation Setup: {len(queries)} Query Probes evaluated against {len(gallery)} Gallery Candidates.")

    # 3. Extract Embeddings via POST /embed/reid
    print("\nExtracting Re-ID embeddings via POST /embed/reid endpoint...")
    embedding_cache = {}

    def get_embedding(img_path: str) -> np.ndarray:
        if img_path in embedding_cache:
            return embedding_cache[img_path]
        with open(img_path, "rb") as f:
            resp = client.post("/embed/reid", content=f.read(), headers={"Content-Type": "image/jpeg"})
        emb = np.array(resp.json()["embedding"], dtype=np.float32)
        embedding_cache[img_path] = emb
        return emb

    query_feats = np.array([get_embedding(q[0]) for q in queries])
    gallery_feats = np.array([get_embedding(g[0]) for g in gallery])

    # 4. Compute Distance Matrix & Rank-k / mAP
    print("\nComputing Cosine Distance Matrix & Ranking Candidates...")
    # Cosine Similarity Matrix: (N_query, N_gallery)
    sim_matrix = np.dot(query_feats, gallery_feats.T)

    cmc = np.zeros(len(gallery))
    all_ap = []

    for q_idx in range(len(queries)):
        q_path, q_pid, q_cam = queries[q_idx]
        scores = sim_matrix[q_idx] # (N_gallery,)

        # Sort gallery descending by similarity
        rank_indices = np.argsort(-scores)

        # Standard Market-1501 evaluation masking:
        # Same pid & same camera = junk (ignore)
        # Same pid & diff camera = true positive
        # Diff pid = false positive
        valid_indices = []
        is_match = []

        for g_idx in rank_indices:
            g_path, g_pid, g_cam = gallery[g_idx]
            if g_pid == q_pid and g_cam == q_cam:
                continue # ignore junk (same viewpoint)
            valid_indices.append(g_idx)
            is_match.append(1 if g_pid == q_pid else 0)

        is_match = np.array(is_match)
        total_positives = np.sum(is_match)

        if total_positives == 0:
            continue # No valid gallery match for this query

        # 1. Compute Cumulative Match Characteristic (CMC)
        match_positions = np.where(is_match == 1)[0]
        first_match_rank = match_positions[0]
        cmc[first_match_rank:] += 1

        # 2. Compute Average Precision (AP)
        cum_matches = np.cumsum(is_match)
        ranks = np.arange(1, len(is_match) + 1)
        precision_at_k = cum_matches / ranks
        ap = np.sum(precision_at_k * is_match) / total_positives
        all_ap.append(ap)

    # Normalize CMC and mAP
    num_valid_queries = len(all_ap)
    cmc = (cmc[:20] / num_valid_queries) * 100.0
    mAP = np.mean(all_ap) * 100.0

    rank1 = cmc[0]
    rank5 = cmc[4] if len(cmc) >= 5 else cmc[-1]
    rank10 = cmc[9] if len(cmc) >= 10 else cmc[-1]

    # 5. Display Evaluation Report
    print("\n" + "=" * 80)
    print("MARKET-1501 PERSON RE-IDENTIFICATION EVALUATION REPORT")
    print("=" * 80)
    print(f"Pretrained Model Architecture:      OSNet x1_0 (Omni-Scale Network)")
    print(f"Training Dataset Weights:           Market-1501 (751 identities)")
    print(f"Evaluated Query Probes:             {num_valid_queries}")
    print(f"Gallery Search Space:               {len(gallery)} images")
    print("-" * 80)
    print("CUMULATIVE MATCHING CHARACTERISTIC (CMC) & mAP RESULTS:")
    print(f"  • Rank-1 Identification Accuracy:  {rank1:.2f}%")
    print(f"  • Rank-5 Identification Accuracy:  {rank5:.2f}%")
    print(f"  • Rank-10 Identification Accuracy: {rank10:.2f}%")
    print(f"  • Mean Average Precision (mAP):    {mAP:.2f}%")
    print("-" * 80)
    print("RECALL-ORIENTED EVALUATION NOTE:")
    print("  • Rank-1 measures top-candidate retrieval precision.")
    print("  • mAP measures overall recall across multiple cameras and viewpoints.")
    print("=" * 80)
    print("PHASE 5 MARKET-1501 EVALUATION COMPLETE!")

if __name__ == "__main__":
    evaluate_market1501_protocol()
