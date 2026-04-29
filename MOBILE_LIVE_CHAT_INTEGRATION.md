# Mobile Live + Chat Integration Guide

This guide explains how to integrate **live game updates** and **chat** together in a mobile app.

Backend references used:
- `src/stream/stream.gateway.ts`
- `src/live-game/live-game.gateway.ts`
- `src/chat/chat.controller.ts`
- `src/presence/presence.gateway.ts`
- `src/presence/presence.controller.ts`
- `src/friendship/friendship.controller.ts`

---

## 1) Goal

Build one mobile screen called **Live Room** that combines:
- Live stream/chat presence
- Realtime chat messages
- Realtime game state/events
- Reactions
- Friends online/offline status

---

## 2) Connections Needed

### A) Stream/Chat Socket (default namespace)
Used for:
- Channel join/leave
- Chat send/receive
- Broadcaster status
- Reactions

### B) Live Game Socket (`/live-game` namespace)
Used for:
- `game-state`
- `game-event`
- `game-started`
- `game-ended`

### C) REST Chat History
Used for initial message history:
- `GET /chat/channel/:channelId?limit=50`

### D) Presence Socket (`/presence` namespace)
Used for:
- Friends connected/disconnected in realtime
- Friends status updates (`in_game`, `in_queue`, etc.)
- Initial sorted friends presence snapshot

### E) Friendship REST API
Used for:
- Friends list
- Pending/sent requests
- Accept/reject requests

---

## 3) Event Contract

## Stream/Chat Events

### Client emits
- `join-channel` => `{ channelId, role: 'viewer' | 'broadcaster' }`
- `leave-channel` => no payload required
- `chat-message` => `{ channelId, message }`
- `reaction` => `{ channelId, emoji }`

### Client listens
- `chat-message` => newly created chat message
- `broadcaster-status` => `{ channelId, isBroadcasting }`
- `reaction-event` => realtime reaction event
- `reaction-summary` => `{ channelId, counts: Record<string, number> }`
- `broadcast-ended` => `{ channelId }`

## Live Game Events

### Client listens
- `game-state` => scoreboard/player snapshot
- `game-event` => feed events (kills/objectives/etc.)
- `game-started` => `{ phase: 'InProgress' }`
- `game-ended` => `{ ended: true }`

## Presence Events (`/presence`)

### Client emits
- `update-status` => `{ status, game?, details? }`
- `get-friends` => no payload

### Client listens
- `presence-ready` => `{ friends: FriendPresence[] }`
- `friend-online` => `{ userId, status: 'online' }`
- `friend-offline` => `{ userId }`
- `friend-status` => `{ userId, status, game?, details? }`

---

## 4) Live Room Screen Architecture

Recommended mobile layout:

1. **Top section**: video/player + live badge  
2. **Middle section**: game info card (K/D/A, CS, gold, game time, teams)  
3. **Bottom section**: chat list + input + reactions row

Internal states:
- `isLoadingHistory`
- `chatMessages[]`
- `gameState`
- `gameEvents[]`
- `isBroadcasting`
- `reactionCounts`
- `connectionState`
- `friendsPresence[]`
- `onlineFriendsCount`

---

## 5) Lifecycle Flow

1. Open screen with `channelId`
2. Fetch chat history (`GET /chat/channel/:channelId`)
3. Connect stream socket
4. Emit `join-channel` as viewer
5. Connect `/live-game` socket
6. Listen and render incoming events
7. On send message => emit `chat-message`
8. On react => emit `reaction`
9. Connect `/presence` socket with auth token
10. Receive `presence-ready` and render friends widget
11. Listen to `friend-online`, `friend-offline`, `friend-status`
12. On unmount => emit `leave-channel`, disconnect all sockets

---

## 6) React Native Example (Socket.IO)

