"""
Test script to verify the agent uses the knowledge base instead of hardcoded information.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from src.agent import RealEstateAgent

# Load environment variables
load_dotenv()

def test_agent_with_knowledge_base():
    """Test that the agent retrieves information from knowledge base."""
    
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ OPENAI_API_KEY not found in .env")
        return
    
    print("=" * 70)
    print("🧪 Testing Agent with Knowledge Base Integration")
    print("=" * 70)
    print()
    
    # Initialize agent
    print("Initializing agent...")
    agent = RealEstateAgent(openai_key, model_name="gpt-4o")
    print("✅ Agent initialized\n")
    
    # Test questions that should trigger knowledge base retrieval
    test_questions = [
        "What is Land O'Clock?",
        "What are the best areas to invest in Kigali?",
        "How does the platform help tenants?",
        "What is the buy-to-rent investment strategy?",
    ]
    
    for i, question in enumerate(test_questions, 1):
        print("=" * 70)
        print(f"Test {i}: {question}")
        print("=" * 70)
        
        try:
            response = agent.answer_question(question)
            print(f"\nResponse:\n{response}\n")
            print("-" * 70)
            print()
        except Exception as e:
            print(f"❌ Error: {e}\n")
    
    print("=" * 70)
    print("✅ Testing complete!")
    print("=" * 70)
    print("\nNote: The agent should automatically call retrieve_real_estate_knowledge")
    print("for each question and base answers on the knowledge base content.")

if __name__ == "__main__":
    test_agent_with_knowledge_base()

