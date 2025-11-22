@echo off
REM Kozi AI Backend Startup Script for Windows
REM This script activates the virtual environment and starts the Python server

echo 🚀 Starting Kozi AI Backend...
echo.

cd /d "%~dp0"

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if requirements are installed
if not exist "venv\.requirements_installed" (
    echo 📥 Installing Python dependencies...
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    type nul > venv\.requirements_installed
    echo ✅ Dependencies installed
)

REM Check if Prisma client is generated
if not exist ".prisma_generated" (
    echo 🔧 Generating Prisma client...
    set PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
    python -m prisma generate
    type nul > .prisma_generated
    echo ✅ Prisma client generated
)

REM Start the server
echo.
echo 🌟 Starting FastAPI server...
echo 📍 Server will run on: http://localhost:%PORT%
echo 📚 API Docs: http://localhost:%PORT%/docs
echo.

cd src_python
python main.py

