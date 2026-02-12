import pytest
from httpx import AsyncClient
from app.core.config import settings

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    import uuid
    payload = {
        "username": f"testuser_auth_{uuid.uuid4()}",
        "password": "testpassword123"
    }
    response = await client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["username"] == payload["username"]
    assert "id" in data["data"]

@pytest.mark.asyncio
async def test_login_access_token(client: AsyncClient):
    # Register first (Assuming fresh DB or unique user needed)
    # Using a unique name to avoid conflict if DB not wiped
    import uuid
    username = f"testuser_login_{uuid.uuid4()}"
    password = "testpassword123"
    
    await client.post(f"{settings.API_V1_STR}/auth/register", json={
        "username": username,
        "password": password
    })

    login_data = {
        "username": username,
        "password": password
    }
    response = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    assert response.status_code == 200
    tokens = response.json()
    assert tokens["code"] == 0
    assert "access_token" in tokens["data"]
    assert tokens["data"]["token_type"] == "bearer"