```ts
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'http://YOUR_BACKEND:3000';

let streamSocket: Socket | null = null;
let liveGameSocket: Socket | null = null;
let presenceSocket: Socket | null = null;

export const connectLiveRoom = (
  channelId: string,
  token?: string,
  onChatMessage?: (m: any) => void,
  onBroadcasterStatus?: (s: any) => void,
  onReactionSummary?: (r: any) => void,
  onGameState?: (g: any) => void,
  onGameEvent?: (e: any) => void,
  onPresenceReady?: (p: any) => void,
  onFriendOnline?: (p: any) => void,
  onFriendOffline?: (p: any) => void,
  onFriendStatus?: (p: any) => void,
) => {
  streamSocket = io(API_BASE_URL, {
    transports: ['websocket'],
    auth: token ? { token } : {},
  });

  liveGameSocket = io(`${API_BASE_URL}/live-game`, {
    transports: ['websocket'],
  });

  presenceSocket = io(`${API_BASE_URL}/presence`, {
    transports: ['websocket'],
    auth: token ? { token } : {},
  });

  streamSocket.emit('join-channel', { channelId, role: 'viewer' });

  streamSocket.on('chat-message', (msg) => onChatMessage?.(msg));
  streamSocket.on('broadcaster-status', (status) =>
    onBroadcasterStatus?.(status),
  );
  streamSocket.on('reaction-summary', (summary) =>
    onReactionSummary?.(summary),
  );

  liveGameSocket.on('game-state', (state) => onGameState?.(state));
  liveGameSocket.on('game-event', (event) => onGameEvent?.(event));

  presenceSocket.on('presence-ready', (payload) => onPresenceReady?.(payload));
  presenceSocket.on('friend-online', (payload) => onFriendOnline?.(payload));
  presenceSocket.on('friend-offline', (payload) => onFriendOffline?.(payload));
  presenceSocket.on('friend-status', (payload) => onFriendStatus?.(payload));

  presenceSocket.emit('get-friends');
};

export const sendChatMessage = (channelId: string, message: string) => {
  const text = message.trim();
  if (!text || !streamSocket) return;
  streamSocket.emit('chat-message', { channelId, message: text });
};

export const sendReaction = (channelId: string, emoji: string) => {
  if (!streamSocket) return;
  streamSocket.emit('reaction', { channelId, emoji });
};

export const disconnectLiveRoom = () => {
  streamSocket?.emit('leave-channel');
  streamSocket?.disconnect();
  liveGameSocket?.disconnect();
  presenceSocket?.disconnect();
  streamSocket = null;
  liveGameSocket = null;
  presenceSocket = null;
};
```

---

## 7) REST Bootstrapping for Chat

When screen opens, call:

`GET /chat/channel/:channelId?limit=50`

Then:
- Populate initial chat list
- Keep appending realtime `chat-message` events after that

---

## 8) UX Best Practices (Mobile)

- Keep message input sticky at bottom
- Use optimistic UI for sent messages
- Auto-scroll to latest message only if user is near bottom
- Throttle reactions to avoid spam
- Show reconnect banner when socket disconnects
- Handle guest mode (backend supports guest nickname fallback)
- Keep a compact "Friends Online" bar in Live Room header
- Tap a friend to open 1:1 chat or invite to watch

---

## 9) Friends + Connected Users Integration

Use both presence and friendship APIs together:

### Realtime connected friends
- Connect socket namespace `/presence` with JWT in `auth.token`
- On connect, backend sends `presence-ready` with sorted friends
- Update UI instantly when receiving:
  - `friend-online`
  - `friend-offline`
  - `friend-status`

### Friendship REST endpoints
- `GET /friendship/friends/:userId`
- `GET /friendship/pending-requests/:userId`
- `GET /friendship/sent-requests/:userId`
- `POST /friendship/send-request`
- `POST /friendship/accept/:friendshipId`
- `POST /friendship/reject/:friendshipId`

### Presence REST fallback
- `GET /presence/friends/:userId`
- Use as fallback when socket is reconnecting or for pull-to-refresh

### UI recommendation
- Live Room: small horizontal avatars of online friends
- Chat tab: grouped list
  - `In game`
  - `In queue`
  - `Online`
  - `Away`
  - `Offline`

---

## 10) Error Handling Checklist

- [ ] Socket connection error state shown
- [ ] Retry connection button available
- [ ] Empty chat state handled
- [ ] No broadcaster state handled (`isBroadcasting: false`)
- [ ] Graceful cleanup on screen unmount
- [ ] Presence socket reconnect handled
- [ ] Friends list fallback fetch (`/presence/friends/:userId`) works

---

## 11) Implementation Checklist

- [ ] Create `LiveRoomScreen`
- [ ] Add chat history API call
- [ ] Add stream socket integration
- [ ] Add `/live-game` socket integration
- [ ] Add `/presence` socket integration
- [ ] Wire chat input to `chat-message`
- [ ] Wire reactions to `reaction`
- [ ] Add friends online widget
- [ ] Add friend requests/pending page
- [ ] Add disconnect cleanup for all sockets
- [ ] Test with authenticated and guest users

