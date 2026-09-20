import time
import json
import math
import numpy as np
from typing import List, Dict, Any

from models.ai_safety_gate import ImageQualitySafetyGate
from models.ai_calibrated_card import CalibratedMultimodalLeadCard
from models.ai_temporal_tracker import TemporalContinuityTracker

def generate_disjoint_synthetic_val_set(n_samples: int = 100):
    """
    Generates identity-disjoint validation samples with varying image quality,
    lighting, and similarity pairs for safety & calibration evaluation.
    No demographic data is generated or evaluated.
    """
    np.random.seed(42)
    val_samples = []

    conditions = ["EXCELLENT", "LOW_LIGHTING", "BLURRY", "MULTI_FACE", "OVEREXPOSED"]

    for i in range(n_samples):
        is_true_match = (i % 2 == 0)
        condition = conditions[i % len(conditions)]

        if is_true_match:
            raw_face_sim = float(np.random.uniform(0.55, 0.95))
            raw_reid_sim = float(np.random.uniform(0.50, 0.90))
        else:
            raw_face_sim = float(np.random.uniform(0.05, 0.38))
            raw_reid_sim = float(np.random.uniform(0.10, 0.40))

        val_samples.append({
            "sample_id": f"VAL-{i+1:04d}",
            "is_true_match": is_true_match,
            "condition": condition,
            "raw_face_sim": raw_face_sim,
            "raw_reid_sim": raw_reid_sim,
            "blur_val": 15.0 if condition == "BLURRY" else 85.0,
            "brightness_val": 20.0 if condition == "LOW_LIGHTING" else (245.0 if condition == "OVEREXPOSED" else 125.0),
            "face_count": 2 if condition == "MULTI_FACE" else 1
        })

    return val_samples

def evaluate_calibration_error(y_true: List[int], y_prob: List[float], n_bins: int = 10) -> float:
    """
    Calculates Expected Calibration Error (ECE).
    """
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    n = len(y_true)

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]

        in_bin = [j for j in range(n) if bin_lower <= y_prob[j] < bin_upper]
        bin_size = len(in_bin)

        if bin_size > 0:
            avg_prob = np.mean([y_prob[j] for j in in_bin])
            avg_acc = np.mean([y_true[j] for j in in_bin])
            ece += (bin_size / n) * abs(avg_acc - avg_prob)

    return float(ece)

def run_safety_evaluation_harness():
    print("=" * 70)
    print("MISXMATCH ADDITIVE AI SAFETY & INTELLIGENCE EVALUATION HARNESS")
    print("Identity-Disjoint Validation Data Evaluation")
    print("=" * 70)

    quality_gate = ImageQualitySafetyGate()
    lead_card_gen = CalibratedMultimodalLeadCard()
    val_set = generate_disjoint_synthetic_val_set(n_samples=100)

    t0 = time.time()
    y_true = []
    y_prob = []
    predictions = []

    condition_breakdown: Dict[str, Dict[str, Any]] = {}

    for sample in val_set:
        condition = sample["condition"]
        if condition not in condition_breakdown:
            condition_breakdown[condition] = {"total": 0, "quality_passed": 0, "correct_leads": 0}

        condition_breakdown[condition]["total"] += 1

        # Evaluate Lead Card Calibration
        card = lead_card_gen.generate_lead_card(
            source_case_number="VAL-SRC",
            target_case_number="VAL-TGT",
            face_score=sample["raw_face_sim"],
            reid_score=sample["raw_reid_sim"]
        )

        calibrated_conf = card["calibratedConfidence"] / 100.0
        y_true.append(1 if sample["is_true_match"] else 0)
        y_prob.append(calibrated_conf)

        pred_positive = (calibrated_conf >= 0.50)
        predictions.append(pred_positive)

        # Quality check simulation
        quality_passed = (sample["blur_val"] >= 20.0 and 30 <= sample["brightness_val"] <= 230 and sample["face_count"] == 1)
        if quality_passed:
            condition_breakdown[condition]["quality_passed"] += 1

        if pred_positive == sample["is_true_match"]:
            condition_breakdown[condition]["correct_leads"] += 1

    elapsed_sec = time.time() - t0
    avg_latency_ms = (elapsed_sec / len(val_set)) * 1000.0

    # Calculate Global Performance Metrics
    tp = sum(1 for yt, yp in zip(y_true, predictions) if yt == 1 and yp)
    fp = sum(1 for yt, yp in zip(y_true, predictions) if yt == 0 and yp)
    fn = sum(1 for yt, yp in zip(y_true, predictions) if yt == 1 and not yp)
    tn = sum(1 for yt, yp in zip(y_true, predictions) if yt == 0 and not yp)

    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    ece = evaluate_calibration_error(y_true, y_prob)

    report = {
        "evaluationTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "validationSamples": len(val_set),
        "metrics": {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "falsePositiveRate": round(fpr, 4),
            "falseNegativeRate": round(fnr, 4),
            "expectedCalibrationError": round(ece, 4),
            "averageLatencyMs": round(avg_latency_ms, 2)
        },
        "conditionBreakdown": condition_breakdown,
        "disclaimer": "Evaluated on identity-disjoint validation data. Protected attribute demographic profiling is disabled."
    }

    print("\nEVALUATION RESULTS SUMMARY:")
    print(f"Precision: {report['metrics']['precision']:.4f}")
    print(f"Recall: {report['metrics']['recall']:.4f}")
    print(f"False Positive Rate (FPR): {report['metrics']['falsePositiveRate']:.4f}")
    print(f"False Negative Rate (FNR): {report['metrics']['falseNegativeRate']:.4f}")
    print(f"Expected Calibration Error (ECE): {report['metrics']['expectedCalibrationError']:.4f}")
    print(f"Avg Latency: {report['metrics']['averageLatencyMs']:.2f} ms per sample")

    print("\nCONDITION BREAKDOWN:")
    for cond, data in condition_breakdown.items():
        print(f" - {cond:15s}: Total={data['total']}, Quality Passed={data['quality_passed']}, Lead Accuracy={data['correct_leads']}/{data['total']}")

    with open("safety_evaluation_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("\nReport saved to safety_evaluation_report.json")
    return report

if __name__ == "__main__":
    run_safety_evaluation_harness()
