"""
AI Property Analyzer

Uses GPT-4 to analyze all property data (text + images) and determine
which properties best match user needs.
"""

import os
from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from dotenv import load_dotenv

from .property_detail_scraper import scrape_property_details
from .image_analyzer import analyze_property_images

load_dotenv()


@tool
def analyze_and_rank_properties(
    properties: List[Dict[str, Any]],
    user_query: str,
    user_context: Optional[str] = None,
    max_properties_to_analyze: int = 10
) -> List[Dict[str, Any]]:
    """
    Analyze all properties using AI to determine best matches.
    
    This function:
    1. Scrapes detail pages for top properties
    2. Extracts images
    3. Analyzes images with GPT-4 Vision
    4. Uses GPT-4 to analyze all data together
    5. Ranks properties based on AI analysis
    
    Args:
        properties: List of property dictionaries from aggregator
        user_query: Original user query
        user_context: Additional context (e.g., "family with children", "rental only")
        max_properties_to_analyze: Maximum number of properties to do deep analysis on
    
    Returns:
        Ranked list of properties with AI-generated explanations and scores
    """
    if not properties:
        return []
    
    # Analyze all properties up to max_properties_to_analyze
    # If max_properties_to_analyze is large, analyze all properties
    if max_properties_to_analyze and max_properties_to_analyze < len(properties):
        properties_to_analyze = properties[:max_properties_to_analyze]
    else:
        properties_to_analyze = properties
    
    # Build user context from query
    if not user_context:
        user_context = user_query.lower()
        if 'family' in user_context or 'children' in user_context:
            user_context += " - family-friendly property needed"
        if 'rent' in user_context or 'rental' in user_context:
            user_context += " - rental property only, filter out sale properties"
    
    # Extract property type from user query
    property_type_requested = None
    user_query_lower = user_query.lower()
    if 'apartment' in user_query_lower:
        property_type_requested = 'apartment'
    elif 'house' in user_query_lower and 'apartment' not in user_query_lower:
        property_type_requested = 'house'
    elif 'villa' in user_query_lower:
        property_type_requested = 'villa'
    elif 'land' in user_query_lower:
        property_type_requested = 'land'
    
    # Filter properties by type BEFORE analysis if type is specified
    if property_type_requested:
        print(f"[AI ANALYZER] Filtering properties by type: {property_type_requested}")
        filtered_properties = []
        for prop in properties_to_analyze:
            title_lower = (prop.get('title', '') or '').lower()
            description_lower = (prop.get('description', '') or '').lower()
            
            # Check if property matches requested type
            if property_type_requested == 'apartment':
                # For apartment: must contain "apartment" and NOT be a house
                # Check if title contains "apartment" and doesn't contain "house" (unless "apartment" comes first)
                if 'apartment' in title_lower or 'apartment' in description_lower:
                    # If title has both, check which comes first
                    if 'house' in title_lower:
                        apt_index = title_lower.find('apartment')
                        house_index = title_lower.find('house')
                        if apt_index != -1 and (house_index == -1 or apt_index < house_index):
                            filtered_properties.append(prop)
                    else:
                        # Only apartment, no house
                        filtered_properties.append(prop)
            elif property_type_requested == 'house':
                # For house: must contain "house" and NOT contain "apartment"
                if 'house' in title_lower or 'house' in description_lower:
                    if 'apartment' not in title_lower and 'apartment' not in description_lower:
                        filtered_properties.append(prop)
            elif property_type_requested == 'villa':
                if 'villa' in title_lower or 'villa' in description_lower:
                    filtered_properties.append(prop)
            elif property_type_requested == 'land':
                if 'land' in title_lower or 'land' in description_lower:
                    filtered_properties.append(prop)
        
        if filtered_properties:
            print(f"[AI ANALYZER] Filtered {len(properties_to_analyze)} properties to {len(filtered_properties)} matching type '{property_type_requested}'")
            properties_to_analyze = filtered_properties
        else:
            print(f"[AI ANALYZER] No properties found matching type '{property_type_requested}', using all properties")
    
    print(f"[AI ANALYZER] Analyzing {len(properties_to_analyze)} properties for: {user_context}")
    
    # Step 1: Scrape detail pages and extract images
    enriched_properties = []
    for prop in properties_to_analyze:
        if not prop.get('url'):
            # Skip if no URL
            prop['ai_analysis'] = {
                'error': 'No property URL available for deep analysis'
            }
            enriched_properties.append(prop)
            continue
        
        try:
            # Scrape property details
            details = scrape_property_details.invoke({'property_url': prop['url']})
            
            # Merge details into property
            prop.update({
                'description': details.get('description') or prop.get('description'),
                'amenities': details.get('amenities', []),
                'size': details.get('size') or prop.get('size'),
                'images': details.get('images', []),
                'bedrooms': details.get('bedrooms') or prop.get('bedrooms'),
                'bathrooms': details.get('bathrooms') or prop.get('bathrooms'),
            })
            
            # Step 2: Analyze images if available
            if prop.get('images'):
                print(f"[AI ANALYZER] Analyzing {len(prop['images'])} images for property: {prop.get('title', 'Unknown')}")
                image_analysis = analyze_property_images(
                    prop['images'],
                    user_context,
                    {
                        'bedrooms': prop.get('bedrooms'),
                        'bathrooms': prop.get('bathrooms'),
                        'description': prop.get('description')
                    }
                )
                prop['image_analysis'] = image_analysis
            else:
                prop['image_analysis'] = {
                    'condition_score': 5,
                    'family_friendly': False,
                    'quality_assessment': 'No images available',
                    'safety_features': [],
                    'overall_appeal': 5,
                    'suitability_score': 5,
                    'analysis_text': 'No images were available to analyze this property.'
                }
            
            enriched_properties.append(prop)
            
        except Exception as e:
            print(f"[AI ANALYZER] Error analyzing property {prop.get('url')}: {str(e)}")
            prop['ai_analysis'] = {
                'error': f'Error during analysis: {str(e)}'
            }
            enriched_properties.append(prop)
    
    # Step 3: Use GPT-4 to analyze all properties together and rank them
    try:
        llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.3,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Build property summaries for AI analysis
        property_summaries = []
        for i, prop in enumerate(enriched_properties, 1):
            summary = f"""
Property {i}:
- Title: {prop.get('title', 'Unknown')}
- Price: {prop.get('price', 'Unknown')}
- Location: {prop.get('location', 'Unknown')}
- Bedrooms: {prop.get('bedrooms', 'Unknown')}
- Bathrooms: {prop.get('bathrooms', 'Unknown')}
- Description: {prop.get('description', 'No description')[:200]}
- Amenities: {', '.join(prop.get('amenities', [])[:5])}
- Image Analysis: {prop.get('image_analysis', {}).get('analysis_text', 'No analysis')}
- Condition Score: {prop.get('image_analysis', {}).get('condition_score', 'N/A')}/10
- Family Friendly: {prop.get('image_analysis', {}).get('family_friendly', False)}
- Suitability Score: {prop.get('image_analysis', {}).get('suitability_score', 'N/A')}/10
- URL: {prop.get('url', 'N/A')}
"""
            property_summaries.append(summary)
        
        # Create prompt for AI ranking
        property_type_note = f"\n**IMPORTANT: User requested {property_type_requested.upper()} - ONLY recommend properties that are {property_type_requested}s. Filter out any properties that are NOT {property_type_requested}s.**" if property_type_requested else ""
        
        prompt = f"""You are an expert real estate advisor. Analyze these properties and rank them based on how well they match the user's needs.

User Query: "{user_query}"
User Context: {user_context}{property_type_note}

Properties to analyze:
{chr(10).join(property_summaries)}

**CRITICAL FILTERING RULES:**
1. If user wants RENTAL, immediately filter out any properties that are FOR SALE
2. **PROPERTY TYPE FILTERING (CRITICAL):** If user requests a specific property type (apartment, house, villa, land), ONLY recommend properties matching that type:
   - If user asks for "apartment": ONLY show apartments, NOT houses. Check the title - "Apartment For Rent" = apartment, "House For Rent" = house
   - If user asks for "house": ONLY show houses, NOT apartments. Check the title - "House For Rent" = house, "Apartment For Rent" = apartment
   - Property type is usually clearly indicated in the title (e.g., "Kigali Furnished Apartment" = apartment, "Kigali Cozy House" = house)
   - **DO NOT recommend a house when user asks for an apartment, and vice versa**
3. If user mentions "family" or "children", prioritize family-friendly properties
4. Respect budget constraints strictly
5. Prioritize properties that match location requirements

For each property, provide:
1. **Match Score** (0-10): How well it matches user needs
2. **Recommendation** (Yes/No): Should this be recommended? (MUST be No if property type doesn't match user's request)
3. **Why/Why Not**: Brief explanation (2-3 sentences)
4. **Key Highlights**: Top 3 reasons this property is/isn't suitable

Return a JSON array with this structure:
[
  {{
    "property_index": 1,
    "match_score": 8,
    "recommend": true,
    "why": "This property perfectly matches the user's budget and location requirements. The image analysis shows it's well-maintained and family-friendly.",
    "highlights": ["Perfect budget match", "Family-friendly layout", "Well-maintained condition"]
  }},
  ...
]

Rank properties from BEST MATCH to WORST MATCH. Filter out properties that don't match basic requirements (e.g., sale properties when user wants rent, houses when user wants apartments, apartments when user wants houses)."""

        response = llm.invoke(prompt)
        response_text = response.content
        
        # Parse JSON response
        import json
        import re
        
        # Extract JSON from response
        rankings = None
        
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            try:
                rankings = json.loads(json_match.group(0))
            except json.JSONDecodeError:
                # Try cleaning
                try:
                    json_str = json_match.group(0).replace('\n', ' ').replace('\r', '')
                    rankings = json.loads(json_str)
                except json.JSONDecodeError:
                    print("[AI ANALYZER] Could not parse JSON from response, using fallback")
                    rankings = None
        else:
            # Fallback: try to parse entire response
            try:
                rankings = json.loads(response_text)
            except json.JSONDecodeError:
                print("[AI ANALYZER] Could not parse JSON, using image analysis scores")
                rankings = None
        
        # If parsing failed, create rankings from image analysis scores
        if not rankings or not isinstance(rankings, list):
            print("[AI ANALYZER] Creating rankings from image analysis scores")
            rankings = []
            for i, prop in enumerate(enriched_properties, 1):
                suitability = prop.get('image_analysis', {}).get('suitability_score', 5)
                # Filter out sale properties if user wants rent
                if user_context and 'rent' in user_context.lower() and 'sale' in prop.get('title', '').lower():
                    continue  # Skip sale properties
                rankings.append({
                    'property_index': i,
                    'match_score': suitability,
                    'recommend': suitability >= 6,
                    'why': prop.get('image_analysis', {}).get('analysis_text', 'Analysis based on available data'),
                    'highlights': []
                })
        
        # Apply rankings to properties
        ranked_properties = []
        if rankings and isinstance(rankings, list) and len(rankings) > 0:
            for ranking in rankings:
                if not isinstance(ranking, dict):
                    continue
                prop_index = ranking.get('property_index', 1) - 1  # Convert to 0-based
                if 0 <= prop_index < len(enriched_properties):
                    prop = enriched_properties[prop_index]
                    
                    # Additional property type filtering (double-check to ensure no mismatches)
                    if property_type_requested:
                        title_lower = (prop.get('title', '') or '').lower()
                        description_lower = (prop.get('description', '') or '').lower()
                        
                        # Skip if property type doesn't match
                        if property_type_requested == 'apartment':
                            # Must be apartment, not house
                            if 'house' in title_lower and 'apartment' not in title_lower:
                                print(f"[AI ANALYZER] Filtering out house when apartment requested: {prop.get('title')}")
                                continue
                            if 'apartment' not in title_lower and 'apartment' not in description_lower:
                                # If no apartment mention, likely not an apartment
                                if 'house' in title_lower or 'house' in description_lower:
                                    print(f"[AI ANALYZER] Filtering out property (no apartment mention): {prop.get('title')}")
                                    continue
                        elif property_type_requested == 'house':
                            # Must be house, not apartment
                            if 'apartment' in title_lower and 'house' not in title_lower:
                                print(f"[AI ANALYZER] Filtering out apartment when house requested: {prop.get('title')}")
                                continue
                            if 'house' not in title_lower and 'house' not in description_lower:
                                # If no house mention, likely not a house
                                if 'apartment' in title_lower or 'apartment' in description_lower:
                                    print(f"[AI ANALYZER] Filtering out property (no house mention): {prop.get('title')}")
                                    continue
                    
                    prop['ai_analysis'] = {
                        'match_score': ranking.get('match_score', 5),
                        'recommend': ranking.get('recommend', False),
                        'why': ranking.get('why', ''),
                        'highlights': ranking.get('highlights', [])
                    }
                    ranked_properties.append(prop)
        
        # Sort by match score (highest first)
        ranked_properties.sort(key=lambda x: x.get('ai_analysis', {}).get('match_score', 0), reverse=True)
        
        # Filter to only recommended properties
        recommended = [p for p in ranked_properties if p.get('ai_analysis', {}).get('recommend', False)]
        
        # If we have recommendations, return those; otherwise return top ranked
        return recommended if recommended else ranked_properties[:5]
        
    except Exception as e:
        print(f"[AI ANALYZER] Error in AI ranking: {str(e)}")
        # Fallback: return properties with image analysis scores
        for prop in enriched_properties:
            if 'ai_analysis' not in prop:
                prop['ai_analysis'] = {
                    'match_score': prop.get('image_analysis', {}).get('suitability_score', 5),
                    'recommend': prop.get('image_analysis', {}).get('suitability_score', 5) >= 6,
                    'why': prop.get('image_analysis', {}).get('analysis_text', 'Analysis not available'),
                    'highlights': []
                }
        
        # Sort by suitability score
        enriched_properties.sort(
            key=lambda x: x.get('image_analysis', {}).get('suitability_score', 0),
            reverse=True
        )
        
        return enriched_properties[:5]

