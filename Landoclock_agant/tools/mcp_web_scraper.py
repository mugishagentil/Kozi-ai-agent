"""
MCP Web Scraper Tools for Rwanda Real Estate

This module provides LangChain tools for scraping live property listings
from verified Rwanda real estate websites:
- Quick Homes Rwanda (quick.rw) - Primary source
- Kwanda Real Estate (kwandarealestate.com)
- House in Rwanda (houseinrwanda.com)
"""

import os
import re
import json
import requests
from typing import Optional, List, Dict, Any
from langchain_core.tools import tool
from dotenv import load_dotenv
from bs4 import BeautifulSoup

from .web_scraper_utils import (
    parse_property_listings,
    extract_price,
    extract_contact_info,
    format_results,
    add_delays_between_requests,
    get_headers,
    scrape_with_scrapingant,
)

# Load environment variables
load_dotenv()


@tool
def scrape_quick_rw_properties(query: str, location: str = "Kigali", bedrooms: Optional[int] = None, budget_max: Optional[float] = None) -> str:
    """
    Search Quick Homes Rwanda (quick.rw) for property listings.
    
    Quick Homes Rwanda is a leading real estate platform in Rwanda with verified property listings.
    This is the PRIMARY and BEST source for Rwanda real estate searches.
    
    Args:
        query: Search query (e.g., "house", "apartment", "land", "villa")
        location: Location to search in (default: "Kigali")
        bedrooms: Number of bedrooms desired (optional)
        budget_max: Maximum budget in RWF (optional)
        
    Returns:
        Formatted string with property listings including title, price, location, bedrooms, and contact info.
        Returns error message if scraping fails.
    
    Example:
        >>> result = scrape_quick_rw_properties("house", "Kigali", bedrooms=2, budget_max=500000)
        >>> print(result)
    """
    try:
        base_url = "https://www.quick.rw"
        
        # Try different URL structures - start with homepage or properties page
        possible_urls = [
            f"{base_url}/properties",
            f"{base_url}/listings",
            f"{base_url}/search",
            f"{base_url}",
        ]
        
        headers = get_headers()
        response = None
        html_content = None
        
        # Try each URL until one works
        for search_url in possible_urls:
            try:
                # Build query parameters
                params = {}
                if query and search_url != base_url:
                    params['q'] = query
                if location and search_url != base_url:
                    params['location'] = location
                if bedrooms and search_url != base_url:
                    params['bedrooms'] = bedrooms
                if budget_max and search_url != base_url:
                    params['max_price'] = budget_max
                
                # Try ScrapingAnt first (handles JavaScript-rendered content)
                full_url = search_url + ('?' + '&'.join([f'{k}={v}' for k, v in params.items()]) if params else '')
                html_content = scrape_with_scrapingant(full_url)
                
                # If ScrapingAnt not available or failed, use regular requests
                if html_content:
                    response = type('obj', (object,), {'text': html_content, 'status_code': 200})()
                    break
                else:
                    response = requests.get(search_url, headers=headers, params=params if params else None, timeout=15)
                    if response.status_code == 200:
                        html_content = response.text
                        break
            except requests.exceptions.RequestException:
                continue
        
        if not response or response.status_code != 200:
            return (
                f"Unable to access Quick Homes Rwanda (quick.rw). The site structure may have changed.\n\n"
                f"**Search Suggestions:**\n"
                f"- Visit Quick Homes directly: {base_url}\n"
                f"- Search for: '{query}' in {location}\n"
                f"- Try other Rwanda real estate platforms (Kwanda Real Estate, House in Rwanda)\n\n"
                f"**Note:** Quick Homes Rwanda may require direct browser access or have changed their URL structure."
            )
        
        # Parse listings
        html_to_parse = html_content if html_content else response.text
        soup = BeautifulSoup(html_to_parse, 'lxml')
        listings = []
        
        # Quick.rw uses /property/ URLs - find all property links first
        property_links = soup.find_all('a', href=re.compile(r'/property/', re.I))
        
        # Also look for listing containers (cards, items, etc.)
        listing_containers = soup.find_all(['div', 'article', 'section'], 
                                          class_=re.compile(r'property|listing|card|item|house|apartment|post', re.I))
        
        # If we found property links, extract containers from their parents
        if property_links:
            for link in property_links[:30]:  # Check first 30 property links
                parent = link.find_parent(['div', 'article', 'section', 'li'])
                if parent and parent not in listing_containers:
                    listing_containers.append(parent)
        
        # If still no containers, try data attributes
        if not listing_containers:
            listing_containers = soup.find_all(['div'], attrs={'data-property': True})
        
        for container in listing_containers[:30]:  # Limit to 30 listings
            listing = {}
            
            # Extract title - try multiple strategies
            title_elem = None
            
            # Strategy 1: Look for property link first (most reliable for quick.rw)
            prop_link = container.find('a', href=re.compile(r'/property/', re.I))
            if prop_link:
                title_elem = prop_link
                href = prop_link.get('href', '')
                # Build full URL
                if href.startswith('/'):
                    full_url = base_url + href
                elif href.startswith('http'):
                    full_url = href
                else:
                    full_url = base_url + '/' + href
                listing['url'] = full_url
            
            # Strategy 2: Look for heading elements
            if not title_elem:
                title_elem = container.find(['h1', 'h2', 'h3', 'h4', 'h5'], 
                                           class_=re.compile(r'title|heading|name|entry-title', re.I))
            
            # Strategy 3: Look for any link with property in href
            if not title_elem:
                title_elem = container.find('a', href=re.compile(r'/property|/listing'))
            
            # Strategy 4: Look for any heading in container
            if not title_elem:
                title_elem = container.find(['h1', 'h2', 'h3', 'h4', 'h5'])
            
            if title_elem:
                title_text = title_elem.get_text(strip=True)
                if title_text and len(title_text) > 5:  # Valid title
                    listing['title'] = title_text
                    
                    # Extract URL if not already set
                    if not listing.get('url') and title_elem.name == 'a' and title_elem.get('href'):
                        href = title_elem['href']
                        if href.startswith('/'):
                            full_url = base_url + href
                        elif href.startswith('http'):
                            full_url = href
                        else:
                            full_url = base_url + '/' + href
                        
                        # Only add if it's a property page
                        if '/property/' in full_url.lower() or '/listing/' in full_url.lower():
                            listing['url'] = full_url
            
            # Extract price - try multiple strategies
            price_elem = None
            price_text = None
            
            # Strategy 1: Look for price class
            price_elem = container.find(['span', 'div', 'p'], 
                                      class_=re.compile(r'price|cost|amount', re.I))
            
            # Strategy 2: Look for RWF or currency symbols in text
            if not price_elem:
                container_text = container.get_text()
                if 'RWF' in container_text or 'Fr' in container_text or '$' in container_text:
                    # Try to find price in container text
                    price_text = container_text
            
            if price_elem:
                price_text = price_elem.get_text(strip=True)
            
            if price_text:
                # Clean price text - remove common non-price words
                price_text_clean = re.sub(r'\b(Sqm|Price|Cost|Amount)\b', '', price_text, flags=re.IGNORECASE).strip()
                
                extracted_price = extract_price(price_text_clean if price_text_clean else price_text)
                if extracted_price and extracted_price != "RWF Sqm":  # Skip invalid prices
                    listing['price'] = extracted_price
                    # Extract numeric value for scoring
                    price_num_match = re.search(r'([\d,]+)', extracted_price.replace(',', ''))
                    if price_num_match:
                        try:
                            listing['price_numeric'] = int(price_num_match.group(1).replace(',', ''))
                        except ValueError:
                            pass
            
            # Extract location - clean up location text
            location_elem = container.find(['span', 'div', 'p'], 
                                         class_=re.compile(r'location|address|area|city|place', re.I))
            if location_elem:
                loc_text = location_elem.get_text(strip=True)
                # Clean up location - remove common prefixes and long text
                if len(loc_text) > 100:  # Too long, likely includes other content
                    # Try to extract just the location name
                    loc_match = re.search(r'(Kigali|Nyarutarama|Kacyiru|Kimihurura|Remera|Gacuriro|Kiyovu|Rusororo|Kimironko|Rebero|Muhazi|Gahanga|Kicukiro|Niboye|Kibagabaga|Busanza|Gikondo)', loc_text, re.IGNORECASE)
                    if loc_match:
                        listing['location'] = loc_match.group(1)
                    else:
                        listing['location'] = location  # Use default
                else:
                    listing['location'] = loc_text
            elif location:
                listing['location'] = location
            
            # Extract bedrooms
            if bedrooms:
                listing['bedrooms'] = bedrooms
            else:
                beds_elem = container.find(['span', 'div'], 
                                          class_=re.compile(r'bed|bedroom', re.I))
                if beds_elem:
                    beds_text = beds_elem.get_text()
                    beds_match = re.search(r'(\d+)', beds_text)
                    if beds_match:
                        listing['bedrooms'] = beds_match.group(1)
            
            # Extract contact info
            contact_info = extract_contact_info(container.get_text())
            if contact_info:
                listing['contact'] = contact_info
            
            # Only add if we have valid data (title AND (price OR URL))
            # Skip listings with invalid prices like "Sqm" or "Price"
            has_valid_price = listing.get('price') and listing['price'] not in ['Sqm', 'Price', 'Cost', 'Amount']
            has_title = listing.get('title') and len(listing['title']) > 5
            has_url = listing.get('url')
            
            if has_title and (has_valid_price or has_url):
                listing['source'] = "Quick Homes Rwanda"
                listings.append(listing)
        
        # If still no listings, try generic parser
        if not listings:
            listings = parse_property_listings(response.text, "Quick Homes Rwanda")
        
        add_delays_between_requests(1.0)
        
        # Always use format_results for consistency (even if empty)
        return format_results(listings, "Quick Homes Rwanda")
    
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        if "Failed to resolve" in error_msg or "NameResolutionError" in error_msg:
            return (
                f"Unable to connect to Quick Homes Rwanda (quick.rw).\n\n"
                f"**Alternative Options:**\n"
                f"1. Visit Quick Homes directly: https://www.quick.rw\n"
                f"2. Try other Rwanda real estate platforms\n"
                f"3. Search manually for: '{query}' in {location}\n\n"
                f"**Note:** The website may be temporarily down."
            )
        return f"Error accessing Quick Homes Rwanda: {error_msg}. Please try again later or visit https://www.quick.rw directly."
    except Exception as e:
        return f"Error scraping Quick Homes Rwanda properties: {str(e)}"


