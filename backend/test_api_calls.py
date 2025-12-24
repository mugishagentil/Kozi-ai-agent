#!/usr/bin/env python3
"""
Test script to validate Kozi API endpoints
This will help us understand what data the API returns and how to call it correctly
"""

import requests
import json
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# API Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "https://apis.kozi.rw")
JOBS_API_URL = os.getenv("JOBS_API_URL", f"{API_BASE_URL}/jobs")
JOB_CATEGORIES_API = os.getenv("JOB_CATEGORIES_API", f"{API_BASE_URL}/categories")
JOB_SEEKERS_BY_CATEGORY_API = os.getenv("JOB_SEEKERS_BY_CATEGORY_API", f"{API_BASE_URL}/job-seekers")

# Login credentials
JOBS_API_LOGIN_URL = os.getenv("JOBS_API_LOGIN_URL", f"{API_BASE_URL}/login")
JOBS_API_EMAIL = os.getenv("JOBS_API_EMAIL")
JOBS_API_PASSWORD = os.getenv("JOBS_API_PASSWORD")
JOBS_API_ROLE_ID = os.getenv("JOBS_API_ROLE_ID", "1")

# Token (will be obtained by login)
API_TOKEN = None

def print_section(title):
    """Print a section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")

def login_and_get_token():
    """Login to the API and get an authentication token"""
    global API_TOKEN
    
    print_section("TEST 0: Login and Get Token")
    
    if not JOBS_API_EMAIL or not JOBS_API_PASSWORD:
        print("❌ ERROR: Missing login credentials")
        print("Please set JOBS_API_EMAIL and JOBS_API_PASSWORD in your .env file")
        return False
    
    url = JOBS_API_LOGIN_URL
    print(f"URL: {url}")
    print(f"Email: {JOBS_API_EMAIL}")
    print(f"Role ID: {JOBS_API_ROLE_ID}")
    
    login_data = {
        "email": JOBS_API_EMAIL,
        "password": JOBS_API_PASSWORD,
        "role_id": int(JOBS_API_ROLE_ID)
    }
    
    try:
        print("\n📡 Logging in...")
        response = requests.post(url, json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ LOGIN SUCCESS!")
            print(f"Response keys: {list(data.keys())}")
            
            # Try to extract token from different possible locations
            if 'token' in data:
                API_TOKEN = data['token']
            elif 'access_token' in data:
                API_TOKEN = data['access_token']
            elif 'data' in data and isinstance(data['data'], dict):
                if 'token' in data['data']:
                    API_TOKEN = data['data']['token']
                elif 'access_token' in data['data']:
                    API_TOKEN = data['data']['access_token']
            
            if API_TOKEN:
                print(f"Token obtained: {API_TOKEN[:30]}..." if len(API_TOKEN) > 30 else f"Token obtained: {API_TOKEN}")
                return True
            else:
                print(f"⚠️  WARNING: Could not find token in response")
                print(f"Response structure: {json.dumps(data, indent=2)[:500]}")
                return False
        else:
            print(f"\n❌ LOGIN FAILED: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"\n❌ EXCEPTION during login: {str(e)}")
        return False

def test_jobs_api():
    """Test the jobs API endpoint"""
    print_section("TEST 1: Jobs API")
    
    url = JOBS_API_URL
    print(f"URL: {url}")
    print(f"Token: {API_TOKEN[:20]}..." if len(API_TOKEN) > 20 else f"Token: {API_TOKEN}")
    
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        print("\n📡 Calling API...")
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ SUCCESS! Got response")
            print(f"Response type: {type(data)}")
            
            if isinstance(data, dict):
                print(f"Keys in response: {list(data.keys())}")
                print(f"\nFull response structure:")
                print(json.dumps(data, indent=2)[:500] + "..." if len(json.dumps(data)) > 500 else json.dumps(data, indent=2))
            elif isinstance(data, list):
                print(f"Number of jobs: {len(data)}")
                if len(data) > 0:
                    print(f"\nFirst job structure:")
                    print(json.dumps(data[0], indent=2))
                    print(f"\nKeys in first job: {list(data[0].keys())}")
        else:
            print(f"\n❌ ERROR: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")

def test_categories_api():
    """Test the categories API endpoint"""
    print_section("TEST 2: Categories API")
    
    url = JOB_CATEGORIES_API
    print(f"URL: {url}")
    
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        print("\n📡 Calling API...")
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ SUCCESS! Got response")
            print(f"Response type: {type(data)}")
            
            if isinstance(data, list):
                print(f"Number of categories: {len(data)}")
                if len(data) > 0:
                    print(f"\nFirst category structure:")
                    print(json.dumps(data[0], indent=2))
                    print(f"\nAll categories:")
                    for i, cat in enumerate(data[:10], 1):  # Show first 10
                        print(f"  {i}. {cat.get('name', cat)}")
            else:
                print(f"\nFull response:")
                print(json.dumps(data, indent=2))
        else:
            print(f"\n❌ ERROR: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")

def test_job_seekers_api():
    """Test the job seekers API endpoint"""
    print_section("TEST 3: Job Seekers API")
    
    url = JOB_SEEKERS_BY_CATEGORY_API
    print(f"URL: {url}")
    
    # Try with a test category
    test_category = "Technology"
    params = {"category": test_category}
    print(f"Parameters: {params}")
    
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        print("\n📡 Calling API...")
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ SUCCESS! Got response")
            print(f"Response type: {type(data)}")
            
            if isinstance(data, list):
                print(f"Number of job seekers: {len(data)}")
                if len(data) > 0:
                    print(f"\nFirst job seeker structure:")
                    print(json.dumps(data[0], indent=2))
            else:
                print(f"\nFull response:")
                print(json.dumps(data, indent=2)[:500])
        else:
            print(f"\n❌ ERROR: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")

def main():
    """Run all tests"""
    print("\n" + "🔍"*40)
    print("  KOZI API ENDPOINT TESTING")
    print("🔍"*40)
    
    print(f"\nConfiguration:")
    print(f"  API_BASE_URL: {API_BASE_URL}")
    print(f"  JOBS_API_URL: {JOBS_API_URL}")
    print(f"  JOB_CATEGORIES_API: {JOB_CATEGORIES_API}")
    print(f"  JOB_SEEKERS_BY_CATEGORY_API: {JOB_SEEKERS_BY_CATEGORY_API}")
    print(f"  LOGIN_URL: {JOBS_API_LOGIN_URL}")
    
    # First, login to get the token
    if not login_and_get_token():
        print("\n❌ Cannot proceed with tests - login failed")
        return
    
    # Run tests
    test_jobs_api()
    test_categories_api()
    test_job_seekers_api()
    
    print_section("TESTING COMPLETE")
    print("Review the results above to understand:")
    print("  1. What structure the API returns")
    print("  2. What parameters it accepts")
    print("  3. How the data should be formatted for the LLM")

if __name__ == "__main__":
    main()

