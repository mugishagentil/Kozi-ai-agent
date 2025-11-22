#!/bin/bash
set -e

echo "🚀 Starting Land O'Clock Backend..."

# Get PORT from environment or use default
PORT=${PORT:-3001}
echo "📡 Using port: $PORT"

# Run migrations (allow to fail gracefully)
echo "📦 Running database migrations..."
npx prisma migrate deploy || {
    echo "⚠️  Migrations failed or skipped. Server will continue without migrations."
}

# Start the server
echo "🌐 Starting FastAPI server on port $PORT..."
exec uvicorn src.main:app --host 0.0.0.0 --port "$PORT"

