"""
Web Scraper Utility Functions

Helper functions for parsing, extracting, and formatting property listings
from various real estate websites in Rwanda.
"""

import os
import re
import time
from typing import List, Dict, Optional, Any
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import ScrapingAnt (optional)
SCRAPINGANT_AVAILABLE = False
try:
    from scrapingant_client import ScrapingAntClient
    SCRAPINGANT_AVAILABLE = True
except ImportError:
    pass

SCRAPINGANT_API_KEY = os.getenv("SCRAPINGANT_API_KEY")


def parse_property_listings(html_content: str, source: str) -> List[Dict[str, Any]]:
    """
    Parse HTML content and extract property listings.
    
    Args:
        html_content: Raw HTML content from the website
        source: Source website name (e.g., "OLX", "Airbnb", "Kigali Houses")
        
    Returns:
        List of dictionaries containing property information
    """
    listings = []
    
    try:
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Generic parsing - look for common property listing patterns
        # This is a simplified parser; actual implementation would be site-specific
        
        # Find potential listing containers
        listing_containers = soup.find_all(['div', 'article', 'section'], 
                                          class_=re.compile(r'listing|property|item|card', re.I))
        
        for container in listing_containers[:20]:  # Limit to 20 listings
            listing = {}
            
            # Extract title
            title_elem = container.find(['h1', 'h2', 'h3', 'h4', 'a'], 
                                       class_=re.compile(r'title|heading|name', re.I))
            if title_elem:
                listing['title'] = title_elem.get_text(strip=True)
            
            # Extract price
            price_text = extract_price(container.get_text())
            if price_text:
                listing['price'] = price_text
            
            # Extract location
            location_elem = container.find(['span', 'div', 'p'], 
                                         class_=re.compile(r'location|address|area', re.I))
            if location_elem:
                listing['location'] = location_elem.get_text(strip=True)
            
            # Extract contact info
            contact_info = extract_contact_info(container.get_text())
            if contact_info:
                listing['contact'] = contact_info
            
            # Extract link if available
            link_elem = container.find('a', href=True)
            if link_elem:
                listing['url'] = link_elem['href']
            
            # Only add if we have at least title or price
            if listing.get('title') or listing.get('price'):
                listing['source'] = source
                listings.append(listing)
    
    except Exception as e:
        print(f"Error parsing listings from {source}: {str(e)}")
    
    return listings


def extract_price(text: str) -> Optional[str]:
    """
    Extract price information from text.
    
    Args:
        text: Text content that may contain price information
        
    Returns:
        Extracted price string or None
    """
    if not text:
        return None
    
    # Patterns for Rwandan Franc (RWF) prices
    patterns = [
        r'RWF\s*([\d,]+)',  # RWF 500,000
        r'([\d,]+)\s*RWF',  # 500,000 RWF
        r'RF\s*([\d,]+)',   # RF 500,000
        r'([\d,]+)\s*RF',   # 500,000 RF
        r'\$\s*([\d,]+)',   # $500,000
        r'USD\s*([\d,]+)',  # USD 500,000
        r'([\d,]+)\s*USD',  # 500,000 USD
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            price = match.group(1).replace(',', '')
            # Format with commas
            try:
                price_num = int(price)
                return f"RWF {price_num:,}"
            except ValueError:
                return f"RWF {price}"
    
    # Look for numbers that might be prices (large numbers)
    numbers = re.findall(r'[\d,]+', text)
    for num_str in numbers:
        num = num_str.replace(',', '')
        try:
            num_int = int(num)
            # Assume prices are typically 100k or more
            if num_int >= 100000:
                return f"RWF {num_int:,}"
        except ValueError:
            continue
    
    return None


def extract_contact_info(text: str) -> Optional[Dict[str, str]]:
    """
    Extract contact information (phone, email) from text.
    
    Args:
        text: Text content that may contain contact information
        
    Returns:
        Dictionary with 'phone' and/or 'email' keys, or None
    """
    if not text:
        return None
    
    contact = {}
    
    # Extract phone numbers (Rwanda format: +250 or 0XX)
    phone_patterns = [
        r'\+250\s*\d{9}',  # +250 788 123 456
        r'0\d{2}\s*\d{3}\s*\d{3}',  # 0788 123 456
        r'\(\+250\)\s*\d{9}',  # (+250) 788123456
    ]
    
    for pattern in phone_patterns:
        match = re.search(pattern, text)
        if match:
            phone = match.group(0).strip()
            contact['phone'] = phone
            break
    
    # Extract email addresses
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, text)
    if email_match:
        contact['email'] = email_match.group(0)
    
    return contact if contact else None


