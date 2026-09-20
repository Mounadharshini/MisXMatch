"""
Development Benchmark Labeled Evaluation Dataset
=================================================
Provides explicit ground-truth pairs for offline/development validation of:
1. Face Biometric Matching
2. NLP Semantic Text Description Matching
3. Structured Attribute Matching
4. Location Distance Decay Functions
5. Time Decay Functions
6. Risk Scoring Classification

Notice: This dataset is strictly categorized as 'DEVELOPMENT_BENCHMARK' to distinguish
development evaluation from live production telemetry.
"""

# 1. NLP Semantic Description Pair Benchmark
TEXT_EVALUATION_PAIRS = [
    # Positive Pairs (Same/similar semantic meaning)
    {"text1": "wearing a red shirt and blue jeans", "text2": "red coloured shirt with navy blue pants", "is_match": 1},
    {"text1": "black leather jacket and silver watch", "text2": "dark leather coat wearing wrist watch", "is_match": 1},
    {"text1": "elderly man with grey hair and walking stick", "text2": "senior male with grey hair carrying cane", "is_match": 1},
    {"text1": "child in yellow raincoat near school bus stop", "text2": "young kid with yellow waterproof jacket at bus stop", "is_match": 1},
    {"text1": "blue hoodie with white sneakers", "text2": "blue sweatshirt wearing white shoes", "is_match": 1},
    {"text1": "brown hair with gold framed spectacles", "text2": "brownish hair wearing golden glasses", "is_match": 1},
    {"text1": "tall woman in black dress carrying red handbag", "text2": "tall female wearing black outfit with red purse", "is_match": 1},
    {"text1": "tattoo on right forearm wearing green cap", "text2": "green baseball cap tattoo on right arm", "is_match": 1},

    # Negative Pairs (Different semantic descriptions)
    {"text1": "wearing a red shirt and blue jeans", "text2": "wearing a black jacket and formal trousers", "is_match": 0},
    {"text1": "elderly man with grey hair and walking stick", "text2": "young toddler in yellow onesie", "is_match": 0},
    {"text1": "black leather jacket and silver watch", "text2": "white cotton shirt with pink scarf", "is_match": 0},
    {"text1": "child in yellow raincoat near school bus stop", "text2": "adult male in police uniform at station", "is_match": 0},
    {"text1": "blue hoodie with white sneakers", "text2": "red saree with gold necklace", "is_match": 0},
    {"text1": "brown hair with gold framed spectacles", "text2": "bald man with dark sunglasses", "is_match": 0},
    {"text1": "tall woman in black dress carrying red handbag", "text2": "short boy in sports jersey holding football", "is_match": 0},
    {"text1": "tattoo on right forearm wearing green cap", "text2": "clean shaven corporate executive in blue suit", "is_match": 0},
]

# 2. Structured Attribute Match Benchmark
ATTRIBUTE_EVALUATION_CASES = [
    {
        "attr1": {"gender": "MALE", "age": 28, "height": 175, "clothingUpper": "RED SHIRT", "hairColor": "BLACK"},
        "attr2": {"gender": "MALE", "age": 29, "height": 174, "clothingUpper": "RED SHIRT", "hairColor": "BLACK"},
        "is_match": 1
    },
    {
        "attr1": {"gender": "FEMALE", "age": 45, "height": 160, "clothingUpper": "BLUE SUIT"},
        "attr2": {"gender": "FEMALE", "age": 44, "height": 162, "clothingUpper": "BLUE SUIT"},
        "is_match": 1
    },
    {
        "attr1": {"gender": "MALE", "age": 10, "clothingUpper": "YELLOW HOODIE"},
        "attr2": {"gender": "MALE", "age": 10, "clothingUpper": "UNKNOWN", "hairColor": "UNKNOWN"}, # Missing attribute test
        "is_match": 1
    },
    {
        "attr1": {"gender": "FEMALE", "age": 70, "height": 152},
        "attr2": {"gender": "MALE", "age": 22, "height": 180},
        "is_match": 0
    },
    {
        "attr1": {"gender": "MALE", "age": 35, "clothingUpper": "GREEN JACKET"},
        "attr2": {"gender": "MALE", "age": 35, "clothingUpper": "PURPLE SWEATER"},
        "is_match": 0
    }
]

# 3. Location Distance Benchmark
LOCATION_EVALUATION_CASES = [
    {"loc1": {"latitude": 28.6139, "longitude": 77.2090}, "loc2": {"latitude": 28.6145, "longitude": 77.2095}, "expected_relevance": "HIGH"}, # ~70 meters
    {"loc1": {"latitude": 28.6139, "longitude": 77.2090}, "loc2": {"latitude": 28.6320, "longitude": 77.2180}, "expected_relevance": "MEDIUM"}, # ~2.2 km
    {"loc1": {"latitude": 28.6139, "longitude": 77.2090}, "loc2": {"latitude": 19.0760, "longitude": 72.8777}, "expected_relevance": "LOW"}, # ~1150 km (Delhi vs Mumbai)
]

# 4. Time Relevance Benchmark
TIME_EVALUATION_CASES = [
    {"t1": "2026-09-07T10:00:00Z", "t2": "2026-09-07T10:30:00Z", "expected_relevance": "HIGH"}, # 30 mins
    {"t1": "2026-09-07T10:00:00Z", "t2": "2026-09-07T18:00:00Z", "expected_relevance": "MEDIUM"}, # 8 hours
    {"t1": "2026-09-07T10:00:00Z", "t2": "2026-08-01T10:00:00Z", "expected_relevance": "LOW"}, # 37 days
]

# 5. Risk Assessment Model Benchmark Cases
RISK_EVALUATION_BENCHMARK = [
    {"age": 6, "gender": "FEMALE", "medicalNeeds": "Diabetes insulin required", "daysMissing": 1, "expected_risk": "HIGH"},
    {"age": 82, "gender": "MALE", "medicalNeeds": "Dementia memory loss", "daysMissing": 2, "expected_risk": "HIGH"},
    {"age": 25, "gender": "MALE", "medicalNeeds": "None", "daysMissing": 1, "expected_risk": "LOW"},
    {"age": 16, "gender": "FEMALE", "medicalNeeds": "Asthma inhaler", "daysMissing": 3, "expected_risk": "MEDIUM"},
    {"age": 40, "gender": "FEMALE", "medicalNeeds": "None", "daysMissing": 5, "expected_risk": "MEDIUM"},
]
