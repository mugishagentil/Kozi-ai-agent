#!/bin/bash

# Kozi AI Backend Startup Script
# This script activates the virtual environment and starts the Python server

set -e

echo "🚀 Starting Kozi AI Backend..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
if [ ! -f "venv/.requirements_installed" ]; then
    echo "📥 Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    touch venv/.requirements_installed
    echo "✅ Dependencies installed"
fi

# Check if Prisma client is generated
if [ ! -d "venv/lib/python*/site-packages/prisma" ] || [ ! -f ".prisma_generated" ]; then
    echo "🔧 Generating Prisma client..."
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 python -m prisma generate
    touch .prisma_generated
    echo "✅ Prisma client generated"
fi

# Check and kill any process using port 5050
PORT=${PORT:-5050}
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use. Killing existing process..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 1
    echo "✅ Port $PORT cleared"
fi

# Start the server
echo ""
echo "🌟 Starting FastAPI server..."
echo "📍 Server will run on: http://localhost:$PORT"
echo "📚 API Docs: http://localhost:$PORT/docs"
echo ""
cd src_python
python main.py

