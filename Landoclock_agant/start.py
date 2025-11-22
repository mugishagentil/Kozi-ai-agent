#!/usr/bin/env python3
import os
import subprocess
import sys

print("🚀 Starting Land O'Clock Backend...")
print(f"🐍 Python: {sys.executable}")
print(f"📂 Working directory: {os.getcwd()}")

# Get PORT from environment
port_str = os.getenv("PORT", "3001")
print(f"🔍 PORT from environment: '{port_str}' (type: {type(port_str)})")
try:
    port = int(port_str)
    print(f"📡 Using port: {port}")
except ValueError:
    print(f"❌ ERROR: PORT '{port_str}' is not a valid integer!")
    print(f"   Environment variables: {dict(os.environ)}")
    sys.exit(1)

# Run migrations
print("📦 Running database migrations...")
migrate_result = subprocess.run(
    ["npx", "prisma", "migrate", "deploy"],
    capture_output=True,
    text=True
)
if migrate_result.returncode != 0:
    print("⚠️  Migrations failed or skipped. Server will continue without migrations.")
    if migrate_result.stderr:
        print(f"   Error: {migrate_result.stderr[:200]}")  # Print first 200 chars

# Start server using python -m uvicorn (more reliable)
print(f"🌐 Starting FastAPI server on port {port}...")
print(f"   Command: python -m uvicorn src.main:app --host 0.0.0.0 --port {port}")

# Use subprocess.run with sys.executable to ensure we use the correct Python
subprocess.run([
    sys.executable, "-m", "uvicorn",
    "src.main:app",
    "--host", "0.0.0.0",
    "--port", str(port)
])

