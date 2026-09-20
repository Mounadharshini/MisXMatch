from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Dict, Any

class HealthResponse(BaseModel):
    status: str = Field(default="UP", example="UP")
    service: str = Field(default="ai-service", example="ai-service")
    version: str = Field(default="1.0.0", example="1.0.0")
    models: Dict[str, str] = Field(default_factory=dict, example={"face": "READY", "text": "READY", "cctv": "READY"})
    capabilities: Dict[str, bool] = Field(default_factory=dict, example={"face_similarity_detection": True, "text_semantic_matching": True})

class ImageDetail(BaseModel):
    filename: str = Field(description="Name of uploaded image file")
    content_type: str = Field(description="MIME content type")
    size_bytes: int = Field(description="File size in bytes")
    format: str = Field(description="Verified image format (JPEG, PNG, WEBP, BMP)")
    dimensions: Tuple[int, int] = Field(description="Width and height in pixels [width, height]")

class ImageMatchValidationResponse(BaseModel):
    status: str = Field(default="SUCCESS", description="Validation status")
    message: str = Field(description="Validation response message")
    image1: ImageDetail = Field(description="Validated metadata for image 1")
    image2: ImageDetail = Field(description="Validated metadata for image 2")

class ImageMatchResultResponse(BaseModel):
    success: bool = Field(description="Overall execution status of face detection & AI matching")
    faceDetectedInImage1: bool = Field(description="Whether at least one face was detected in image 1")
    faceDetectedInImage2: bool = Field(description="Whether at least one face was detected in image 2")
    facesCountImage1: int = Field(description="Total face count detected in image 1")
    facesCountImage2: int = Field(description="Total face count detected in image 2")
    similarityScore: float = Field(description="Real cosine similarity score [0.0 to 1.0]")
    match: bool = Field(description="True if similarityScore >= threshold")
    matchStatus: str = Field(description="Classification: 'POSSIBLE_MATCH' or 'UNLIKELY_MATCH'")
    threshold: float = Field(description="Configured similarity comparison threshold")
    message: str = Field(description="Human readable result summary")
    image1: Optional[ImageDetail] = Field(default=None, description="Metadata for image 1")
    image2: Optional[ImageDetail] = Field(default=None, description="Metadata for image 2")

class TextMatchRequest(BaseModel):
    text1: str = Field(
        ...,
        max_length=5000,
        description="First text description (e.g. missing person dossier)",
        json_schema_extra={"example": "15 year old boy wearing a blue shirt and black pants, last seen near the bus stand."}
    )
    text2: str = Field(
        ...,
        max_length=5000,
        description="Second text description (e.g. found person or sighting description)",
        json_schema_extra={"example": "Teenage male wearing blue clothes and dark trousers, found near a bus station."}
    )

class TextMatchResponse(BaseModel):
    success: bool = Field(default=True, description="Overall execution status of NLP semantic match")
    similarityScore: float = Field(description="Real NLP sentence transformer cosine similarity score [0.0 to 1.0]")
    possibleMatch: bool = Field(description="True if similarityScore >= threshold")
    matchStatus: str = Field(description="Classification: 'POSSIBLE_SEMANTIC_MATCH' or 'UNLIKELY_SEMANTIC_MATCH'")
    threshold: float = Field(description="Configured text similarity threshold")
    text1Length: int = Field(description="Character length of text 1")
    text2Length: int = Field(description="Character length of text 2")
    message: str = Field(description="Human readable result summary")

class PersonAttributes(BaseModel):
    age: Optional[int] = Field(default=None, ge=0, le=150, description="Age in years", json_schema_extra={"example": 17})
    gender: Optional[str] = Field(default=None, description="Gender (e.g. 'male', 'female', 'other')", json_schema_extra={"example": "male"})
    height: Optional[float] = Field(default=None, ge=30.0, le=300.0, description="Height in centimeters", json_schema_extra={"example": 165.0})
    clothing: Optional[str] = Field(default=None, max_length=2000, description="Clothing description", json_schema_extra={"example": "blue shirt and black pants"})
    hair: Optional[str] = Field(default=None, max_length=500, description="Hair description (color, length, style)", json_schema_extra={"example": "short black hair"})
    skinTone: Optional[str] = Field(default=None, max_length=500, description="Skin tone description", json_schema_extra={"example": "medium"})

class AttributeDetail(BaseModel):
    score: Optional[float] = Field(default=None, description="Similarity score [0.0 to 1.0], or null if UNKNOWN")
    status: str = Field(description="Status: 'MATCH', 'PARTIAL_MATCH', 'MISMATCH', 'UNKNOWN'")
    explanation: str = Field(description="Human readable explainability summary")

class AttributeMatchRequest(BaseModel):
    person1: PersonAttributes = Field(description="Structured person record 1 (e.g. missing report)")
    person2: PersonAttributes = Field(description="Structured person record 2 (e.g. found report)")

