import os
import math
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.models.schemas import RiskScoreRequest, RiskFactorDetail, RiskScoreResponse

class RiskScoringService:
    def __init__(self):
        self.high_threshold = float(os.getenv("RISK_HIGH_THRESHOLD", "0.75"))
        self.medium_threshold = float(os.getenv("RISK_MEDIUM_THRESHOLD", "0.45"))

    def _get_normalized_raw_weights(self) -> Dict[str, float]:
        """
        Reads base weight configuration from .env and validates/normalizes
        them so the sum of raw base weights equals 1.0.
        """
        raw = {
            "age": float(os.getenv("RISK_WEIGHT_AGE", "0.25")),
            "duration": float(os.getenv("RISK_WEIGHT_DURATION", "0.20")),
            "vulnerability": float(os.getenv("RISK_WEIGHT_VULNERABILITY", "0.20")),
            "danger": float(os.getenv("RISK_WEIGHT_DANGER", "0.25")),
            "sighting": float(os.getenv("RISK_WEIGHT_SIGHTING", "0.10")),
        }
        total_raw = sum(raw.values())
        if total_raw <= 0:
            return {"age": 0.25, "duration": 0.20, "vulnerability": 0.20, "danger": 0.25, "sighting": 0.10}

        return {k: round(v / total_raw, 4) for k, v in raw.items()}

    def _parse_utc_datetime(self, ts_str: str) -> Optional[datetime]:
        """Parses ISO 8601 string to UTC datetime."""
        if not ts_str or not str(ts_str).strip():
            return None
        cleaned = str(ts_str).strip()
        if cleaned.endswith("Z") or cleaned.endswith("z"):
            cleaned = cleaned[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt
        except Exception:
            return None

    def evaluate_risk(self, request: RiskScoreRequest) -> RiskScoreResponse:
        """
        Evaluates risk factors, normalizes weights over available fields,
        and computes deterministic case priority risk score [0.0 to 1.0].
        """
        raw_weights = self._get_normalized_raw_weights()
        factors: Dict[str, RiskFactorDetail] = {}

        # -------------------------------------------------------------
        # 1. Age Vulnerability Risk
        # -------------------------------------------------------------
        if request.age is not None:
            if not (0 <= request.age <= 130):
                raise ValueError(f"'age' must be between 0 and 130 years. Received: {request.age}")

            if request.age < 12:
                age_score = 1.00
                status_str = "HIGH_RISK"
                explanation = f"Young child ({request.age} years old) represents highest age vulnerability."
            elif 12 <= request.age <= 17:
                age_score = 0.75
                status_str = "HIGH_RISK"
                explanation = f"Minor ({request.age} years old) represents heightened vulnerability."
            elif request.age >= 65:
                age_score = 0.90
                status_str = "HIGH_RISK"
                explanation = f"Senior/elderly individual ({request.age} years old) represents high vulnerability."
            else:
                age_score = 0.25
                status_str = "LOW_RISK"
                explanation = f"Adult age group ({request.age} years old)."

            factors["age"] = RiskFactorDetail(
                available=True,
                score=age_score,
                rawWeight=raw_weights["age"],
                effectiveWeight=None,
                status=status_str,
                explanation=explanation
            )
        else:
            factors["age"] = RiskFactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["age"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation="Age is missing or unspecified."
            )

        # -------------------------------------------------------------
        # 2. Case Duration Risk
        # -------------------------------------------------------------
        ref_dt = self._parse_utc_datetime(request.lastSeenDate) or self._parse_utc_datetime(request.createdAt)
        if ref_dt is not None:
            now_utc = datetime.now(timezone.utc)
            diff_hours = (now_utc - ref_dt).total_seconds() / 3600.0
            if diff_hours < 0:
                diff_hours = 0.0

            if diff_hours <= 12.0:
                dur_score = 0.50
                status_str = "MEDIUM_RISK"
                explanation = f"Disappeared {round(diff_hours, 1)} hours ago (Initial search window)."
            elif 12.0 < diff_hours <= 48.0:
                dur_score = 0.85
                status_str = "HIGH_RISK"
                explanation = f"Disappeared {round(diff_hours, 1)} hours ago (Critical 48-hour golden window)."
            elif 48.0 < diff_hours <= 168.0:  # Within 7 days
                dur_score = 1.00
                status_str = "HIGH_RISK"
                explanation = f"Disappeared {round(diff_hours / 24.0, 1)} days ago (Extended unresolved period)."
            else:
                dur_score = 0.70
                status_str = "MEDIUM_RISK"
                explanation = f"Long-term missing case ({round(diff_hours / 24.0, 1)} days elapsed)."

            factors["duration"] = RiskFactorDetail(
                available=True,
                score=dur_score,
                rawWeight=raw_weights["duration"],
                effectiveWeight=None,
                status=status_str,
                explanation=explanation
            )
        else:
            factors["duration"] = RiskFactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["duration"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation="Disappearance date or creation timestamp is missing."
            )

        # -------------------------------------------------------------
        # 3. Medical / Vulnerability Risk
        # -------------------------------------------------------------
        high_vuln_keywords = [
            "insulin", "dementia", "alzheimer", "disabled", "wheelchair", "autism",
            "epilepsy", "schizophrenia", "suicidal", "heart condition", "life threatening",
            "special needs", "mental disability"
        ]
        med_vuln_keywords = ["medication", "pregnant", "asthma", "allergic", "depression"]

        combined_text = " ".join([
            str(request.medicalConditions or ""),
            " ".join(request.vulnerabilityFlags or []),
            str(request.description or "")
        ]).lower()

        has_vuln_data = bool(request.medicalConditions or request.vulnerabilityFlags or request.description)

        if has_vuln_data and combined_text.strip():
            matched_high = [k for k in high_vuln_keywords if k in combined_text]
            matched_med = [k for k in med_vuln_keywords if k in combined_text]

            if matched_high:
                vuln_score = 1.00
                status_str = "HIGH_RISK"
                explanation = f"High medical vulnerability indicators identified: {', '.join(matched_high[:3])}."
            elif matched_med or (request.vulnerabilityFlags and len(request.vulnerabilityFlags) > 0):
                vuln_score = 0.65
                status_str = "MEDIUM_RISK"
                explanation = f"Moderate vulnerability indicators identified: {', '.join(matched_med[:3]) if matched_med else 'special flags'}."
            else:
                vuln_score = 0.10
                status_str = "LOW_RISK"
                explanation = "No medical or vulnerability indicators identified."

            factors["vulnerability"] = RiskFactorDetail(
                available=True,
                score=vuln_score,
                rawWeight=raw_weights["vulnerability"],
                effectiveWeight=None,
                status=status_str,
                explanation=explanation
            )
        else:
            factors["vulnerability"] = RiskFactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["vulnerability"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation="Medical conditions and vulnerability flags are unspecified."
            )

        # -------------------------------------------------------------
        # 4. Danger & Threat Indicators Risk
        # -------------------------------------------------------------
        danger_keywords = [
            "abduction", "kidnapped", "coerced", "foul play", "threat", "weapon",
            "forced", "suspicious vehicle", "ransom", "violence", "armed", "stalker", "abuse"
        ]
        danger_text = " ".join([
            " ".join(request.dangerIndicators or []),
            str(request.description or "")
        ]).lower()

        has_danger_data = bool(request.dangerIndicators or request.description)

        if has_danger_data and danger_text.strip():
            matched_danger = [k for k in danger_keywords if k in danger_text]
            if matched_danger:
                danger_score = 1.00
                status_str = "HIGH_RISK"
                explanation = f"Critical danger/threat indicators identified: {', '.join(matched_danger[:3])}."
            else:
                danger_score = 0.10
                status_str = "LOW_RISK"
                explanation = "No explicit danger or threat indicators identified."

            factors["danger"] = RiskFactorDetail(
                available=True,
                score=danger_score,
                rawWeight=raw_weights["danger"],
                effectiveWeight=None,
                status=status_str,
                explanation=explanation
            )
        else:
            factors["danger"] = RiskFactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["danger"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation="Danger and threat indicators are unspecified."
            )

        # -------------------------------------------------------------
        # 5. Sighting Activity & Recency Risk
        # -------------------------------------------------------------
        if request.lastSightingHoursAgo is not None or request.recentSightingsCount is not None:
            hours_ago = request.lastSightingHoursAgo
            if hours_ago is not None and hours_ago < 0:
                raise ValueError(f"'lastSightingHoursAgo' cannot be negative. Received: {hours_ago}")

            if hours_ago is not None:
                if hours_ago <= 12.0:
                    sighting_score = 1.00
                    status_str = "HIGH_RISK"
                    explanation = f"Urgent active sighting lead reported {round(hours_ago, 1)} hours ago."
                elif 12.0 < hours_ago <= 48.0:
                    sighting_score = 0.75
                    status_str = "HIGH_RISK"
                    explanation = f"Recent sighting lead reported {round(hours_ago, 1)} hours ago."
                else:
                    sighting_score = 0.35
                    status_str = "LOW_RISK"
                    explanation = f"Last sighting lead reported {round(hours_ago / 24.0, 1)} days ago."
            elif request.recentSightingsCount and request.recentSightingsCount > 0:
                sighting_score = 0.70
                status_str = "MEDIUM_RISK"
                explanation = f"{request.recentSightingsCount} recent sighting lead(s) reported."
            else:
                sighting_score = 0.40
                status_str = "LOW_RISK"
                explanation = "No recent sightings or leads reported."

            factors["sighting"] = RiskFactorDetail(
                available=True,
                score=sighting_score,
                rawWeight=raw_weights["sighting"],
                effectiveWeight=None,
                status=status_str,
                explanation=explanation
            )
        else:
            factors["sighting"] = RiskFactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["sighting"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation="Sighting leads and recency information are unspecified."
            )

        # -------------------------------------------------------------
        # Dynamic Weight Normalization & Overall Score Calculation
        # -------------------------------------------------------------
        available_factors_count = sum(1 for f in factors.values() if f.available)
        available_weight_sum = sum(f.rawWeight for f in factors.values() if f.available)

        if available_factors_count == 0 or available_weight_sum <= 0:
            return RiskScoreResponse(
                success=True,
                riskScore=None,
                riskLevel="UNKNOWN",
                availableFactorsCount=0,
                totalFactorsEvaluated=5,
                factors=factors,
                reason="Insufficient case details provided to compute risk score.",
                message="AI-assisted risk prioritization assessment. Authorized personnel decision support only."
            )

        weighted_score_sum = 0.0
        reasons_list = []
        for f_name, f_detail in factors.items():
            if f_detail.available and f_detail.score is not None:
                eff_weight = round(f_detail.rawWeight / available_weight_sum, 4)
                f_detail.effectiveWeight = eff_weight
                weighted_score_sum += f_detail.score * f_detail.rawWeight
                if f_detail.status == "HIGH_RISK":
                    reasons_list.append(f_detail.explanation)

        overall_risk_score = round(weighted_score_sum / available_weight_sum, 4)
        overall_risk_score = min(max(overall_risk_score, 0.0), 1.0)

        # Classify Risk Level
        if overall_risk_score >= self.high_threshold:
            risk_level = "HIGH"
        elif overall_risk_score >= self.medium_threshold:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        if reasons_list:
            synthesized_reason = f"High-priority case indicators: {' '.join(reasons_list)}"
        else:
            synthesized_reason = f"Case evaluated as {risk_level} urgency priority based on available case factors."

        disclaimer = "AI-assisted risk prioritization assessment based on provided case indicators. Authorized personnel decision support only."

        return RiskScoreResponse(
            success=True,
            riskScore=overall_risk_score,
            riskLevel=risk_level,
            availableFactorsCount=available_factors_count,
            totalFactorsEvaluated=5,
            factors=factors,
            reason=synthesized_reason,
            message=disclaimer
        )
