import httpx
import sys

# Change base URL if needed
BASE_URL = "http://localhost:8000/api/v1"

def check_me_endpoint():
    # 1. Login
    print("Logging in as admin...")
    try:
        resp = httpx.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "password"})
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code} {resp.text}")
            return
        
        json_resp = resp.json()
        print(f"Login Response: {json_resp}")
        
        if "data" in json_resp:
             # It might be wrapped in ResponseBase?
             # auth endpoint usually returns Token directly or ResponseBase?
             # Let's check auth.py
             token = json_resp["data"]["access_token"]
        else:
             token = json_resp["access_token"]
             
        print("Login successful. Token obtained.")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    # 2. Get Me
    print("Fetching /users/me...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = httpx.get(f"{BASE_URL}/users/me", headers=headers)
    
    if resp.status_code != 200:
        print(f"Get Me failed: {resp.status_code} {resp.text}")
        return

    data = resp.json()["data"]
    print(f"User: {data['username']} (ID: {data['id']})")
    
    if "stores" in data:
        print(f"Stores found: {len(data['stores'])}")
        for s in data["stores"]:
            print(f"- {s['name']} (ID: {s['id']})")
        
        if len(data["stores"]) > 0:
            print("SUCCESS: Stores are being returned.")
        else:
            print("WARNING: 'stores' field exists but is empty.")
    else:
        print("FAILURE: 'stores' field missing in response.")

if __name__ == "__main__":
    check_me_endpoint()
