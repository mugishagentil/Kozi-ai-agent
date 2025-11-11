# Admin Guide: Checking Upcoming Salary Payments

## Quick Start

The AI admin assistant can now automatically check and report upcoming salary payments for hired employees!

## How to Use

### Ask the AI Assistant

Simply open the admin AI chat and ask questions like:

1. **"Show me upcoming salary payments"**
2. **"What payments are due this week?"**
3. **"Upcoming payments"**
4. **"List salary schedules"**

### What You'll Get

The AI will show you:
- Employee names (hired job seekers)
- Employer/provider names
- Payment amounts (in RWF)
- Due dates
- Payment status

### Example Response

```
💰 Upcoming Salary Payments

1. **Jane Doe** (ABC Company)
   Amount: 150000 RWF
   Due: 11/15/2025
   Status: pending

2. **John Smith** (XYZ Services)
   Amount: 200000 RWF
   Due: 11/18/2025
   Status: pending

Would you like me to generate a payment report or send notifications?
```

## How It Works

The system:
1. ✅ Fetches all hired employees from the Kozi API
2. ✅ Calculates when their next monthly salary payment is due
3. ✅ Shows only payments due within the next 7 days
4. ✅ Extracts salary amounts from job descriptions
5. ✅ Sorts by due date (earliest first)

## Important Notes

### Payment Schedule
- **Frequency**: Monthly payments
- **Date**: Same day of the month as hire date
- **Window**: Shows payments due in next 7 days only

### Salary Information
For the system to show accurate amounts, make sure job descriptions include salary in formats like:
- "Salary: 150000"
- "150000 RWF per month"
- "Monthly: 150,000 RWF"

If salary isn't found in the description, it will show as 0.

## Testing the Feature

### Before You Start
1. Ensure you have hired employees in the system
2. Check that hire dates are set correctly
3. Verify job descriptions include salary information

### Try These Queries
- "Show upcoming payments"
- "What salaries are due?"
- "List payment schedules"
- "Check salary payments"

### No Payments Showing?
- No employees were hired, OR
- No payments are due within the next 7 days, OR
- The external API is not returning data

## Benefits

✨ **Proactive Management**: Never miss a salary payment deadline
📊 **Quick Overview**: See all upcoming payments at a glance
💬 **Natural Language**: Just ask in plain English
🤖 **Automated**: No manual checking required
⚡ **Real-time**: Always up-to-date with latest hires

## Need Help?

If you encounter issues:
1. Check that the backend server is running
2. Verify your admin token is valid
3. Ensure the external Kozi API is accessible
4. Contact technical support if problems persist

---

**Tip**: You can also ask the AI to generate payment reports or send notifications to employers!

