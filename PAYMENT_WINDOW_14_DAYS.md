# Payment Window Changed to 14 Days

## ✅ Change Applied

The payment reminder window has been updated from **7 days** to **14 days**.

## What Changed

### Before:
- Showed payments due within the next **7 days**
- Header: "Upcoming Salary Payments (Next 7 Days)"

### After:
- Shows payments due within the next **14 days**
- Header: "Upcoming Salary Payments (Next 14 Days)"

## Files Updated

1. **`backend/src/services/payment.service.js`**
   - Line 87-88: Changed `sevenDaysFromNow` → `fourteenDaysFromNow`
   - Line 88: Changed `+7` → `+14` days
   - Line 110: Updated window check to use 14 days
   - Line 151: Updated log message "within 7 days" → "within 14 days"
   - Line 168: Updated success message
   - Lines 176-184: Updated fallback messages

2. **`backend/src/services/chat/admin.service.js`**
   - Line 964: Changed window check from '7 days' → '14 days'
   - Line 969: Updated display message check

## Test It Now

### Step 1: Restart Backend
```bash
cd backend
npm start
```

### Step 2: Ask for Payments
In admin chat, ask:
```
"Show me upcoming payments"
```

### Expected Result

You should now see payments due within the next **14 days** instead of 7:

```
💰 **Upcoming Salary Payments** (Next 14 Days)

1. **UWINEZA Joselyne** (Kamikazi Martha)
   📅 Due Date: 11/17/2025 (in 5 days)
   ...

2. **NTAWUBIZERA Frere** (Employer Name)
   📅 Due Date: 11/20/2025 (in 9 days)
   ...

Summary:
• Total Payments: 2  ← Now showing more payments!
• Total Salary Amount: XXX,XXX RWF
• Total Kozi Commission: XX,XXX RWF
```

## Backend Console Logs

You'll see:
```
[PAYMENT] 📅 Payment window: { 
  today: '2025-11-12', 
  fourteenDaysFromNow: '2025-11-26'  ← 14 days from now
}
[PAYMENT] ✅ Payment due within 14 days for UWINEZA Joselyne
[PAYMENT] ✅ Payment due within 14 days for NTAWUBIZERA Frere
[PAYMENT] 🎉 Found 2 payments due within 14 days!
```

## Benefits

✅ **More visibility** - See payments 2 weeks ahead  
✅ **Better planning** - More time to prepare  
✅ **Catch more payments** - Won't miss payments that fall in days 8-14  

## Customization

If you want to change it to a different number of days (e.g., 30 days):

In `backend/src/services/payment.service.js`, line 88:
```javascript
fourteenDaysFromNow.setDate(today.getDate() + 30); // Change to any number
```

Don't forget to update the messages to match!

---

**Status:** ✅ Ready to use - restart backend and test!  
**Updated:** November 12, 2025










