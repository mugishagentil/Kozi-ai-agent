"""
Image Analysis Tool

Uses GPT-4 Vision to analyze property images and extract:
- Property condition
- Family-friendliness
- Quality assessment
- Safety features
- Overall appeal
"""

import os
import json
import re
from typing import Dict, Any, List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()


def analyze_property_images(
    image_urls: List[str], 
    user_context: str,
    property_details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Analyze property images using GPT-4 Vision.
    
    Args:
        image_urls: List of property image URLs
        user_context: User's needs (e.g., "family with children", "rental")
        property_details: Additional property details for context
    
    Returns:
        Dictionary with analysis results:
        - condition_score: 0-10
        - family_friendly: bool
        - quality_assessment: str
        - safety_features: list
        - overall_appeal: 0-10
        - suitability_score: 0-10
        - analysis_text: detailed analysis
    """
    if not image_urls:
        return {
            'condition_score': 5,
            'family_friendly': False,
            'quality_assessment': 'No images available for analysis',
            'safety_features': [],
            'overall_appeal': 5,
            'suitability_score': 5,
            'analysis_text': 'No images were available to analyze this property.'
        }
    
    try:
        # Initialize GPT-4 Vision model
        vision_model = ChatOpenAI(
            model="gpt-4o",
            temperature=0.3,  # Lower temperature for more consistent analysis
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Analyze first 2-3 images (most important ones) - reduced for faster response
        images_to_analyze = image_urls[:3]  # Reduced from 5 to 3 for faster analysis
        
        # Build context from property details
        context_text = f"User needs: {user_context}"
        if property_details:
            if property_details.get('bedrooms'):
                context_text += f"\nProperty has {property_details['bedrooms']} bedrooms"
            if property_details.get('bathrooms'):
                context_text += f"\nProperty has {property_details['bathrooms']} bathrooms"
            if property_details.get('description'):
                context_text += f"\nProperty description: {property_details['description'][:200]}"
        
        # Create message with images
        content = [
            {
                "type": "text",
                "text": f"""Analyze these property images for a real estate rental recommendation.

{context_text}

Evaluate the following aspects and provide a JSON response:

1. **condition_score** (0-10): Overall property condition based on visible maintenance, cleanliness, and upkeep
2. **family_friendly** (true/false): Is this property suitable for families? Consider safety, space, layout, and visible hazards
3. **quality_assessment** (string): Brief assessment of property quality (e.g., "Well-maintained modern property", "Needs some renovation")
4. **safety_features** (array of strings): Visible safety features (e.g., "Secure windows", "Safe stairs", "Well-lit areas")
5. **overall_appeal** (0-10): How appealing is this property overall?
6. **suitability_score** (0-10): How well does this property match the user's needs?
7. **analysis_text** (string): 2-3 sentence detailed analysis explaining the scores and why this property is/isn't suitable

Focus on:
- Property condition and maintenance
- Safety for families (if applicable)
- Space and layout
- Overall quality and appeal
- Match to user's stated needs

Return ONLY valid JSON in this format:
{{
    "condition_score": 8,
    "family_friendly": true,
    "quality_assessment": "Well-maintained property with modern finishes",
    "safety_features": ["Secure windows", "Safe stair railings", "Well-lit interior"],
    "overall_appeal": 7,
    "suitability_score": 8,
    "analysis_text": "This property appears well-maintained and suitable for families. The visible safety features and clean condition make it a good rental option."
}}"""
            }
        ]
        
        # Add images
        for img_url in images_to_analyze:
            content.append({
                "type": "image_url",
                "image_url": {"url": img_url}
            })
        
        messages = [HumanMessage(content=content)]
        
        # Get analysis from GPT-4 Vision
        response = vision_model.invoke(messages)
        response_text = response.content
        
        # Parse JSON response
        # Try to extract JSON from response (might have markdown code blocks)
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                analysis = json.loads(json_str)
            except json.JSONDecodeError:
                # Try cleaning the JSON string
                json_str = json_str.replace('\n', ' ').replace('\r', '')
                analysis = json.loads(json_str)
        else:
            # Fallback: try to parse entire response as JSON
            try:
                analysis = json.loads(response_text)
            except json.JSONDecodeError:
                # If still fails, return default
                raise json.JSONDecodeError("Could not parse JSON from response", response_text, 0)
        
        return analysis
        
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON from image analysis: {e}")
        print(f"Response was: {response_text[:500]}")
        # Return default analysis
        return {
            'condition_score': 5,
            'family_friendly': False,
            'quality_assessment': 'Unable to analyze images',
            'safety_features': [],
            'overall_appeal': 5,
            'suitability_score': 5,
            'analysis_text': 'Image analysis was not available for this property.'
        }
    except Exception as e:
        print(f"Error analyzing images: {str(e)}")
        return {
            'condition_score': 5,
            'family_friendly': False,
            'quality_assessment': f'Error: {str(e)}',
            'safety_features': [],
            'overall_appeal': 5,
            'suitability_score': 5,
            'analysis_text': 'Unable to analyze images due to an error.'
        }


def analyze_property_images_batch(
    properties: List[Dict[str, Any]],
    user_context: str
) -> List[Dict[str, Any]]:
    """
    Analyze images for multiple properties in batch.
    
    Args:
        properties: List of property dictionaries with 'images' key
        user_context: User's needs
        
    Returns:
        List of properties with added 'image_analysis' key
    """
    results = []
    for prop in properties:
        image_urls = prop.get('images', [])
        property_details = {
            'bedrooms': prop.get('bedrooms'),
            'bathrooms': prop.get('bathrooms'),
            'description': prop.get('description')
        }
        
        analysis = analyze_property_images(image_urls, user_context, property_details)
        prop['image_analysis'] = analysis
        results.append(prop)
    
    return results

