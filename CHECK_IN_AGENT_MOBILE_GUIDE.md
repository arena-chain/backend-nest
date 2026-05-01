# CHECK_IN_AGENT Mobile Integration Guide

This guide explains how to implement the new `CHECK_IN_AGENT` role on the mobile frontend for ticket scanning.

## 1) Role Overview

- New role value: `check_in_agent`
- Purpose: event entry agents who scan QR tickets at venue access points
- Access rights:
  - Can log in like normal users
  - Can call `POST /api/tickets/validate` (same as admin)
  - Cannot access admin-only business actions unless explicitly allowed elsewhere

## 2) Required Backend Behavior (already implemented)

- `CHECK_IN_AGENT` role is accepted by auth registration/login flow
- Scan endpoint is protected with JWT + Roles:
  - Allowed: `admin`, `check_in_agent`
- Scan response now includes:
  - `scanStatus: "CONFIRMED"` on first valid scan
  - `scanStatus: "USED"` on repeated scan (or non-usable state)

## 3) Mobile Login Flow

Use existing login endpoint:

- `POST /api/auth/login`
- Body:

```json
{
  "email": "agent@yourdomain.com",
  "password": "StrongPassword123!"
}
```

Expected success fields:

- `accessToken`
- `refreshToken`
- `user.role` should be `check_in_agent`

## 4) Guard Mobile Screen Access

On mobile startup (or after login), route users by role:

- `check_in_agent` -> Scan Screen
- `admin` -> Admin/Scan screen (if desired)
- other roles -> regular app flow

## 5) Ticket Scan API

Endpoint:

- `POST /api/tickets/validate`
- Header:
  - `Authorization: Bearer <accessToken>`
- Body:

```json
{
  "ticketNumber": "TKT-1714469440000-1234-0"
}
```

## 6) Response Handling (Important)

### A) First valid scan

```json
{
  "success": true,
  "message": "Ticket confirmed and access granted",
  "scanStatus": "CONFIRMED",
  "ticket": {
    "...": "..."
  }
}
```

UI behavior:

- Show green state: `Confirmed`
- Allow entry
- Optional sound/vibration success feedback

### B) Already scanned

```json
{
  "success": false,
  "message": "Ticket already used on 2026-04-30T10:00:00.000Z",
  "scanStatus": "USED",
  "ticket": {
    "...": "..."
  }
}
```

UI behavior:

- Show red/orange state: `Used`
- Deny entry
- Display timestamp if present

### C) Invalid/cancelled/expired

Typical result:

- `success: false`
- `scanStatus: "USED"` (non-confirmable state)
- message explains reason (`not found`, `cancelled`, `expired`)

UI behavior:

- Deny entry
- Show clear error reason to agent

## 7) Suggested Mobile UI States

Use 4 scan result cards:

- `CONFIRMED` -> green (`Access granted`)
- `USED` -> red (`Already used / Access denied`)
- `NOT_FOUND` -> red (`Ticket not found`) (derived from `message`)
- `NETWORK_ERROR` -> gray/orange (`Try again`)

Note: backend currently provides `scanStatus` values `CONFIRMED` and `USED`. For finer UI labels (`NOT_FOUND`, etc.), infer from `message`.

## 8) Recommended Scanner Flow

1. Scan QR
2. Parse ticket number from QR payload
3. Call `POST /api/tickets/validate`
4. Lock scan button while request is pending (avoid double requests)
5. Show full-screen result for 1-2 seconds
6. Auto-return to scanner

## 9) QR Payload Note

Current ticket QR generation stores JSON like:

```json
{
  "ticketNumber": "TKT-...",
  "tournament": "...",
  "user": "...",
  "type": "..."
}
```

On mobile, extract `ticketNumber` and send it to validate endpoint.

## 10) Security Checklist

- Always send JWT in `Authorization` header
- Never trust role only from local storage; trust backend response
- Handle `401/403` by forcing re-login
- Keep scan endpoint inaccessible in UI for non-agent roles

## 11) Quick Test Cases

1. Login with `check_in_agent` account -> open scanner
2. Scan a fresh valid ticket -> `CONFIRMED`, access granted
3. Scan same ticket again -> `USED`, access denied
4. Scan random number -> `success: false`
5. Login with `player` and call validate endpoint -> `403 Forbidden`

