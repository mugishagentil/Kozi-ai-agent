import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Login first
login_url = "https://apis.kozi.rw/login"
login_data = {
    "email": os.getenv("JOBS_API_EMAIL"),
    "password": os.getenv("JOBS_API_PASSWORD"),
    "role_id": 1
}

response = requests.post(login_url, json=login_data)
token = response.json().get('token')

print("Testing different Job Seekers endpoints...")
headers = {"Authorization": f"Bearer {token}"}

# Try different possible endpoints
endpoints = [
    "/select_user_based_on_category?category=Technology",
    "/job-seekers?category=Technology",
    "/seekers?category=Technology",
    "/users/seekers?category=Technology",
    "/job_seekers?category=Technology",
    "/admin/job_seekers?category=Technology",
    "/seekers/by-category?category=Technology",
    "/api/job-seekers?category=Technology",
]

for endpoint in endpoints:
    url = f"https://apis.kozi.rw{endpoint}"
    print(f"\nTrying: {url}")
    try:
        r = requests.get(url, headers=headers, timeout=5)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            print(f"  ✅ FOUND IT! Response: {str(r.json())[:200]}")
            break
    except Exception as e:
        print(f"  Error: {str(e)[:50]}")
