# Testing Guide: Employer Category Filtering

## Quick Test Cases

### Test 1: Marketing Request ✅

**User Message:**
```
I need a person who can do marketing
```

**Expected Behavior:**
- ✅ Extracts: `categoryName: "Marketing Specialist"`
- ✅ Searches ONLY in Marketing Specialist category
- ✅ Returns 3-10 marketing professionals
- ❌ Should NOT show drivers, chefs, cleaners, etc.

**Check Logs:**
```
[EmployerAgent] 🔍 Extracted filters: { role: 'marketing', categoryName: 'Marketing Specialist', categoryId: X }
[EmployerAgent] 🎯 Searching in specific category: Marketing Specialist (ID: X)
[EmployerAgent] ✅ Found X candidates in Marketing Specialist category
```

---

### Test 2: Driver in Kigali ✅

**User Message:**
```
Find me a driver in Kigali
```

**Expected Behavior:**
- ✅ Extracts: `categoryName: "Driver"`, `location: "Kigali"`
- ✅ Returns only drivers in Kigali area
- ❌ Should NOT show drivers from other locations

**Check Logs:**
```
[EmployerAgent] 🔍 Extracted filters: { role: 'driver', categoryName: 'Driver', location: 'Kigali' }
```

---

### Test 3: Sales Full-Time ✅

**User Message:**
```
I need someone for sales full-time
```

**Expected Behavior:**
- ✅ Extracts: `categoryName: "Salesperson"`, `employmentType: "full-time"`
- ✅ Returns only sales professionals
- ✅ Filters for full-time availability

---

### Test 4: Chef/Cook ✅

**User Message:**
```
I need a chef
```
or
```
Looking for a cook
```

**Expected Behavior:**
- ✅ Extracts: `categoryName: "Chef"`
- ✅ Returns only chefs/cooks
- ❌ Should NOT show other hospitality workers

---

### Test 5: Multiple Criteria ✅

**User Message:**
```
I need a marketing specialist in Kigali with experience, full-time
```

**Expected Behavior:**
- ✅ Extracts all filters:
  - `role: "marketing specialist"`
  - `categoryName: "Marketing Specialist"`
  - `location: "Kigali"`
  - `employmentType: "full-time"`
- ✅ Returns highly filtered results (1-5 candidates)

---

## How to Test

### 1. Start Backend with Logs
```bash
cd backend
npm start
```

### 2. Open Employer Dashboard
- Login as employer
- Open AI assistant chat

### 3. Test Each Case
- Send test message
- Watch backend console for logs
- Check candidate cards returned

### 4. Verify Results

**Good Signs ✅:**
- Specific category detected in logs
- Candidate count is reasonable (3-10)
- All returned candidates match the requested category
- Candidate cards show relevant roles

**Bad Signs ❌:**
- No category detected (`categoryName: null`)
- Too many candidates (20+)
- Candidates from unrelated categories shown
- Log shows "searching ALL categories"

---

## Expected Log Flow

```
1. User sends: "I need a person who can do marketing"

2. [EmployerAgent] shouldHandleQuery: true

3. [EmployerAgent] 🔍 Extracted filters: {
     role: 'marketing',
     categoryName: 'Marketing Specialist',
     categoryId: 5,
     location: null,
     employmentType: null
   }

4. [EmployerAgent] 🎯 Searching in specific category: Marketing Specialist (ID: 5)

5. [EmployerAgent] ✅ Found 8 candidates in Marketing Specialist category

6. [EmployerAgent] 📊 After filtering: 5 candidates match criteria

7. AI Response: "Great news! I found 5 marketing professionals..."
   [Shows 5 candidate cards - all marketing specialists]
```

---

## Troubleshooting

### Problem: Still showing all candidates

**Symptoms:**
- Returns 20+ candidates
- Includes unrelated job types
- Logs show `categoryName: null`

**Solutions:**
1. Check category names in your database
2. Verify they match the mappings in the prompt
3. Add more keyword variations if needed

---

### Problem: No candidates returned

**Symptoms:**
- Returns 0 candidates
- Category is detected correctly
- Log shows `Found 0 candidates in X category`

**Solutions:**
1. Check if candidates exist in that category in database
2. Verify the category API endpoint is working
3. Check if additional filters (location, type) are too restrictive

---

### Problem: Wrong category detected

**Symptoms:**
- User asks for "sales" but gets "Marketing Specialist"
- Category mapping is incorrect

**Solutions:**
1. Add/update keyword mappings in the prompt
2. Use more specific keywords
3. Check available category names in database

---

## Quick Checklist

Before considering test successful:

- [ ] Backend server is running
- [ ] Can see logs in console
- [ ] Employer is logged in
- [ ] AI chat is open
- [ ] Sent test message
- [ ] Category detected in logs (🔍)
- [ ] Specific category search started (🎯)
- [ ] Candidates found (✅)
- [ ] Correct number of candidates returned
- [ ] All candidates match requested category
- [ ] Can see candidate cards in UI

---

## Example Test Session

```bash
# Terminal 1: Backend
cd backend
npm start
# Watch logs...

# Browser: Employer Dashboard -> AI Chat
User: "I need a person who can do marketing"

# Terminal 1: Should see
[EmployerAgent] 🔍 Extracted filters: { role: 'marketing', categoryName: 'Marketing Specialist', categoryId: 5 }
[EmployerAgent] 🎯 Searching in specific category: Marketing Specialist (ID: 5)
[EmployerAgent] ✅ Found 6 candidates in Marketing Specialist category
[EmployerAgent] 📊 After filtering: 6 candidates match criteria

# Browser: Should see
"Great news! I found 6 marketing professionals..."
[6 candidate cards - all marketing specialists]
```

---

## Additional Test Cases

### Edge Cases

**Vague Request:**
```
User: "I need someone to work"
Expected: Asks for clarification OR searches all categories
```

**Multiple Skills:**
```
User: "I need someone for marketing and sales"
Expected: Prioritizes primary skill (marketing), may include both
```

**Uncommon Category:**
```
User: "I need a graphic designer"
Expected: Maps to closest category (IT Specialist or Marketing Specialist)
```

---

## Success Criteria

✅ Test is successful when:
1. Specific category is detected (check logs)
2. Search is limited to that category
3. Returns 3-10 relevant candidates (not 20+)
4. All returned candidates match the requested job type
5. No unrelated candidates are shown

❌ Test fails when:
1. No category detected
2. Searches ALL categories
3. Returns 20+ candidates
4. Includes unrelated job types
5. Error in logs or UI

---

**Last Updated**: November 2025  
**Status**: Ready for Testing









