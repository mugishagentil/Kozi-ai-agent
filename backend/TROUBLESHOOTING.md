# Troubleshooting Guide

## JobSeekerAgent Not Working

### Issue: OpenAI API Quota Exceeded

**Error Message:**
```
Error code: 429 - You exceeded your current quota, please check your plan and billing details.
```

**Solution:**
1. Go to https://platform.openai.com/account/billing
2. Add credits to your OpenAI account
3. Or upgrade your plan to increase quota limits
4. Wait a few minutes for the quota to reset (if on a usage-based plan)

### Issue: Invalid API Key

**Error Message:**
```
401 - OpenAI API key is invalid or not configured
```

**Solution:**
1. Check your `.env` file in the `backend` directory
2. Verify `OPENAI_API_KEY` is set correctly
3. Make sure there are no extra spaces or quotes around the key
4. Restart the server after updating the `.env` file

### Issue: Frontend Can't Connect

**Error Message:**
```
Sorry, I could not connect right now. Please try again in a moment.
```

**Possible Causes:**
1. **Backend not running**: Make sure the Python backend is running on port 5050
   ```bash
   cd backend
   ./start.sh
   ```

2. **Port mismatch**: Frontend expects backend on `localhost:5050`
   - Backend runs on: `http://localhost:5050`
   - Frontend connects to: `http://localhost:5050/api` (when on localhost)

3. **CORS issues**: Check that CORS is enabled in `main.py`

4. **Network issues**: Check firewall or network settings

**Solution:**
1. Verify backend is running:
   ```bash
   curl http://localhost:5050/health
   ```
   Should return: `{"status":"ok",...}`

2. Check frontend configuration in `src/composables/useKoziChat.js`:
   - Should use `http://localhost:5050/api` when on localhost
   - Should use Railway URL for production

3. Check browser console for specific error messages

### Issue: Rate Limit Exceeded

**Error Message:**
```
429 - OpenAI API rate limit exceeded
```

**Solution:**
1. Wait a few minutes before trying again
2. Reduce the number of concurrent requests
3. Consider upgrading your OpenAI plan for higher rate limits

## Testing the Agent

### Test JobSeekerAgent Directly

```bash
curl -X POST http://localhost:5050/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, can you help me find a job?",
    "role_type": "employee"
  }'
```

### Expected Response

```json
{
  "response": "Hello! I'd be happy to help you find a job...",
  "model": "gpt-4o-mini",
  "sessionId": 123456789
}
```

### Check Server Logs

The server logs will show:
- `📝 Question received: ...`
- `✅ Response generated (... characters)`
- Any error messages with details

## Common Issues

### 1. Virtual Environment Not Activated

**Symptom:** Import errors or module not found

**Solution:**
```bash
cd backend
source venv/bin/activate
cd src_python
python main.py
```

### 2. Prisma Client Not Generated

**Symptom:** `RuntimeError: The Client hasn't been generated yet`

**Solution:**
```bash
cd backend
source venv/bin/activate
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 python -m prisma generate
```

### 3. Port Already in Use

**Symptom:** `ERROR: [Errno 48] error while attempting to bind on address ('0.0.0.0', 5050): address already in use`

**Solution:**
The `start.sh` script now automatically handles this, but you can manually:
```bash
lsof -ti:5050 | xargs kill -9
```

### 4. Database Connection Issues

**Symptom:** Chat works but history isn't saved

**Solution:**
- Check `DATABASE_URL` in `.env`
- Verify database is accessible
- Chat will work without database, but history won't be saved

## Getting Help

1. Check server logs for detailed error messages
2. Test the `/health` endpoint: `curl http://localhost:5050/health`
3. Test the chat endpoint directly (see above)
4. Check browser console for frontend errors
5. Verify all environment variables are set correctly