def format_results(listings: List[Dict[str, Any]], source: str) -> str:
    """
    Format property listings into a readable string format.
    
    Args:
        listings: List of property listing dictionaries
        source: Source website name
        
    Returns:
        Formatted string with all listings
    """
    if not listings:
        return f"No properties found on {source}."
    
    formatted = [f"\n=== {source} Results ({len(listings)} properties) ===\n"]
    
    for i, listing in enumerate(listings, 1):
        formatted.append(f"--- Property {i} ---")
        
        if listing.get('title'):
            formatted.append(f"Title: {listing['title']}")
        
        if listing.get('price'):
            formatted.append(f"Price: {listing['price']}")
        
        if listing.get('location'):
            formatted.append(f"Location: {listing['location']}")
        
        if listing.get('bedrooms'):
            formatted.append(f"Bedrooms: {listing['bedrooms']}")
        
        if listing.get('bathrooms'):
            formatted.append(f"Bathrooms: {listing['bathrooms']}")
        
        if listing.get('contact'):
            contact = listing['contact']
            if contact.get('phone'):
                formatted.append(f"Phone: {contact['phone']}")
            if contact.get('email'):
                formatted.append(f"Email: {contact['email']}")
        
        if listing.get('url'):
            formatted.append(f"URL: {listing['url']}")
        
        formatted.append("")  # Empty line between listings
    
    return "\n".join(formatted)


def add_delays_between_requests(delay_seconds: float = 1.0) -> None:
    """
    Add a delay between web requests to avoid overloading servers.
    
    Args:
        delay_seconds: Number of seconds to wait (default: 1.0)
    """
    time.sleep(delay_seconds)


def get_headers() -> Dict[str, str]:
    """
    Get standard HTTP headers for web scraping requests.
    
    Returns:
        Dictionary of HTTP headers
    """
    return {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',  # Removed 'br' (Brotli) - requests doesn't auto-decompress it
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }


def scrape_with_scrapingant(url: str) -> Optional[str]:
    """
    Scrape a URL using ScrapingAnt (handles JavaScript-rendered content).
    
    Args:
        url: URL to scrape
        
    Returns:
        HTML content as string, or None if ScrapingAnt is not available or fails
    """
    if not SCRAPINGANT_AVAILABLE or not SCRAPINGANT_API_KEY:
        return None
    
    try:
        client = ScrapingAntClient(token=SCRAPINGANT_API_KEY)
        
        # Try different API methods (different SDK versions may use different methods)
        result = None
        try:
            # Method 1: general_request (newer API)
            result = client.general_request(
                url=url,
                browser=True,
                proxy_type="datacenter",
                wait_for=2000,
            )
        except AttributeError:
            try:
                # Method 2: scrape_url (alternative API)
                result = client.scrape_url(
                    url=url,
                    browser=True,
                    proxy_type="datacenter",
                    wait_for=2000,
                )
            except AttributeError:
                # Method 3: Direct API call (GET request with query params)
                import requests as req_lib
                from urllib.parse import quote
                api_url = f"https://api.scrapingant.com/v2/general"
                params = {
                    "url": url,
                    "browser": "true",
                    "proxy_type": "datacenter",
                    "wait_for": "2000",
                }
                response = req_lib.get(
                    api_url,
                    params=params,
                    headers={"x-api-key": SCRAPINGANT_API_KEY},
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    result = type('obj', (object,), {'content': data.get('content', '')})()
        
        # Extract content from result
        if result:
            if hasattr(result, 'content'):
                return result.content
            elif hasattr(result, 'text'):
                return result.text
            elif isinstance(result, dict):
                return result.get('content', result.get('text', ''))
            elif isinstance(result, str):
                return result
        
        return None
    except Exception as e:
        print(f"ScrapingAnt error for {url}: {str(e)}")
        return None

