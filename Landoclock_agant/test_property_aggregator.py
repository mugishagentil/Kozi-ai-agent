"""
Test Property Aggregator Tool

This script tests the master property aggregator that searches all Rwanda
real estate websites simultaneously and returns top 5 best matches.
"""

import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from tools.property_aggregator import search_best_properties_all_websites

# Load environment variables
load_dotenv()


def test_property_aggregator():
    """Test the property aggregator with a sample search."""
    print("=" * 80)
    print("🚀 Testing Property Aggregator - All Websites Search")
    print("=" * 80)
    print()
    
    # Test 1: Search for 2-bedroom house in Kigali under 1M RWF for rent
    print("Test: Searching for house in Kigali (2 bedrooms, max 1M RWF) for rent...")
    print()
    
    result = search_best_properties_all_websites.invoke({
        "query": "house",
        "location": "Kigali",
        "bedrooms": 2,
        "budget_max": 1000000,
        "offer_type": "rent"
    })
    
    print(result)
    print()
    print("=" * 80)
    print("✅ Test completed!")
    print("=" * 80)


if __name__ == "__main__":
    test_property_aggregator()

