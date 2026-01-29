# Score Based System Documentation

## Overview
This document provides a comprehensive guide to the Score Based System, including database schema, API routes, controllers, and cron jobs.

---

## 1. Database Schema

### UserScore (MongoDB Example)
```
{
  _id: ObjectId,
  userId: ObjectId, // Reference to User
  score: Number,    // Current score
  updatedAt: Date,  // Last updated timestamp
  createdAt: Date   // Created timestamp
}
```

#### Indexes
- `userId` (unique)
- `score` (for range queries)

---

## 2. API Routes

### Admin Routes
| Method | Endpoint                  | Description                |
|--------|---------------------------|----------------------------|
| GET    | /admin/score/:userId      | Get user score             |
| POST   | /admin/score/update       | Update user score          |
| GET    | /admin/score/leaderboard  | Get top users by score     |

### User Routes
| Method | Endpoint                  | Description                |
|--------|---------------------------|----------------------------|
| GET    | /user/score               | Get own score              |

---


## 3. Controllers & Logic (Detailed)

### AdminScoreController

#### `getUserScore(req, res)`
- Fetches a user's current score by userId.
- Handles 404 if user not found.
- Returns `{ userId, score }`.

#### `updateUserScore(req, res)`
- Allows admin to credit or debit a user's score.
- Validates input: userId, action (credit/debit), amount (must be positive).
- Prevents score from going below zero.
- Logs every change in `ScoreHistory` with type `ADMIN_BONUS`.
- Returns updated score.
- Handles errors: invalid user, invalid amount, insufficient score, DB errors.

#### `getLeaderboard(req, res)`
- Returns top users sorted by score (descending).
- Supports pagination and filtering if needed.

### UserScoreController

#### `getOwnScore(req, res)`
- Returns the authenticated user's score.

### Example: Admin Score Operation Controller (Node.js/Express)
```js
// POST /admin/users/operate-score
exports.operateScore = async (req, res) => {
  try {
    const { userId, action, amount, message } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
    if (!['credit', 'debit'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });
    const user = await FemaleUser.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const updatedScore = action === 'credit' ? (user.score || 0) + numericAmount : (user.score || 0) - numericAmount;
    if (updatedScore < 0) return res.status(400).json({ success: false, message: 'Insufficient score' });
    user.score = updatedScore;
    await user.save();
    // Log to ScoreHistory
    await ScoreHistory.create({
      femaleUserId: user._id,
      activityType: 'ADMIN_BONUS',
      scoreAdded: action === 'credit' ? numericAmount : -numericAmount,
      referenceDate: new Date(),
      addedBy: 'ADMIN',
      comment: message || (action === 'credit' ? 'Admin credited score' : 'Admin debited score'),
      createdAt: new Date()
    });
    return res.json({ success: true, data: { userId: user._id, score: updatedScore } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
```

---

## 4. Score Calculation & Business Logic

- **Score Sources:**
  - Admin manual adjustment (credit/debit)
  - Rule-based events (login, online hours, call completed, weekly consistency, etc.)
  - User activity (chat, calls, achievements)

- **Score Calculation Example (Rule-Based):**
  - Each rule has a type, value, and eligibility condition.
  - Only one score per rule per user per day (duplicate protection).
  - Example: If user logs in, and the rule for login is active, add score if not already given today.

```js
// Rule eligibility and application (simplified)
const isRuleEligible = (user, rule, meta) => {
  switch (rule.activityType) {
    case 'LOGIN': return true;
    case 'ONLINE_HOURS': return (meta.onlineMinutes || 0) >= (rule.minMinutes || 0);
    case 'CALL_COMPLETED': return (meta.callsCompleted || 0) >= (rule.minCalls || 0);
    case 'WEEKLY_CONSISTENCY': return (user.consecutiveActiveDays || 0) >= 7;
    default: return false;
  }
};
```

- **Score Application:**
  - Updates `score`, `dailyScore`, `weeklyScore` fields.
  - Updates `lastActiveDate`.
  - Logs to `ScoreHistory` with rule reference.

