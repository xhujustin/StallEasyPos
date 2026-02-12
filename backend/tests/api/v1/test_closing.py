import pytest
import uuid
from httpx import AsyncClient
from app.core.config import settings
from datetime import date

@pytest.mark.asyncio
async def test_daily_closing_logic(client: AsyncClient):
    # 1. Setup
    username = f"closing_user_{uuid.uuid4()}"
    password = "password"
    await client.post(f"{settings.API_V1_STR}/auth/register", json={"username": username, "password": password})
    token = (await client.post(f"{settings.API_V1_STR}/auth/login", data={"username": username, "password": password})).json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    store_id = (await client.post(f"{settings.API_V1_STR}/stores/", json={"name": "Closing Store"}, headers=headers)).json()["data"]["id"]
    
    p_id = (await client.post(
        f"{settings.API_V1_STR}/products/?store_id={store_id}",
        json={"name": "Item", "price": 100.0},
        headers=headers
    )).json()["data"]["id"]
    
    # 2. Create Orders
    # A. Cash Paid (100) -> Should count
    await client.post(
        f"{settings.API_V1_STR}/payments/?store_id={store_id}",
        json={
            "idempotency_key": str(uuid.uuid4()),
            "order_id": (await create_order(client, headers, store_id, p_id, 100.0, "cash")),
            "amount": 100.0,
            "method": "cash",
            "provider_txn_id": "CASH1"
        },
        headers=headers
    )
    
    # B. LinePay Paid (100) -> Should NOT count for CASH expectation
    await client.post(
        f"{settings.API_V1_STR}/payments/?store_id={store_id}",
        json={
            "idempotency_key": str(uuid.uuid4()),
            "order_id": (await create_order(client, headers, store_id, p_id, 100.0, "linepay")),
            "amount": 100.0,
            "method": "linepay",
            "provider_txn_id": "LP1"
        },
        headers=headers
    )
    
    # C. Pending Order (100) -> Should NOT count
    await create_order(client, headers, store_id, p_id, 100.0, "cash")
    
    # 3. Perform Closing
    # Expected Cash: 100 (Order A only)
    # Actual Cash: 90 (Short -10)
    
    closing_res = await client.post(
        f"{settings.API_V1_STR}/closing/?store_id={store_id}",
        json={"actual_cash": 90.0},
        headers=headers
    )
    assert closing_res.status_code == 200
    data = closing_res.json()["data"]
    
    assert data["business_date"] == str(date.today())
    assert float(data["expected_cash"]) == 100.0
    assert float(data["actual_cash"]) == 90.0
    assert float(data["short_over"]) == -10.0
    
    # 4. Duplicate Closing check
    dup_res = await client.post(
        f"{settings.API_V1_STR}/closing/?store_id={store_id}",
        json={"actual_cash": 90.0},
        headers=headers
    )
    assert dup_res.status_code == 400
    assert "already done" in dup_res.json()["detail"]

async def create_order(client, headers, store_id, product_id, amount, method):
    res = await client.post(
        f"{settings.API_V1_STR}/orders/?store_id={store_id}",
        json={
            "idempotency_key": str(uuid.uuid4()),
            "items": [{"product_id": product_id, "quantity": 1}],
            "total_amount": amount,
            "source": "pos",
            "payment_method": method
        },
        headers=headers
    )
    return res.json()["data"]["id"]
