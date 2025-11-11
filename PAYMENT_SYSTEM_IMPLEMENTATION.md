# Payment System Implementation for Hired Employees

## Overview
This implementation adds automatic salary payment tracking for hired job seekers. The AI admin assistant can now check upcoming salary payments and notify administrators.

## What Was Implemented

### 1. Hired Seekers Service (`backend/src/services/hiredSeekers.service.js`)
A new service that:
- Fetches hired job seekers from the external Kozi API (`https://apis.kozi.rw/admin/hired_seekers`)
- Calculates monthly payment schedules based on hire dates
- Extracts salary information from job descriptions
- Filters for payments due within the next 7 days
- Returns formatted payment data

**Key Functions:**
- `fetchHiredSeekersFromAPI(apiToken)` - Fetches hired seekers data
- `getUpcomingPayments(apiToken)` - Calculates and returns upcoming payments
- `calculateNextPaymentDate(hireDate, today)` - Calculates next monthly payment date
- `extractSalaryFromDescription(description)` - Extracts salary from job description text

### 2. Admin Routes Update (`backend/src/routes/admin.route.js`)
Added new endpoint:
```
GET /api/admin/hired_seekers/upcoming_payments
```

**Features:**
- Accepts Bearer token authentication
- Returns upcoming salary payments in the next 7 days
- Swagger/OpenAPI documentation included

### 3. Payment Service Integration (`backend/src/services/payment.service.js`)
Updated to use the local hired seekers service instead of trying to call a non-existent external endpoint.

## How It Works

### Payment Calculation Logic
1. **Fetch Hired Seekers**: Retrieves all hired employees from external API
2. **Parse Hire Date**: Extracts the date when each employee was hired
3. **Calculate Next Payment**: Assumes monthly payments on the same day of each month
4. **Extract Salary**: Looks for salary patterns in job description:
   - "salary: 150000"
   - "150000 RWF"
   - "150,000 per month"
5. **Filter Upcoming**: Only includes payments due in next 7 days
6. **Sort**: Orders by payment date (earliest first)

### Data Flow
```
Admin asks AI: "Show me upcoming payments"
    ↓
Admin Service (handlePayment)
    ↓
Payment Service (listUpcomingPayments)
    ↓
Hired Seekers Service (getUpcomingPayments)
    ↓
External Kozi API (/admin/hired_seekers)
    ↓
Calculate payment schedules
    ↓
Return to AI Agent
    ↓
Display to Admin
```

## API Response Format

### Request
```http
GET /api/admin/hired_seekers/upcoming_payments
Authorization: Bearer {token}
```

### Response
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 123,
      "amount": 150000,
      "next_payment_date": "2025-11-15T00:00:00.000Z",
      "status": "pending",
      "employer_name": "John Provider",
      "job_seeker_first_name": "Jane",
      "job_seeker_last_name": "Seeker",
      "employer": {
        "company_name": "John Provider",
        "first_name": "John",
        "last_name": "Provider",
        "email": null
      },
      "job_seeker": {
        "first_name": "Jane",
        "last_name": "Seeker",
        "email": null
      },
      "when_need_worker": "Immediately",
      "working_mode": "Full-time",
      "accommodation_preference": "Live-in",
      "hire_date": "2025-10-15T00:00:00.000Z"
    }
  ]
}
```

## How to Test

### 1. Start the Backend Server
```bash
cd backend
npm install
npm start
```

### 2. Test via AI Admin Chat
Ask the AI assistant:
- "Show me upcoming salary payments"
- "Upcoming payments"
- "List upcoming salaries"

### 3. Test Direct API Call
```bash
# Replace {token} with your admin token
curl -X GET http://localhost:5050/api/admin/hired_seekers/upcoming_payments \
  -H "Authorization: Bearer {token}"
```

### 4. Expected Behavior
- **If hired employees exist with upcoming payments**: Shows list with details
- **If no hired employees**: Returns "No Upcoming Payments" message
- **If external API fails**: Falls back to local database (if payment table has data)

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
# External Kozi API base URL
JOBSEEKERS_API_BASE=https://apis.kozi.rw

# API Token for authentication
API_TOKEN=your_api_token_here
```

## AI Agent Integration

The AI admin assistant automatically:
1. Detects payment-related queries using intent analysis
2. Calls the payment service to fetch upcoming payments
3. Formats the response in a user-friendly way
4. Suggests next actions (generate report, send notifications)

### Example AI Conversation
```
Admin: Show me upcoming salary payments

AI: 💰 Upcoming Salary Payments

1. **Jane Seeker** (John Provider)
   Amount: 150000 RWF
   Due: 11/15/2025
   Status: pending

2. **Bob Worker** (Alice Employer)
   Amount: 200000 RWF
   Due: 11/18/2025
   Status: pending

Would you like me to generate a payment report or send notifications?
```

## Important Notes

### Salary Extraction
The system tries to extract salary from the job description. For best results, ensure job descriptions include salary in these formats:
- "Salary: 150000"
- "150000 RWF per month"
- "Monthly payment: 150,000"

If no salary is found, the amount will be 0.

### Payment Schedule Assumptions
- **Monthly Payments**: Assumes employees are paid monthly on the same day they were hired
- **7-Day Window**: Only shows payments due within the next 7 days
- **Timezone**: Uses server timezone for date calculations

### Customization
To adjust payment logic:
- **Change payment frequency**: Modify `calculateNextPaymentDate()` in `hiredSeekers.service.js`
- **Change time window**: Modify the filter in `getUpcomingPayments()`
- **Add custom salary logic**: Update `extractSalaryFromDescription()`

## Future Enhancements

Potential improvements:
1. **Configurable Payment Frequency**: Support weekly, bi-weekly, monthly schedules
2. **Email Notifications**: Auto-send payment reminders 2 days before due date
3. **Payment History**: Track completed payments
4. **Multiple Salaries**: Handle different payment amounts for the same employee
5. **Payment Status Updates**: Allow marking payments as completed via AI
6. **Integration with Payment Providers**: Automate actual payment processing

## Troubleshooting

### No payments showing up?
1. Check if hired seekers exist in the external API
2. Verify hire dates are within payment window
3. Ensure job descriptions contain salary information
4. Check API token is valid

### AI not responding to payment queries?
1. Check backend logs for errors
2. Verify intent detection is working (should show "PAYMENT" intent)
3. Test the endpoint directly to ensure it returns data

### External API errors?
1. Verify `JOBSEEKERS_API_BASE` environment variable
2. Check API token validity
3. Ensure external API is accessible
4. System will fallback to local database if external API fails

