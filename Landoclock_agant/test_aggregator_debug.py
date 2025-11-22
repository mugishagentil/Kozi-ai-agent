"""
Debug Test for Property Aggregator

This script tests the aggregator and shows detailed debug output
to diagnose why properties aren't being found or URLs are wrong.
"""

import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from tools.property_aggregator import search_best_properties_all_websites

# Load environment variables
load_dotenv()


def test_aggregator_debug():
    """Test the property aggregator with debug output."""
    print("=" * 80)
    print("🔍 DEBUG TEST: Property Aggregator")
    print("=" * 80)
    print()
    
    print("Searching for: house in Kigali (2 bedrooms, max 1M RWF) for rent")
    print()
    
    result = search_best_properties_all_websites.invoke({
        "query": "house",
        "location": "Kigali",
        "bedrooms": 2,
        "budget_max": 1000000,
        "offer_type": "rent"
    })
    
    print("\n" + "=" * 80)
    print("RESULT:")
    print("=" * 80)
    print(result)
    print("\n" + "=" * 80)


if __name__ == "__main__":
    test_aggregator_debug()

