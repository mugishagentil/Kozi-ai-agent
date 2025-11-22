# How to Update OpenAI API Key

## Steps to Update API Key

### 1. Update the `.env` file

Edit `backend/.env` and update the `OPENAI_API_KEY`:

```bash
cd backend
nano .env  # or use your preferred editor
```

Make sure the line looks like:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important:**
- No spaces around the `=` sign
- No quotes around the key
- The key should start with `sk-` or `sk-proj-`

### 2. Restart the Server

**The server MUST be restarted to pick up the new API key!**

```bash
# Stop the current server (if running)
lsof -ti:5050 | xargs kill -9

# Start the server again
cd backend
./start.sh
```

Or manually:
```bash
cd backend
source venv/bin/activate
cd src_python
python main.py
```

### 3. Verify the New Key is Loaded

Test the API:
```bash
curl -X POST http://localhost:5050/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "role_type": "employee"}'
```

If you still see quota errors, the new key might also have quota issues.

## Troubleshooting

### Server Not Picking Up New Key

1. **Make sure you restarted the server** - Environment variables are only loaded at startup
2. **Check .env file location** - Should be in `backend/.env`
3. **Check for typos** - No extra spaces, quotes, or special characters
4. **Check file encoding** - Should be plain text, not rich text

### Still Getting Quota Errors

1. **Verify the new key has credits:**
   - Go to https://platform.openai.com/account/billing
   - Check your account balance
   - Add credits if needed

2. **Check key permissions:**
   - Make sure the key has access to the model you're using (gpt-4o-mini)
   - Check if there are any usage limits on the key

3. **Wait a few minutes:**
   - Sometimes quota resets take a few minutes to propagate

### Verify Key is Being Used

Check server logs when it starts - it should show:
```
🤖 Kozi AI Agents initialized with model: gpt-4o-mini
```

If you see errors about the API key during startup, the key format might be wrong.

## Quick Test

After updating and restarting:

```bash
# Test health endpoint
curl http://localhost:5050/health

# Test chat endpoint
curl -X POST http://localhost:5050/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "role_type": "employee"}'
```

If both work, the new API key is working!

