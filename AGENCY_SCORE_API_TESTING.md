# Agency Panel Female Score API Testing

This document provides sample test cases and payloads for verifying the agency panel API that returns female user scores, earnings, and online hours.

---

## 1. API Endpoint

```
GET /agency/earnings
```

**Headers:**
- `Authorization: Bearer <AGENCY_TOKEN>`

**Query Parameters:**
- (Optional) `range` — e.g., `2026-01-12 to 2026-01-19`

---

## 2. Sample Request (Postman/cURL)

### Postman Example

- **Method:** GET
- **URL:** `{{BASE_URL}}/agency/earnings`
- **Headers:**
  - `Authorization: Bearer {{AGENCY_TOKEN}}`

### cURL Example

```
curl -X GET \
  '{{BASE_URL}}/agency/earnings' \
  -H 'Authorization: Bearer <AGENCY_TOKEN>'
```

---

## 3. Expected JSON Response

```
{
  "success": true,
  "range": "2026-01-12 to 2026-01-19",
  "results": [
    {
      "femaleId": "...",
      "name": "Female B",
      "thumbnail": "https://...jpg",
      "score": 123,           // <--- NEW: Score field should be present
      "earningCoins": 0,
      "timeHours": 0
    },
    // ...more females
  ]
}
```

---

## 4. Test Cases

### ✅ 1. Score Field Present
- [ ] Each female in `results` has a `score` field (number, >= 0)

### ✅ 2. Score Updates After Admin Action
- [ ] After admin uses `/admin/users/operate-score` to credit/debit, the new score is reflected in this API

### ✅ 3. Score Updates After Rule-Based Event
- [ ] After a rule-based event (e.g., login, online), the score increases as per rules and is reflected here

### ✅ 4. No Duplicate Score for Same Rule/Day
- [ ] Trigger the same rule twice in a day; score should only increase once

### ✅ 5. Score, Earnings, and Time All Present
- [ ] Each female result includes `score`, `earningCoins`, and `timeHours`

---

## 5. Troubleshooting
- If `score` is missing, check backend API and DB for correct field population.
- If score does not update, verify rule logic and event triggers.
- If duplicate scores, check idempotency logic in `ScoreHistory` and rule evaluation.

---

**Note:**
- Replace `{{BASE_URL}}` and `{{AGENCY_TOKEN}}` with your actual values.
- This document is for QA and developer testing of the agency panel score integration.
