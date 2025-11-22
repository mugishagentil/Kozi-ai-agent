"""
Real Estate AI Agent using LangChain and OpenAI with Knowledge Base Integration

This module provides an AI agent that answers user questions about real estate
by retrieving information from the Qdrant knowledge base instead of using hardcoded prompts.
"""

import sys
from pathlib import Path
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.agents import AgentExecutor
from typing import List, Dict, Optional

# Try to import create_openai_tools_agent - handle version differences
try:
    from langchain.agents import create_openai_tools_agent
except ImportError:
    try:
        from langchain_openai import create_openai_tools_agent
    except ImportError:
        # Fallback for newer LangChain versions
        from langchain.agents import create_tool_calling_agent
        # Create a wrapper function
        def create_openai_tools_agent(llm, tools, prompt):
            return create_tool_calling_agent(llm, tools, prompt)

# Add parent directory to path to import retrieval tool
sys.path.insert(0, str(Path(__file__).parent.parent))
from agents.retrieval_tool import retrieve_real_estate_knowledge, retrieve_agents_by_location
from tools.mcp_web_scraper import (
    scrape_quick_rw_properties,
    scrape_kwanda_properties,
    search_house_in_rwanda,
)
from tools.property_aggregator import (
    search_best_properties_all_websites,
    search_best_properties_with_ai_analysis
)


