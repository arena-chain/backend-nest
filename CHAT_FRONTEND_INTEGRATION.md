# Chat & group chat — frontend integration guide

This document matches the NestJS **Chat** module: `ChatService`, `ChatController`, `GroupChatController`, and `ChatGateway` (Socket.IO).

## Base URL and auth

| Item | Value |
|------|--------|
| HTTP API prefix | `/api` (e.g. `https://your-host/api/chat/inbox`) |
| WebSocket | Same host as the API; namespace **`/chat`** (Socket.IO path is usually default `/socket.io/`) |
| REST auth | Header `Authorization: Bearer <JWT>` on guarded routes |
| Socket auth | Pass the JWT in the handshake: `auth: { token: '<JWT>' }` or `auth: { token: 'Bearer <JWT>' }` (both are accepted) |

If the socket connects without a valid token, the server **disconnects** the client immediately.

---

## REST — private chat (`ChatController`)

All routes below are under **`/api/chat`**. Routes marked **JWT** require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/inbox` | JWT | List private DM threads: last message, date, unread count, interlocutor profile. |
| `GET` | `/conversation/:userId` | JWT | Paginated-ish history with `otherUserId` (default limit **50** in service). |
| `POST` | `/send` | JWT | Send a private message (also consider WebSocket — see below). |
| `PATCH` | `/read/:userId` | JWT | Mark messages **from** `userId` **to** the current user as read. |
| `DELETE` | `/conversation/:userId` | JWT | Delete all DM messages between the current user and `userId`. |
| `POST` | `/user/:userId` | **No JWT in controller** | Channel message as that `userId` (intended for trusted/internal use; prefer gateway + JWT for real apps). |
| `POST` | `/anonymous` | **No JWT** | Guest channel message: body must include `CreateChatDto` fields + `guestNickname`. |
| `GET` | `/channel/:channelId` | **No JWT** | Fetch channel/group message history. Query: `?limit=` (1–100, default 50). |

### Request bodies

**`POST /api/chat/send`** (JWT)

```json
{
  "receiverId": "<Mongo ObjectId string>",
  "message": "Hello"
}
```

**`POST /api/chat/anonymous`**

```json
{
  "channelId": "<channel or group id>",
  "message": "Hello from guest",
  "guestNickname": "GuestName"
}
```

**`POST /api/chat/user/:userId`** (body)

Same shape as `CreateChatDto`:

```json
{
  "channelId": "<id>",
  "message": "text"
}
```

### Typical DM REST flow

1. `GET /api/chat/inbox` — build the inbox UI.
2. `GET /api/chat/conversation/<otherUserId>` — open a thread.
3. `POST /api/chat/send` or Socket `sendPrivateMessage` — send.
4. `PATCH /api/chat/read/<otherUserId>` when the user opens the thread.

### Inbox aggregate shape (approximate)

Each inbox row includes `_id` (interlocutor user id), `lastMessage`, `lastMessageDate`, `unreadCount`, and `interlocutor` (`_id`, `nickname`, `avatar`, `isActive`, `role`). Treat field names as returned by the API and map in your types.

### Chat message document (REST / DB)

Private and channel messages share one collection. Relevant fields:

- `senderId`, `receiverId` (ObjectIds; private DMs have both; channel messages use `channelId` and may omit `receiverId`)
- `channelId` — ObjectId or string depending on input
- `senderNickname`, `senderRole`
- `message`, `isRead`, `messageType`, `attachments`
- `createdAt`, `updatedAt` (timestamps)

---

## REST — group chat (`GroupChatController`)

Base path: **`/api/group-chat`**. All routes below require **JWT**.

| Method | Path | Body / params | Description |
|--------|------|----------------|-------------|
| `GET` | `/my` | — | Groups where the user is in `members`. |
| `POST` | `/` | See below | Create group; owner is JWT user. |
| `GET` | `/:id/messages` | — | Same as `GET /api/chat/channel/:id` (history by `channelId`). |
| `POST` | `/:id/invite` | `{ "memberId": "<userId>" }` | Add member. |
| `DELETE` | `/:id/leave` | — | Remove self from `members`. |
| `DELETE` | `/:id/messages` | — | Owner-only: delete all chat messages whose `channelId` is this group id. |
| `DELETE` | `/:id` | — | Owner-only: delete the group document. |

**`POST /api/group-chat` body** (typed as `any` on server; typical payload):

```json
{
  "name": "Squad",
  "description": "Optional",
  "type": "group",
  "isPrivate": false,
  "memberIds": ["<userObjectId>", "..."]
}
```

The server ensures the owner’s id is included in `members` if missing.

---

## WebSocket — Socket.IO namespace `/chat`

Connect with your HTTP(S) origin and credentials if you use cookies (CORS allows `credentials: true`).

### Example (browser / React)

```ts
import { io, Socket } from 'socket.io-client';