@tool
def scrape_kwanda_properties(location: str = "Kigali", bedrooms: Optional[int] = None, budget_max: Optional[float] = None, property_type: str = "all") -> str:
    """
    Search Kwanda Real Estate (kwandarealestate.com) for property listings.
    
    Kwanda Real Estate is a verified real estate agency in Kigali, Rwanda offering
    residential houses, apartments, plots of land, commercial properties, and joint ventures.
    
    Args:
        location: Location to search in (default: "Kigali")
        bedrooms: Number of bedrooms desired (optional)
        budget_max: Maximum budget in RWF (optional)
        property_type: Type of property - "house", "apartment", "land", "commercial", "all" (default: "all")
        
    Returns:
        Formatted string with property listings including title, price, location, bedrooms, and contact info.
        Returns error message if scraping fails.
    
    Example:
        >>> result = scrape_kwanda_properties("Kigali", bedrooms=2, budget_max=500000000, property_type="house")
        >>> print(result)
    """
    try:
        base_url = "https://www.kwandarealestate.com"
        
        # Try different URL structures - Kwanda may use different paths
        possible_urls = [
            f"{base_url}",  # Homepage with all properties
            f"{base_url}/all-properties",
            f"{base_url}/properties",
        ]
        
        headers = get_headers()
        response = None
        html_content = None
        
        # Try each URL until one works
        for search_url in possible_urls:
            try:
                # Try ScrapingAnt first (handles JavaScript-rendered content)
                html_content = scrape_with_scrapingant(search_url)
                
                # If ScrapingAnt not available or failed, use regular requests
                if html_content:
                    response = type('obj', (object,), {'text': html_content, 'status_code': 200})()
                    break
                else:
                    response = requests.get(search_url, headers=headers, timeout=15)
                    if response.status_code == 200:
                        html_content = response.text
                        break
            except requests.exceptions.RequestException:
                continue
        
        if not response or response.status_code != 200:
            return (
                f"Unable to access Kwanda Real Estate website. The site structure may have changed.\n\n"
                f"**Contact Kwanda Real Estate:**\n"
                f"- Phone: +250 788 370 360\n"
                f"- Email: [email protected]\n"
                f"- Website: {base_url}\n"
                f"- Address: KG 5 Ave Kacyiru, Ikirezi Building, Kigali-Rwanda\n\n"
                f"**Alternative:** Try Quick Homes Rwanda (quick.rw) or House in Rwanda"
            )
        
        # Parse listings
        html_to_parse = html_content if html_content else response.text
        soup = BeautifulSoup(html_to_parse, 'lxml')
        listings = []
        
        # Based on Kwanda Real Estate structure - look for property cards
        # They use featured properties and recent properties sections
        property_sections = soup.find_all(['div', 'article', 'section'], 
                                         class_=re.compile(r'property|featured|recent|listing', re.I))
        
        for section in property_sections[:30]:  # Check more items
            listing = {}
            
            # Extract title - Kwanda uses property titles
            title_elem = section.find(['h1', 'h2', 'h3', 'h4', 'h5', 'a'], 
                                     class_=re.compile(r'title|heading|name', re.I))
            if not title_elem:
                title_elem = section.find('a', href=re.compile(r'/property|/all-properties'))
            if title_elem:
                listing['title'] = title_elem.get_text(strip=True)
                if title_elem.name == 'a' and title_elem.get('href'):
                    href = title_elem['href']
                    # Build full URL
                    if href.startswith('/'):
                        full_url = base_url + href
                    elif href.startswith('http'):
                        full_url = href
                    else:
                        full_url = base_url + '/' + href
                    
                    # Only add if it's a property page, not homepage
                    if any(pattern in full_url.lower() for pattern in ['/property/', '/listing/', '/house/', '/apartment/', '/advert/', '/all-properties/']):
                        listing['url'] = full_url
                    # Also check for numeric IDs in URL
                    elif re.search(r'/\d+', href):
                        listing['url'] = full_url
            
            # Extract price - Kwanda shows prices like "2,500,000,000 RWF"
            price_elem = section.find(['span', 'div', 'p', 'h3', 'h4'], 
                                     class_=re.compile(r'price|cost|amount', re.I))
            if not price_elem:
                # Look for RWF pattern in text
                price_text = section.get_text()
                price_match = re.search(r'([\d,]+)\s*RWF|RWF\s*([\d,]+)', price_text, re.IGNORECASE)
                if price_match:
                    price = price_match.group(1) or price_match.group(2)
                    listing['price'] = f"RWF {price}"
            else:
                price_text = price_elem.get_text()
                extracted_price = extract_price(price_text)
                if extracted_price:
                    listing['price'] = extracted_price
                    # Extract numeric value for scoring
                    price_num_match = re.search(r'([\d,]+)', extracted_price.replace(',', ''))
                    if price_num_match:
                        try:
                            listing['price_numeric'] = int(price_num_match.group(1).replace(',', ''))
                        except ValueError:
                            pass
                else:
                    listing['price'] = price_text.strip()
            
            # Extract location - Kwanda shows locations like "Kacyiru", "Nyarutarama"
            location_elem = section.find(['span', 'div', 'p'], 
                                        class_=re.compile(r'location|address|area|city', re.I))
            if location_elem:
                listing['location'] = location_elem.get_text(strip=True)
            elif location:
                listing['location'] = location
            
            # Extract bedrooms - Kwanda shows "Beds: 4"
            beds_text = section.get_text()
            beds_match = re.search(r'Beds?:\s*(\d+)', beds_text, re.IGNORECASE)
            if beds_match:
                listing['bedrooms'] = beds_match.group(1)
            elif bedrooms:
                listing['bedrooms'] = bedrooms
            
            # Extract bathrooms
            baths_match = re.search(r'Baths?:\s*(\d+)', beds_text, re.IGNORECASE)
            if baths_match:
                listing['bathrooms'] = baths_match.group(1)
            
            # Extract square meters
            sq_match = re.search(r'Sq:\s*([\d,]+)\s*m2', beds_text, re.IGNORECASE)
            if sq_match:
                listing['size'] = f"{sq_match.group(1)} m²"
            
            # Contact info - Kwanda has phone: +250 788 370 360, email: [email protected]
            contact_info = extract_contact_info(section.get_text())
            if not contact_info:
                # Add default Kwanda contact
                contact_info = {
                    'phone': '+250 788 370 360',
                    'email': '[email protected]'
                }
            listing['contact'] = contact_info
            
            # Filter by budget if specified
            if budget_max and listing.get('price'):
                price_str = listing['price']
                price_match = re.search(r'([\d,]+)', price_str.replace(',', ''))
                if price_match:
                    try:
                        price_value = int(price_match.group(1).replace(',', ''))
                        if price_value > budget_max:
                            continue
                    except ValueError:
                        pass
            
            # Only add if we have at least title or price
            if listing.get('title') or listing.get('price'):
                listing['source'] = "Kwanda Real Estate"
                listings.append(listing)
        
        # If still no listings, try generic parser
        if not listings:
            listings = parse_property_listings(response.text, "Kwanda Real Estate")
        
        add_delays_between_requests(1.0)
        
        # Always use format_results for consistency (even if empty)
        return format_results(listings, "Kwanda Real Estate")
    
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        return (
            f"Error accessing Kwanda Real Estate: {error_msg}\n\n"
            f"**Contact Information:**\n"
            f"- Phone: +250 788 370 360\n"
            f"- Email: [email protected]\n"
            f"- Website: https://www.kwandarealestate.com\n"
            f"- Address: KG 5 Ave Kacyiru, Ikirezi Building, Kigali-Rwanda\n\n"
            f"**Alternative:** Try Quick Homes Rwanda (quick.rw) or House in Rwanda"
        )
    except Exception as e:
        return f"Error scraping Kwanda Real Estate properties: {str(e)}"


