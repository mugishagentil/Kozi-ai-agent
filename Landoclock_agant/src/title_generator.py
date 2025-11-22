"""
Generate meaningful titles from chat conversations using OpenAI
"""

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from typing import List, Dict


class TitleGenerator:
    """Generate meaningful titles from chat conversations"""
    
    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini"):
        """
        Initialize the Title Generator.
        
        Args:
            api_key: OpenAI API key
            model_name: OpenAI model name (default: gpt-4o-mini for cost efficiency)
        """
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0.3,  # Lower temperature for more consistent titles
            api_key=api_key,
            timeout=30.0,
            max_retries=2,
        )
        
        self.system_prompt = """You are a title generator for Land O'Clock, a real estate platform. 
Your task is to create a short, meaningful title (maximum 60 characters) that summarizes the main topic of a conversation about real estate.

Guidelines:
1. Make titles clear and descriptive based on the FIRST MEANINGFUL QUESTION (skip greetings)
2. Focus on the main topic or question (e.g., "Finding 2BR Apartment in Kigali", "Property Pricing Questions", "Rental Application Process")
3. Keep it under 60 characters
4. Use title case (Capitalize First Letter Of Each Word)
5. Be specific but concise
6. IGNORE greetings like "hello", "hi", "good morning", "goodbye", "bye", "thanks" - look for the first actual question or topic
7. If ALL messages are just greetings, return "New Chat"
8. Extract the core topic from the first meaningful question, not from greetings

Examples:
- "Hello" → "New Chat" (greeting only)
- "Good afternoon" → "New Chat" (greeting only)
- "Where are landoclock ha an office" → "Land O'Clock Office Location"
- "I need to know about land o'clock" → "About Land O'Clock"
- "I'm looking for a 2 bedroom apartment in Kacyiru with parking" → "2BR Apartment in Kacyiru"
- "What's the average rent for 3 bedroom houses?" → "3BR House Rental Prices"
- "Can you help me understand the rental agreement?" → "Rental Agreement Help"
- "How do I pay rent?" → "How To Pay Rent"
- "What are the best areas to invest?" → "Best Investment Areas"

Generate ONLY the title, nothing else."""

    def generate_title(self, messages: List[Dict[str, str]]) -> str:
        """
        Generate a title from chat messages, focusing on the first meaningful question.
        
        Args:
            messages: List of messages in format [{"role": "user"|"assistant", "content": "..."}]
            
        Returns:
            Generated title string
        """
        try:
            # If no messages, return default
            if not messages or len(messages) == 0:
                return "New Chat"
            
            # Find the first meaningful user question (skip greetings)
            meaningful_question = None
            greeting_keywords = [
                "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
                "goodbye", "bye", "thanks", "thank you", "thank", "no bye", "no i back",
                "welcome back", "how are you", "how do you do", "see you", "see ya"
            ]
            
            # Question words that indicate meaningful questions
            question_words = ["where", "what", "how", "when", "who", "why", "which", "can", "do", "does", "is", "are", "will"]
            
            for msg in messages:
                if msg.get("role") == "user":
                    content = msg.get("content", "").strip()
                    content_lower = content.lower()
                    word_count = len(content.split())
                    
                    # Check if it contains question words - these are always meaningful
                    has_question_word = any(
                        content_lower.startswith(qw) or f" {qw} " in content_lower or content_lower.endswith(f" {qw}")
                        for qw in question_words
                    )
                    
                    # Check if it's just a greeting (short message with greeting keywords)
                    is_greeting = (
                        word_count <= 5 and 
                        any(keyword in content_lower for keyword in greeting_keywords)
                    )
                    
                    # It's meaningful if:
                    # 1. It has question words (where, what, how, etc.), OR
                    # 2. It's longer than 5 words, OR
                    # 3. It doesn't match greeting patterns
                    if has_question_word or (not is_greeting and word_count > 3):
                        meaningful_question = content
                        break
            
            # If no meaningful question found, return default
            if not meaningful_question:
                return "New Chat"
            
            # Get first few messages for context (to save tokens)
            context_messages = messages[:6]  # First 3 exchanges
            
            # Format messages for the prompt
            conversation = ""
            for msg in context_messages:
                role = msg.get("role", "")
                content = msg.get("content", "")
                if role == "user":
                    conversation += f"User: {content}\n"
                elif role == "assistant":
                    conversation += f"Assistant: {content}\n"
            
            # Create prompt emphasizing the first meaningful question
            prompt = f"""Generate a title for this conversation. Focus on the FIRST MEANINGFUL QUESTION (ignore greetings like hello, hi, goodbye).

Conversation:
{conversation}

Generate a title based on the main topic/question, not greetings."""
            
            # Get title from model
            response = self.llm.invoke([
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=prompt)
            ])
            
            title = response.content.strip()
            
            # Clean up title (remove quotes if present)
            title = title.strip('"\'')
            
            # Limit to 60 characters
            if len(title) > 60:
                title = title[:57] + "..."
            
            # Fallback to default if empty
            if not title:
                title = "Property Inquiry"
            
            return title
            
        except Exception as error:
            print(f"Error generating title: {error}")
            # Fallback title based on first user message
            if messages and len(messages) > 0:
                first_user_msg = next((msg.get("content", "") for msg in messages if msg.get("role") == "user"), "")
                if first_user_msg:
                    # Extract first few words
                    words = first_user_msg.split()[:5]
                    return " ".join(words).capitalize() if words else "Property Inquiry"
            return "Property Inquiry"

