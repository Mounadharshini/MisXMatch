import math
import os
from typing import Optional
from app.models.schemas import LocationPoint, LocationMatchResponse

class LocationMatchService:
    def __init__(self):
        # Earth mean radius in kilometers (IUGG standard)
        self.EARTH_RADIUS_KM = 6371.0088
        # Half-life distance in kilometers (where relevance score = 0.5)
        self.half_life_km = float(os.getenv("LOCATION_RELEVANCE_HALF_LIFE_KM", "20.0"))
        # Classification threshold
        self.threshold = float(os.getenv("LOCATION_MATCH_THRESHOLD", "0.50"))

    def calculate_haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates the great-circle distance between two points on the Earth's surface
        using the Haversine formula.
        
        Returns distance in kilometers.
        """
        # Convert decimal degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = math.sin(dlat / 2.0) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2.0) ** 2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

        distance_km = self.EARTH_RADIUS_KM * c
        return distance_km

    def calculate_relevance_score(self, distance_km: float) -> float:
        """
        Calculates continuous exponential half-life relevance score based on distance:
        Score = exp(-ln(2) * (distance / half_life))
        
        Range: [0.0 to 1.0]
        """
        if distance_km <= 0.0:
            return 1.0
        
        score = math.exp(-math.log(2) * (distance_km / self.half_life_km))
        return round(min(max(score, 0.0), 1.0), 4)

    def evaluate_location_match(
        self,
        location1: Optional[LocationPoint],
        location2: Optional[LocationPoint]
    ) -> LocationMatchResponse:
        """
        Evaluates location relevance between two report coordinates.
        Handles missing coordinates gracefully as UNKNOWN.
        """
        # Check if coordinates are provided and valid
        if (
            location1 is None
            or location2 is None
            or location1.latitude is None
            or location1.longitude is None
            or location2.latitude is None
            or location2.longitude is None
        ):
            return LocationMatchResponse(
                success=True,
                available=False,
                distanceKm=None,
                distanceMeters=None,
                locationRelevanceScore=None,
                matchStatus="UNKNOWN_LOCATION",
                status="UNKNOWN",
                threshold=self.threshold,
                explanation="One or both location coordinates are missing or unknown. Relevance cannot be determined.",
                message="Location data is missing. Marked as UNKNOWN without score penalty."
            )

        # Calculate exact Haversine distance
        distance_km = self.calculate_haversine_distance(
            location1.latitude,
            location1.longitude,
            location2.latitude,
            location2.longitude
        )
        distance_km_rounded = round(distance_km, 4)
        distance_meters = round(distance_km * 1000.0, 2)

        # Calculate relevance score
        relevance_score = self.calculate_relevance_score(distance_km)

        # Classify match status
        if relevance_score >= 0.80:
            match_status = "HIGH_LOCATION_RELEVANCE"
            status = "MATCH"
            explanation = f"Coordinates are {distance_km_rounded} km apart ({distance_meters} m). High geographic proximity relevance."
        elif relevance_score >= self.threshold:
            match_status = "MEDIUM_LOCATION_RELEVANCE"
            status = "MATCH"
            explanation = f"Coordinates are {distance_km_rounded} km apart. Moderate geographic proximity relevance."
        else:
            match_status = "LOW_LOCATION_RELEVANCE"
            status = "MISMATCH"
            explanation = f"Coordinates are {distance_km_rounded} km apart. Low geographic proximity relevance."

        return LocationMatchResponse(
            success=True,
            available=True,
            distanceKm=distance_km_rounded,
            distanceMeters=distance_meters,
            locationRelevanceScore=relevance_score,
            matchStatus=match_status,
            status=status,
            threshold=self.threshold,
            explanation=explanation,
            message="Geographic location relevance comparison completed successfully."
        )
