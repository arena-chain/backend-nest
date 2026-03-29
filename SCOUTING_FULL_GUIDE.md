# Scouting – Full Implementation Guide

Complete reference for implementing the scouting module on the frontend. All operations, logic, and examples in one file.

---

## Base Configuration

| Setting | Value |
|---------|-------|
| Base URL | `http://localhost:3000` |
| Content-Type | `application/json` |
| Auth | `Authorization: Bearer <accessToken>` |

**Important:** `scouterId` = logged-in scouter's user ID (from JWT/profile). Use it in request bodies where required.

---

# Part 1 — Watchlist

## 1.1 Add player to watchlist

```
POST /scouting/watchlist
```

**Body:**
```json
{
  "scouterId": "<logged-in-user-id>",
  "playerId": "<player-user-id>",
  "notes": "Optional notes",
  "priority": "LOW"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| scouterId | yes | Logged-in scouter's user ID |
| playerId | yes | Player's user ID |
| notes | no | Text |
| priority | no | `LOW` \| `MEDIUM` \| `HIGH` (default: LOW) |

**Success:** 201 + created watchlist entry  
**Conflict:** 409 if player already in watchlist

---

## 1.2 Remove player from watchlist

```
DELETE /scouting/watchlist/scouter/:scouterId/player/:playerId
```

**Example:** `DELETE /scouting/watchlist/scouter/507f.../player/507f...`

**Success:** 200  
**Not found:** 404

---

## 1.3 List scouter's watchlist

```
GET /scouting/watchlist/scouter/:scouterId
```

**Response:** Array of watchlist entries with populated `playerId` (nickname, email, country)

---

## 1.4 Check if player is in watchlist

```
GET /scouting/watchlist/check?scouterId=:scouterId&playerId=:playerId
```

**Response:** `true` or `false`

---

## 1.5 Update watchlist entry (notes/priority)

```
PATCH /scouting/watchlist/:id
```

**Body:**
```json
{
  "scouterId": "<logged-in-user-id>",
  "notes": "Updated notes",
  "priority": "HIGH"
}
```

---

## 1.6 Watchlist UI logic

```
On player card/profile:
1. GET /scouting/watchlist/check?scouterId={me}&playerId={playerId}
2. If false → show "Add to watchlist" → POST /scouting/watchlist
3. If true  → show "Remove" → DELETE /scouting/watchlist/scouter/{me}/player/{playerId}
4. "My watchlist" page → GET /scouting/watchlist/scouter/{me}
```

---

# Part 2 — Scouting Reports

## 2.1 Create report

```
POST /scouting/reports
```

**Body:**
```json
{
  "scouterId": "<logged-in-user-id>",
  "playerId": "<player-user-id>",
  "matchId": "<match-id>",
  "rating": 85,
  "strengths": "Strong aim, positioning",
  "weaknesses": "Communication",
  "notes": "Promising for tier 2",
  "recommendedRole": "Duelist"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| scouterId | yes | Logged-in scouter's user ID |
| playerId | yes | Player's user ID |
| matchId | no | Match ID if report is match-based |
| rating | yes | 0–100 |
| strengths | no | Text |
| weaknesses | no | Text |
| notes | no | Text |
| recommendedRole | no | e.g. Duelist, Support, Controller |

---

## 2.2 List reports by scouter

```
GET /scouting/reports/scouter/:scouterId
GET /scouting/reports/scouter/:scouterId?playerId=:playerId
```

Optional `playerId` filters by player.

---

## 2.3 List reports for a player

```
GET /scouting/reports/player/:playerId
```

---

## 2.4 Get single report

```
GET /scouting/reports/:id
```

---

## 2.5 Update report

```
PATCH /scouting/reports/:id
```

**Body (all optional):**
```json
{
  "rating": 90,
  "strengths": "Updated",
  "weaknesses": "Updated",
  "notes": "Updated",
  "recommendedRole": "Support"
}
```

---

## 2.6 Delete report

```
DELETE /scouting/reports/:id
```

---

## 2.7 Reports UI logic

```
Player profile:
1. GET /scouting/reports/player/:playerId → show list
2. "New report" → form → POST /scouting/reports
3. On report row: Edit → PATCH, Delete → DELETE

Scouter dashboard:
1. GET /scouting/reports/scouter/:scouterId → my reports
2. Optional filter by playerId
```

---

# Part 3 — Prospect Status

## 3.1 Create or update prospect status

```
POST /scouting/prospects
```

**Body:**
```json
{
  "playerId": "<player-user-id>",
  "prospectLevel": "PROSPECT",
  "priority": "HIGH"
}
```

| prospectLevel | |
|---------------|--|
| UNKNOWN | |
| WATCHLIST | |
| PROSPECT | |
| ELITE_PROSPECT | |
| SIGNED | |

| priority | |
|----------|--|
| LOW | |
| MEDIUM | |
| HIGH | |

If status exists for the player, it is updated.

---

## 3.2 Get prospect status for a player

```
GET /scouting/prospects/player/:playerId
```

**Response:** Prospect object or `null`

---

## 3.3 List prospects (with filters)

```
GET /scouting/prospects
GET /scouting/prospects?prospectLevel=PROSPECT
GET /scouting/prospects?priority=HIGH
GET /scouting/prospects?prospectLevel=PROSPECT&priority=HIGH
```

---

## 3.4 Update prospect status

```
PATCH /scouting/prospects/player/:playerId
```

**Body:**
```json
{
  "prospectLevel": "ELITE_PROSPECT",
  "priority": "HIGH"
}
```

---

## 3.5 Prospect UI logic

```
Player profile:
1. GET /scouting/prospects/player/:playerId
2. If null → show "Set status" → POST /scouting/prospects
3. If exists → show dropdown → PATCH /scouting/prospects/player/:playerId

Prospects list:
1. GET /scouting/prospects?prospectLevel=PROSPECT&priority=HIGH
2. Render table/list
```

---

# Part 4 — Recommendations

## 4.1 Create recommendation

```
POST /scouting/recommendations
```

**Body:**
```json
{
  "scouterId": "<logged-in-user-id>",
  "playerId": "<player-user-id>",
  "organizationId": "<team-id>",
  "recommendationLevel": "STRONGLY_RECOMMEND",
  "message": "Strong performance."
}
```

| recommendationLevel | |
|---------------------|--|
| CONSIDER | |
| STRONGLY_RECOMMEND | |
| MUST_SIGN | |

---

## 4.2 List recommendations by scouter

```
GET /scouting/recommendations/scouter/:scouterId
```

---

## 4.3 List recommendations for a player

```
GET /scouting/recommendations/player/:playerId
```

---

## 4.4 List recommendations for organization (team manager)

```
GET /scouting/recommendations/organization/:organizationId
GET /scouting/recommendations/organization/:organizationId?status=PENDING
```

| status | |
|--------|--|
| PENDING | |
| ACCEPTED | |
| REJECTED | |

---

## 4.5 Update recommendation status (accept/reject)

```
PATCH /scouting/recommendations/:id/status
```

**Body:**
```json
{ "status": "ACCEPTED" }
```
or
```json
{ "status": "REJECTED" }
```

---

## 4.6 Recommendations UI logic

```
Scouter (player profile):
1. "Recommend to team" → select org → POST /scouting/recommendations

Team manager:
1. GET /scouting/recommendations/organization/:orgId?status=PENDING
2. Accept → PATCH .../status { "status": "ACCEPTED" }
3. Reject → PATCH .../status { "status": "REJECTED" }
```

---

# Part 5 — Player Discovery (Filter)

## 5.1 Filter players

```
GET /scouting/players/filter
```

**Query params (all optional):**

| Param | Type | Example |
|-------|------|---------|
| gameId | string | `?gameId=507f...` |
| tier | string | `?tier=DIAMOND` |
| country | string | `?country=Tunisia` |
| hasTeam | string | `?hasTeam=true` or `?hasTeam=false` |
| prospectLevel | string | `?prospectLevel=PROSPECT` |
| priority | string | `?priority=HIGH` |

**Examples:**
```
GET /scouting/players/filter?tier=DIAMOND&country=Tunisia
GET /scouting/players/filter?hasTeam=false&prospectLevel=PROSPECT
GET /scouting/players/filter?gameId=507f...&tier=MASTER
```

**Response:** Array of player profiles (with populated userId)

---

# Part 6 — Complete Operation Matrix

| Action | Method | Endpoint | Body / Params |
|--------|--------|----------|---------------|
| Add to watchlist | POST | `/scouting/watchlist` | scouterId, playerId, notes?, priority? |
| Remove from watchlist | DELETE | `/scouting/watchlist/scouter/:scouterId/player/:playerId` | — |
| List my watchlist | GET | `/scouting/watchlist/scouter/:scouterId` | — |
| Check in watchlist | GET | `/scouting/watchlist/check?scouterId=&playerId=` | — |
| Update watchlist entry | PATCH | `/scouting/watchlist/:id` | scouterId, notes?, priority? |
| Create report | POST | `/scouting/reports` | scouterId, playerId, rating, matchId?, strengths?, weaknesses?, notes?, recommendedRole? |
| List my reports | GET | `/scouting/reports/scouter/:scouterId` | ?playerId= |
| List reports for player | GET | `/scouting/reports/player/:playerId` | — |
| Get report | GET | `/scouting/reports/:id` | — |
| Update report | PATCH | `/scouting/reports/:id` | rating?, strengths?, weaknesses?, notes?, recommendedRole? |
| Delete report | DELETE | `/scouting/reports/:id` | — |
| Set prospect status | POST | `/scouting/prospects` | playerId, prospectLevel?, priority? |
| Get prospect for player | GET | `/scouting/prospects/player/:playerId` | — |
| List prospects | GET | `/scouting/prospects` | ?prospectLevel=, ?priority= |
| Update prospect | PATCH | `/scouting/prospects/player/:playerId` | prospectLevel?, priority? |
| Create recommendation | POST | `/scouting/recommendations` | scouterId, playerId, organizationId, recommendationLevel, message? |
| List my recommendations | GET | `/scouting/recommendations/scouter/:scouterId` | — |
| List recommendations for player | GET | `/scouting/recommendations/player/:playerId` | — |
| List org recommendations | GET | `/scouting/recommendations/organization/:orgId` | ?status= |
| Accept/Reject recommendation | PATCH | `/scouting/recommendations/:id/status` | { "status": "ACCEPTED" \| "REJECTED" } |
| Filter players | GET | `/scouting/players/filter` | ?gameId=, ?tier=, ?country=, ?hasTeam=, ?prospectLevel=, ?priority= |

---

# Part 7 — Suggested Page Flows

## Scouter dashboard

1. `GET /scouting/players/filter` (with filters) → player list
2. Each row: "Add to watchlist", "View profile", "New report"
3. Sidebar: "My watchlist" → `GET /scouting/watchlist/scouter/:me`
4. Sidebar: "My reports" → `GET /scouting/reports/scouter/:me`

## Player profile (scouter view)

1. `GET /scouting/watchlist/check?scouterId=:me&playerId=:playerId` → show Add/Remove watchlist
2. `GET /scouting/reports/player/:playerId` → reports list
3. `GET /scouting/prospects/player/:playerId` → prospect badge
4. Actions: New report, Set prospect status, Recommend to team

## My watchlist page

1. `GET /scouting/watchlist/scouter/:scouterId` → list
2. Each row: player info, notes, priority, "Remove", "View profile", "New report"

## Team manager – pending recommendations

1. `GET /scouting/recommendations/organization/:orgId?status=PENDING`
2. Each row: player, scouter, level, message, Accept, Reject

---

# Part 8 — TypeScript (Frontend)

```typescript
export enum ProspectLevel {
  UNKNOWN = 'UNKNOWN',
  WATCHLIST = 'WATCHLIST',
  PROSPECT = 'PROSPECT',
  ELITE_PROSPECT = 'ELITE_PROSPECT',
  SIGNED = 'SIGNED',
}

export enum ProspectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum RecommendationLevel {
  CONSIDER = 'CONSIDER',
  STRONGLY_RECOMMEND = 'STRONGLY_RECOMMEND',
  MUST_SIGN = 'MUST_SIGN',
}

export enum RecommendationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export interface Watchlist {
  _id: string;
  scouterId: string;
  playerId: string | { _id: string; nickname?: string; email?: string; country?: string };
  notes: string;
  priority: ProspectPriority;
  createdAt: string;
}

export interface ScoutingReport {
  _id: string;
  scouterId: string | { _id: string; nickname?: string; email?: string };
  playerId: string | { _id: string; nickname?: string; email?: string; country?: string };
  matchId?: string;
  rating: number;
  strengths: string;
  weaknesses: string;
  notes: string;
  recommendedRole: string;
  createdAt: string;
}

export interface PlayerProspectStatus {
  _id: string;
  playerId: string | { _id: string; nickname?: string; email?: string; country?: string };
  prospectLevel: ProspectLevel;
  priority: ProspectPriority;
  lastUpdated: string;
}

export interface PlayerRecommendation {
  _id: string;
  scouterId: string | { _id: string; nickname?: string; email?: string };
  playerId: string | { _id: string; nickname?: string; email?: string; country?: string };
  organizationId: string | { _id: string; name?: string; tag?: string; logo?: string };
  recommendationLevel: RecommendationLevel;
  message: string;
  status: RecommendationStatus;
  createdAt: string;
}
```

---

# Part 9 — Error Handling

| Code | Meaning |
|------|---------|
| 400 | Bad request (validation) |
| 404 | Not found |
| 409 | Conflict (e.g. player already in watchlist) |

Always send `scouterId` in the body when required; it is not inferred from the token.