---

## 5. Score History & Auditing

- Every score change is logged in `ScoreHistory`:
  - `userId`, `activityType`, `scoreAdded`, `addedBy`, `referenceDate`, `comment`, `createdAt`
- Used for audit, rollback, and analytics.
- Admin actions are always logged as `ADMIN_BONUS`.
- Rule-based actions are logged with the rule type.

---

## 6. Edge Cases & Validation

- Prevent negative scores (cannot go below zero).
- Prevent duplicate rule-based score for same user/rule/day.
- Validate all inputs (userId, amount, action).
- Handle user not found, DB errors, and invalid requests.
- Rate limit admin/manual operations for security.

---

## 7. Score Events & Notifications

- Optionally notify users on significant score changes (e.g., bonus, penalty).
- Use in-app notifications or push notifications.

---

## 8. Cron Jobs (Expanded)

- **Score Decay:** Periodically decrease scores for inactivity.
- **Score Recalculation:** Recompute scores based on new rules or corrections.
- **Daily/Weekly Reset:** Reset daily/weekly scores, aggregate as needed.

Example:
```js
// src/jobs/scoreCronJobs.js
async function dailyScoreResetAndWeeklyAggregation() {
  const today = new Date();
  const isMonday = today.getDay() === 1;
  await FemaleUser.updateMany({}, { $set: { dailyScore: 0 } });
  if (isMonday) {
    await FemaleUser.updateMany({}, { $set: { weeklyScore: 0, consecutiveActiveDays: 0 } });
  }
}
```

---

## 9. Security & Best Practices

- All admin routes must be authenticated and permission-checked.
- Validate all inputs and sanitize data.
- Log all admin actions for audit.
- Use transactions for critical score updates if supported by DB.
- Monitor for suspicious activity (e.g., rapid score changes).

---

## 10. Testing & Troubleshooting

- Test cases:
  - Credit/debit score, check response and DB.
  - Prevent negative scores.
  - Audit log creation.
  - Duplicate rule prevention.
  - Error handling for invalid input/user.
- Troubleshoot by checking logs, DB, and ScoreHistory.

---

## 11. Example ScoreHistory Schema
```js
{
  _id: ObjectId,
  femaleUserId: ObjectId,
  activityType: String, // e.g., 'ADMIN_BONUS', 'LOGIN', etc.
  scoreAdded: Number,
  ruleId: ObjectId, // Optional, for rule-based
  referenceDate: Date,
  addedBy: String, // 'ADMIN' or 'SYSTEM'
  comment: String,
  createdAt: Date
}
```

---

---

## 4. Cron Jobs

### Score Decay Job
- **Purpose:** Decrease user scores periodically (e.g., daily/weekly) for inactivity or other business logic.
- **Location:** `src/cron/scoreDecayJob.js`
- **Example:**
  ```js
  // src/cron/scoreDecayJob.js
  const UserScore = require('../models/UserScore');
  module.exports = async function scoreDecayJob() {
    await UserScore.updateMany({}, { $inc: { score: -1 } });
  };
  ```

### Score Recalculation Job
- **Purpose:** Recalculate scores based on user activity, achievements, etc.
- **Location:** `src/cron/scoreRecalculationJob.js`
- **Example:**
  ```js
  // src/cron/scoreRecalculationJob.js
  const UserScore = require('../models/UserScore');
  module.exports = async function recalculateScores() {
    // Custom logic to recalculate scores
  };
  ```

---

## 5. Example Usage

### Get User Score (Admin)
```
GET /admin/score/:userId
Response: { userId, score }
```

### Update User Score (Admin)
```
POST /admin/score/update
Body: { userId, score }
Response: { success: true }
```

### Get Leaderboard
```
GET /admin/score/leaderboard
Response: [ { userId, score }, ... ]
```

---

## 6. Notes
- Ensure proper validation and authentication on all routes.
- Cron jobs should be scheduled using a job scheduler (e.g., node-cron, Agenda).
- Adjust score decay/recalculation logic as per business requirements.
