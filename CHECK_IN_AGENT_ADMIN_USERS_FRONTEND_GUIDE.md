# CHECK_IN_AGENT Frontend Guide (Admin `/admin/users`)

This guide explains how to implement **check-in agent creation** inside your Admin Users page (`/admin/users`) so admins can create agents who will log in on mobile and scan tickets.

## Goal

From Admin dashboard:

1. Admin opens **Users** page
2. Clicks **Add New User**
3. Chooses role `CHECK_IN_AGENT`
4. Submits form
5. New agent account is created
6. Agent logs in on mobile and starts scanning tickets

---

## Backend endpoint to use

Use this endpoint for admin creation:

- `POST /api/admin/check-in-agents`
- Auth required: `Bearer <admin-jwt>`
- Role required: `admin`

### Request body

```json
{
  "email": "checkin.agent@arena.test",
  "nickname": "Gate Agent 01",
  "password": "StrongPassword123!",
  "region": "EUROPE",
  "country": "TUNISIA"
}
```

### Response (success)

```json
{
  "id": "680fd7....",
  "email": "checkin.agent@arena.test",
  "nickname": "Gate Agent 01",
  "role": "check_in_agent",
  "region": "EUROPE",
  "country": "TUNISIA",
  "isEmailVerified": true,
  "isActive": true
}
```

---

## Frontend changes in `/admin/users`

## 1) Add role option in Add User modal

In your role dropdown/radio, add:

- label: `Check-in Agent`
- value: `check_in_agent`

---

## 2) Route submit logic by selected role

In your Add User submit handler:

- If role is `check_in_agent` -> call `POST /api/admin/check-in-agents`
- Else keep existing logic for other roles

Pseudo-code:

```ts
if (form.role === 'check_in_agent') {
  await api.post('/api/admin/check-in-agents', {
    email: form.email,
    nickname: form.nickname,
    password: form.password,
    region: form.region || undefined,
    country: form.country || undefined,
  }, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
} else {
  // existing create-user flow
}
```

---

## 3) Validation rules (UI)

For `check_in_agent` role:

- `email` required + valid format
- `nickname` required
- `password` required (min 8 chars)
- `region/country` optional (or required if your UX requires)

Show backend error message when available (`message` field).

---

## 4) Users table display

When listing users:

- Render role badge for `check_in_agent` (example color: cyan/orange)
- Add role filter option: **Check-in Agents**

Display text recommendation:

- UI label: `CHECK-IN AGENT`
- Raw value (API): `check_in_agent`

---

## 5) Success UX

After creating agent:

- Show toast: `Check-in agent created successfully`
- Close modal
- Refresh users list
- Optional: show quick copy credentials warning to admin

Security recommendation:

- Tell admin to share credentials securely and force password reset policy later if needed.

---

## 6) Mobile handoff

Created check-in agents can now:

1. Login from mobile app using created email/password
2. Scan ticket QR
3. Backend returns:
   - `scanStatus: "CONFIRMED"` on first valid scan
   - `scanStatus: "USED"` on repeated scan / denied entry

---

## 7) Error handling map

- `401` -> token expired, force relogin
- `403` -> user is not admin
- `409/400` -> duplicate/invalid data (show backend message)
- network error -> show retry CTA

---

## 8) Quick QA checklist

1. Admin can see `Check-in Agent` role in Add User modal
2. Creating agent calls `/api/admin/check-in-agents` (not generic endpoint)
3. New user appears in `/admin/users` table with role `check_in_agent`
4. Role filter shows new user
5. Agent can login on mobile
6. Agent can scan tickets
7. First scan -> `CONFIRMED`, second scan -> `USED`

