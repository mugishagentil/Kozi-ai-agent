"""
User Thread Mapping - Maps users to their active threads in database
"""

from typing import Optional

class UserThreadManager:
    def __init__(self):
        pass
    
    async def get_thread_for_user(self, user_id: int, role_type: str = "employee") -> Optional[str]:
        """Get current active thread for user and role."""
        try:
            from database import get_db
            db = await get_db()
            session = await db.chatsession.find_first(
                where={"users_id": user_id, "role_type": role_type, "is_active": True}
            )
            return session.thread_id if session else None
        except Exception:
            return None
    
    async def set_thread_for_user(self, user_id: int, thread_id: str, role_type: str = "employee"):
        """Set new active thread for user and role."""
        try:
            from database import get_db
            db = await get_db()
            
            # Deactivate all existing threads for user and role
            await db.chatsession.update_many(
                where={"users_id": user_id, "role_type": role_type},
                data={"is_active": False}
            )
            
            # Create new active thread
            await db.chatsession.create(
                data={
                    "users_id": user_id,
                    "thread_id": thread_id,
                    "role_type": role_type,
                    "title": None,
                    "is_active": True
                }
            )
        except Exception:
            pass
    
    async def clear_thread_for_user(self, user_id: int, role_type: str = "employee"):
        """Mark threads as inactive for user and role."""
        try:
            from database import get_db
            db = await get_db()
            # Deactivate threads for user and role
            await db.chatsession.update_many(
                where={"users_id": user_id, "role_type": role_type},
                data={"is_active": False}
            )
        except Exception:
            pass

# Global instance
user_thread_manager = UserThreadManager()