"""
Database configuration and Prisma Client management
"""

import os
from typing import Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

# Global Prisma client instance
prisma_client = None
prisma_available = False

try:
    from prisma import Prisma
    prisma_available = True
except RuntimeError as e:
    if "hasn't been generated yet" in str(e):
        print("⚠️  Prisma Client not generated yet. Database features will be disabled.")
        print("   Run: PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 python -m prisma generate")
        prisma_available = False
    else:
        raise
except ImportError:
    prisma_available = False


async def get_prisma():
    """
    Get or create Prisma client instance.
    Creates a new client if one doesn't exist.
    """
    global prisma_client
    
    if not prisma_available:
        raise RuntimeError("Prisma Client is not available. Run 'python -m prisma generate' first.")
    
    if prisma_client is None:
        prisma_client = Prisma()
        await prisma_client.connect()
    
    return prisma_client


async def close_prisma():
    """Close Prisma client connection"""
    global prisma_client
    
    if prisma_client is not None and prisma_available:
        await prisma_client.disconnect()
        prisma_client = None


async def init_db():
    """Initialize database - Prisma will handle migrations"""
    if not prisma_available:
        print("⚠️  Prisma Client not available. Database features disabled.")
        print("   To enable: PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 python -m prisma generate")
        return False
    
    try:
        # Verify connection with timeout
        import asyncio
        client = await asyncio.wait_for(get_prisma(), timeout=5.0)
        
        # Test connection with a simple query (with timeout)
        await asyncio.wait_for(
            client.chatsession.find_first(),
            timeout=3.0
        )
        
        print("✅ Database connection verified")
        return True
    except asyncio.TimeoutError:
        print("⚠️  Database connection timeout. Continuing without database.")
        return False
    except RuntimeError as e:
        if "not available" in str(e):
            print("⚠️  Prisma Client not generated. Database features disabled.")
            return False
        raise
    except Exception as e:
        print(f"⚠️  Database connection error: {e}")
        print("   Server will continue without database features.")
        return False


async def get_db():
    """
    Database dependency for FastAPI routes.
    Returns a Prisma client instance.
    Raises RuntimeError if Prisma is not available.
    """
    if not prisma_available:
        raise RuntimeError("Prisma Client is not available. Run 'python -m prisma generate' first.")
    return await get_prisma()