class AttributeMatchResponse(BaseModel):
    success: bool = Field(default=True, description="Overall execution status")
    overallAttributeScore: float = Field(description="Weighted overall attribute similarity score [0.0 to 1.0]")
    matchStatus: str = Field(description="Classification: 'POSSIBLE_ATTRIBUTE_MATCH' or 'UNLIKELY_ATTRIBUTE_MATCH'")
    threshold: float = Field(description="Configured attribute comparison threshold")
    availableAttributesCount: int = Field(description="Count of available attribute pairs evaluated")
    totalAttributesEvaluated: int = Field(default=6, description="Total supported schema attributes")
    attributes: Dict[str, AttributeDetail] = Field(description="Per-attribute evaluation breakdown")
    message: str = Field(description="Human readable summary message")

class LocationPoint(BaseModel):
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Latitude in decimal degrees [-90.0 to 90.0]", json_schema_extra={"example": 11.0168})
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Longitude in decimal degrees [-180.0 to 180.0]", json_schema_extra={"example": 76.9558})

class LocationMatchRequest(BaseModel):
    location1: Optional[LocationPoint] = Field(default=None, description="Coordinates for report 1 (e.g. missing location)")
    location2: Optional[LocationPoint] = Field(default=None, description="Coordinates for report 2 (e.g. sighting/found location)")

class LocationMatchResponse(BaseModel):
    success: bool = Field(default=True, description="Execution status")
    available: bool = Field(description="True if both location coordinates are valid and available")
    distanceKm: Optional[float] = Field(default=None, description="Geographic distance in kilometers")
    distanceMeters: Optional[float] = Field(default=None, description="Geographic distance in meters")
    locationRelevanceScore: Optional[float] = Field(default=None, description="Location relevance score [0.0 to 1.0], or null if UNKNOWN")
    matchStatus: str = Field(description="Classification: 'HIGH_LOCATION_RELEVANCE', 'MEDIUM_LOCATION_RELEVANCE', 'LOW_LOCATION_RELEVANCE', or 'UNKNOWN_LOCATION'")
    status: str = Field(description="Status: 'MATCH', 'MISMATCH', or 'UNKNOWN'")
    threshold: float = Field(description="Configured location relevance threshold")
    explanation: str = Field(description="Human readable explanation")
    message: str = Field(description="Summary message")

class TimeMatchRequest(BaseModel):
    time1: Optional[str] = Field(default=None, description="Timestamp for report 1 (ISO 8601 string)", json_schema_extra={"example": "2026-09-01T10:00:00Z"})
    time2: Optional[str] = Field(default=None, description="Timestamp for report 2 (ISO 8601 string)", json_schema_extra={"example": "2026-09-01T13:00:00Z"})

class TimeMatchResponse(BaseModel):
    success: bool = Field(default=True, description="Execution status")
    available: bool = Field(description="True if both timestamps are valid and available")
    timeDifferenceHours: Optional[float] = Field(default=None, description="Absolute time difference in hours")
    timeDifferenceMinutes: Optional[float] = Field(default=None, description="Absolute time difference in minutes")
    timeDifferenceDays: Optional[float] = Field(default=None, description="Absolute time difference in days")
    timeRelevanceScore: Optional[float] = Field(default=None, description="Time relevance score [0.0 to 1.0], or null if UNKNOWN")
    matchStatus: str = Field(description="Classification: 'HIGH_TIME_RELEVANCE', 'MEDIUM_TIME_RELEVANCE', 'LOW_TIME_RELEVANCE', or 'UNKNOWN_TIME'")
    status: str = Field(description="Status: 'MATCH', 'MISMATCH', or 'UNKNOWN'")
    threshold: float = Field(description="Configured time relevance threshold")
    explanation: str = Field(description="Human readable explanation")
    message: str = Field(description="Summary message")

class PersonRecord(BaseModel):
    image: Optional[str] = Field(default=None, description="Optional face image (base64 data URL, raw base64, or file path)")
    description: Optional[str] = Field(default=None, max_length=5000, description="Optional textual description of person / sighting")
    attributes: Optional[PersonAttributes] = Field(default=None, description="Optional structured attributes")
    location: Optional[LocationPoint] = Field(default=None, description="Optional report location coordinates")
    timestamp: Optional[str] = Field(default=None, description="Optional report timestamp (ISO 8601 string)")

class FactorDetail(BaseModel):
    available: bool = Field(description="Whether this AI signal factor was available and evaluated")
    score: Optional[float] = Field(default=None, description="Factor similarity/relevance score [0.0 to 1.0], or null if unavailable")
    rawWeight: float = Field(description="Base configured weight for this factor")
    effectiveWeight: Optional[float] = Field(default=None, description="Normalized weight after excluding unavailable factors")
    status: str = Field(description="Factor status code ('MATCH', 'PARTIAL_MATCH', 'MISMATCH', 'UNKNOWN')")
    explanation: str = Field(description="Human readable explanation for this factor")

