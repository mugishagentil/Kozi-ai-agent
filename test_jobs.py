#!/usr/bin/env python3
"""
Test script to verify job search functionality
"""

import sys
import os
from pathlib import Path

# Add src_python to path
sys.path.insert(0, str(Path(__file__).parent / "backend" / "src_python"))

from tools.mcp_tools import search_jobs, get_current_jobs_data, clear_current_jobs_data

def test_job_search():
    print("🧪 Testing job search functionality...")
    
    # Clear any existing data
    clear_current_jobs_data()
    
    # Test search for marketing jobs
    print("\n1. Searching for marketing jobs...")
    result = search_jobs(
        query="marketing",
        category="marketing", 
        fetch_all=True,
        api_token="test_token"  # This will likely fail but we can see the flow
    )
    
    print(f"Search result: {result}")
    
    # Check if jobs were stored
    print("\n2. Checking stored jobs data...")
    jobs_data = get_current_jobs_data()
    if jobs_data:
        print(f"✅ Found {len(jobs_data)} jobs in global storage")
        print(f"First job: {jobs_data[0] if jobs_data else 'None'}")
    else:
        print("❌ No jobs found in global storage")
    
    return jobs_data

if __name__ == "__main__":
    test_job_search()