import numpy as np
from typing import Dict, Any, List, Tuple

def compute_classification_metrics(y_true: List[int], y_scores: List[float], threshold: float) -> Dict[str, Any]:
    """
    Computes rigorous classification evaluation metrics for a given decision threshold.
    
    Args:
        y_true: Ground truth binary labels (1 = Positive match, 0 = Negative match).
        y_scores: Continuous model similarity scores in range [0.0, 1.0].
        threshold: Decision threshold for positive prediction (score >= threshold).
        
    Returns:
        Dict containing Accuracy, Precision, Recall, F1-Score, FPR, FNR, TP, FP, TN, FN.
    """
    y_true_arr = np.array(y_true, dtype=int)
    y_scores_arr = np.array(y_scores, dtype=float)
    y_pred_arr = (y_scores_arr >= threshold).astype(int)

    tp = int(np.sum((y_pred_arr == 1) & (y_true_arr == 1)))
    fp = int(np.sum((y_pred_arr == 1) & (y_true_arr == 0)))
    tn = int(np.sum((y_pred_arr == 0) & (y_true_arr == 0)))
    fn = int(np.sum((y_pred_arr == 0) & (y_true_arr == 1)))

    total = len(y_true_arr)
    accuracy = float((tp + tn) / total) if total > 0 else 0.0

    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1_score = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

    # Score distributions
    pos_scores = y_scores_arr[y_true_arr == 1]
    neg_scores = y_scores_arr[y_true_arr == 0]

    pos_mean = float(np.mean(pos_scores)) if len(pos_scores) > 0 else 0.0
    neg_mean = float(np.mean(neg_scores)) if len(neg_scores) > 0 else 0.0
    separation_margin = pos_mean - neg_mean

    return {
        "threshold_evaluated": float(threshold),
        "total_pairs_evaluated": total,
        "positive_pairs_count": int(len(pos_scores)),
        "negative_pairs_count": int(len(neg_scores)),
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1_score, 4),
        "false_positive_rate": round(fpr, 4),
        "false_negative_rate": round(fnr, 4),
        "positive_score_mean": round(pos_mean, 4),
        "negative_score_mean": round(neg_mean, 4),
        "separation_margin": round(separation_margin, 4)
    }

def compute_tpr_at_fixed_fpr(y_true: List[int], y_scores: List[float], target_fpr: float) -> Tuple[float, float]:
    """
    Calculates True Positive Rate (Recall) at a fixed False Positive Rate target (e.g. 1% FPR or 10% FPR).
    """
    y_true_arr = np.array(y_true, dtype=int)
    y_scores_arr = np.array(y_scores, dtype=float)

    thresholds = np.linspace(0.0, 1.0, 101)
    best_tpr = 0.0
    best_th = 1.0

    for th in thresholds:
        y_pred = (y_scores_arr >= th).astype(int)
        fp = np.sum((y_pred == 1) & (y_true_arr == 0))
        tn = np.sum((y_pred == 0) & (y_true_arr == 0))
        tp = np.sum((y_pred == 1) & (y_true_arr == 1))
        fn = np.sum((y_pred == 0) & (y_true_arr == 1))

        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        tpr = tp / (tp + fn) if (tp + fn) > 0 else 0.0

        if fpr <= target_fpr:
            if tpr >= best_tpr:
                best_tpr = tpr
                best_th = th

    return round(float(best_tpr), 4), round(float(best_th), 4)