class MultiMatchRequest(BaseModel):
    person1: PersonRecord = Field(description="Person / Case Record 1 (e.g. Missing Report)")
    person2: PersonRecord = Field(description="Person / Case Record 2 (e.g. Sighting or Found Report)")

class MultiMatchResponse(BaseModel):
    success: bool = Field(default=True, description="Execution status")
    overallScore: Optional[float] = Field(default=None, description="Weighted overall multi-factor score [0.0 to 1.0]")
    classification: str = Field(description="Classification: 'HIGH_CONFIDENCE_MATCH', 'POSSIBLE_MATCH', 'LOW_CONFIDENCE', or 'INSUFFICIENT_DATA'")
    availableFactorsCount: int = Field(description="Number of available AI factors evaluated")
    totalFactorsEvaluated: int = Field(default=5, description="Total supported AI factors (5)")
    factors: Dict[str, FactorDetail] = Field(description="Per-factor evaluation breakdown (face, text, attributes, location, time)")
    message: str = Field(description="AI-assisted summary message")

class RiskScoreRequest(BaseModel):
    caseId: Optional[str] = Field(default=None, description="Case / Dossier identifier (e.g. 'MP-1001')", json_schema_extra={"example": "MP-1001"})
    age: Optional[int] = Field(default=None, ge=0, le=150, description="Age of missing person in years", json_schema_extra={"example": 8})
    gender: Optional[str] = Field(default=None, description="Gender", json_schema_extra={"example": "female"})
    lastSeenDate: Optional[str] = Field(default=None, description="Date/time last seen (ISO 8601 string)", json_schema_extra={"example": "2026-09-01T10:00:00Z"})
    createdAt: Optional[str] = Field(default=None, description="Case creation timestamp (ISO 8601 string)", json_schema_extra={"example": "2026-09-01T12:00:00Z"})
    medicalConditions: Optional[str] = Field(default=None, max_length=1000, description="Medical vulnerability details (e.g. 'insulin dependent', 'dementia')", json_schema_extra={"example": "Requires daily insulin medication"})
    dangerIndicators: Optional[List[str]] = Field(default=None, description="Explicit danger indicators (e.g. ['abduction', 'unusual_disappearance'])", json_schema_extra={"example": ["abduction", "unusual_disappearance"]})
    vulnerabilityFlags: Optional[List[str]] = Field(default=None, description="Explicit vulnerability flags (e.g. ['minor', 'medical'])", json_schema_extra={"example": ["minor", "medical"]})
    recentSightingsCount: Optional[int] = Field(default=None, ge=0, description="Count of recent unverified leads/sightings", json_schema_extra={"example": 0})
    lastSightingHoursAgo: Optional[float] = Field(default=None, ge=0.0, description="Hours elapsed since last unverified sighting lead", json_schema_extra={"example": 120.0})
    description: Optional[str] = Field(default=None, max_length=5000, description="Detailed case notes / description text", json_schema_extra={"example": "8 year old girl missing from school. Suspected vehicle abduction."})

class RiskFactorDetail(BaseModel):
    available: bool = Field(description="Whether this risk factor had sufficient data and was evaluated")
    score: Optional[float] = Field(default=None, description="Risk factor score [0.0 to 1.0], or null if unavailable")
    rawWeight: float = Field(description="Base configured weight for this risk factor")
    effectiveWeight: Optional[float] = Field(default=None, description="Normalized weight after excluding unavailable factors")
    status: str = Field(description="Factor status ('HIGH_RISK', 'MEDIUM_RISK', 'LOW_RISK', 'UNKNOWN')")
    explanation: str = Field(description="Human readable explanation for this risk factor")

class RiskScoreResponse(BaseModel):
    success: bool = Field(default=True, description="Execution status")
    riskScore: Optional[float] = Field(default=None, description="Weighted overall risk score [0.0 to 1.0]")
    riskLevel: str = Field(description="Urgency classification: 'HIGH', 'MEDIUM', 'LOW', or 'UNKNOWN'")
    availableFactorsCount: int = Field(description="Number of available risk factors evaluated")
    totalFactorsEvaluated: int = Field(default=5, description="Total supported risk factors (5)")
    factors: Dict[str, RiskFactorDetail] = Field(description="Per-factor risk breakdown (age, duration, vulnerability, danger, sighting)")
    reason: str = Field(description="Synthesized human readable explanation of the risk classification")
    message: str = Field(description="Authorized personnel decision support disclaimer")

class ErrorDetailResponse(BaseModel):
    status: str = Field(default="ERROR", json_schema_extra={"example": "ERROR"})
    error_type: str = Field(description="Error classification type")
    detail: str = Field(description="Human readable error explanation")
