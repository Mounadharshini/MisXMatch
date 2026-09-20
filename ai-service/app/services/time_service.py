import math
import os
from datetime import datetime, timezone
from typing import Optional
from app.models.schemas import TimeMatchResponse

class TimeMatchService:
    def __init__(self):
        # Half-life time window in hours (where relevance score = 0.5)
        self.half_life_hours = float(os.getenv("TIME_RELEVANCE_HALF_LIFE_HOURS", "24.0"))
        # Classification threshold
        self.threshold = float(os.getenv("TIME_MATCH_THRESHOLD", "0.50"))

    def parse_iso_timestamp(self, ts_str: str) -> datetime:
        """
        Parses an ISO 8601 timestamp string and normalizes it to UTC datetime.
        Raises ValueError if format is invalid.
        """
        cleaned_ts = ts_str.strip()
        if not cleaned_ts:
            raise ValueError("Timestamp string cannot be empty or whitespace-only.")

        # Python ISO format parsing: replace Z with +00:00 for strict compatibility
        if cleaned_ts.endswith("Z") or cleaned_ts.endswith("z"):
            cleaned_ts = cleaned_ts[:-1] + "+00:00"

        try:
            dt = datetime.fromisoformat(cleaned_ts)
        except Exception as e:
            raise ValueError(f"Invalid ISO 8601 timestamp format '{ts_str}'. Expected e.g. 'YYYY-MM-DDTHH:MM:SSZ' or 'YYYY-MM-DDTHH:MM:SS+05:30'. Details: {str(e)}")

        # If naive (no timezone info), assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            # Convert to UTC
            dt = dt.astimezone(timezone.utc)

        return dt

    def calculate_relevance_score(self, hours_diff: float) -> float:
        """
        Calculates continuous exponential half-life relevance score based on time difference in hours:
        Score = exp(-ln(2) * (hours_diff / half_life))
        
        Range: [0.0 to 1.0]
        """
        if hours_diff <= 0.0:
            return 1.0
        
        score = math.exp(-math.log(2) * (hours_diff / self.half_life_hours))
        return round(min(max(score, 0.0), 1.0), 4)

    def evaluate_time_match(
        self,
        time1_str: Optional[str],
        time2_str: Optional[str]
    ) -> TimeMatchResponse:
        """
        Evaluates time relevance between two report timestamps.
        Handles missing timestamps gracefully as UNKNOWN.
        Raises ValueError for invalid timestamp formats.
        """
        # Check if timestamps are provided
        if (
            time1_str is None
            or time2_str is None
            or not str(time1_str).strip()
            or not str(time2_str).strip()
            or str(time1_str).strip().lower() == "unknown"
            or str(time2_str).strip().lower() == "unknown"
        ):
            return TimeMatchResponse(
                success=True,
                available=False,
                timeDifferenceHours=None,
                timeDifferenceMinutes=None,
                timeDifferenceDays=None,
                timeRelevanceScore=None,
                matchStatus="UNKNOWN_TIME",
                status="UNKNOWN",
                threshold=self.threshold,
                explanation="One or both timestamps are missing or unknown. Relevance cannot be determined.",
                message="Time data is missing. Marked as UNKNOWN without score penalty."
            )

        # Parse ISO timestamps into UTC datetimes
        dt1 = self.parse_iso_timestamp(str(time1_str))
        dt2 = self.parse_iso_timestamp(str(time2_str))

        # Compute absolute time difference
        diff_seconds = abs((dt2 - dt1).total_seconds())
        diff_hours = round(diff_seconds / 3600.0, 4)
        diff_minutes = round(diff_seconds / 60.0, 2)
        diff_days = round(diff_seconds / 86400.0, 4)

        # Calculate relevance score
        relevance_score = self.calculate_relevance_score(diff_hours)

        # Classify match status
        if relevance_score >= 0.80:
            match_status = "HIGH_TIME_RELEVANCE"
            status = "MATCH"
            explanation = f"Time difference is {diff_hours} hour(s) ({diff_minutes} minutes). High temporal proximity relevance."
        elif relevance_score >= self.threshold:
            match_status = "MEDIUM_TIME_RELEVANCE"
            status = "MATCH"
            explanation = f"Time difference is {diff_hours} hour(s) ({diff_days} days). Moderate temporal proximity relevance."
        else:
            match_status = "LOW_TIME_RELEVANCE"
            status = "MISMATCH"
            explanation = f"Time difference is {diff_hours} hour(s) ({diff_days} days). Low temporal proximity relevance."

        return TimeMatchResponse(
            success=True,
            available=True,
            timeDifferenceHours=diff_hours,
            timeDifferenceMinutes=diff_minutes,
            timeDifferenceDays=diff_days,
            timeRelevanceScore=relevance_score,
            matchStatus=match_status,
            status=status,
            threshold=self.threshold,
            explanation=explanation,
            message="Temporal time relevance comparison completed successfully."
        )
