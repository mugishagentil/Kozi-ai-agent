"""
Retrieval Tool for Real Estate Knowledge Base

This module provides a LangChain tool that allows the AI agent to search
the Qdrant knowledge base for relevant information about Land O'Clock,
real estate investment strategies, Rwanda market insights, and best practices.
"""

from langchain_core.tools import tool
from typing import List, Dict, Any, Optional
import re
from config.qdrant_config import get_vector_store, COLLECTION_NAME


@tool
def retrieve_real_estate_knowledge(query: str) -> str:
    """
    Search the Land O'Clock knowledge base for information about real estate,
    investment strategies, Rwanda market insights, property evaluation, and platform features.
    
    This tool searches the Qdrant vector database containing comprehensive information about:
    - Land O'Clock mission, vision, and features
    - Real estate investment strategies (buy-to-rent, short-term rentals, land banking, etc.)
    - Rwanda property market and best investment areas
    - Property evaluation and valuation methods
    - Tenant and landlord information
    - Fraud prevention
    - AI applications in real estate
    - Investment recommendations
    - How to find properties in 30 minutes
    - Property management tools
    - Rent tracking and tenant screening
    - Real estate agents by location in Kigali (with names and phone numbers)
    
    Args:
        query: The search query/question about real estate, Land O'Clock, or Rwanda property market
        
    Returns:
        str: Formatted search results with relevant information from the knowledge base.
             Returns "No relevant information found." if no results match the query.
    
    Example:
        >>> result = retrieve_real_estate_knowledge("What are the best areas to invest in Kigali?")
        >>> print(result)
    """
    try:
        # Get the vector store
        vector_store = get_vector_store()
        
        # Search for similar documents (k=3 for top 3 results)
        results = vector_store.similarity_search(query, k=3)
        
        if not results:
            return "No relevant information found in the knowledge base."
        
        # Format the results for the AI agent
        formatted_results = []
        formatted_results.append(f"Found {len(results)} relevant document(s) from the Land O'Clock knowledge base:\n")
        
        for i, doc in enumerate(results, 1):
            content = doc.page_content.strip()
            metadata = doc.metadata if hasattr(doc, 'metadata') else {}
            source = metadata.get('source', 'Unknown source')
            
            formatted_results.append(f"--- Result {i} ---")
            formatted_results.append(f"Source: {source}")
            formatted_results.append(f"Content:\n{content}\n")
        
        return "\n".join(formatted_results)
        
    except Exception as e:
        error_message = f"Error retrieving knowledge: {str(e)}"
        print(f"❌ {error_message}")
        return f"Unable to retrieve information from the knowledge base. Error: {error_message}"


