# Quick Start Guide

## 🚀 Fastest Way to Start

### Using Startup Script (Recommended)

**Linux/Mac:**
```bash
cd backend
./start.sh
```

**Windows:**
```cmd
cd backend
start.bat
```

That's it! The script handles everything automatically.

---

## 📝 Manual Steps (If Needed)

### 1. Activate Virtual Environment

**Linux/Mac:**
```bash
cd backend
source venv/bin/activate
```

**Windows:**
```cmd
cd backend
venv\Scripts\activate
```

**✅ You should see `(venv)` in your terminal prompt**

### 2. Install Dependencies (First Time Only)

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Generate Prisma Client (First Time Only)

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 python -m prisma generate
```

### 4. Run Server

```bash
cd src_python
python main.py
```

---

## ⚠️ Important Notes

1. **Always activate venv first!** - You must see `(venv)` in your prompt
2. **Check activation:** Run `which python` (should point to `venv/bin/python`)
3. **Deactivate:** When done, run `deactivate`

---

## 🔍 Verify Setup

```bash
# Check Python version
python --version

# Check if venv is active (should show venv path)
which python

# Test imports
python -c "import fastapi; import langchain; print('✅ All imports work')"
```

---

## 🐛 Troubleshooting

**"python: command not found"**
- Use `python3` instead of `python`
- Make sure Python 3.10+ is installed

**"Module not found"**
- Make sure venv is activated
- Run `pip install -r requirements.txt`

**"Prisma client not generated"**
- Run: `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 python -m prisma generate`

