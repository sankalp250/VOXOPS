import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.memory_service import EmbeddingService


def test_embedding_cosine_similarity():
    emb = EmbeddingService()
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    v3 = [0.0, 1.0, 0.0]
    
    assert emb.cosine_similarity(v1, v2) == 1.0
    assert emb.cosine_similarity(v1, v3) == 0.0


@pytest.mark.asyncio
async def test_memory_ingest_and_multi_tenant_search():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create 2 distinct clients
        c1 = await ac.post("/api/v1/clients", json={
            "name": "Apollo Dental Care",
            "system_prompt": "Dental clinic assistant.",
            "language_code": "en",
        })
        client1_id = c1.json()["id"]
        api_key1 = c1.json()["api_key"]

        c2 = await ac.post("/api/v1/clients", json={
            "name": "PizzaHub Express",
            "system_prompt": "Pizza delivery assistant.",
            "language_code": "en",
        })
        client2_id = c2.json()["id"]
        api_key2 = c2.json()["api_key"]

        # 2. Ingest document for Client 1 (Dental)
        ingest1 = await ac.post(
            "/api/v1/memory/ingest",
            headers={"X-Client-API-Key": api_key1},
            json={"content": "Root canal treatment costs 5000 INR and takes 45 minutes."}
        )
        assert ingest1.status_code == 200
        assert ingest1.json()["client_id"] == client1_id

        # 3. Ingest document for Client 2 (Pizza)
        ingest2 = await ac.post(
            "/api/v1/memory/ingest",
            headers={"X-Client-API-Key": api_key2},
            json={"content": "Large Pepperoni Pizza costs 650 INR with extra cheese."}
        )
        assert ingest2.status_code == 200
        assert ingest2.json()["client_id"] == client2_id

        # 4. Search Client 1 for "root canal cost"
        search1 = await ac.post(
            "/api/v1/memory/search",
            headers={"X-Client-API-Key": api_key1},
            json={"query": "How much does a root canal cost?", "top_k": 3}
        )
        assert search1.status_code == 200
        res1 = search1.json()
        assert res1["client_id"] == client1_id
        assert len(res1["results"]) > 0
        assert "Root canal" in res1["results"][0]["content"]

        # 5. Verify Multi-Tenant Isolation:
        # Search Client 2 (Pizza) for "root canal" -> must return 0 results because pizza shop has no dental data!
        search2 = await ac.post(
            "/api/v1/memory/search",
            headers={"X-Client-API-Key": api_key2},
            json={"query": "root canal treatment", "top_k": 3}
        )
        assert search2.status_code == 200
        res2 = search2.json()
        # Strictly 0 results for Client 2
        assert len(res2["results"]) == 0
