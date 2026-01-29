# Admin Manual Score Adjustment API Testing

This document explains how an admin can manually add or deduct score for a female user, and provides ready-to-use API test cases.

---

## 1. API Endpoint

```
POST /admin/users/operate-score
```

**Headers:**
- `Authorization: Bearer <ADMIN_TOKEN>`
- `Content-Type: application/json`

---

## 2. Request Body

| Field    | Type   | Required | Description                       |
|----------|--------|----------|-----------------------------------|
| userId   | string | Yes      | Female user's MongoDB ObjectId    |
| action   | string | Yes      | 'credit' or 'debit'               |
| amount   | number | Yes      | Score to add or subtract          |
| message  | string | No       | Reason/comment for audit trail    |

**Example:**

```
{
  "userId": "60f7c2b5e1a2b34d2c123456",
  "action": "credit",
  "amount": 10,
  "message": "Manual bonus for contest winner"
}
```

---

## 3. Sample cURL

```
curl -X POST \
  '{{BASE_URL}}/admin/users/operate-score' \
  -H 'Authorization: Bearer <ADMIN_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "60f7c2b5e1a2b34d2c123456",
    "action": "credit",
    "amount": 10,
    "message": "Manual bonus for contest winner"
  }'
```

---

## 4. Expected Response

```
{
  "success": true,
  "data": {
    "userId": "60f7c2b5e1a2b34d2c123456",
    "score": 110
  }
}
```

---

## 5. Test Cases

- [ ] **Credit score:** Admin adds score, response reflects new total.
- [ ] **Debit score:** Admin deducts score, response reflects new total (cannot go below 0).
- [ ] **Audit log:** Each action is logged in `ScoreHistory` with `ADMIN_BONUS` type.
- [ ] **Invalid user:** Returns 404 if user not found.
- [ ] **Negative/invalid amount:** Returns 400 error.

---

## 6. Troubleshooting

- If score does not update, check backend logs and DB for errors.
- If audit log missing, check `ScoreHistory` collection.
- If API returns 401/403, check admin token and permissions.

---

**Note:**
- Replace `{{BASE_URL}}` and `{{ADMIN_TOKEN}}` with your actual values.
- This API is for admin use only and should be protected.
