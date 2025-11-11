# Debugging the Payment System

## Overview
This guide will help you troubleshoot why "No Upcoming Payments" is showing even when you have hired seekers in your database.

## Quick Debug Steps

### Step 1: Check Backend Logs
When you ask the AI "Show me upcoming salary payments", look at your backend console. You'll see detailed logs like:

```
[PAYMENT] 💰 Starting payment calculation...
[HIRED_SEEKERS_API] 🔍 Fetching hired seekers...
[HIRED_SEEKERS_API] URL: https://apis.kozi.rw/admin/hired_seekers
[HIRED_SEEKERS_API] Has token: true
[HIRED_SEEKERS_API] Response status: 200
[HIRED_SEEKERS_API] ✅ Found 5 hired seekers
[PAYMENT] 📅 Payment window: { today: '2025-11-11', sevenDaysFromNow: '2025-11-18' }
[PAYMENT] Processing John Doe: { hireDate: '2025-10-15', nextPayment: '2025-11-15', isWithinWindow: true }
[PAYMENT] ✅ Payment due for John: { salary: 150000, jobDescription: '...' }
[PAYMENT] 📊 Summary: { totalHiredSeekers: 5, upcomingPayments: 1, skippedInvalidDates: 0, outsidePaymentWindow: 4 }
[PAYMENT] 🎉 Found 1 upcoming payments!
```

### Step 2: Use the Test Endpoint
Test the hired seekers API connection directly:

```bash
# Replace YOUR_ADMIN_TOKEN with your actual admin token
curl -X GET http://localhost:5050/api/admin/hired_seekers/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

This will return:
```json
{
  "success": true,
  "test": {
    "timestamp": "2025-11-11T10:00:00.000Z",
    "apiUrl": "https://apis.kozi.rw",
    "endpoint": "/admin/hired_seekers",
    "hasToken": true,
    "apiCallSuccess": true,
    "hiredSeekersCount": 5,
    "error": null,
    "sampleData": {
      "hired_id": 123,
      "seeker_name": "John Doe",
      "provider_name": "ABC Company",
      "hire_date": "2025-10-15",
      "has_job_description": true,
      "job_description_preview": "Looking for driver with experience..."
    }
  },
  "message": "✅ API connection successful!"
}
```

### Step 3: Check Direct API
Test the external Kozi API directly:

```bash
curl -X GET https://apis.kozi.rw/admin/hired_seekers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

You should get a response like:
```json
[
  {
    "hired_id": 123,
    "seeker_first_name": "John",
    "seeker_last_name": "Doe",
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "date": "2025-10-15",
    "job_description": "Driver position. Salary: 150000 RWF per month",
    "when_need_worker": "Immediately",
    "working_mode": "Full-time",
    "accommodation_preference": "Live-in"
  }
]
```

## Common Issues & Solutions

### Issue 1: "No hired seekers found"

**Symptoms:** Logs show `Found 0 hired seekers`

**Causes:**
- External API returns empty array
- No employees have been hired yet
- API token is invalid

**Solutions:**
1. Check if hired seekers exist in your main database
2. Verify the frontend "Hired Seekers" page shows data
3. Test the API directly (Step 3 above)
4. Check API token validity

### Issue 2: "No payments due in next 7 days"

**Symptoms:** Logs show hired seekers found but `upcomingPayments: 0`

**Causes:**
- All hire dates are outside the 7-day payment window
- Payment dates haven't been reached yet

**Example:**
```
Today: November 11
Hire Date: October 5
Next Payment: December 5 (not within 7 days)
```

**Solutions:**
1. Check hire dates in logs: `hireDate: '2025-10-05', nextPayment: '2025-12-05'`
2. Wait for payment dates to approach
3. For testing, hire someone with a recent date (within the last month)

### Issue 3: "Salary: NOT FOUND"

**Symptoms:** Logs show `salary: 'NOT FOUND'` or `amount: 0`

**Causes:**
- Job description doesn't contain salary information
- Salary format not recognized

**Solutions:**
Add salary to job description in one of these formats:
- "Salary: 150000"
- "150000 RWF per month"
- "Monthly payment: 150,000"
- "Salary 150000 RWF"

### Issue 4: "Invalid hire date"

**Symptoms:** Logs show `Skipping hired seeker - invalid hire date`

**Causes:**
- `date` field is null
- `date` field has invalid format

**Solutions:**
1. Check that hired seekers have a `date` field
2. Ensure date is in valid format (YYYY-MM-DD or ISO 8601)

### Issue 5: "API connection failed"

**Symptoms:** Test endpoint returns error or `apiCallSuccess: false`