@tool
def search_house_in_rwanda(bedrooms: Optional[int] = None, budget_max: Optional[float] = None, property_type: str = "all", offer_type: str = "all") -> str:
    """
    Search House in Rwanda (houseinrwanda.com) for property listings.
    
    House in Rwanda is a comprehensive real estate platform offering properties for rent,
    sale, short stay, and auctions across Rwanda.
    
    Args:
        bedrooms: Number of bedrooms desired (optional)
        budget_max: Maximum budget in RWF (optional)
        property_type: Type of property - "house", "apartment", "room", "land", "all" (default: "all")
        offer_type: Type of offer - "rent", "sale", "auction", "short", "all" (default: "all")
        
    Returns:
        Formatted string with property listings including title, price, location, bedrooms, and contact info.
        Returns error message if scraping fails.
    
    Example:
        >>> result = search_house_in_rwanda(bedrooms=2, budget_max=500000, property_type="house", offer_type="rent")
        >>> print(result)
    """
    try:
        base_url = "https://www.houseinrwanda.com"
        
        # Build search URL based on offer type
        if offer_type.lower() == "rent":
            search_url = f"{base_url}/for-rent"
        elif offer_type.lower() == "sale":
            search_url = f"{base_url}/for-sale"
        elif offer_type.lower() == "auction":
            search_url = f"{base_url}/auctions"
        elif offer_type.lower() == "short":
            search_url = f"{base_url}/short-stay"
        else:
            search_url = f"{base_url}/for-rent"  # Default to rent
        
        # Build query parameters
        params = {}
        if bedrooms:
            # House in Rwanda uses room ranges: 1, 2-3, 4-6, 7-9, 9+
            if bedrooms == 1:
                params['rooms'] = '1 room'
            elif 2 <= bedrooms <= 3:
                params['rooms'] = '2 - 3 rooms'
            elif 4 <= bedrooms <= 6:
                params['rooms'] = '4 - 6 rooms'
            elif 7 <= bedrooms <= 9:
                params['rooms'] = '7 - 9 rooms'
            else:
                params['rooms'] = '9+ rooms'
        
        if budget_max:
            # House in Rwanda uses price ranges
            if budget_max < 100000:
                params['price'] = 'less than 100k'
            elif budget_max < 200000:
                params['price'] = '100k - 200k'
            elif budget_max < 300000:
                params['price'] = '200k - 300k'
            elif budget_max < 400000:
                params['price'] = '300k - 400k'
            elif budget_max < 600000:
                params['price'] = '400k - 600k'
            elif budget_max < 800000:
                params['price'] = '600k - 800k'
            elif budget_max < 1000000:
                params['price'] = '800k - 1M'
            elif budget_max < 5000000:
                params['price'] = '1M - 5M'
            elif budget_max < 10000000:
                params['price'] = '5M - 10M'
            elif budget_max < 50000000:
                params['price'] = '10M - 50M'
            elif budget_max < 75000000:
                params['price'] = '50M - 75M'
            elif budget_max < 100000000:
                params['price'] = '75M - 100M'
            elif budget_max < 150000000:
                params['price'] = '100M - 150M'
            elif budget_max < 200000000:
                params['price'] = '150M - 200M'
            else:
                params['price'] = 'More than 200M'
        
        headers = get_headers()
        
        # Try ScrapingAnt first (handles JavaScript-rendered content)
        html_content = scrape_with_scrapingant(f"{search_url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}" if params else search_url)
        
        # If ScrapingAnt not available or failed, use regular requests
        if not html_content:
            response = requests.get(search_url, headers=headers, params=params, timeout=15)
            response.raise_for_status()
            html_content = response.text
        else:
            # Create a mock response object for consistency
            response = type('obj', (object,), {'text': html_content, 'status_code': 200})()
        
        # Parse listings
        soup = BeautifulSoup(html_content, 'lxml')
        listings = []
        
        # House in Rwanda uses advert listings - look for property cards
        # Exclude filter/sidebar elements
        listing_containers = soup.find_all(['div', 'article'], 
                                          class_=re.compile(r'advert|property|listing|card', re.I))
        
        # Filter out sidebar, filter, and navigation elements
        filtered_containers = []
        for container in listing_containers:
            container_text = container.get_text()
            container_html = str(container).lower()
            
            # Skip filter elements
            if any(keyword in container_html for keyword in ['filter', 'sidebar', 'nav', 'menu', 'dropdown', 'select']):
                continue
            
            # Skip if it looks like a filter UI (contains price ranges as options)
            if re.search(r'less than 100k|100k - 200k|200k - 300k', container_text, re.IGNORECASE):
                if 'price' in container_html and ('select' in container_html or 'option' in container_html):
                    continue
            
            # Skip if it's just a link to advertiser page
            if '/advertiser/' in container_html and not container.find('a', href=re.compile(r'/advert/\d+|/property/\d+')):
                continue
            
            filtered_containers.append(container)
        
        for container in filtered_containers[:20]:  # Limit to 20 listings
            listing = {}
            container_text = container.get_text()
            
            # Skip if this looks like a filter element
            if re.search(r'^Price\s*-?\s*(less than|100k|200k|300k)', container_text, re.IGNORECASE):
                continue
            
            # Extract title - must have a meaningful title
            # Try multiple strategies to find the title
            title_text = None
            title_elem = None
            
            # Strategy 1: Look for property link first and extract title from URL slug (MOST RELIABLE)
            prop_link = container.find('a', href=re.compile(r'/property/|/advert/'))
            if prop_link:
                href = prop_link.get('href', '')
                
                # For House in Rwanda, extract title from URL slug (most reliable - matches website exactly)
                if '/property/' in href.lower():
                    # Extract from URL slug: /property/rent/apartment/kigali-furnished-apartment-rent-kanombe
                    # Convert slug to readable title - this matches what's on the website
                    slug_parts = href.split('/')
                    if len(slug_parts) > 0:
                        slug = slug_parts[-1]  # Last part is the slug
                        # Convert kigali-furnished-apartment-rent-kanombe to "Kigali Furnished Apartment For Rent Kanombe"
                        # Replace 'rent' with 'for rent' but avoid double 'for'
                        title_from_slug = slug.replace('-', ' ')
                        # Replace 'rent' with 'for rent' but only if not already preceded by 'for'
                        title_from_slug = re.sub(r'\brent\b', 'for rent', title_from_slug)
                        # Fix double "for for rent" -> "for rent"
                        title_from_slug = re.sub(r'\bfor for rent\b', 'for rent', title_from_slug, flags=re.IGNORECASE)
                        # Capitalize properly
                        title_from_slug = ' '.join(word.capitalize() for word in title_from_slug.split())
                        title_text = title_from_slug
                        title_elem = prop_link
                
                # If we didn't get title from slug, try link text
                if not title_text:
                    link_text = prop_link.get_text(strip=True, separator=' ')
                    link_title_attr = prop_link.get('title', '')
                    # Use whichever is longer (more complete)
                    if link_title_attr and len(link_title_attr) > len(link_text or ''):
                        title_text = link_title_attr
                    elif link_text:
                        title_text = link_text
                    title_elem = prop_link
            
            # Strategy 2: Look for heading elements in container
            if not title_text or len(title_text) < 10:
                title_elem = container.find(['h1', 'h2', 'h3', 'h4', 'h5'], 
                                           class_=re.compile(r'title|heading|name', re.I))
                if title_elem:
                    heading_text = title_elem.get_text(strip=True, separator=' ')
                    if len(heading_text) > len(title_text or ''):
                        title_text = heading_text
            
            # Strategy 3: Look for any text element that might contain the title
            if not title_text or len(title_text) < 10:
                # Look for divs/spans with title-like classes
                title_div = container.find(['div', 'span'], class_=re.compile(r'title|heading|name', re.I))
                if title_div:
                    div_text = title_div.get_text(strip=True, separator=' ')
                    if len(div_text) > len(title_text or ''):
                        title_text = div_text
            
            if title_text and len(title_text) > 15:
                # Preserve FULL title - don't truncate
                # Skip generic titles like "Apartments For rent"
                if not title_text.lower().startswith(('apartments for', 'houses for', 'properties for', 'price', 'filter', 'search')):
                    # Clean title but preserve original - remove extra whitespace
                    clean_title = ' '.join(title_text.split())
                    listing['title'] = clean_title
                    # Store original for exact matching with website
                    listing['title_original'] = clean_title
            
            # Extract URL - Search ALL links in container, not just title link
            # House in Rwanda property links are usually in <a> tags with /advert/ or numeric IDs
            all_links = container.find_all('a', href=True)
            property_url_found = False
            
            for link in all_links:
                href = link.get('href', '')
                if not href:
                    continue
                
                # Build full URL
                if href.startswith('/'):
                    full_url = base_url + href
                elif href.startswith('http'):
                    full_url = href
                else:
                    full_url = base_url + '/' + href
                
                # Check if this is a property detail page (not category or advertiser page)
                url_lower = full_url.lower()
                
                # Reject category/advertiser pages first
                if '/advertiser/' in url_lower or '/category/' in url_lower or '/advertisers' in url_lower:
                    continue
                
                # House in Rwanda uses slug-based URLs like /property/rent/apartment/...
                # OR numeric IDs like /advert/12345 or /property/12345
                if '/property/' in url_lower:
                    # Accept slug-based URLs (e.g., /property/rent/apartment/kigali-...)
                    # Must have at least 3 path segments after /property/ to be a valid property page
                    if re.search(r'/property/[^/]+/[^/]+/[^/]+', url_lower):
                        listing['url'] = full_url
                        property_url_found = True
                        break
                    # Also accept numeric IDs (e.g., /property/12345)
                    elif re.search(r'/property/\d+', url_lower):
                        listing['url'] = full_url
                        property_url_found = True
                        break
                elif '/advert/' in url_lower:
                    # Must have numeric ID in URL to be valid property page
                    if re.search(r'/\d+', full_url):
                        listing['url'] = full_url
                        property_url_found = True
                        break
                # Also accept URLs with numeric IDs that look like property pages
                elif re.search(r'/(advert|property|listing|house|apartment)/\d+', url_lower):
                    listing['url'] = full_url
                    property_url_found = True
                    break
                # Also accept URLs with just numeric IDs (like /12345) - at least 4 digits
                elif re.search(r'/\d{4,}', url_lower):
                    listing['url'] = full_url
                    property_url_found = True
                    break
            
            # Extract price - House in Rwanda shows "900,000 RWF/month" or "Price on request"
            price_elem = container.find(['span', 'div', 'p'], 
                                       class_=re.compile(r'price|cost|amount', re.I))
            if price_elem:
                price_text = price_elem.get_text()
                # Skip if it's a filter dropdown
                if not re.search(r'less than|100k - 200k|200k - 300k', price_text, re.IGNORECASE):
                    extracted_price = extract_price(price_text)
                    if extracted_price:
                        listing['price'] = extracted_price
                        # Also extract numeric value for scoring
                        price_num_match = re.search(r'([\d,]+)', extracted_price.replace(',', ''))
                        if price_num_match:
                            try:
                                listing['price_numeric'] = int(price_num_match.group(1).replace(',', ''))
                            except ValueError:
                                pass
            
            # If no price from element, look in container text
            if not listing.get('price'):
                price_match = re.search(r'([\d,]+)\s*RWF(/month|/day)?', container_text, re.IGNORECASE)
                if price_match:
                    price_display = f"RWF {price_match.group(1)}{price_match.group(2) or ''}"
                    listing['price'] = price_display
                    # Extract numeric value
                    try:
                        listing['price_numeric'] = int(price_match.group(1).replace(',', ''))
                    except ValueError:
                        pass
            
            # Extract location - House in Rwanda shows "Kigali City, Gasabo, Kimihurura"
            location_elem = container.find(['span', 'div', 'p'], 
                                         class_=re.compile(r'location|address|area|city', re.I))
            if location_elem:
                listing['location'] = location_elem.get_text(strip=True)
            
            # Extract bedrooms - House in Rwanda shows "Bedrooms: 3"
            beds_match = re.search(r'Bedrooms?:\s*(\d+)', container_text, re.IGNORECASE)
            if beds_match:
                listing['bedrooms'] = beds_match.group(1)
            elif bedrooms:
                listing['bedrooms'] = bedrooms
            
            # Extract bathrooms
            baths_match = re.search(r'Bathrooms?:\s*(\d+)', container_text, re.IGNORECASE)
            if baths_match:
                listing['bathrooms'] = baths_match.group(1)
            
            # Extract offer type (Rent/Sale)
            offer_match = re.search(r'(Rent|Sale|Auction)', container_text, re.IGNORECASE)
            if offer_match:
                listing['offer_type'] = offer_match.group(1)
            
            # Extract contact info
            contact_info = extract_contact_info(container_text)
            if contact_info:
                listing['contact'] = contact_info
            
            # Extract reference number
            ref_match = re.search(r'Ref:\s*([A-Z0-9]+)', container_text, re.IGNORECASE)
            if ref_match:
                listing['reference'] = ref_match.group(1)
            
            # Filter by budget if specified
            if budget_max and listing.get('price'):
                price_str = listing['price']
                price_match = re.search(r'([\d,]+)', price_str.replace(',', ''))
                if price_match:
                    try:
                        price_value = int(price_match.group(1).replace(',', ''))
                        if price_value > budget_max:
                            continue
                    except ValueError:
                        pass
            
            # Only add if we have valid property data
            # CRITICAL: Must have title AND (price OR URL) to be valid
            if listing.get('title') and len(listing['title']) > 15:
                # Additional validation: title must not be generic
                title_lower = listing['title'].lower()
                if not title_lower.startswith(('apartments for', 'houses for', 'properties for', 'price', 'filter', 'search')):
                    # Must have either price or URL to be valid
                    if listing.get('price') or listing.get('url'):
                        # If we have URL, validate it's a property page (not category/advertiser)
                        if listing.get('url'):
                            url_lower = listing['url'].lower()
                            if '/advertiser/' not in url_lower and '/category/' not in url_lower and '/advertisers' not in url_lower:
                                # URL must be a property detail page (numeric ID or slug-based)
                                # Accept slug-based URLs like /property/rent/apartment/...
                                if re.search(r'/property/[^/]+/[^/]+/[^/]+', url_lower) or re.search(r'/\d+', listing['url']):
                                    listing['source'] = "House in Rwanda"
                                    # Preserve original title
                                    if not listing.get('title_original'):
                                        listing['title_original'] = listing['title']
                                    listings.append(listing)
                        elif listing.get('price'):
                            # Has title and price but no URL - still valid but lower priority
                            listing['source'] = "House in Rwanda"
                            # Preserve original title
                            if not listing.get('title_original'):
                                listing['title_original'] = listing['title']
                            listings.append(listing)
            elif listing.get('price') and listing.get('url'):  # Has price and specific property URL
                # Validate URL is actually a property page
                url_lower = listing['url'].lower()
                if '/advertiser/' not in url_lower and '/category/' not in url_lower and '/advertisers' not in url_lower:
                    # Accept slug-based URLs or numeric IDs
                    if '/property/' in url_lower and re.search(r'/property/[^/]+/[^/]+/[^/]+', url_lower):
                        listing['source'] = "House in Rwanda"
                        if not listing.get('title_original') and listing.get('title'):
                            listing['title_original'] = listing['title']
                        listings.append(listing)
                    elif any(pattern in url_lower for pattern in ['/advert/', '/property/']):
                        if re.search(r'/\d+', listing['url']):
                            listing['source'] = "House in Rwanda"
                            if not listing.get('title_original') and listing.get('title'):
                                listing['title_original'] = listing['title']
                            listings.append(listing)
        
        # If still no listings, try generic parser
        if not listings:
            listings = parse_property_listings(response.text, "House in Rwanda")
        
        add_delays_between_requests(1.0)
        
        # Always use format_results for consistency (even if empty)
        return format_results(listings, "House in Rwanda")
    
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        return (
            f"Error accessing House in Rwanda: {error_msg}\n\n"
            f"**Contact Information:**\n"
            f"- Phone: +250 788 315 661\n"
            f"- Email: info@houseinrwanda.com\n"
            f"- Website: https://www.houseinrwanda.com\n"
            f"- Address: KG 611 St #10 Gishushu, P.O. Box 4062 Kigali, Rwanda\n\n"
            f"**Alternative:** Try Quick Homes Rwanda (quick.rw) or Kwanda Real Estate"
        )
    except Exception as e:
        return f"Error searching House in Rwanda: {str(e)}"

