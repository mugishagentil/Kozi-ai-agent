"""
Property Aggregator Tool

This module provides a master aggregator tool that searches ALL Rwanda real estate
websites simultaneously, intelligently compares results, ranks them by best match
to user criteria, and returns ONLY the TOP BEST properties with direct links.
"""

import re
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from langchain_core.tools import tool

from .mcp_web_scraper import (
    scrape_quick_rw_properties,
    scrape_kwanda_properties,
    search_house_in_rwanda,
)
from .ai_property_analyzer import analyze_and_rank_properties


def parse_property_from_text(text: str, source: str) -> List[Dict[str, Any]]:
    """
    Parse property listings from scraper text output.
    
    Args:
        text: Formatted text output from scraper
        source: Source website name
        
    Returns:
        List of property dictionaries
    """
    properties = []
    
    # Only skip if it's clearly an error AND has no property data
    # Don't skip if there might be properties despite an error message
    if text and ("Error accessing" in text or "Unable to access" in text):
        # Check if there are any properties in the text
        if "--- Property" not in text and "Title:" not in text and "=== " not in text:
            # No properties found, skip
            return properties
        # If there are properties, continue parsing despite error message
    
    # Split by property separators (multiple patterns)
    property_sections = re.split(
        r'--- Property \d+ ---|=== .+ Results',
        text,
        flags=re.MULTILINE | re.IGNORECASE
    )
    
    for section in property_sections:
        if not section.strip() or len(section.strip()) < 20:
            continue
        
        # Skip sections that are clearly error messages
        if section.strip().startswith(("Error", "Unable to", "No properties found")):
            continue
        
        property_data = {
            'source': source,
            'title': None,
            'price': None,
            'location': None,
            'bedrooms': None,
            'bathrooms': None,
            'url': None,
            'contact': None,
        }
        
        # Extract title - MUST have Title: prefix to be valid (strict validation)
        title_match = re.search(r'Title:\s*(.+?)(?:\n|$)', section, re.IGNORECASE)
        if not title_match:
            continue  # Skip if no proper title with Title: prefix
        
        title = title_match.group(1).strip()
        # Clean HTML tags if present
        title = re.sub(r'<[^>]+>', '', title)
        
        # Validate title - must be meaningful and not generic
        if not title or len(title) < 10:
            continue  # Skip very short titles
        
        # Skip generic titles
        title_lower = title.lower()
        if title_lower.startswith(('apartments for', 'houses for', 'properties for', 'price', 'filter', 'search')):
            continue
        
        property_data['title'] = title
        # Preserve original title for exact matching
        property_data['title_original'] = title
        
        # Extract price - MUST have Price: prefix (strict validation)
        price_match = re.search(r'Price:\s*(.+?)(?:\n|$)', section, re.IGNORECASE)
        if not price_match:
            continue  # Skip if no price with Price: prefix
        
        price_text = price_match.group(1).strip()
        
        # Extract numeric value
        price_num_match = re.search(r'([\d,]+)', price_text.replace(',', ''))
        if price_num_match:
            try:
                price_value = int(price_num_match.group(1).replace(',', ''))
                property_data['price'] = price_value  # Numeric for scoring
                # Format display price
                if 'RWF' not in price_text.upper():
                    property_data['price_display'] = f"RWF {price_value:,}"
                else:
                    # Preserve original format but with formatted number
                    property_data['price_display'] = price_text.replace(price_num_match.group(1), f"{price_value:,}")
            except ValueError:
                property_data['price_display'] = price_text
        else:
            property_data['price_display'] = price_text
        
        # Extract location
        location_match = re.search(r'Location:\s*(.+?)(?:\n|$)', section, re.IGNORECASE)
        if location_match:
            property_data['location'] = location_match.group(1).strip()
        else:
            # Try finding location patterns (Kigali, Nyarutarama, etc.)
            location_patterns = [
                r'(Kigali|Nyarutarama|Kacyiru|Kimihurura|Remera|Gacuriro|Kiyovu|Rusororo|Kimironko|Rebero|Muhazi|Gahanga|Kicukiro|Niboye)',
            ]
            for pattern in location_patterns:
                loc_match = re.search(pattern, section, re.IGNORECASE)
                if loc_match:
                    property_data['location'] = loc_match.group(1)
                    break
        
        # Extract bedrooms
        beds_match = re.search(r'Bedrooms?:\s*(\d+)', section, re.IGNORECASE)
        if not beds_match:
            beds_match = re.search(r'(\d+)\s*Bedrooms?', section, re.IGNORECASE)
        if not beds_match:
            beds_match = re.search(r'Beds?:\s*(\d+)', section, re.IGNORECASE)
        if beds_match:
            try:
                property_data['bedrooms'] = int(beds_match.group(1))
            except ValueError:
                pass
        
        # Extract bathrooms
        baths_match = re.search(r'Bathrooms?:\s*(\d+)', section, re.IGNORECASE)
        if not baths_match:
            baths_match = re.search(r'(\d+)\s*Bathrooms?', section, re.IGNORECASE)
        if not baths_match:
            baths_match = re.search(r'Baths?:\s*(\d+)', section, re.IGNORECASE)
        if baths_match:
            try:
                property_data['bathrooms'] = int(baths_match.group(1))
            except ValueError:
                pass
        
        # Extract URL - CRITICAL: Must be a direct property link
        url_match = re.search(r'URL:\s*(https?://[^\s\n]+)', section, re.IGNORECASE)
        if url_match:
            url = url_match.group(1).strip()
            
            # Reject homepages and category pages explicitly
            if url in ["https://www.quick.rw", "https://www.kwandarealestate.com", "https://www.houseinrwanda.com", 
                       "https://www.quick.rw/", "https://www.kwandarealestate.com/", "https://www.houseinrwanda.com/"]:
                continue  # Skip homepages
            
            # Reject category/advertiser pages
            if '/advertiser/' in url.lower() or '/category/' in url.lower():
                continue  # Skip category pages
            
            # Validate URL - must contain property page indicators
            url_lower = url.lower()
            
            # House in Rwanda uses slug-based URLs like /property/rent/apartment/...
            # Quick Homes uses /property/slug/ format
            if '/property/' in url_lower:
                # Accept slug-based URLs with multiple segments (e.g., /property/rent/apartment/kigali-...)
                if re.search(r'/property/[^/]+/[^/]+/[^/]+', url_lower):
                    property_data['url'] = url
                # Accept Quick Homes format: /property/slug/ (single segment after /property/)
                elif re.search(r'/property/[^/]+/', url_lower):
                    property_data['url'] = url
                # Also accept numeric IDs (e.g., /property/12345)
                elif re.search(r'/property/\d+', url_lower):
                    property_data['url'] = url
            # Other property page patterns
            elif any(pattern in url_lower for pattern in ['/advert/', '/listing/', '/house/', '/apartment/', '/room/', '/villa/']):
                # Must have numeric ID or slug in URL to be valid property page
                if re.search(r'/\d+', url) or re.search(r'/(advert|listing|house|apartment)/[^/]+', url_lower):
                    property_data['url'] = url
            # Also accept URLs with numeric IDs that look like property pages
            elif re.search(r'/(advert|property|listing|house|apartment)/\d+', url_lower):
                property_data['url'] = url
        
        # Extract contact
        phone_match = re.search(r'Phone:\s*(.+?)(?:\n|$)', section, re.IGNORECASE)
        email_match = re.search(r'Email:\s*(.+?)(?:\n|$)', section, re.IGNORECASE)
        if not phone_match:
            # Try finding phone patterns
            phone_match = re.search(r'(\+250\s*\d{9}|0\d{2}\s*\d{3}\s*\d{3})', section)
        if not email_match:
            # Try finding email patterns
            email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', section)
        
        if phone_match or email_match:
            property_data['contact'] = {}
            if phone_match:
                property_data['contact']['phone'] = phone_match.group(1).strip() if phone_match.lastindex else phone_match.group(0).strip()
            if email_match:
                property_data['contact']['email'] = email_match.group(1).strip() if email_match.lastindex else email_match.group(0).strip()
        
        # Only add if we have BOTH title AND price (required fields)
        if property_data['title'] and (property_data.get('price') or property_data.get('price_display')):
            properties.append(property_data)
    
    return properties


