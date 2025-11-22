"""
Test MCP Web Scraper Tools

This script tests the web scraper tools for OLX, Airbnb, and Kigali Houses
by running sample property search queries.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from tools.mcp_web_scraper import (
    scrape_quick_rw_properties,
    scrape_kwanda_properties,
    search_house_in_rwanda,
)

# Load environment variables
load_dotenv()


def test_quick_rw_scraper():
    """Test Quick Homes Rwanda property scraper (PRIMARY SOURCE)."""
    print("=" * 80)
    print("🏆 Testing Quick Homes Rwanda Scraper (PRIMARY & BEST SOURCE)")
    print("=" * 80)
    print()
    
    # Test 1: Search for 2-bedroom houses in Kigali with budget
    print("Test 1: Searching for 'house' in Kigali (2 bedrooms, max 500M RWF)...")
    result1 = scrape_quick_rw_properties.invoke({
        "query": "house",
        "location": "Kigali",
        "bedrooms": 2,
        "budget_max": 500000000
    })
    print(result1)
    print("\n" + "-" * 80 + "\n")
    
    # Test 2: Search for apartments
    print("Test 2: Searching for 'apartment' in Kigali...")
    result2 = scrape_quick_rw_properties.invoke({
        "query": "apartment",
        "location": "Kigali"
    })
    print(result2)
    print("\n" + "-" * 80 + "\n")


def test_kwanda_scraper():
    """Test Kwanda Real Estate property scraper."""
    print("=" * 80)
    print("🏘️  Testing Kwanda Real Estate Scraper")
    print("=" * 80)
    print()
    
    # Test 1: Search for 2-bedroom houses in Kigali with budget
    print("Test 1: Searching for houses in Kigali (2 bedrooms, max 500M RWF)...")
    result1 = scrape_kwanda_properties.invoke({
        "location": "Kigali",
        "bedrooms": 2,
        "budget_max": 500000000,
        "property_type": "house"
    })
    print(result1)
    print("\n" + "-" * 80 + "\n")
    
    # Test 2: Search for apartments
    print("Test 2: Searching for apartments in Kigali...")
    result2 = scrape_kwanda_properties.invoke({
        "location": "Kigali",
        "property_type": "apartment"
    })
    print(result2)
    print("\n" + "-" * 80 + "\n")


def test_house_in_rwanda_scraper():
    """Test House in Rwanda property scraper."""
    print("=" * 80)
    print("🏠 Testing House in Rwanda Scraper")
    print("=" * 80)
    print()
    
    # Test 1: Search for 2-bedroom houses for rent with budget
    print("Test 1: Searching for houses for rent (2 bedrooms, max 500k RWF/month)...")
    result1 = search_house_in_rwanda.invoke({
        "bedrooms": 2,
        "budget_max": 500000,
        "property_type": "house",
        "offer_type": "rent"
    })
    print(result1)
    print("\n" + "-" * 80 + "\n")
    
    # Test 2: Search for properties for sale
    print("Test 2: Searching for properties for sale...")
    result2 = search_house_in_rwanda.invoke({
        "offer_type": "sale"
    })
    print(result2)
    print("\n" + "-" * 80 + "\n")


def run_all_tests():
    """Run all scraper tests."""
    print("\n" + "=" * 80)
    print("🚀 Starting MCP Web Scraper Tests")
    print("=" * 80)
    print()
    
    try:
        # Test Quick Homes Rwanda scraper (PRIMARY SOURCE)
        test_quick_rw_scraper()
        
        # Test Kwanda Real Estate scraper
        test_kwanda_scraper()
        
        # Test House in Rwanda scraper
        test_house_in_rwanda_scraper()
        
        print("=" * 80)
        print("✅ All tests completed!")
        print("=" * 80)
        print()
        print("Note: Some tests may return errors if websites are not accessible,")
        print("require authentication, or have changed their structure.")
        print("This is expected behavior for web scraping tools.")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()

