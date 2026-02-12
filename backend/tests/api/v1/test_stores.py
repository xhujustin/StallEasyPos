import pytest
from httpx import AsyncClient
from app.core.config import settings

@pytest.mark.asyncio
async def test_create_store(client: AsyncClient):
    # 1. Login to get token
    username = "store_owner"
    password = "password"
    
    # Register
    await client.post(f"{settings.API_V1_STR}/auth/register", json={
        "username": username,
        "password": password
    })
    
    # Login
    login_res = await client.post(f"{settings.API_V1_STR}/auth/login", data={
        "username": username,
        "password": password
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Store
    response = await client.post(
        f"{settings.API_V1_STR}/stores/",
        json={"name": "My Test Store"},
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "My Test Store"
    store_id = data["data"]["id"]

    # 3. List Stores
    list_res = await client.get(f"{settings.API_V1_STR}/stores/", headers=headers)
    assert list_res.status_code == 200
    stores = list_res.json()["data"]
    assert len(stores) >= 1
    assert any(s["id"] == store_id for s in stores)