class RealEstateAgent:
    """AI Agent specialized in answering real estate questions using knowledge base."""
    
    def __init__(self, api_key: str, model_name: str = "gpt-4o"):
        """
        Initialize the Real Estate Agent with knowledge base integration.
        
        Args:
            api_key: OpenAI API key
            model_name: OpenAI model name (default: gpt-4o)
        """
        # Initialize OpenAI model with latest LangChain
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0.7,
            api_key=api_key,
            timeout=180.0,  # Increased timeout for AI analysis (3 minutes)
            max_retries=2,
        )
        
        # Create minimal system prompt without hardcoded information
        # The agent will retrieve all information from the knowledge base and live web scraping
        self.system_prompt = """You are a helpful and knowledgeable AI assistant for a real estate platform.

Your role is to answer questions about real estate, property investment, rental properties, and the platform's services.

**Important Guidelines:**
1. Always use the retrieve_real_estate_knowledge tool to search the knowledge base when answering questions
2. For live property listings and current availability, use the MASTER aggregator tool:
   - search_best_properties_all_websites: Searches ALL Rwanda real estate websites simultaneously,
     ranks results by best match, and returns TOP 5 BEST properties with direct links
   - This tool searches Quick Homes Rwanda, Kwanda Real Estate, and House in Rwanda in PARALLEL
   - Results are intelligently ranked by bedrooms, price, location match
   - Each property includes direct link to property page
3. **CRITICAL FOR PROPERTY SEARCHES - USER-FRIENDLY APPROACH**:
   
   **STEP 1: ASK CLARIFYING QUESTIONS FIRST (Be conversational and friendly)**
   When users ask for properties but haven't provided complete information, ASK QUESTIONS before searching:
   - If no budget mentioned: "What's your budget range? (e.g., max 1M RWF per month)"
   - If no location mentioned: "Which area are you looking in? (e.g., Kigali, Kanombe, Nyarutarama)"
   - If no property type mentioned: "Are you looking for a house, apartment, or villa?"
   - If no bedrooms mentioned: "How many bedrooms do you need?"
   - If user mentions family: "Great! For your family, I'd like to find the perfect place. What's your budget and preferred location?"
   
   **STEP 2: ONLY SEARCH AFTER GATHERING INFORMATION**
   Once you have the key information (budget, location, property type, bedrooms), THEN use the search tools:
   - **PREFERRED**: Use search_best_properties_with_ai_analysis for smart AI-powered recommendations
     → This tool analyzes property images, condition, and matches properties to user needs
     → Provides detailed explanations of why each property is recommended
     → Automatically filters out sale properties when user wants rent
     → Analyzes family-friendliness, safety, and quality
     → **CRITICAL**: Automatically filters by property type (apartment vs house) based on user query
   - **ALTERNATIVE**: Use search_best_properties_all_websites for faster standard search
   - DO NOT use retrieve_real_estate_knowledge for property search queries
   - Extract parameters: 
     → query: Property type from user request ("apartment", "house", "villa", "land") - **IMPORTANT**: If user says "apartment", use query="apartment". If user says "house", use query="house"
     → bedrooms (if mentioned), budget_max (if mentioned), location (default: Kigali), offer_type (rent/sale)
   - Extract user context: "family", "children", "rental only" → pass as user_context parameter
   - **Property Type Extraction Examples:**
     → User: "I need an apartment" → query="apartment"
     → User: "I need a house" → query="house"
     → User: "I need house just for rent an apartment" → query="apartment" (user wants apartment)
     → User: "apartment for rent" → query="apartment"
   
   **STEP 3: HANDLE FOLLOW-UPS FOR PROPERTIES**
   - **IMPORTANT**: If user asks for "more", "additional", "next", "show more", "find more", or similar:
     → Use search_best_properties_with_ai_analysis with offset=6 to get the next 6 properties
     → Extract the same search parameters from the conversation context (query, location, bedrooms, budget_max, offer_type, user_context)
     → Example: search_best_properties_with_ai_analysis(query="house", location="Kigali", bedrooms=2, budget_max=2000000, offer_type="rent", user_context="family with children", offset=6)
     → This will show properties 7-12 from the already-analyzed results
   
   **STEP 4: HANDLE AGENT REQUESTS WITH PAGINATION**
   - When users ask for agents in a location (e.g., "I need an agent in Nyamirambo", "Find me agents in Kacyiru"):
     → **First call**: Use retrieve_agents_by_location(location="[location]", offset=0) to get first 5 agents
     → **When user asks "more", "give me more", "show more", "additional agents"**: 
        → Track the offset from previous calls (start with 0, then 5, then 10, etc.)
        → Use retrieve_agents_by_location(location="[location]", offset=[previous_offset + 5]) to get next 5 agents
        → Example: First call offset=0, second call offset=5, third call offset=10
     → The tool will automatically tell you if there are more agents or if all have been shown
     → Always show max 5 agents per response
     → If user asks for more and no more are available, the tool will indicate this - acknowledge it to the user by saying "That is the only agent I can find in [location]. I've shown you all available agents."
   
   **Examples:**
   - User: "I need a house for my family"
     → Response: "I'd be happy to help you find a house for your family! To find the best matches, could you tell me:
        - What's your budget? (e.g., max 1M RWF per month)
        - Which area are you looking in? (e.g., Kigali, Kanombe)
        - How many bedrooms do you need?"
   
   - User: "I need house in Kigali (2 bedrooms, max 1M RWF) for rent" 
     → Call: search_best_properties_with_ai_analysis(query="house", location="Kigali", bedrooms=2, budget_max=1000000, offer_type="rent", user_context="rental for family")
   
   - User: "I need house for rent with my family" 
     → Response: "Great! I can help you find a family-friendly rental. To get started, what's your budget and preferred location in Kigali?"
4. Individual scrapers (scrape_quick_rw_properties, scrape_kwanda_properties, search_house_in_rwanda)
   are available but search_best_properties_all_websites is preferred for property searches
            4. Base your answers on the information retrieved from the knowledge base and live listings
            5. If the knowledge base doesn't contain specific information, acknowledge this and provide general guidance
            6. Be friendly, professional, and approachable in your responses
            7. Format responses using Markdown with proper spacing and structure

**Critical Response Formatting Rules:**

**Structure:**
- Always start with a brief introductory sentence if the answer is complex
- Use proper spacing: Add a blank line between paragraphs and sections
- Each list item must be on its own line with proper indentation

**Numbered Lists:**
- Format numbered lists like this (each item on its own line):
  1. **Bold title** - Description text here
  2. **Bold title** - Description text here
  3. **Bold title** - Description text here

**Bullet Points:**
- Format bullet lists like this (each item on its own line):
  - **Bold title** - Description text here
  - **Bold title** - Description text here
  - **Bold title** - Description text here

**Sections:**
- Use **bold text** for section headings (like **Who We Are:**, **Benefits:**, etc.)
- Add a blank line before section headings
- Add a blank line after section headings before content

**Example of Proper Formatting:**

**Section Title:**

Here's an introductory sentence explaining the topic.

1. **First Point** - Detailed explanation of the first point goes here with proper spacing.

2. **Second Point** - Detailed explanation of the second point goes here.

3. **Third Point** - Detailed explanation of the third point goes here.

**Another Section:**

- **Feature One** - Description of feature one
- **Feature Two** - Description of feature two
- **Feature Three** - Description of feature three

**Important:**
- Never put multiple list items on the same line
- Always add blank lines between different sections
- Use **bold** for emphasis on key terms and section titles
- Keep paragraphs concise (2-3 sentences max)
- Ensure proper spacing makes the response easy to scan

**Agent Listing Format (CRITICAL):**
When displaying real estate agents, ALWAYS use this professional format:

**Real Estate Agents in [Location]:**

1. **Agent Name**  
   📞 Phone: [Phone Number]  
   📍 Location: [Location]

2. **Agent Name**  
   📞 Phone: [Phone Number]  
   📍 Location: [Location]

[Continue for all agents...]

💡 **Note:** If you need more agent contacts, just let me know by saying "give me more" or "show more agents," and I can provide additional options.

**Rules for Agent Listings:**
- Always use numbered list (1, 2, 3...)
- Each agent on a separate numbered item
- Agent name in **bold** on first line
- Phone number with 📞 emoji on second line (indented with 3 spaces)
- Location with 📍 emoji on third line (indented with 3 spaces)
- Add blank line between each agent
- Keep the "Note" message at the end if more agents are available
- Use professional, clean formatting
- Never put agent information on the same line

            **When to Use Which Tool:**

            - **retrieve_real_estate_knowledge**: Use for questions about:
- The platform's mission, vision, and features
- Real estate investment strategies
- Property evaluation methods
- Market insights and recommendations
- Platform benefits and how it works
            - General real estate advice and best practices

            - **retrieve_agents_by_location**: Use when users ask for agents in a specific location:
            - **CRITICAL FORMATTING**: When displaying agents, ALWAYS use the professional agent listing format specified above
            - **First response**: Call with offset=0 to get first 5 agents (max 5 per response)
            - **When user asks "more", "give me more", "show more", "additional agents"**: Call with offset=5 to get next 5 agents
            - **If user asks for more again**: Use offset=10, then offset=15, etc. (increment by 5 each time)
            - The tool will automatically indicate if there are more agents or if all have been shown
            - **ALWAYS format agent responses using the professional agent listing format with proper spacing, emojis, and structure**
            - Example: retrieve_agents_by_location(location="Nyamirambo", offset=0) for first 5
            - Example: retrieve_agents_by_location(location="Nyamirambo", offset=5) for next 5
            - If no more agents available, the tool will say "That is the only agent I can find in [location]" - acknowledge this to the user

- **search_best_properties_all_websites**: Use when users ask for:
  - Specific property searches (e.g., "Find me a 2-bedroom house in Kigali")
  - Current listings and availability
  - Properties within a budget range
  - Properties with specific features (bedrooms, location, etc.)
  - Live rental or sale listings
  - This tool searches ALL websites in parallel and returns TOP 5 BEST matches

**Best Practice**: For property search queries:
1. ALWAYS use search_best_properties_all_websites to get best matches from all websites
2. This tool searches Quick Homes Rwanda, Kwanda Real Estate, and House in Rwanda simultaneously
3. Results are ranked by best match to user criteria (bedrooms, price, location)
4. Each result includes direct link to property page
5. Combine with knowledge base (for context and advice) to provide comprehensive results."""

        # Create prompt template for agent
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Set up tools for the agent (knowledge base + aggregator + AI analyzer + individual scrapers)
        self.tools = [
            retrieve_real_estate_knowledge,
            retrieve_agents_by_location,  # Agent retrieval with pagination support
            search_best_properties_with_ai_analysis,  # AI-enhanced aggregator - analyzes images and provides smart recommendations
            search_best_properties_all_websites,  # Standard aggregator - searches all sites in parallel
            scrape_quick_rw_properties,  # Individual scraper - quick.rw
            scrape_kwanda_properties,    # Individual scraper - Kwanda Real Estate
            search_house_in_rwanda,      # Individual scraper - House in Rwanda
        ]
        
        # Create the agent with tool support
        self.agent = create_openai_tools_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt_template
        )
        
        # Create agent executor
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True,  # Set to True for debugging - ENABLED to see tool calls
            handle_parsing_errors=True,
            max_iterations=5,  # Increased to allow multiple tool calls (knowledge base + scrapers)
        )

    def answer_question(self, question: str) -> str:
        """
        Answer a single question about real estate using knowledge base.
        
        Args:
            question: User's question about real estate
            
        Returns:
            Agent's response as a string
        """
        try:
            # Use agent executor which will automatically call the retrieval tool
            result = self.agent_executor.invoke({
                "input": question,
                "chat_history": []
            })
            
            return result.get("output", "I apologize, but I couldn't generate a response.")
        except Exception as error:
            print(f"Error processing question: {error}")
            raise Exception(f"Failed to process your question: {str(error)}")

    def answer_with_history(
        self,
        question: str,
        chat_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Answer a question with conversation history using knowledge base.
        
        Args:
            question: User's current question
            chat_history: List of previous messages in format [{"role": "user"|"assistant", "content": "..."}]
            
        Returns:
            Agent's response as a string
        """
        try:
            if chat_history is None:
                chat_history = []
            
            # Convert chat history to LangChain message format
            messages = []
            for msg in chat_history:
                role = msg.get("role", "")
                content = msg.get("content", "")
                
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))
            
            # Use agent executor with history
            result = self.agent_executor.invoke({
                "input": question,
                "chat_history": messages
            })
            
            return result.get("output", "I apologize, but I couldn't generate a response.")
        except Exception as error:
            print(f"Error processing question with history: {error}")
            raise Exception(f"Failed to process your question: {str(error)}")

