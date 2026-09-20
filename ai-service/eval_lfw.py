import os
import sys
import numpy as np
from typing import List, Tuple
from sklearn.metrics import roc_curve, auc
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app
from loaders.lfw_loader import load_lfw_pairs
from models.face_embedder import FaceEmbedder

def evaluate_lfw_protocol():
    print("=" * 80)
    print("MISXMATCH AI-SERVICE: PHASE 4 LFW VERIFICATION EVALUATION (TPR @ FIXED FPR)")
    print("=" * 80)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lfw_dir = os.path.join(base_dir, "archive (2)", "lfw-deepfunneled", "lfw-deepfunneled")
    pairs_file = os.path.join(base_dir, "archive (2)", "pairs.csv")

    client = TestClient(app)

    # 1. Load pairs from Phase 0.5 Loader
    print(f"Loading pairs from: {pairs_file}")
    raw_pairs = load_lfw_pairs(lfw_dir, pairs_file, verify_images=True)
    
    # In addition to pairs.csv, load dev pairs for comprehensive coverage
    for dev_file in ["matchpairsDevTrain.csv", "matchpairsDevTest.csv"]:
        dev_path = os.path.join(base_dir, "archive (2)", dev_file)
        if os.path.exists(dev_path):
            raw_pairs.extend(load_lfw_pairs(lfw_dir, dev_path, verify_images=True))
    
    # Deduplicate same pairs
    same_pairs = list(set([(p[0], p[1], True) for p in raw_pairs if p[2]]))
    print(f"Loaded {len(same_pairs)} unique verified same-person pairs from local LFW dataset.")

    # Generate balanced different-person pairs across available individuals in local dataset
    person_dirs = [d for d in os.listdir(lfw_dir) if os.path.isdir(os.path.join(lfw_dir, d))]
    person_images = {}
    for p in person_dirs:
        imgs = [os.path.join(lfw_dir, p, f) for f in os.listdir(os.path.join(lfw_dir, p)) if f.lower().endswith((".jpg", ".png"))]
        if imgs:
            person_images[p] = imgs

    diff_pairs = []
    p_names = list(person_images.keys())
    for i in range(len(p_names)):
        for j in range(i + 1, len(p_names)):
            img1 = person_images[p_names[i]][0]
            img2 = person_images[p_names[j]][0]
            diff_pairs.append((img1, img2, False))

    eval_pairs = same_pairs + diff_pairs
    print(f"Total Evaluation Pairs: {len(eval_pairs)} ({len(same_pairs)} positive pairs, {len(diff_pairs)} negative pairs).")

    # 2. Extract Embeddings & Compute Similarities
    print("\nExtracting face embeddings via POST /embed/face endpoint...")
    embedding_cache = {}

    def get_embedding(img_path: str) -> List[float]:
        if img_path in embedding_cache:
            return embedding_cache[img_path]
        with open(img_path, "rb") as f:
            resp = client.post("/embed/face", content=f.read(), headers={"Content-Type": "image/jpeg"})
        emb = resp.json()["embedding"]
        embedding_cache[img_path] = emb
        return emb

    y_true = []
    y_scores = []

    for img1_path, img2_path, is_same in eval_pairs:
        e1 = get_embedding(img1_path)
        e2 = get_embedding(img2_path)
        sim = FaceEmbedder.cosine_similarity(e1, e2)
        y_true.append(1 if is_same else 0)
        y_scores.append(sim)

    y_true = np.array(y_true)
    y_scores = np.array(y_scores)

    # 3. Compute ROC & Recall-Oriented Metrics (TPR @ fixed FPR)
    fpr, tpr, thresholds = roc_curve(y_true, y_scores)
    roc_auc = auc(fpr, tpr)

    def tpr_at_fixed_fpr(target_fpr: float) -> Tuple[float, float]:
        # Find threshold where FPR <= target_fpr
        idx = np.where(fpr <= target_fpr)[0]
        if len(idx) == 0:
            return 0.0, float(thresholds[-1])
        selected_idx = idx[-1]
        return float(tpr[selected_idx]), float(thresholds[selected_idx])

    tpr_at_01, thresh_01 = tpr_at_fixed_fpr(0.10)
    tpr_at_001, thresh_001 = tpr_at_fixed_fpr(0.01)
    tpr_at_0001, thresh_0001 = tpr_at_fixed_fpr(0.001)

    # Compute optimal accuracy and threshold
    accuracies = []
    for th in thresholds:
        preds = (y_scores >= th).astype(int)
        acc = np.mean(preds == y_true)
        accuracies.append(acc)
    
    best_idx = np.argmax(accuracies)
    best_acc = accuracies[best_idx]
    best_thresh = thresholds[best_idx]

    # Positive & Negative distributions
    pos_scores = y_scores[y_true == 1]
    neg_scores = y_scores[y_true == 0]

    # 4. Display Results Report
    print("\n" + "=" * 80)
    print("LFW VERIFICATION EVALUATION METRICS REPORT")
    print("=" * 80)
    print(f"Total Evaluated Image Pairs:        {len(eval_pairs)}")
    print(f"Positive (Same Person) Pairs:       {len(pos_scores)}")
    print(f"Negative (Different Person) Pairs:  {len(neg_scores)}")
    print(f"ROC Area Under Curve (AUC):         {roc_auc:.4f}")
    print(f"Peak Verification Accuracy:         {best_acc * 100:.2f}% (at threshold = {best_thresh:.4f})")
    print("-" * 80)
    print("RECALL-ORIENTED METRICS (TPR AT FIXED FPR TARGETS):")
    print(f"  • TPR @ FPR = 10% (0.10):          {tpr_at_01 * 100:.2f}% (threshold = {thresh_01:.4f})")
    print(f"  • TPR @ FPR = 1%  (0.01):          {tpr_at_001 * 100:.2f}% (threshold = {thresh_001:.4f})")
    print(f"  • TPR @ FPR = 0.1% (0.001):        {tpr_at_0001 * 100:.2f}% (threshold = {thresh_0001:.4f})")
    print("-" * 80)
    print("SIMILARITY SCORE DISTRIBUTIONS:")
    print(f"  • Positive Pairs (Same Identity): Mean = {np.mean(pos_scores):.4f}, Std = {np.std(pos_scores):.4f}, Min = {np.min(pos_scores):.4f}, Max = {np.max(pos_scores):.4f}")
    print(f"  • Negative Pairs (Diff Identity): Mean = {np.mean(neg_scores):.4f}, Std = {np.std(neg_scores):.4f}, Min = {np.min(neg_scores):.4f}, Max = {np.max(neg_scores):.4f}")
    print(f"  • Separation Margin (Δ Means):    {np.mean(pos_scores) - np.mean(neg_scores):.4f}")
    print("=" * 80)
    print("PHASE 4 EVALUATION COMPLETE!")

if __name__ == "__main__":
    evaluate_lfw_protocol()