**Causes:**
- External API is down
- Network connectivity issues
- CORS or firewall issues
- Invalid API URL

**Solutions:**
1. Check if `https://apis.kozi.rw` is accessible
2. Verify API_TOKEN in environment variables
3. Check backend .env file
4. Test from server: `curl https://apis.kozi.rw/admin/hired_seekers`

## Understanding Payment Calculation

### How It Works:
1. **Fetch Hired Seekers**: Gets all hired employees from external API
2. **Calculate Next Payment**: Assumes monthly payments on hire date anniversary
3. **Filter Window**: Only shows payments due in next 7 days
4. **Extract Salary**: Looks for salary patterns in job description

### Example Scenario:
```
Hire Date: October 15, 2025
Today: November 11, 2025
Next Payment: November 15, 2025
Days Until Payment: 4 days ✅ (within 7-day window)
Result: SHOWN in upcoming payments
```

### Example Outside Window:
```
Hire Date: October 5, 2025
Today: November 11, 2025
Next Payment: December 5, 2025
Days Until Payment: 24 days ❌ (outside 7-day window)
Result: NOT shown in upcoming payments
```

## Testing Checklist

Before reporting an issue, verify:

- [ ] Backend server is running
- [ ] External API is accessible
- [ ] At least one hired seeker exists
- [ ] Hired seeker has a valid `date` field
- [ ] Hire date is within last month (for testing)
- [ ] Job description contains salary information
- [ ] Admin token is valid
- [ ] Checked backend console logs
- [ ] Tested using test endpoint
- [ ] Tested external API directly

## Environment Variables

Ensure these are set in `backend/.env`:

```env
# External Kozi API
JOBSEEKERS_API_BASE=https://apis.kozi.rw

# API Token for authentication
API_TOKEN=your_admin_token_here

# Database connection
DATABASE_URL=your_database_url
```

## Useful Commands

### Start Backend with Logs
```bash
cd backend
npm start
```

### Test Payment Endpoint
```bash
curl -X GET http://localhost:5050/api/admin/hired_seekers/upcoming_payments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Connection
```bash
curl -X GET http://localhost:5050/api/admin/hired_seekers/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Backend Health
```bash
curl -X GET http://localhost:5050/health
```

## Reading the Logs

### Success Example:
```
[PAYMENT] 💰 Starting payment calculation...
[HIRED_SEEKERS_API] ✅ Found 3 hired seekers
[PAYMENT] 📅 Payment window: { today: '2025-11-11', sevenDaysFromNow: '2025-11-18' }
[PAYMENT] Processing John Doe: { isWithinWindow: true }
[PAYMENT] ✅ Payment due for John: { salary: 150000 }
[PAYMENT] 🎉 Found 1 upcoming payments!
```

### No Payments Example:
```
[PAYMENT] 💰 Starting payment calculation...
[HIRED_SEEKERS_API] ✅ Found 3 hired seekers
[PAYMENT] 📅 Payment window: { today: '2025-11-11', sevenDaysFromNow: '2025-11-18' }
[PAYMENT] Processing John Doe: { isWithinWindow: false }
[PAYMENT] Processing Jane Smith: { isWithinWindow: false }
[PAYMENT] Processing Bob Johnson: { isWithinWindow: false }
[PAYMENT] 📊 Summary: { upcomingPayments: 0, outsidePaymentWindow: 3 }
[PAYMENT] ℹ️  No payments due in the next 7 days
```

### Error Example:
```
[HIRED_SEEKERS_API] ❌ Error response: Unauthorized
[PAYMENT] ❌ Failed to fetch hired seekers: Hired seekers API failed: 401
```

## Quick Fixes

### For Testing: Create a Test Hire
To see payments immediately, hire someone today:
1. Go to Hired Seekers page
2. Hire a job seeker TODAY
3. In job description, add: "Salary: 150000 RWF per month"
4. Wait a few minutes
5. Ask AI: "Show me upcoming payments"
6. You should see payment due in ~30 days

### For Immediate Testing: Adjust the Window
Temporarily change the 7-day window to 30 days:

In `hiredSeekers.service.js`, change:
```javascript
sevenDaysFromNow.setDate(today.getDate() + 7);
```
To:
```javascript
sevenDaysFromNow.setDate(today.getDate() + 30);
```

## Getting Help

If you're still stuck:
1. Copy backend console logs
2. Copy test endpoint response
3. Note: Number of hired seekers in system
4. Note: Sample hire dates
5. Contact technical support with this information

---

**Remember:** The system shows payments due in the NEXT 7 DAYS. If all your hired seekers were hired more than a week ago or their next payment is more than a week away, you won't see any upcoming payments!

