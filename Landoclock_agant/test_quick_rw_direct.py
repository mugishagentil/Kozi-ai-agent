"""
Test script to inspect quick.rw website structure
This helps us understand the actual HTML structure so we can improve the scraper
"""

import requests
from bs4 import BeautifulSoup
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from tools.web_scraper_utils import get_headers

def test_quick_rw():
    """Test what quick.rw actually returns"""
    url = "https://www.quick.rw"
    headers = get_headers()
    
    print("=" * 80)
    print("Testing Quick Homes Rwanda (quick.rw) Website Structure")
    print("=" * 80)
    print()
    
    try:
        print(f"🌐 Fetching: {url}")
        response = requests.get(url, headers=headers, timeout=15)
        
        print(f"✅ Status Code: {response.status_code}")
        print(f"📄 Content Length: {len(response.text)} characters")
        print()
        
        if response.status_code != 200:
            print(f"❌ Error: Got status code {response.status_code}")
            return
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Check for JavaScript frameworks
        scripts = soup.find_all('script')
        has_react = any('react' in str(script).lower() for script in scripts)
        has_vue = any('vue' in str(script).lower() for script in scripts)
        has_angular = any('angular' in str(script).lower() for script in scripts)
        
        print("🔍 JavaScript Framework Detection:")
        print(f"   - React: {has_react}")
        print(f"   - Vue: {has_vue}")
        print(f"   - Angular: {has_angular}")
        print()
        
        # Look for property-related elements
        print("🔍 Searching for property containers...")
        
        # Try various selectors
        selectors = [
            ('div', {'class': lambda x: x and 'property' in str(x).lower()}),
            ('div', {'class': lambda x: x and 'listing' in str(x).lower()}),
            ('div', {'class': lambda x: x and 'card' in str(x).lower()}),
            ('article', {}),
            ('div', {'data-property': True}),
            ('a', {'href': lambda x: x and ('property' in x.lower() or 'listing' in x.lower() or 'house' in x.lower() or 'apartment' in x.lower())}),
        ]
        
        for selector_type, attrs in selectors:
            elements = soup.find_all(selector_type, attrs)
            if elements:
                print(f"   ✅ Found {len(elements)} elements with {selector_type} and {attrs}")
                # Show first element structure
                if elements:
                    print(f"      First element classes: {elements[0].get('class', [])}")
                    print(f"      First element HTML (first 300 chars):")
                    print(f"      {str(elements[0])[:300]}...")
                    print()
        
        # Look for property links
        property_links = soup.find_all('a', href=lambda x: x and (
            '/property' in x.lower() or 
            '/listing' in x.lower() or 
            '/house' in x.lower() or 
            '/apartment' in x.lower() or
            '/advert' in x.lower()
        ))
        
        if property_links:
            print(f"🔗 Found {len(property_links)} property links:")
            for i, link in enumerate(property_links[:5], 1):
                href = link.get('href', '')
                text = link.get_text(strip=True)
                print(f"   {i}. {text[:50]} -> {href}")
            print()
        
        # Look for price elements
        price_elements = soup.find_all(['span', 'div', 'p'], 
                                      class_=lambda x: x and 'price' in str(x).lower() if x else False)
        if price_elements:
            print(f"💰 Found {len(price_elements)} price elements:")
            for i, elem in enumerate(price_elements[:5], 1):
                print(f"   {i}. {elem.get_text(strip=True)[:50]}")
            print()
        
        # Check for common property listing patterns
        print("🔍 Checking for common patterns...")
        
        # Check if content is loaded via JavaScript (empty body with scripts)
        body = soup.find('body')
        if body:
            body_text = body.get_text(strip=True)
            if len(body_text) < 100:
                print("   ⚠️  Body content is very short - likely JavaScript-rendered content")
                print(f"   Body text length: {len(body_text)}")
            else:
                print(f"   ✅ Body has content ({len(body_text)} characters)")
        
        # Show page title
        title = soup.find('title')
        if title:
            print(f"   📄 Page Title: {title.get_text()}")
        
        # Show first 1000 characters of body
        print()
        print("=" * 80)
        print("First 1000 characters of page content:")
        print("=" * 80)
        print(response.text[:1000])
        print()
        
        # Save full HTML for inspection (response.text is already decompressed by requests)
        output_file = Path(__file__).parent / "quick_rw_page.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"💾 Full HTML saved to: {output_file}")
        print("   (You can open this in a browser to see what the scraper sees)")
        
        # Try to find actual property data in the HTML
        print()
        print("=" * 80)
        print("Looking for property-related content...")
        print("=" * 80)
        
        # Check for JSON data (many sites use JSON for property listings)
        import json
        script_tags = soup.find_all('script', type='application/json')
        if script_tags:
            print(f"   Found {len(script_tags)} JSON script tags")
            for i, script in enumerate(script_tags[:3], 1):
                try:
                    data = json.loads(script.string)
                    print(f"   Script {i} contains JSON data")
                    if isinstance(data, dict) and ('properties' in data or 'listings' in data or 'items' in data):
                        print(f"   ✅ Found property data in script {i}!")
                except:
                    pass
        
        # Look for data attributes
        data_properties = soup.find_all(attrs={'data-property': True})
        if data_properties:
            print(f"   Found {len(data_properties)} elements with data-property attribute")
        
        # Check for common React/Vue data attributes
        react_data = soup.find_all(attrs={'data-react': True})
        vue_data = soup.find_all(attrs={'data-vue': True})
        if react_data or vue_data:
            print(f"   Found React/Vue data attributes")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request Error: {str(e)}")
        print("   This might mean:")
        print("   - The website is blocking automated requests")
        print("   - Network connectivity issues")
        print("   - The website requires JavaScript to load")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_quick_rw()

