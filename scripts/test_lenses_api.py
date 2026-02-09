import requests
import uuid

BASE_URL = "http://localhost:8000/api"
# Assuming we can use the same admin user or just need a valid token.
# For simplicity in this test script, assuming no auth or using a known token? 
# The routers use `Depends(get_current_active_user)`.
# I need to login first to get a token.

def test_lenses_crud():
    print("Testing Lenses API...")
    
    # 1. Login
    login_data = {
        "username": "admin",
        "password": "password"
    }
    try:
        resp = requests.post(f"{BASE_URL}/auth/token", data=login_data)
        if resp.status_code != 200:
            print("Failed to login:", resp.text)
            return
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    # 2. Create Lens
    lens_data = {
        "model_name": "Sony FE 24-70mm GM II",
        "serial_number": "LENS12345",
        "purchase_price": 8999.00,
        "purchase_date": "2024-01-15"
    }
    resp = requests.post(f"{BASE_URL}/lenses/", json=lens_data, headers=headers)
    if resp.status_code != 200:
        print("Failed to create lens:", resp.text)
        return
    lens_id = resp.json()["id"]
    print(f"Lens created: {lens_id}")

    # 3. List Lenses
    resp = requests.get(f"{BASE_URL}/lenses/", headers=headers)
    lenses = resp.json()
    print(f"Lenses count: {len(lenses)}")
    found = False
    for l in lenses:
        if l["id"] == lens_id:
            found = True
            print(f"Found lens: {l['model_name']} ({l['serial_number']})")
            break
    if not found:
        print("Created lens not found in list!")

    # 4. Update Lens
    update_data = {
        "purchase_price": 9200.00
    }
    resp = requests.put(f"{BASE_URL}/lenses/{lens_id}", json=update_data, headers=headers)
    if resp.status_code == 200:
        print("Lens updated.")
    else:
        print("Failed to update lens:", resp.text)

    # 5. Get Lens Details
    resp = requests.get(f"{BASE_URL}/lenses/{lens_id}", headers=headers)
    if resp.status_code == 200:
        details = resp.json()
        if details["purchase_price"] == 9200.00:
            print("Lens details verified.")
        else:
            print(f"Lens update not reflected: {details['purchase_price']}")
    
    # 6. Delete Lens
    resp = requests.delete(f"{BASE_URL}/lenses/{lens_id}", headers=headers)
    if resp.status_code == 200:
        print("Lens deleted.")
    else:
        print("Failed to delete lens:", resp.text)

    # Verify Deletion
    resp = requests.get(f"{BASE_URL}/lenses/{lens_id}", headers=headers)
    if resp.status_code == 404:
        print("Deletion verified.")
    else:
        print("Lens still exists after deletion.")

if __name__ == "__main__":
    test_lenses_crud()
