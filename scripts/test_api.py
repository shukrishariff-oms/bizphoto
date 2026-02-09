import requests
import sys

# Event ID from inspect_db.py output
EVENT_ID = "9ef08347-90a3-4505-8d8c-a43f817fab43"
URL = f"http://localhost:8000/api/expenses/event/{EVENT_ID}"

# We might need auth token?
# The endpoint has `Depends(get_current_active_user)`.
# If so, we need to login first.
# Lets try without auth first, if 401, we know server is running at least.

def test_api():
    print(f"Testing URL: {URL}")
    try:
        response = requests.get(URL)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response JSON:")
            print(response.json())
        else:
            print("Response Text:")
            print(response.text)
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_api()