@tool
def retrieve_agents_by_location(location: str, offset: int = 0) -> str:
    """
    Search for real estate agents in a specific location in Kigali with pagination support.
    
    This tool searches the knowledge base for agents in a given location and returns them
    in batches for pagination. Use this when users ask for agents in a specific area.
    
    Args:
        location: The location/area name (e.g., "Nyamirambo", "Kacyiru", "Remera", "Kanombe")
        offset: Number of agents to skip (for pagination). Default is 0. Use offset=5 to get agents 6-10.
        
    Returns:
        str: Formatted list of agents with their names and phone numbers, or a message if no more agents are available.
        
    Example:
        >>> result = retrieve_agents_by_location("Nyamirambo", offset=0)
        >>> # Returns first 5 agents
        >>> result = retrieve_agents_by_location("Nyamirambo", offset=5)
        >>> # Returns next 5 agents (6-10)
    """
    try:
        # Get the vector store
        vector_store = get_vector_store()
        
        # Search for agents in the location (get more results to ensure we find all agents)
        query = f"real estate agents in {location} area"
        results = vector_store.similarity_search(query, k=20)  # Get more results to find all agents
        
        if not results:
            return f"No agents found in {location} area."
        
        # Parse agents from the results
        all_agents = []
        seen_agents = set()  # Track agents by phone number to avoid duplicates
        
        for doc in results:
            content = doc.page_content.strip()
            
            # Extract agent entries using regex
            # Pattern: Agent Name: [name] followed by Phone Number: [number]
            agent_pattern = r'Agent Name:\s*([^\n]+)\s*Phone Number:\s*([0-9\s]+)'
            matches = re.finditer(agent_pattern, content, re.IGNORECASE)
            
            for match in matches:
                agent_name = match.group(1).strip()
                phone_number = match.group(2).strip()
                
                # Create unique key from name and phone
                agent_key = f"{agent_name.lower()}_{phone_number}"
                
                # Only add if we haven't seen this agent before and location matches
                if agent_key not in seen_agents and location.lower() in content.lower():
                    all_agents.append({
                        'name': agent_name,
                        'phone': phone_number,
                        'location': location
                    })
                    seen_agents.add(agent_key)
        
        # If no agents found with regex, try alternative parsing
        if not all_agents:
            # Try to find agent entries in a different format
            for doc in results:
                content = doc.page_content.strip()
                lines = content.split('\n')
                
                current_agent = {}
                for line in lines:
                    line = line.strip()
                    if 'agent name:' in line.lower() and not current_agent.get('name'):
                        name_match = re.search(r'agent name:\s*(.+)', line, re.IGNORECASE)
                        if name_match:
                            current_agent['name'] = name_match.group(1).strip()
                    elif 'phone number:' in line.lower() or 'phone:' in line.lower():
                        phone_match = re.search(r'phone\s*(?:number)?:?\s*([0-9\s]+)', line, re.IGNORECASE)
                        if phone_match:
                            current_agent['phone'] = phone_match.group(1).strip()
                    
                    # If we have both name and phone, add the agent
                    if current_agent.get('name') and current_agent.get('phone'):
                        agent_key = f"{current_agent['name'].lower()}_{current_agent['phone']}"
                        if agent_key not in seen_agents and location.lower() in content.lower():
                            all_agents.append({
                                'name': current_agent['name'],
                                'phone': current_agent['phone'],
                                'location': location
                            })
                            seen_agents.add(agent_key)
                            current_agent = {}
        
        if not all_agents:
            return f"No agents found in {location} area."
        
        # Apply offset for pagination
        total_agents = len(all_agents)
        agents_to_show = all_agents[offset:]
        
        if not agents_to_show:
            return f"That is the only agent I can find in {location}. I've shown you all {total_agents} available agent(s)."
        
        # Format agents (show max 5 per batch)
        max_per_batch = 5
        agents_batch = agents_to_show[:max_per_batch]
        remaining_count = len(agents_to_show) - max_per_batch
        
        formatted_results = []
        formatted_results.append(f"Here are the real estate agents in {location}:\n")
        
        for i, agent in enumerate(agents_batch, start=offset+1):
            formatted_results.append(f"{i}. **{agent['name']}**")
            formatted_results.append(f"   Phone Number: {agent['phone']}")
            formatted_results.append(f"   Location: {location}\n")
        
        # Add message about more agents if available
        if remaining_count > 0:
            formatted_results.append(f"\n💡 **There are {remaining_count} more agent(s) available in {location}.**")
            formatted_results.append("If these don't help, feel free to let me know and I can find you more. Just say 'give me more' or 'show more agents'.")
        elif offset + len(agents_batch) >= total_agents:
            formatted_results.append(f"\n✅ **That is the only agent I can find in {location}.** I've shown you all {total_agents} available agent(s).")
        
        return "\n".join(formatted_results)
        
    except Exception as e:
        error_message = f"Error retrieving agents: {str(e)}"
        print(f"❌ {error_message}")
        return f"Unable to retrieve agents from the knowledge base. Error: {error_message}"


def get_retrieval_tool() -> Any:
    """
    Get the retrieval tool instance for use with LangChain agents.
    
    Returns:
        The retrieve_real_estate_knowledge tool function
    """
    return retrieve_real_estate_knowledge

