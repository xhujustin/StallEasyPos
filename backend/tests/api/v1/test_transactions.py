import pytest
import uuid
from httpx import AsyncClient
from app.core.config import settings

@pytest.mark.asyncio
async def test_transaction_flow(client: AsyncClient):
    # 1. Setup User & Store
    username = "txn_user"
    password = "password"
    await client.post(f"{settings.API_V1_STR}/auth/register", json={"username": username, "password": password})
    token = (await client.post(f"{settings.API_V1_STR}/auth/login", data={"username": username, "password": password})).json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    store_id = (await client.post(f"{settings.API_V1_STR}/stores/", json={"name": "Txn Store"}, headers=headers)).json()["data"]["id"]
    
    # 2. Create Product
    p_res = await client.post(
        f"{settings.API_V1_STR}/products/?store_id={store_id}",
        json={"name": "Coffee", "price": 60.0, "cost": 10.0},
        headers=headers
    )
    product_id = p_res.json()["data"]["id"]
    
    # 3. Create Order
    idempotency_key = str(uuid.uuid4())
    order_payload = {
        "idempotency_key": idempotency_key,
        "items": [
            {"product_id": product_id, "quantity": 2, "note": "Sugar free"}
        ],
        "total_amount": 120.0, # 60 * 2
        "source": "pos",
        "payment_method": "cash"
    }
    
    order_res = await client.post(
        f"{settings.API_V1_STR}/orders/?store_id={store_id}",
        json=order_payload,
        headers=headers
    )
    assert order_res.status_code == 200, order_res.text
    order_data = order_res.json()["data"]
    assert order_data["status"] == "pending_payment"
    assert order_data["total_amount"] == 120.0
    assert len(order_data["items"]) == 1
    assert order_data["items"][0]["name_snapshot"] == "Coffee"
    
    order_id = order_data["id"]
    
    # 4. Test Idempotency (Repeat same request)
    dup_res = await client.post(
        f"{settings.API_V1_STR}/orders/?store_id={store_id}",
        json=order_payload,
        headers=headers
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["data"]["id"] == order_id # Should return same ID
    
    # 5. Make Payment
    pay_key = str(uuid.uuid4())
    payment_payload = {
        "idempotency_key": pay_key,
        "order_id": order_id,
        "amount": 120.0,
        "method": "cash",
        "provider_txn_id": "LOC-123"
    }
    
    pay_res = await client.post(
        f"{settings.API_V1_STR}/payments/?store_id={store_id}",
        json=payment_payload,
        headers=headers
    )
    assert pay_res.status_code == 200
    pay_data = pay_res.json()["data"]
    assert pay_data["amount"] == 120.0
    assert pay_data["status"] == "success"
    
    # 6. Verify Order Updated to PAID
    # We might need to fetch order again
    # But currently no direct GET /orders/{id} endpoint implemented in spec plan?
    # Let's check listing or trust the flow. The implementation plan mentions "endpoints/.../orders.py"
    # Let's assume there is a list or get endpoint.
    
    # Try list
    list_res = await client.get(f"{settings.API_V1_STR}/orders/?store_id={store_id}", headers=headers)
    assert list_res.status_code == 200
    orders = list_res.json()["data"]
    saved_order = next(o for o in orders if o["id"] == order_id)
    assert saved_order["status"] == "paid"

@pytest.mark.asyncio
async def test_order_total_validation(client: AsyncClient):
    # Setup
    username = "wrong_total_user"
    password = "password"
    await client.post(f"{settings.API_V1_STR}/auth/register", json={"username": username, "password": password})
    token = (await client.post(f"{settings.API_V1_STR}/auth/login", data={"username": username, "password": password})).json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    store_id = (await client.post(f"{settings.API_V1_STR}/stores/", json={"name": "Val Store"}, headers=headers)).json()["data"]["id"]
    
    p_id = (await client.post(
        f"{settings.API_V1_STR}/products/?store_id={store_id}",
        json={"name": "Item", "price": 10.0},
        headers=headers
    )).json()["data"]["id"]
    
    # Try create with wrong total
    res = await client.post(
        f"{settings.API_V1_STR}/orders/?store_id={store_id}",
        json={
            "idempotency_key": str(uuid.uuid4()),
            "items": [{"product_id": p_id, "quantity": 1}],
            "total_amount": 999.0, # Wrong
            "source": "pos"
        },
        headers=headers
    )
    assert res.status_code == 400
    assert "mismatch" in res.json()["detail"]
