import os
import time
from typing import Dict, Any, List

# Active Model Versions Traceability Registry
MODEL_VERSIONS = {
    "face_model_version": "face-embedder-v1 (ResNet50 / ArcFace 512d)",
    "text_model_version": "text-nlp-v1 (TF-IDF + MiniLM Semantic Vector)",
    "attribute_model_version": "attr-matcher-v1 (Structured Exact/Fuzzy)",
    "multi_match_version": "multi-factor-fusion-v1 (Normalized Weighted Sum)",
    "risk_model_version": "risk-scorer-v1 (Multi-Factor Vulnerability Heuristic)",
    "cctv_model_version": "cctv-hog-v1 (OpenCV HOG People Detector + Face Embedder)",
    "configuration_version": "config-v1.4.2",
    "evaluation_version": "eval-engine-v1.0.0"
}

# Production Threshold Calibration Matrix
THRESHOLDS_CONFIG = {
    "FACE_MATCH_THRESHOLD": {
        "current_value": 0.75,
        "valid_range": [0.50, 0.95],
        "purpose": "Cosine similarity cutoff for face biometric verification",
        "explanation": "Determines whether facial feature vectors belong to the same individual. Scores below 0.75 are flagged as potential mismatches."
    },
    "TEXT_MATCH_THRESHOLD": {
        "current_value": 0.65,
        "valid_range": [0.40, 0.90],
        "purpose": "NLP semantic description match cutoff",
        "explanation": "Evaluates semantic similarity between missing person physical descriptions and found person/sighting reports."
    },
    "HIGH_CONFIDENCE_THRESHOLD": {
        "current_value": 0.80,
        "valid_range": [0.70, 0.95],
        "purpose": "Trigger threshold for automated high-confidence alert notifications",
        "explanation": "Overall similarity scores >= 0.80 automatically dispatch high-priority notifications to police officers."
    },
    "POSSIBLE_MATCH_THRESHOLD": {
        "current_value": 0.60,
        "valid_range": [0.40, 0.80],
        "purpose": "Minimum cutoff for candidate match inclusion",
        "explanation": "Overall similarity scores >= 0.60 are included in candidate review feeds for human officer inspection."
    },
    "HIGH_RISK_THRESHOLD": {
        "current_value": 0.75,
        "valid_range": [0.60, 0.90],
        "purpose": "High risk urgency categorization threshold",
        "explanation": "Cases with vulnerability risk score >= 0.75 are prioritized as HIGH RISK emergencies."
    },
    "MEDIUM_RISK_THRESHOLD": {
        "current_value": 0.45,
        "valid_range": [0.30, 0.70],
        "purpose": "Medium risk urgency categorization threshold",
        "explanation": "Cases with risk score between 0.45 and 0.74 are categorized as MEDIUM RISK."
    }
}

# Default Multi-Factor Weights Configuration
DEFAULT_MULTI_FACTOR_WEIGHTS = {
    "FACE_WEIGHT": 0.35,
    "TEXT_WEIGHT": 0.25,
    "ATTRIBUTE_WEIGHT": 0.20,
    "LOCATION_WEIGHT": 0.10,
    "TIME_WEIGHT": 0.10
}

def validate_weights(weights: Dict[str, float]) -> Dict[str, Any]:
    """
    Verifies that multi-factor weights sum strictly to 1.0 (with floating-point precision tolerance).
    """
    total = sum(weights.values())
    is_valid = abs(total - 1.0) < 1e-4
    return {
        "is_valid": is_valid,
        "sum": round(total, 4),
        "weights": weights,
        "status": "VALIDATED" if is_valid else "INVALID_WEIGHT_SUM"
    }

# Global Latency Tracker for Performance Metrics
class LatencyTracker:
    def __init__(self):
        self.records = {
            "face_match": [],
            "text_match": [],
            "multi_match": [],
            "risk_score": [],
            "cctv_analysis": []
        }
        self.counters = {
            "successful_runs": 0,
            "failed_runs": 0
        }

    def record_latency(self, endpoint: str, latency_ms: float, success: bool = True):
        if endpoint in self.records:
            self.records[endpoint].append(latency_ms)
            # Retain recent 500 records
            if len(self.records[endpoint]) > 500:
                self.records[endpoint].pop(0)
        if success:
            self.counters["successful_runs"] += 1
        else:
            self.counters["failed_runs"] += 1

    def get_performance_summary(self) -> Dict[str, Any]:
        summary = {}
        for key, latencies in self.records.items():
            if latencies:
                summary[key] = {
                    "count": len(latencies),
                    "avg_ms": round(float(sum(latencies) / len(latencies)), 2),
                    "min_ms": round(float(min(latencies)), 2),
                    "max_ms": round(float(max(latencies)), 2)
                }
            else:
                summary[key] = {
                    "count": 0,
                    "avg_ms": 0.0,
                    "min_ms": 0.0,
                    "max_ms": 0.0
                }
        summary["totals"] = self.counters
        return summary

global_latency_tracker = LatencyTracker()
