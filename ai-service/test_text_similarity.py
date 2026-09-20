import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app
from models.text_embedder import TextEmbedder

def test_text_similarity_features():
    print("=" * 80)
    print("MISXMATCH AI-SERVICE: TEXT SIMILARITY DETECTION TEST SUITE")
    print("=" * 80)

    client = TestClient(app)

    # 1. Health check verification
    print("\n--- [1/6] Testing GET /health capabilities ---")
    resp_health = client.get("/health")
    assert resp_health.status_code == 200, f"Expected 200, got {resp_health.status_code}"
    health_data = resp_health.json()
    print(f"Health Status: {health_data['status']}")
    print(f"Text Similarity Capability: {health_data['capabilities'].get('text_similarity_detection')}")
    assert "text_similarity_detection" in health_data["capabilities"]

    # 2. Extract Text Embedding via POST /embed/text
    sample_text = "Wearing a blue jacket, red t-shirt, and black spectacles."
    print(f"\n--- [2/6] Testing POST /embed/text for: '{sample_text}' ---")
    resp_emb = client.post("/embed/text", json={"text": sample_text})
    assert resp_emb.status_code == 200, f"Expected 200, got {resp_emb.status_code}: {resp_emb.text}"
    emb_data = resp_emb.json()
    print(f"Extraction Status: {emb_data['status']}")
    print(f"Embedding Vector Dimension: {emb_data['dimension']}")
    print(f"NLP Model: {emb_data['model']}")
    print(f"Sample Embedding Values: {emb_data['embedding'][:6]} ...")

    # 3. Direct Text Similarity Matching for Similar Descriptions via POST /match/text
    text1_match = "Young boy wearing a blue jacket, red tshirt, and black specs near railway station."
    text2_match = "Child seen in red t-shirt, blue denim jacket, and spectacles in market area."
    
    print("\n--- [3/6] Testing POST /match/text for Similar Descriptions ---")
    resp_match1 = client.post("/match/text", json={
        "text1": text1_match,
        "text2": text2_match,
        "threshold": 0.40
    })
    assert resp_match1.status_code == 200, f"Expected 200, got {resp_match1.status_code}: {resp_match1.text}"
    m1_data = resp_match1.json()
    print(f"Text 1: '{text1_match}'")
    print(f"Text 2: '{text2_match}'")
    print(f"  • Match Decision (is_match): {m1_data['is_match']}")
    print(f"  • Similarity Score:        {m1_data['similarity_score']}%")
    print(f"  • Semantic Cosine Sim:     {m1_data['semantic_similarity']}")
    print(f"  • Keyword Jaccard Sim:     {m1_data['keyword_similarity']}")
    print(f"  • Matched Keywords:        {m1_data['matched_keywords']}")
    print(f"  • Confidence Rating:       {m1_data['confidence']}")
    assert m1_data["is_match"] is True, "Similar descriptions should evaluate to is_match = True"
    assert m1_data["similarity_score"] >= 50.0

    # 4. Direct Text Similarity Matching for Unrelated Descriptions
    text3_diff = "Elderly woman wearing green saree and gold bangles sitting near temple entrance."
    
    print("\n--- [4/6] Testing POST /match/text for Unrelated Descriptions ---")
    resp_match2 = client.post("/match/text", json={
        "text1": text1_match,
        "text2": text3_diff,
        "threshold": 0.40
    })
    assert resp_match2.status_code == 200, f"Expected 200, got {resp_match2.status_code}"
    m2_data = resp_match2.json()
    print(f"Text 1: '{text1_match}'")
    print(f"Text 3: '{text3_diff}'")
    print(f"  • Match Decision (is_match): {m2_data['is_match']}")
    print(f"  • Similarity Score:        {m2_data['similarity_score']}%")
    print(f"  • Semantic Cosine Sim:     {m2_data['semantic_similarity']}")
    print(f"  • Keyword Jaccard Sim:     {m2_data['keyword_similarity']}")
    print(f"  • Matched Keywords:        {m2_data['matched_keywords']}")
    print(f"  • Confidence Rating:       {m2_data['confidence']}")
    assert m2_data["is_match"] is False, "Unrelated descriptions should evaluate to is_match = False"
    assert m2_data["similarity_score"] < 40.0

    # 5. Direct Vector Matching via POST /match/text-embedding
    print("\n--- [5/6] Testing POST /match/text-embedding ---")
    emb1 = client.post("/embed/text", json={"text": text1_match}).json()["embedding"]
    emb2 = client.post("/embed/text", json={"text": text2_match}).json()["embedding"]

    resp_vec = client.post("/match/text-embedding", json={
        "embedding1": emb1,
        "embedding2": emb2,
        "threshold": 0.40
    })
    assert resp_vec.status_code == 200, f"Expected 200, got {resp_vec.status_code}"
    v_data = resp_vec.json()
    print(f"Vector Match Decision (is_match): {v_data['is_match']}")
    print(f"Vector Similarity Score:        {v_data['similarity_score']}%")
    print(f"Vector Raw Cosine Similarity:   {v_data['raw_cosine_similarity']}")
    assert v_data["is_match"] is True

    # 6. Batch Text Candidate Ranking via POST /match/text-batch
    print("\n--- [6/6] Testing POST /match/text-batch Ranking ---")
    candidates = [
        {"caseNumber": "MP-101", "description": "Elderly lady in silk saree and spectacles."},
        {"caseNumber": "MP-102", "description": "Child in red t-shirt, blue jacket, and specs."},
        {"caseNumber": "MP-103", "description": "Tall man in white formal shirt and black trousers."}
    ]

    resp_batch = client.post("/match/text-batch", json={
        "query_text": text1_match,
        "candidate_texts": candidates,
        "top_k": 3
    })
    assert resp_batch.status_code == 200, f"Expected 200, got {resp_batch.status_code}"
    batch_data = resp_batch.json()
    print(f"Query Text: '{text1_match}'")
    print("Ranked Candidates:")
    for rank, match in enumerate(batch_data["top_matches"], 1):
        print(f"  {rank}. Case #{match['candidate_id']} | Score: {match['similarity_score']}% | Keywords: {match['matched_keywords']}")
    
    assert batch_data["top_matches"][0]["candidate_id"] == "MP-102", "MP-102 should be top ranked candidate"

    print("\n" + "=" * 80)
    print("ALL AI TEXT SIMILARITY DETECTION TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    test_text_similarity_features()
