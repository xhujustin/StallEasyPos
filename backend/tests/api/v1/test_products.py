import pytest
from httpx import AsyncClient
from app.core.config import settings

@pytest.mark.asyncio
async def test_create_and_list_products(client: AsyncClient):
    # 1. Login as Store Owner
    username = "product_owner"
    password = "password"
    
    await client.post(f"{settings.API_V1_STR}/auth/register", json={
        "username": username,
        "password": password
    })
    
    login_res = await client.post(f"{settings.API_V1_STR}/auth/login", data={
        "username": username,
        "password": password
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Store
    store_res = await client.post(
        f"{settings.API_V1_STR}/stores/",
        json={"name": "Product Test Store"},
        headers=headers
    )
    store_id = store_res.json()["data"]["id"]

    # 3. Create Product
    product_payload = {
        "name": "Bubble Tea",
        "price": 50.0,
        "cost": 20.0,
        "category": "Drinks"
    }
    
    res = await client.post(
        f"{settings.API_V1_STR}/products/?store_id={store_id}",
        json=product_payload,
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["name"] == "Bubble Tea"
    assert data["price"] == 50.0
    assert data["store_id"] == store_id
    
    product_id = data["id"]

    # 4. List Products
    list_res = await client.get(f"{settings.API_V1_STR}/products/?store_id={store_id}", headers=headers)
    assert list_res.status_code == 200
    products = list_res.json()["data"]
    assert len(products) >= 1
    assert products[0]["id"] == product_id

@pytest.mark.asyncio
async def test_update_product(client: AsyncClient):
    # Reuse flow ideally, but let's do quick standalone setup or rely on previous state?
    # Better be self-contained for reliability.
    
    username = "product_updater"
    password = "password"
    
    await client.post(f"{settings.API_V1_STR}/auth/register", json={"username": username, "password": password})
    token = (await client.post(f"{settings.API_V1_STR}/auth/login", data={"username": username, "password": password})).json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    store_id = (await client.post(f"{settings.API_V1_STR}/stores/", json={"name": "Update Store"}, headers=headers)).json()["data"]["id"]
    
    # Create
    p_res = await client.post(
        f"{settings.API_V1_STR}/products/?store_id={store_id}",
        json={"name": "Old Name", "price": 100},
        headers=headers
    )
    p_id = p_res.json()["data"]["id"]
    
    # Update
    update_res = await client.patch(
        f"{settings.API_V1_STR}/products/{p_id}",
        json={"name": "New Name", "price": 150},
        headers=headers
    )
    assert update_res.status_code == 200
    updated = update_res.json()["data"]
    assert updated["name"] == "New Name"
    assert updated["price"] == 150.0
