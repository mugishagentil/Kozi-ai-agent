# Fix: API Token Authentication Error

## Problem
You're getting this error when trying to view upcoming payments:
```
❌ Unable to fetch payment data.
Issue: Payroll API failed: 401 - {"message":"Access denied. No token provided."}
```

## Root Cause
The payroll API (`https://apis.kozi.rw/admin/payroll`) requires authentication, but the API token is not being sent properly.

## Solution

### Step 1: Check Backend Environment Variable

1. Open your `.env` file in the `backend/` directory
2. Verify the `API_TOKEN` is set:

```bash
API_TOKEN=your_actual_api_token_here
```

**Important:** Make sure this is a valid token for the Kozi API!

### Step 2: Verify Token in Admin Login

The admin needs to log in with proper credentials. Check that:

1. Admin is logged in (email: `admin@kozi.rw`)
2. The login process stores the API token in localStorage
3. The token is being sent in API requests

### Step 3: Test the API Directly

Test if the API endpoint works with your token:

```bash
# Replace YOUR_TOKEN with your actual API token
curl -H "Authorization: Bearer YOUR_TOKEN" https://apis.kozi.rw/admin/payroll
```

Expected response:
```json
{
  "data": [
    {
      "id": 1,
      "seekers_name": "John Doe",
      "providers_name": "ABC Company",
      "salary": "150000",
      "salary_date": "2024-11-15",
      ...
    }
  ]
}
```

If this fails, your token is invalid or expired.

### Step 4: Restart Backend Server

After setting the API_TOKEN, restart your backend:

```bash
cd backend
npm start
```

Look for these console logs:
```
[PAYROLL_API] 🔍 Fetching payroll data...
[PAYROLL_API] URL: https://apis.kozi.rw/admin/payroll
[PAYROLL_API] Has token: true  ← Should be TRUE
```

### Step 5: Test Again

1. Log in as admin
2. Ask: "Show me upcoming payments"
3. Check the backend console logs

## Debugging Steps

### Check Backend Logs

Look for these log messages:

```
[Payment] Processing query: Show me upcoming payments
[Payment] Has API token: true  ← This should be TRUE
[PAYMENT] 📋 Fetching upcoming payments...
[PAYMENT] Has API token: true  ← This should be TRUE
[PAYROLL_API] 🔍 Fetching payroll data...
[PAYROLL_API] Has token: true  ← This should be TRUE
```

**If any show "false", the token is not being passed correctly!**

### Check Frontend Token

Open browser console (F12) and check:

```javascript
// Check if token is in localStorage
console.log('API Token:', localStorage.getItem('apiToken'));
console.log('User Email:', localStorage.getItem('userEmail'));
```

The token should be present for admin users.

### Common Issues

#### Issue 1: `API_TOKEN` Not Set in `.env`

**Symptom:** Backend logs show `Has token: false`

**Solution:**
```bash
# backend/.env
API_TOKEN=your_actual_token_here
```

#### Issue 2: Invalid or Expired Token

**Symptom:** API returns 401 even with token

**Solution:**
- Get a fresh API token from your API administrator
- Update `.env` file
- Restart backend server

#### Issue 3: Token Not Being Sent from Frontend

**Symptom:** 
- Frontend localStorage has token
- Backend logs show `Has token: false`

**Solution:** Check that the admin is logged in with the correct email (`admin@kozi.rw`)

## How Authentication Works

### 1. **Frontend to Backend**
```
User Browser → API Request with Authorization Header → Backend
```

The frontend sends:
```javascript
headers: {
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json'
}
```

### 2. **Backend to Payroll API**
```
Backend → Payroll API Request with Token → Kozi API
```

The backend forwards:
```javascript
headers: {
  'Authorization': 'Bearer ' + apiToken,
  'Content-Type': 'application/json'
}
```

## Quick Fix Checklist

- [ ] `API_TOKEN` is set in `backend/.env`
- [ ] Token is valid (test with curl)
- [ ] Backend server restarted after setting token
- [ ] Admin logged in with `admin@kozi.rw`
- [ ] Browser localStorage has `apiToken`
- [ ] Backend console shows `Has token: true`
- [ ] No 401 errors in backend logs

## Still Not Working?

### Option 1: Check the Actual API Response

Add this temporary code to see the full error:

In `backend/src/services/payment.service.js`, around line 28:

```javascript
if (!response.ok) {
  const errorText = await response.text();
  console.error('[PAYROLL_API] ❌ Full error response:', errorText);
  console.error('[PAYROLL_API] ❌ Token used:', token ? 'PRESENT' : 'MISSING');
  throw new Error(`Payroll API failed: ${response.status} - ${errorText}`);
}
```

### Option 2: Test with Hardcoded Token (Temporary!)

**⚠️ ONLY FOR TESTING - REMOVE AFTER!**

In `backend/src/services/payment.service.js`, line 11:

```javascript
async function fetchPayrollFromAPI(apiToken = process.env.API_TOKEN) {
  try {
    // TEMPORARY TEST - REMOVE AFTER FIXING
    const token = 'YOUR_ACTUAL_TOKEN_HERE'; // ← Replace with real token
    
    const apiBase = process.env.JOBSEEKERS_API_BASE || 'https://apis.kozi.rw';
    const url = `${apiBase}/admin/payroll`;
    
    console.log('[PAYROLL_API] 🔍 Testing with hardcoded token...');
    // ... rest of code
```

If this works, it confirms the issue is with token passing, not the API itself.

**⚠️ Remember to remove the hardcoded token after testing!**

## Contact Support

If none of these solutions work:

1. Provide these details:
   - Backend console logs (full output)
   - Result of curl test
   - Browser console localStorage values
   - `.env` file content (hide the actual token value)

2. Contact:
   - **Email:** info@kozi.rw
   - **Phone:** +250 788 719 678

## Summary of Changes Made

I've updated these files to properly pass the API token:

1. ✅ `backend/src/services/chat/admin.service.js`
   - `handlePayment()` now accepts `apiToken` parameter
   - Token is passed to `listUpcomingPayments()`

2. ✅ `backend/src/services/payment.service.js`
   - `listUpcomingPayments()` now accepts `apiToken` parameter
   - Token is passed to `listUpcomingPaymentsFromAPI()`
   - Token is passed to `fetchPayrollFromAPI()`

3. ✅ `backend/src/utils/cronJobs.js`
   - All cron jobs now read `API_TOKEN` from env and pass it
   - Updated: `setupPaymentReminders()`, `setupOverduePaymentCheck()`, `setupWeeklyReports()`, `triggerPaymentReminders()`

**Next step:** Set your `API_TOKEN` in the `.env` file and restart the backend!


