# Friends + Presence Integration Guide (Frontend)

This document explains how the frontend should integrate with the backend friendship and presence features:

- Add/remove friends
- Accept/reject requests
- Fetch friends list
- Show who is online/offline/in-game
- Receive live status updates via WebSocket

---

## 1) Feature Overview

There are two related systems:

1. **Friendship system** (`/api/friendship/...`)  
   Manages friend requests and accepted friendships in MongoDB.

2. **Presence system** (`/presence` Socket.IO namespace)  
   Tracks currently connected users in memory and broadcasts live changes.

Status values used by presence:

- `online`
- `in_game`
- `in_queue`
- `away`
- `offline`

---

## 2) Friendship APIs (REST)

Base path: `/api/friendship`

### Send Friend Request

- **POST** `/api/friendship/send-request`
- Body:

```json
{
  "requesterId": "USER_ID_A",
  "recipientId": "USER_ID_B"
}
```

### Accept Request

- **POST** `/api/friendship/accept/:friendshipId`
- Body:

```json
{
  "userId": "RECIPIENT_USER_ID"
}
```

### Reject Request

- **POST** `/api/friendship/reject/:friendshipId`
- Body:

```json
{
  "userId": "RECIPIENT_USER_ID"
}
```

### Remove Friend

- **DELETE** `/api/friendship/remove`
- Body:

```json
{
  "userId": "CURRENT_USER_ID",
  "friendId": "FRIEND_USER_ID"
}
```

### Block / Unblock

- **POST** `/api/friendship/block`
- **DELETE** `/api/friendship/unblock`

### Get Lists

- **GET** `/api/friendship/friends/:userId`
- **GET** `/api/friendship/pending-requests/:userId`
- **GET** `/api/friendship/sent-requests/:userId`
- **GET** `/api/friendship/blocked/:userId`
- **GET** `/api/friendship/status/:userId1/:userId2`
- **GET** `/api/friendship/are-friends/:userId1/:userId2`

---

## 3) Presence APIs (REST + Socket)

## REST (recommended for initial list bootstrap)

Use this endpoint to fetch accepted friends with computed presence:

- **GET** `/api/presence/friends/:userId`

Expected response:

```json
{
  "friends": [
    {
      "userId": "64f...",
      "nickname": "FrostByte",
      "email": "frost@example.com",
      "avatar": "https://...",
      "status": "online",
      "game": "valorant",
      "details": "ranked"
    }
  ]
}
```

If a friend is not connected, `status` should be `offline`.

## Socket.IO namespace for live updates

Namespace: `/presence`  
Auth token should be sent in `handshake.auth.token`.

Client connect example:

```ts
import { io } from "socket.io-client";

const socket = io(`${API_BASE_URL}/presence`, {
  auth: { token: accessToken },
  withCredentials: true
});
```

Server emits:

- `presence-ready` => initial sorted friends list after connect
- `friend-online` => when a friend connects
- `friend-offline` => when a friend disconnects
- `friend-status` => when a friend changes status

Client can emit:

- `update-status` with payload:

```json
{
  "status": "in_game",
  "game": "valorant",
  "details": "Competitive"
}
```

- `get-friends` (request latest friend presence snapshot)

---

## 4) Recommended Frontend Flow

### On app start (or social page open)

1. Call `GET /api/friendship/friends/:userId` for base friend relation list (optional).
2. Call `GET /api/presence/friends/:userId` for presence-aware list.
3. Connect socket namespace `/presence` with JWT token.
4. Use `presence-ready` payload to refresh local friends state.

### During runtime

- On `friend-online` / `friend-offline` / `friend-status`, patch local state immediately.
- If socket reconnects, call `get-friends` or wait for `presence-ready`.
- Use optimistic UI for request actions (send/accept/reject), then reconcile with REST response.

---

## 5) Data Model for Frontend Store

Suggested friend item:

```ts
type FriendStatus = "online" | "in_game" | "in_queue" | "away" | "offline";

type FriendItem = {
  userId: string;
  nickname: string;
  email: string;
  avatar?: string | null;
  status: FriendStatus;
  game?: string;
  details?: string;
};
```

Sort priority suggestion:

1. `in_game`
2. `in_queue`
3. `online`
4. `away`
5. `offline`

---

## 6) Error Handling Rules

- **409** on send request: already friends or pending request exists.
- **400** on bad payload or invalid state transition.
- **404** when friendship id does not exist.
- On socket auth failure, user will be disconnected from `/presence`.
- If socket is unavailable, fallback to periodic REST polling (`/api/presence/friends/:userId`).

---

## 7) Security Notes

- Current backend friendship endpoints may still accept raw `userId` in body/path for some routes.
- Production hardening should rely on JWT user identity from auth guard, not user-provided IDs.
- Frontend should still send authenticated token on every request/socket connection.

---

## 8) QA Checklist

- Send request A -> B appears in B pending list.
- Accept request from B updates both users friend lists.
- Presence changes when friend connects/disconnects.
- `update-status` broadcast reaches all online friends.
- Offline friends render correctly in list.
- Blocked users no longer appear as accepted friends.

---

## 9) Files Involved (Backend Reference)

- `src/friendship/friendship.controller.ts`
- `src/friendship/friendship.service.ts`
- `src/friendship/schemas/friendship.schema.ts`
- `src/presence/presence.service.ts`
- `src/presence/presence.gateway.ts`
- `src/presence/presence.controller.ts` (REST presence list)

