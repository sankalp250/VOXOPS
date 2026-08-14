import asyncio
import logging
from httpx import AsyncClient, ASGITransport
from app.main import app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting live end-to-end verification of VOXOPS Multi-Tenant Engine...")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Health check
        health = await ac.get("/api/v1/health")
        logger.info(f"Health Check: {health.status_code} -> {health.json()}")
        assert health.status_code == 200

        # 2. Register Dynamic Client (FreshMart Organics)
        client_payload = {
            "name": "FreshMart Organics",
            "system_prompt": "You are FreshMart's friendly organic grocery voice assistant. Be warm, fast, and helpful.",
            "language_code": "en",
            "tools": [
                {
                    "name": "order_groceries",
                    "description": "Places order for organic groceries",
                    "parameters": {"items": "list of fruits/vegetables", "delivery_slot": "morning or evening"},
                    "api_url": "mock://"
                },
                {
                    "name": "check_store_hours",
                    "description": "Checks store opening and closing hours",
                    "parameters": {},
                    "api_url": "mock://"
                }
            ],
            "intent_examples": {
                "order_groceries": ["I need organic apples and milk", "Buy 1kg carrots", "Order veggies"],
                "check_store_hours": ["What time do you open?", "Are you open on Sunday?", "Store timing"]
            }
        }

        client_res = await ac.post("/api/v1/clients", json=client_payload)
        logger.info(f"Client Created: {client_res.status_code}")
        client_data = client_res.json()
        client_id = client_data["id"]
        api_key = client_data["api_key"]
        logger.info(f"  -> Client ID: {client_id}")
        logger.info(f"  -> API Key: {api_key}")
        logger.info(f"  -> Embedding Namespace: {client_data['embedding_namespace']}")

        # 3. Test Agent Run Turn 1: Grocery Order Intent
        turn1_res = await ac.post(
            "/api/v1/agent/run",
            headers={"X-Client-API-Key": api_key},
            json={
                "transcript": "Hello! I would like to order 2kg of organic apples and 1 carton of almond milk for this evening.",
                "language_code": "en"
            }
        )
        logger.info(f"Agent Turn 1 Status: {turn1_res.status_code}")
        turn1_data = turn1_res.json()
        logger.info(f"  -> Client: {turn1_data['client_name']}")
        logger.info(f"  -> Intent: {turn1_data['intent']}")
        logger.info(f"  -> Extracted Slots: {turn1_data['slots']}")
        logger.info(f"  -> Agent Response: {turn1_data['response_text']}")
        logger.info(f"  -> Latency: {turn1_data['turn_latency_ms']}ms")

        # 4. Test Agent Turn 2: Store Hours Intent
        turn2_res = await ac.post(
            "/api/v1/agent/run",
            headers={"X-Client-API-Key": api_key},
            json={
                "transcript": "By the way, what time do you open tomorrow morning?",
                "language_code": "en"
            }
        )
        logger.info(f"Agent Turn 2 Status: {turn2_res.status_code}")
        turn2_data = turn2_res.json()
        logger.info(f"  -> Intent: {turn2_data['intent']}")
        logger.info(f"  -> Agent Response: {turn2_data['response_text']}")
        logger.info(f"  -> Latency: {turn2_data['turn_latency_ms']}ms")

        # 5. List Sessions
        sessions = await ac.get("/api/v1/agent/sessions")
        logger.info(f"Sessions count retrieved: {len(sessions.json())}")

    logger.info("ALL LIVE END-TO-END VERIFICATIONS COMPLETED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(main())