def score_property(property_data: Dict[str, Any], 
                   desired_bedrooms: Optional[int] = None,
                   budget_max: Optional[float] = None,
                   location: str = "Kigali") -> float:
    """
    Score a property based on how well it matches user criteria.
    
    Args:
        property_data: Property dictionary
        desired_bedrooms: Desired number of bedrooms
        budget_max: Maximum budget in RWF
        location: Desired location
        
    Returns:
        Score (higher is better)
    """
    score = 0.0
    
    # Base score for having data
    if property_data.get('title'):
        score += 10.0
    if property_data.get('price'):
        score += 10.0
    if property_data.get('location'):
        score += 5.0
    if property_data.get('url'):
        score += 25.0  # Increased from 15.0 - STRONG bonus for direct link
        # Additional bonus if URL is from Quick Homes (most reliable)
        if property_data.get('source') == "Quick Homes Rwanda":
            score += 5.0
    
    # Bedroom matching (exact match gets highest score)
    if desired_bedrooms and property_data.get('bedrooms'):
        beds = property_data['bedrooms']
        if beds == desired_bedrooms:
            score += 30.0  # Exact match
        elif beds == desired_bedrooms + 1:
            score += 20.0  # Close match (+1)
        elif beds == desired_bedrooms - 1:
            score += 20.0  # Close match (-1)
        elif beds >= desired_bedrooms:
            score += 10.0  # More bedrooms (acceptable)
        else:
            score -= 10.0  # Fewer bedrooms (penalty)
    
    # Price matching (under budget gets bonus, over gets penalty)
    if budget_max and property_data.get('price'):
        price = property_data['price']
        if price <= budget_max:
            # Bonus for being under budget (better deals score higher)
            budget_ratio = price / budget_max
            if budget_ratio <= 0.7:
                score += 25.0  # Great deal (30%+ under budget)
            elif budget_ratio <= 0.85:
                score += 20.0  # Good deal (15-30% under budget)
            elif budget_ratio <= 0.95:
                score += 15.0  # Decent deal (5-15% under budget)
            else:
                score += 10.0  # At budget
        else:
            # Penalty for over budget (but don't eliminate completely - still show if it's the only property from that source)
            over_budget_ratio = (price - budget_max) / budget_max
            if over_budget_ratio <= 0.1:
                score -= 5.0  # Slightly over (0-10%)
            elif over_budget_ratio <= 0.2:
                score -= 15.0  # Moderately over (10-20%)
            elif over_budget_ratio <= 1.0:
                score -= 30.0  # Moderately over budget (20-100%)
            else:
                score -= 50.0  # Significantly over budget (100%+)
    
    # Location matching - be more flexible
    if property_data.get('location') and location:
        prop_location = property_data['location'].lower()
        desired_loc = location.lower()
        
        # Check if desired location is mentioned anywhere in property location
        if desired_loc in prop_location or prop_location in desired_loc:
            score += 10.0
        # Also check for common location variations (e.g., "Kanombe" in "Kigali, Kanombe")
        elif any(word in prop_location for word in desired_loc.split()):
            score += 10.0
        # Check if location is in title (sometimes location is in title)
        elif property_data.get('title') and desired_loc in property_data['title'].lower():
            score += 5.0
    
    # Complete info bonus
    complete_fields = sum([
        1 if property_data.get('title') else 0,
        1 if property_data.get('price') else 0,
        1 if property_data.get('location') else 0,
        1 if property_data.get('bedrooms') else 0,
        1 if property_data.get('url') else 0,
    ])
    if complete_fields >= 4:
        score += 10.0  # Bonus for complete information
    
    return score