const socket: Socket = io(`${API_ORIGIN}/chat`, {
  path: '/socket.io', // default; change only if your server uses a custom path
  auth: { token: accessToken }, // or `Bearer ${accessToken}`
  transports: ['websocket', 'polling'],
});
```

### Server → client: automatic room on connect

After a successful JWT check, the server joins the socket to a room named **`userId`** (the user’s Mongo id string). Incoming private messages are emitted to that room.

### Client → server: emit payloads and acknowledgements

| Event (emit) | Payload | Effect |
|--------------|---------|--------|
| `join-room` | `{ roomId: string }` | Join channel/room id (for `send-message` / `new-message`). |
| `leave-room` | `{ roomId: string }` | Leave that room. |
| `send-message` | `{ roomId: string, message: string }` | Persist channel message as authenticated user; broadcasts **`new-message`** to `roomId`. |
| `sendPrivateMessage` | `{ receiverId: string, message: string }` | Persist DM; emits **`newPrivateMessage`** to the receiver’s user room only. Sender should use the handler return value or optimistically append. |
| `joinGroupRoom` | `{ groupId: string }` | Join Socket.IO room = `groupId` (required to receive group broadcasts). |
| `sendGroupMessage` | `{ groupId: string, message: string }` | Persist with `channelId: groupId`; emits **`newGroupMessage`** to room `groupId`. Payload includes `groupId` on the broadcast. |
| `deleteMessage` | `{ messageId: string, receiverId: string }` | Deletes if sender matches; emits **`messageDeleted`** to `receiverId` and `userId` rooms. |
| `deleteConversation` | `{ interlocutorId: string }` | Deletes DM thread for current user vs `interlocutorId`. |

### Voice signaling (WebRTC helpers)

| Emit | Payload | Listen |
|------|---------|--------|
| `joinVoiceRoom` | `{ roomId }` | Returns `{ status, participants }`; others get **`user-joined`**. |
| `leaveVoiceRoom` | — | **`user-left`** to room `voice:<roomId>`. |
| `getVoiceRoomUsers` | `{ roomId }` | Returns participant user ids. |
| `voice-offer` | `{ to, offer }` | Peer receives **`voice-offer`** `{ from, offer }`. |
| `voice-answer` | `{ to, answer }` | **`voice-answer`** `{ from, answer }`. |
| `voice-ice-candidate` | `{ to, candidate }` | **`voice-ice-candidate`** `{ from, candidate }`. |

Voice rooms are Socket.IO rooms named `voice:<roomId>` (distinct from chat text rooms).

---

## Recommended UI wiring

### Private chat (realtime)

1. Connect socket with JWT.
2. On send: emit `sendPrivateMessage` **or** `POST /api/chat/send`.
3. Listen globally on the socket for **`newPrivateMessage`** and route by `receiverId` / `senderId` vs current user to update the active thread and inbox.
4. When opening a thread: `PATCH /api/chat/read/:otherUserId` and refresh unread counts.

### Group chat (realtime)

1. When user opens a group: emit **`joinGroupRoom`** `{ groupId }`.
2. Optionally hydrate history with **`GET /api/group-chat/:id/messages`** (or `GET /api/chat/channel/:channelId`).
3. Send with **`sendGroupMessage`**; listen for **`newGroupMessage`** on the same socket.
4. On leave screen: optionally emit `leave-room` with `groupId` if you joined via `join-room`; for groups the gateway uses `joinGroupRoom` / room name = `groupId` — mirror that with `socket.leave` is server-side on disconnect for voice only; for text groups, joining again on next visit is fine.

### Channel / live room (non-group id)

1. **`join-room`** `{ roomId }`.
2. **`send-message`** `{ roomId, message }`.
3. Listen **`new-message`**.

---

## Idempotency and limits

- Channel history: `limit` is clamped **1–100** (`findByChannel`).
- Private `getConversation` uses service default **50** (not query-param exposed on controller).

---

## Error handling tips

- **401** on REST: refresh or re-login; reconnect socket with new token.
- Socket disconnect right after connect: almost always **invalid / missing JWT**.
- **`Cast to ObjectId failed`**: pass real 24-char hex ids for user/group/message ids, not `undefined` or wrong field names from API responses.

---

## Quick reference: HTTP vs WebSocket

| Feature | REST | WebSocket |
|---------|------|-----------|
| Inbox | `GET /chat/inbox` | — |
| DM history | `GET /chat/conversation/:userId` | — |
| Send DM | `POST /chat/send` | `sendPrivateMessage` |
| Channel / public room history | `GET /chat/channel/:channelId` | — |
| Send channel message | `POST /chat/user/:id` (no guard) | `send-message` (JWT) |
| Group list / CRUD | `/group-chat/*` | — |
| Send group message | (could use REST `user` + channelId — not ideal) | `joinGroupRoom` + `sendGroupMessage` |
| Delete own message | — | `deleteMessage` |
| Delete DM | `DELETE /chat/conversation/:userId` | `deleteConversation` |

For production apps, prefer **JWT-protected** paths and the **socket** for live delivery; avoid relying on unauthenticated `POST /chat/user/:userId` for end users unless you add guards.
