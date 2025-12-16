"""
Test script for OpenAI thread functionality
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# Add src_python to path
sys.path.insert(0, str(Path(__file__).parent))

from thread_manager import ThreadManager
from agents.jobseeker_agent import JobSeekerAgent

def test_thread_functionality():
    """Test OpenAI thread creation and message handling."""
    
    # Get API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment variables")
        return False
    
    try:
        # Initialize thread manager
        print("🧪 Testing ThreadManager...")
        thread_manager = ThreadManager(api_key)
        
        # Create a new thread
        print("📝 Creating new thread...")
        thread_id = thread_manager.create_thread({
            "role_type": "employee",
            "test": "true"
        })
        print(f"✅ Created thread: {thread_id}")
        
        # Add a message
        print("💬 Adding user message...")
        message_id = thread_manager.add_message(thread_id, "Hello, I'm looking for a job in tech", "user")
        print(f"✅ Added message: {message_id}")
        
        # Get messages
        print("📚 Retrieving messages...")
        messages = thread_manager.get_messages(thread_id)
        print(f"✅ Retrieved {len(messages)} messages")
        for msg in messages:
            print(f"   - {msg['role']}: {msg['content'][:50]}...")
        
        # Test with agent
        print("\n🤖 Testing with JobSeekerAgent...")
        agent = JobSeekerAgent(api_key, "gpt-4o-mini")
        
        # Test thread creation through agent
        agent_thread_id = agent.create_thread({"test": "agent_test"})
        print(f"✅ Agent created thread: {agent_thread_id}")
        
        # Test question with thread
        print("❓ Testing question with thread...")
        response = agent.answer_question(
            "What types of jobs are available?",
            thread_id=agent_thread_id
        )
        print(f"✅ Got response: {response[:100]}...")
        
        # Get thread messages through agent
        thread_messages = agent.get_thread_messages(agent_thread_id)
        print(f"✅ Thread now has {len(thread_messages)} messages")
        
        # Clean up
        print("\n🧹 Cleaning up...")
        thread_manager.delete_thread(thread_id)
        thread_manager.delete_thread(agent_thread_id)
        print("✅ Cleanup complete")
        
        print("\n🎉 All tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    print("🚀 Starting OpenAI Thread Tests...")
    success = test_thread_functionality()
    if success:
        print("\n✅ Thread functionality is working correctly!")
    else:
        print("\n❌ Thread functionality has issues.")