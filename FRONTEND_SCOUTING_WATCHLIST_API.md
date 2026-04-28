# Scouting — Watchlist API (frontend copy-paste reference)

Base URL: same as your app API (e.g. `http://localhost:3000/api` or via Vite proxy `/api`).

All paths below are relative to `/api` (Nest global prefix).

---

## Add player to watchlist

**POST** `/scouting/watchlist`

**Headers**

- `Content-Type: application/json`
- `Authorization: Bearer <JWT>` *(recommended; controller may not enforce yet — see Security)*

**Body**

```json
{
  "scouterId": "<mongoId of scouter user>",
  "playerId": "<mongoId of player user>",
  "notes": "optional note",
  "priority": "LOW"
}
```

`priority` is optional; enum values come from backend (`ProspectPriority`, e.g. `LOW`, `MEDIUM`, `HIGH` — confirm in Swagger or schema if needed).

**Success:** `201` / created watchlist entry (populated with player fields).

**Errors**

- `409` — player already in this scouter’s watchlist.

---

## Remove player from watchlist

**DELETE** `/scouting/watchlist/scouter/:scouterId/player/:playerId`

**Example**

```
DELETE /api/scouting/watchlist/scouter/507f1f77bcf86cd799439011/player/507f191e810c19729de860ea
```

**Headers**

- `Authorization: Bearer <JWT>` *(recommended)*

**Success:** `200` (empty body or default Nest delete response — verify in network tab).

**Errors**

- `404` — no watchlist row for that `(scouterId, playerId)`.

---

## List watchlist for a scouter

**GET** `/scouting/watchlist/scouter/:scouterId`

Returns all watchlist entries for that scouter (sorted by `createdAt` desc, populated `playerId`).

---

## List who is watching a player (reverse lookup)

**GET** `/scouting/watchlist/player/:playerId`

---

## Check if a player is on a scouter’s watchlist

**GET** `/scouting/watchlist/check?scouterId=<id>&playerId=<id>`

Returns whether the pair exists (boolean in response — confirm shape in Swagger).

---

## Update a watchlist row (notes / priority)

**PATCH** `/scouting/watchlist/:id`

**Body** (example — align with `UpdateWatchlistDto` in backend)

```json
{
  "scouterId": "<mongoId of scouter>",
  "notes": "updated note",
  "priority": "HIGH"
}
```

---

## Frontend `fetch` examples

### Add

```ts
await fetch(`${API_BASE}/api/scouting/watchlist`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    scouterId,
    playerId,
    notes: '',
    priority: 'LOW',
  }),
});
```

### Remove

```ts
await fetch(
  `${API_BASE}/api/scouting/watchlist/scouter/${encodeURIComponent(scouterId)}/player/${encodeURIComponent(playerId)}`,
  {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

### List for scouter

```ts
const res = await fetch(
  `${API_BASE}/api/scouting/watchlist/scouter/${encodeURIComponent(scouterId)}`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const list = await res.json();
```

---

## Security note (important)

The current `ScoutingController` watchlist routes use **`scouterId` from the URL/body**, not necessarily the JWT user. For production, the frontend should still send JWT, and the backend should be hardened so only `req.user.userId === scouterId` (and role `scouter`) can add/remove/update **their** watchlist. Until then, treat `scouterId` as trusted only in dev.

---

## File reference (backend)

- `src/scouting/scouting.controller.ts` — routes
- `src/scouting/scouting.service.ts` — `addToWatchlist`, `removeFromWatchlist`, etc.
- `src/scouting/dto/create-watchlist.dto.ts` — add body shape
- `src/scouting/dto/update-watchlist.dto.ts` — patch body shape
