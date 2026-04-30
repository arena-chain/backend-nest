# Team Manager — Frontend Implementation Guide

Guide to build **fully dynamic and professional** team profiles on the frontend.

---

## Entities Overview

| Entity | Description |
|--------|-------------|
| **Team** | The team: name, tag, logo, roster (captain + members), game, country |
| **TeamManagerProfile** | Profile of a user who manages teams — links user to `managedTeams[]` |

---

## Team Schema (for display & forms)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | string | auto | |
| `name` | string | yes | Full name, e.g. "Team Liquid" |
| `tag` | string | yes | Short code, uppercase, max 8 chars, e.g. "TL", "FNC" |
| `logo` | string | no | URL to team logo |
| `description` | string | no | Bio, history |
| `country` | string | no | "France", "Tunisia", etc. |
| `gameId` | ObjectId → Catalog | no | Primary game (populate for name/logo) |
| `captain` | ObjectId → User | no | Team captain |
| `members` | ObjectId[] → User | no | Roster (populate for display) |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

---

## TeamManagerProfile API

**Base path:** `/team-manager`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/team-manager` | List all team managers (admin) |
| POST | `/team-manager` | Create profile — body: `{ userId, organizationName? }` |
| GET | `/team-manager/:userId` | Get manager profile by user ID |
| PATCH | `/team-manager/:userId` | Update — body: `{ organizationName?, managedTeams? }` |

### Response shape

```ts
interface TeamManagerProfile {
  _id: string;
  userId: string | { _id: string; nickname: string; email: string; avatar?: string };  // populated
  managedTeams: string[] | Team[];  // IDs or populated
  organizationName?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Team APIs (if implemented)

If your backend exposes team CRUD, use:

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/teams` | `{ name, tag, logo?, description?, country?, gameId?, captain?, members? }` |
| GET | `/teams` | — |
| GET | `/teams/:id` | — |
| PATCH | `/teams/:id` | Partial team fields |
| DELETE | `/teams/:id` | — |
| PATCH | `/teams/:id/members` | Add/remove members |

If not, you may need to add a Team controller. The Team model exists in the backend.

---

## Dynamic Team Profile UI — Pro Layout

### 1. Hero section

```
┌─────────────────────────────────────────────────────┐
│  [Logo]   TEAM NAME (tag)         [Edit] [Share]   │
│           Country • Game • Org                      │
│           "Short description or tagline"             │
└─────────────────────────────────────────────────────┘
```

- **Logo:** `team.logo` or placeholder
- **Name + tag:** `team.name` `(team.tag)`
- **Meta:** `team.country` • `gameId.title` (from Catalog) • `organizationName` (from manager)
- **Description:** `team.description` or truncated

### 2. Roster section (dynamic)

```
┌── Roster ──────────────────────────────────────────┐
│  [Avatar] Captain Name    (captain badge)            │
│  [Avatar] Player 2       Role (if you store it)     │
│  [Avatar] Player 3                                   │
│  ...                                                │
│  [+ Add player]  (if manager)                       │
└─────────────────────────────────────────────────────┘
```

- Map `team.members` + `team.captain` (populated with User)
- Use `user.nickname`, `user.avatar`, `user.email` (masked)
- Show captain badge for `captain` match

### 3. Stats / competitive section

Fetch from related APIs:

- **Season standings:** `GET /standings?seasonId=xxx` — filter by `teamId`
- **Upcoming matches:** `GET /matches?seasonId=xxx` — filter where `team1Id` or `team2Id` = team
- **Past results:** from match history
- **Active seasons:** `GET /season-teams?seasonId=xxx` — filter by `teamId`

### 4. Organization / manager section (if manager view)

- Show `TeamManagerProfile.organizationName`
- List `managedTeams` with links to each team profile
- Edit organization name via `PATCH /team-manager/:userId`

---

## Data Flow for Dynamic Profiles

### Loading a team profile page

```
1. GET /teams/:id (or equivalent)
   → team with gameId, captain, members populated

2. GET /catalog (if gameId not populated)
   → resolve game name/logo

3. GET /users (for captain/members if not populated)
   → or ensure backend populates refs

4. GET /standings?seasonId=xxx  (optional)
   → find entry where teamId = team._id

5. GET /matches?seasonId=xxx   (optional)
   → filter for this team

6. GET /season-teams?seasonId=xxx (optional)
   → check if team is registered
```

### Loading manager dashboard

```
1. GET /team-manager/:userId
   → profile with managedTeams (populate teams)

2. For each managedTeam:
   → team name, tag, logo, recent matches
   → link to full team profile
```

---

## Form Validation (Team create/edit)

| Field | Rules |
|-------|-------|
| `name` | Required, 2–100 chars |
| `tag` | Required, 2–8 chars, uppercase, alphanumeric |
| `logo` | URL or base64 upload |
| `description` | Max 500 chars |
| `country` | From countries list or free text |
| `gameId` | Required — select from `GET /catalog` |
| `captain` | User ID from team members |
| `members` | Array of User IDs — validate against game `teamSize` |

---

## TypeScript Interfaces

```ts
interface Team {
  _id: string;
  name: string;
  tag: string;
  logo?: string;
  description?: string;
  country?: string;
  gameId?: string | CatalogGame;
  captain?: string | User;
  members: (string | User)[];
  createdAt?: string;
  updatedAt?: string;
}

interface TeamManagerProfile {
  _id: string;
  userId: string | User;
  managedTeams: string[] | Team[];
  organizationName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CatalogGame {
  _id: string;
  title: string;
  teamSize: number;
  coverImageUrl?: string;
}

interface User {
  _id: string;
  nickname: string;
  avatar?: string;
  email?: string;
}
```

---

## Pro UI Tips

1. **Skeleton loaders** — Show placeholders while `team`, `gameId`, `members` load.
2. **Responsive roster** — Grid on desktop, stacked on mobile.
3. **Empty states** — "No logo", "No description", "Roster pending" with CTAs.
4. **Permissions** — Show Edit only if current user is manager (`managedTeams` includes this team) or admin.
5. **Deep links** — `/teams/:id`, `/teams/:id/roster`, `/teams/:id/matches`.
6. **SEO** — Use `team.name`, `team.description` for meta tags.

---

## Related Endpoints

| Purpose | Endpoint |
|---------|----------|
| Games for selector | `GET /catalog` |
| Users for roster | `GET /users` or member IDs |
| Standings for team | `GET /standings?seasonId=` |
| Matches for team | `GET /matches?seasonId=` |
| Season registrations | `GET /season-teams?seasonId=` |
| Season rosters | `GET /season-rosters?seasonId=` |
