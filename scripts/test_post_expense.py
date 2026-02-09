import requests
import uuid

# Event ID from previous inspection
EVENT_ID = "9ef08347-90a3-4505-8d8c-a43f817fab43"
URL = "http://localhost:8000/api/expenses/"

def test_create_expense():
    payload = {
        "event_id": EVENT_ID,
        "cost_type": "Photographer Fee",
        "amount": 150.0,
        "description": "Test Expense from Script",
        "rate_type": "per_hour",
        "unit_price": 150.0,
        "quantity": 1.0
    }
    
    print(f"Sending POST to {URL}")
    print(f"Payload: {payload}")
    
    try:
        response = requests.post(URL, json=payload)
        print(f"Status Code: {response.status_code}")
        try:
            print("Response JSON:", response.json())
        except:
            print("Response Text:", response.text)
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_create_expense()
