"""
Property Detail Scraper

Scrapes individual property detail pages to extract:
- Full description
- All amenities
- Property size/area
- Images
- Additional details
"""

import re
import requests
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup
from langchain_core.tools import tool

from .web_scraper_utils import get_headers, scrape_with_scrapingant


@tool
def scrape_property_details(property_url: str) -> Dict[str, Any]:
    """
    Scrape a property detail page to get complete information including images.
    
    Args:
        property_url: Full URL to the property detail page
        
    Returns:
        Dictionary with:
        - url: property_url
        - title: full title
        - description: full description text
        - amenities: list of amenities
        - size: property size/area
        - images: list of image URLs
        - details: additional property details
        - bedrooms: number of bedrooms
        - bathrooms: number of bathrooms
        - price: property price
    """
    try:
        headers = get_headers()
        
        # Try ScrapingAnt first (handles JavaScript-rendered content)
        html_content = scrape_with_scrapingant(property_url)
        
        # If ScrapingAnt not available, use regular requests
        if not html_content:
            response = requests.get(property_url, headers=headers, timeout=15)
            response.raise_for_status()
            html_content = response.text
        
        soup = BeautifulSoup(html_content, 'lxml')
        
        result = {
            'url': property_url,
            'title': None,
            'description': None,
            'amenities': [],
            'size': None,
            'images': [],
            'details': {},
            'bedrooms': None,
            'bathrooms': None,
            'price': None,
        }
        
        # Extract title
        title_elem = soup.find(['h1', 'h2'], class_=re.compile(r'title|heading', re.I))
        if not title_elem:
            title_elem = soup.find('h1')
        if title_elem:
            result['title'] = title_elem.get_text(strip=True)
        
        # Extract description
        desc_elem = soup.find(['div', 'section', 'article'], 
                             class_=re.compile(r'description|content|details|about', re.I))
        if desc_elem:
            result['description'] = desc_elem.get_text(strip=True, separator=' ')
            # Limit description length
            if len(result['description']) > 1000:
                result['description'] = result['description'][:1000] + "..."
        
        # Extract amenities
        amenities_section = soup.find(['div', 'ul', 'section'], 
                                     class_=re.compile(r'amenities|features|facilities', re.I))
        if amenities_section:
            amenity_items = amenities_section.find_all(['li', 'span', 'div'])
            for item in amenity_items:
                text = item.get_text(strip=True)
                if text and len(text) < 100:  # Reasonable amenity length
                    result['amenities'].append(text)
        
        # Extract property size/area
        size_patterns = [
            r'(\d+)\s*(?:sqm|m²|square\s*meters?|square\s*metres?)',
            r'(\d+)\s*(?:sq\s*ft|square\s*feet)',
            r'Area[:\s]+(\d+)',
            r'Size[:\s]+(\d+)',
        ]
        page_text = soup.get_text()
        for pattern in size_patterns:
            match = re.search(pattern, page_text, re.IGNORECASE)
            if match:
                result['size'] = match.group(1)
                break
        
        # Extract images - look for common image patterns
        images = []
        
        # Strategy 1: Look for image galleries
        gallery = soup.find(['div', 'section'], class_=re.compile(r'gallery|images|photos|slider', re.I))
        if gallery:
            img_tags = gallery.find_all('img', src=True)
            for img in img_tags:
                src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
                if src:
                    if src.startswith('/'):
                        src = property_url.split('/')[0] + '//' + property_url.split('/')[2] + src
                    elif not src.startswith('http'):
                        src = property_url.rsplit('/', 1)[0] + '/' + src
                    if src not in images:
                        images.append(src)
        
        # Strategy 2: Look for all images in the page
        if not images:
            img_tags = soup.find_all('img', src=True)
            for img in img_tags:
                src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
                if src:
                    # Filter out small images (likely icons) and common non-property images
                    if any(skip in src.lower() for skip in ['logo', 'icon', 'avatar', 'button', 'badge']):
                        continue
                    # Check image dimensions if available
                    width = img.get('width')
                    height = img.get('height')
                    if width and height:
                        try:
                            if int(width) < 200 or int(height) < 200:
                                continue  # Skip small images
                        except ValueError:
                            pass
                    
                    if src.startswith('/'):
                        base_url = '/'.join(property_url.split('/')[:3])
                        src = base_url + src
                    elif not src.startswith('http'):
                        base_url = '/'.join(property_url.rsplit('/', 1)[0].split('/')[:3])
                        src = base_url + '/' + src
                    
                    if src not in images and 'http' in src:
                        images.append(src)
        
        # Limit to first 10 images (most important ones)
        result['images'] = images[:10]
        
        # Extract bedrooms and bathrooms
        beds_match = re.search(r'(\d+)\s*(?:bedroom|bed|br)', page_text, re.IGNORECASE)
        if beds_match:
            result['bedrooms'] = int(beds_match.group(1))
        
        baths_match = re.search(r'(\d+)\s*(?:bathroom|bath|ba)', page_text, re.IGNORECASE)
        if baths_match:
            result['bathrooms'] = int(baths_match.group(1))
        
        # Extract price
        price_patterns = [
            r'RWF\s*([\d,]+)',
            r'([\d,]+)\s*RWF',
            r'Price[:\s]+RWF\s*([\d,]+)',
        ]
        for pattern in price_patterns:
            match = re.search(pattern, page_text, re.IGNORECASE)
            if match:
                result['price'] = match.group(1).replace(',', '')
                break
        
        return result
        
    except Exception as e:
        print(f"Error scraping property details from {property_url}: {str(e)}")
        return {
            'url': property_url,
            'error': str(e)
        }

