"""
Client Repository — CRUD operations for multi-tenant client management.
"""
from __future__ import annotations

import secrets
import uuid
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


class ClientRepository:
    """Async CRUD repository for client tenants."""

    @staticmethod
    def _generate_api_key() -> str:
        """Generates a cryptographically secure 40-char API key."""
        return f"vox_{secrets.token_urlsafe(30)}"

    @staticmethod
    def _generate_namespace(name: str, client_id: uuid.UUID) -> str:
        """Generates a unique embedding namespace from the client name + UUID prefix."""
        safe = "".join(c if c.isalnum() else "_" for c in name.lower())[:30]
        return f"{safe}_{str(client_id)[:8]}"

    @staticmethod
    async def create_client(db: AsyncSession, data: ClientCreate) -> tuple[Client, str]:
        """
        Creates a new client tenant. Returns (client_db_object, raw_api_key).
        The raw API key is only returned once — it is NOT stored in plaintext.
        In production, store a bcrypt hash; for MVP we store it directly.
        """
        client_id = uuid.uuid4()
        api_key = ClientRepository._generate_api_key()
        namespace = ClientRepository._generate_namespace(data.name, client_id)

        client = Client(
            id=client_id,
            name=data.name,
            system_prompt=data.system_prompt,
            tools_config=[t.model_dump() for t in data.tools],
            intent_examples=data.intent_examples,
            language_code=data.language_code,
            embedding_namespace=namespace,
            api_key=api_key,
            is_active=True,
        )
        db.add(client)
        await db.commit()
        await db.refresh(client)
        return client, api_key

    @staticmethod
    async def get_by_id(db: AsyncSession, client_id: uuid.UUID) -> Optional[Client]:
        result = await db.execute(select(Client).where(Client.id == client_id, Client.is_active.is_(True)))
        return result.scalars().first()

    @staticmethod
    async def get_by_api_key(db: AsyncSession, api_key: str) -> Optional[Client]:
        result = await db.execute(select(Client).where(Client.api_key == api_key, Client.is_active.is_(True)))
        return result.scalars().first()

    @staticmethod
    async def list_clients(db: AsyncSession, limit: int = 50) -> List[Client]:
        result = await db.execute(
            select(Client).where(Client.is_active.is_(True)).order_by(Client.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_client(db: AsyncSession, client_id: uuid.UUID, data: ClientUpdate) -> Optional[Client]:
        client = await ClientRepository.get_by_id(db, client_id)
        if not client:
            return None
        update_data = data.model_dump(exclude_none=True)
        if "tools" in update_data:
            client.tools_config = [t.model_dump() if hasattr(t, "model_dump") else t for t in update_data.pop("tools")]
        for key, value in update_data.items():
            setattr(client, key, value)
        await db.commit()
        await db.refresh(client)
        return client

    @staticmethod
    async def delete_client(db: AsyncSession, client_id: uuid.UUID) -> bool:
        client = await ClientRepository.get_by_id(db, client_id)
        if not client:
            return False
        client.is_active = False
        await db.commit()
        return True