@tool
def search_best_properties_all_websites(
    query: str = "house",
    location: str = "Kigali",
    bedrooms: Optional[int] = None,
    budget_max: Optional[float] = None,
    offer_type: str = "all",
    offset: int = 0
) -> str:
    """
    Search ALL Rwanda real estate websites simultaneously, rank results by best match,
    and return TOP 5 BEST properties with direct links.
    
    This is the MASTER aggregator tool that searches:
    - Quick Homes Rwanda (quick.rw)
    - Kwanda Real Estate (kwandarealestate.com)
    - House in Rwanda (houseinrwanda.com)
    
    All searches run in PARALLEL for speed, then results are intelligently ranked
    by how well they match your criteria (bedrooms, price, location).
    
    Args:
        query: Property type (e.g., "house", "apartment", "land", "villa")
        location: Location to search (default: "Kigali")
        bedrooms: Number of bedrooms desired (optional)
        budget_max: Maximum budget in RWF (optional)
        offer_type: Type of offer - "rent", "sale", "all" (default: "all")
        offset: Number of results to skip for pagination (default: 0). Use offset=5 to get next 5 properties.
        
    Returns:
        Formatted string with TOP 5 BEST properties ranked by match quality,
        each with direct link to property page.
    
    Example:
        >>> result = search_best_properties_all_websites(
        ...     query="house",
        ...     location="Kigali",
        ...     bedrooms=2,
        ...     budget_max=1000000,
        ...     offer_type="rent"
        ... )
    """
    try:
        # Prepare search parameters for each scraper
        quick_params = {
            "query": query,
            "location": location,
            "bedrooms": bedrooms,
            "budget_max": budget_max
        }
        
        kwanda_params = {
            "location": location,
            "bedrooms": bedrooms,
            "budget_max": budget_max,
            "property_type": query if query in ["house", "apartment", "land", "commercial"] else "all"
        }
        
        house_params = {
            "bedrooms": bedrooms,
            "budget_max": budget_max,
            "property_type": query if query in ["house", "apartment", "room", "land"] else "all",
            "offer_type": offer_type if offer_type != "all" else "rent"
        }
        
        # Run all scrapers in PARALLEL using ThreadPoolExecutor
        all_properties = []
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            # Submit all tasks
            futures = {
                executor.submit(scrape_quick_rw_properties.invoke, quick_params): "Quick Homes Rwanda",
                executor.submit(scrape_kwanda_properties.invoke, kwanda_params): "Kwanda Real Estate",
                executor.submit(search_house_in_rwanda.invoke, house_params): "House in Rwanda",
            }
            
            # Collect results as they complete
            for future in as_completed(futures):
                source = futures[future]
                try:
                    result_text = future.result()
                    # Debug: Log what we got
                    print(f"\n[AGGREGATOR] {source} returned {len(result_text)} chars")
                    print(f"[AGGREGATOR] First 300 chars: {result_text[:300]}")
                    
                    properties = parse_property_from_text(result_text, source)
                    print(f"[AGGREGATOR] {source} parsed into {len(properties)} properties")
                    
                    all_properties.extend(properties)
                except Exception as e:
                    # If one website fails, continue with others
                    print(f"[AGGREGATOR] Error from {source}: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    continue
        
        print(f"[AGGREGATOR] Total properties collected: {len(all_properties)}")
        print(f"[AGGREGATOR] Properties by source:")
        for source in ["Quick Homes Rwanda", "Kwanda Real Estate", "House in Rwanda"]:
            count = sum(1 for p in all_properties if p.get('source') == source)
            print(f"  - {source}: {count} properties")
        
        # Score and rank all properties
        scored_properties = []
        for prop in all_properties:
            score = score_property(prop, bedrooms, budget_max, location)
            prop['score'] = score
            scored_properties.append(prop)
        
        # Sort by score (highest first)
        scored_properties.sort(key=lambda x: x['score'], reverse=True)
        
        # Apply offset for pagination (skip first N results)
        if offset > 0:
            scored_properties = scored_properties[offset:]
            print(f"[AGGREGATOR] Applied offset={offset}, {len(scored_properties)} properties remaining")
        
        # Ensure we show properties from all three websites if available
        # Strategy: Prioritize properties with URLs, then ensure diversity of sources
        top_properties = []
        sources_seen = set()
        
        # First pass: Get best property with URL from each source (ensures diversity)
        # This ensures at least one property from each site appears (if available)
        # IMPORTANT: Include properties even if over budget to ensure diversity
        all_sources = ["Quick Homes Rwanda", "Kwanda Real Estate", "House in Rwanda"]
        for source in all_sources:
            # Try to find property with URL first
            found = False
            for prop in scored_properties:
                if prop.get('source') == source and prop.get('url') and source not in sources_seen:
                    top_properties.append(prop)
                    sources_seen.add(source)
                    found = True
                    break
            # If no property with URL found, try without URL (still ensure diversity)
            if not found:
                for prop in scored_properties:
                    if prop.get('source') == source and source not in sources_seen:
                        top_properties.append(prop)
                        sources_seen.add(source)
                        break
        
        # Second pass: Fill remaining slots with highest scoring properties (prioritize those with URLs)
        properties_with_urls = [p for p in scored_properties if p.get('url') and p not in top_properties]
        properties_without_urls = [p for p in scored_properties if not p.get('url') and p not in top_properties]
        
        # Add properties with URLs first
        for prop in properties_with_urls:
            if prop not in top_properties:
                top_properties.append(prop)
                if len(top_properties) >= 5:
                    break
        
        # Then add properties without URLs if we still have slots
        if len(top_properties) < 5:
            for prop in properties_without_urls:
                if prop not in top_properties:
                    top_properties.append(prop)
                    if len(top_properties) >= 5:
                        break
        
        # Format output
        if not top_properties:
            return (
                f"🔍 No properties found matching your criteria.\n\n"
                f"**Search Criteria:**\n"
                f"- Type: {query}\n"
                f"- Location: {location}\n"
                f"- Bedrooms: {bedrooms or 'any'}\n"
                f"- Budget: {f'RWF {budget_max:,.0f}' if budget_max else 'any'}\n"
                f"- Offer Type: {offer_type}\n\n"
                f"**Suggestions:**\n"
                f"- Try adjusting your search criteria\n"
                f"- Visit websites directly:\n"
                f"  • Quick Homes: https://www.quick.rw\n"
                f"  • Kwanda Real Estate: https://www.kwandarealestate.com\n"
                f"  • House in Rwanda: https://www.houseinrwanda.com"
            )
        
        # Build formatted output
        output = [f"🏠 TOP {len(top_properties)} BEST PROPERTIES IN {location.upper()}\n"]
        output.append("=" * 60)
        output.append("")
        
        for i, prop in enumerate(top_properties, 1):
            source_name = prop['source']
            output.append(f"#{i} - {source_name}")
            output.append("")
            
            if prop.get('title'):
                # Use original title if available, otherwise use title
                display_title = prop.get('title_original') or prop.get('title')
                output.append(f"   📍 {display_title}")
            
            if prop.get('price_display'):
                output.append(f"   💰 {prop['price_display']}")
            elif prop.get('price'):
                output.append(f"   💰 RWF {prop['price']:,}")
            
            if prop.get('location'):
                output.append(f"   🏘️ {prop['location']}")
            
            if prop.get('bedrooms'):
                output.append(f"   🛏️ {prop['bedrooms']} Bedrooms")
            
            if prop.get('bathrooms'):
                output.append(f"   🚿 {prop['bathrooms']} Bathrooms")
            
            if prop.get('url'):
                output.append(f"   🔗 {prop['url']}")
            else:
                # If no direct property link, don't show homepage link
                # Instead, indicate that direct link is not available
                output.append(f"   ⚠️ Direct property link not available - visit {source_name} website to search")
            
            if prop.get('contact'):
                contact = prop['contact']
                if contact.get('phone'):
                    output.append(f"   📞 {contact['phone']}")
                if contact.get('email'):
                    output.append(f"   ✉️ {contact['email']}")
            
            output.append("")
            output.append("-" * 60)
            output.append("")
        
        output.append(f"**Total Properties Found:** {len(all_properties)}")
        output.append(f"**Showing Top {len(top_properties)} Best Matches**")
        
        return "\n".join(output)
    
    except Exception as e:
        return f"Error searching properties: {str(e)}. Please try again or visit the websites directly."


@tool
def search_best_properties_with_ai_analysis(
    query: str = "house",
    location: str = "Kigali",
    bedrooms: Optional[int] = None,
    budget_max: Optional[float] = None,
    offer_type: str = "all",
    user_context: Optional[str] = None,
    offset: int = 0  # For pagination - skip first N properties
) -> str:
    """
    Search ALL Rwanda real estate websites, analyze properties with AI (including images),
    and return the BEST matches with detailed explanations.
    
    This is the ENHANCED aggregator that:
    1. Searches all websites in parallel
    2. Scrapes property detail pages
    3. Analyzes property images with GPT-4 Vision
    4. Uses GPT-4 to analyze and rank properties
    5. Returns top recommendations with AI-generated explanations
    
    Args:
        query: Property type (e.g., "house", "apartment", "land", "villa")
        location: Location to search (default: "Kigali")
        bedrooms: Number of bedrooms desired (optional)
        budget_max: Maximum budget in RWF (optional)
        offer_type: Type of offer - "rent", "sale", "all" (default: "all")
        user_context: Additional context (e.g., "family with children", "rental only")
        offset: Number of results to skip for pagination (default: 0). Use offset=6 to get next 6 properties.
        
    Returns:
        Formatted string with top AI-analyzed properties, each with:
        - Why it matches user needs
        - Key highlights
        - Image analysis insights
    """
    try:
        # Step 1: Scrape ALL pages from all websites (pagination)
        all_properties = []
        
        # Scrape multiple pages from each website
        max_pages = 3  # Scrape up to 3 pages from each website
        
        for page in range(max_pages):
            quick_params = {
                "query": query,
                "location": location,
                "bedrooms": bedrooms,
                "budget_max": budget_max
            }
            
            kwanda_params = {
                "location": location,
                "bedrooms": bedrooms,
                "budget_max": budget_max,
                "property_type": query if query in ["house", "apartment", "land", "commercial"] else "all"
            }
            
            house_params = {
                "bedrooms": bedrooms,
                "budget_max": budget_max,
                "property_type": query if query in ["house", "apartment", "room", "land"] else "all",
                "offer_type": offer_type if offer_type != "all" else "rent"
            }
            
            # Run all scrapers in PARALLEL for this page
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = {
                    executor.submit(scrape_quick_rw_properties.invoke, quick_params): "Quick Homes Rwanda",
                    executor.submit(scrape_kwanda_properties.invoke, kwanda_params): "Kwanda Real Estate",
                    executor.submit(search_house_in_rwanda.invoke, house_params): "House in Rwanda",
                }
                
                page_properties = []
                for future in as_completed(futures):
                    source = futures[future]
                    try:
                        result_text = future.result()
                        properties = parse_property_from_text(result_text, source)
                        page_properties.extend(properties)
                    except Exception as e:
                        print(f"[AI ANALYZER] Error from {source} page {page+1}: {str(e)}")
                        continue
                
                # If this page returned no new properties, stop pagination
                if not page_properties:
                    print(f"[AI ANALYZER] Page {page+1} returned no properties, stopping pagination")
                    break
                
                all_properties.extend(page_properties)
                print(f"[AI ANALYZER] Page {page+1}: Found {len(page_properties)} properties (Total: {len(all_properties)})")
        
        # Remove duplicates based on URL
        seen_urls = set()
        unique_properties = []
        for prop in all_properties:
            url = prop.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_properties.append(prop)
            elif not url:  # Keep properties without URLs too (but check title)
                title = prop.get('title', '')
                if title and title not in [p.get('title', '') for p in unique_properties]:
                    unique_properties.append(prop)
        
        all_properties = unique_properties
        print(f"[AI ANALYZER] Total unique properties found: {len(all_properties)}")
        
        if not all_properties:
            return "🔍 No properties found matching your criteria. Please try adjusting your search parameters."
        
        # Step 2: Score ALL properties
        scored_properties = []
        for prop in all_properties:
            score = score_property(prop, bedrooms, budget_max, location)
            prop['score'] = score
            scored_properties.append(prop)
        
        scored_properties.sort(key=lambda x: x['score'], reverse=True)
        
        # Step 3: Build user context
        user_query_parts = [f"{query} in {location}"]
        if bedrooms:
            user_query_parts.append(f"{bedrooms} bedrooms")
        if budget_max:
            user_query_parts.append(f"max {budget_max:,} RWF")
        if offer_type and offer_type != "all":
            user_query_parts.append(f"for {offer_type}")
        
        user_query = " ".join(user_query_parts)
        
        if not user_context:
            user_context = user_query
            if offer_type == "rent":
                user_context += " - rental property only, filter out sale properties"
        
        # Step 4: Analyze ALL properties with AI (not just top 5)
        print(f"[AI ANALYZER] Analyzing ALL {len(scored_properties)} properties with AI...")
        analyzed_properties = analyze_and_rank_properties.invoke({
            'properties': scored_properties,  # Analyze ALL properties
            'user_query': user_query,
            'user_context': user_context,
            'max_properties_to_analyze': len(scored_properties)  # Analyze all
        })
        
        if not analyzed_properties:
            return "🔍 No suitable properties found after analysis. Please try adjusting your search criteria."
        
        # Step 5: Apply offset for pagination (if user asked for "more")
        if offset > 0:
            analyzed_properties = analyzed_properties[offset:]
            print(f"[AI ANALYZER] Applied offset={offset}, {len(analyzed_properties)} properties remaining")
        
        # Step 6: Format top 6 properties
        top_6 = analyzed_properties[:6]
        remaining_count = len(analyzed_properties) - 6
        
        output = [f"🤖 **AI-Enhanced Property Recommendations**\n"]
        output.append(f"Based on your needs: {user_context}\n")
        output.append(f"**Total Properties Found & Analyzed:** {len(analyzed_properties)}\n")
        output.append("=" * 60)
        output.append("")
        
        for i, prop in enumerate(top_6, 1):  # Top 6
            ai_analysis = prop.get('ai_analysis', {})
            image_analysis = prop.get('image_analysis', {})
            
            output.append(f"## #{i} - {prop.get('title', 'Unknown Property')}")
            output.append("")
            
            # Property details
            if prop.get('price'):
                output.append(f"💰 **Price:** {prop.get('price')}")
            if prop.get('location'):
                output.append(f"📍 **Location:** {prop.get('location')}")
            if prop.get('bedrooms'):
                output.append(f"🛏️ **Bedrooms:** {prop.get('bedrooms')}")
            if prop.get('bathrooms'):
                output.append(f"🚿 **Bathrooms:** {prop.get('bathrooms')}")
            
            output.append("")
            
            # AI Analysis
            if ai_analysis.get('why'):
                output.append(f"**Why this matches your needs:**")
                output.append(ai_analysis['why'])
                output.append("")
            
            if ai_analysis.get('highlights'):
                output.append(f"**Key Highlights:**")
                for highlight in ai_analysis['highlights']:
                    output.append(f"✅ {highlight}")
                output.append("")
            
            # Image Analysis
            if image_analysis.get('analysis_text'):
                output.append(f"**Property Analysis:**")
                output.append(image_analysis['analysis_text'])
                output.append("")
            
            if image_analysis.get('condition_score'):
                output.append(f"**Condition Score:** {image_analysis['condition_score']}/10")
            if image_analysis.get('family_friendly'):
                output.append(f"**Family Friendly:** {'Yes' if image_analysis['family_friendly'] else 'No'}")
            
            if prop.get('url'):
                output.append(f"🔗 **View Property:** {prop['url']}")
            
            output.append("")
            output.append("-" * 60)
            output.append("")
        
        output.append(f"**Showing Top 6 Best Matches**")
        
        # Add "show more" prompt if there are more properties
        if remaining_count > 0:
            output.append("")
            output.append(f"💡 **There are {remaining_count} more matching properties available!**")
            output.append("")
            output.append("Would you like me to show you more properties? Just say 'show more' or 'find more properties' and I'll display the next best options.")
        
        return "\n".join(output)
        
    except Exception as e:
        print(f"Error in AI-enhanced search: {str(e)}")
        # Fallback to regular search
        return search_best_properties_all_websites.invoke({
            'query': query,
            'location': location,
            'bedrooms': bedrooms,
            'budget_max': budget_max,
            'offer_type': offer_type,
            'offset': 0
        })

