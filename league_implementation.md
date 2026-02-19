# ArenaChain — League System Frontend Implementation Guide

Complete reference for any frontend developer to implement the competitive league system from scratch. Covers every API endpoint, every request/response shape, all business rules enforced server-side, and the visual season timeline/progress bar.

---

## Base URL

```
http://localhost:3000
```

All requests use `Content-Type: application/json` unless noted (file upload uses `multipart/form-data`).

---

## Creation Order (STRICT — never skip steps)

```
1. POST /catalog              → create the game (Valorant, LoL, CS2)
2. POST /league-rules         → create a reusable rule template for that game
3. POST /leagues              → create the league brand
4. POST /seasons              → create a season (needs leagueId + rulesId)
5. POST /season-teams         → register teams (enforced: deadline + max capacity)
6. POST /rounds or /rounds/generate → create matchday slots
7. POST /matches              → schedule matches per round
8. PATCH /matches/:id/result  → report results (standings auto-update)
```

---

## 1. Catalog — Game Registry

### Create a game
```
POST /catalog
Content-Type: multipart/form-data
```

| Field | Type | Required | Example |
|---|---|---|---|
| `title` | string | yes | `"Valorant"` |
| `genre` | string | yes | `"Tactical Shooter"` |
| `publisher` | string | no | `"Riot Games"` |
| `platforms` | string[] | no | `["PC"]` |
| `teamSize` | number | no | `5` |
| `supportsTeams` | boolean | no | `true` |
| `supportsSolo` | boolean | no | `false` |
| `file` | file (image) | no | cover image upload |

**Response `201`:**
```json
{
  "_id": "6601aabb...",
  "title": "Valorant",
  "genre": "Tactical Shooter",
  "publisher": "Riot Games",
  "platforms": ["PC"],
  "teamSize": 5,
  "supportsTeams": true,
  "supportsSolo": false,
  "isActive": true,
  "coverImageUrl": "/uploads/valorant.jpg",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

### Get all games
```
GET /catalog
```

### Get one game
```
GET /catalog/:id
```

### Update game
```
PATCH /catalog/:id
Content-Type: multipart/form-data
```

---

## 2. LeagueRule — Competition Rules Template

A rule template is created once per game format and reused across multiple seasons. It is **not** tied to a single league.

### Create a rule template
```
POST /league-rules
```

**Body:**
```json
{
  "name": "Valorant Standard BO3",
  "gameId": "<catalog_id>",
  "formatType": "LEAGUE",
  "matchType": "BO3",
  "pointsWin": 3,
  "pointsDraw": 0,
  "pointsLoss": 0,
  "maxTeams": 16,
  "maxForfeitsBeforeDisqualification": 3,
  "forfeitCountsAsLoss": true,
  "tiebreaker": "GAME_DIFF",
  "extraRules": {
    "mapPool": ["Haven", "Bind", "Split"],
    "checkInRequired": true,
    "checkInWindowMinutes": 15
  }
}
```

**`formatType` options:** `LEAGUE` | `SWISS` | `KNOCKOUT`

**`matchType` options:** `BO1` | `BO3` | `BO5`

**`tiebreaker` options:** `POINTS` | `GAME_DIFF` | `HEAD_TO_HEAD`

**Response `201`:**
```json
{
  "_id": "6602aacc...",
  "name": "Valorant Standard BO3",
  "gameId": "6601aabb...",
  "formatType": "LEAGUE",
  "matchType": "BO3",
  "pointsWin": 3,
  "pointsDraw": 0,
  "pointsLoss": 0,
  "maxTeams": 16,
  "maxForfeitsBeforeDisqualification": 3,
  "forfeitCountsAsLoss": true,
  "tiebreaker": "GAME_DIFF"
}
```

### Get all rules (optionally filter by game)
```
GET /league-rules?leagueId=<id>
GET /league-rules/:id
```

### Recommended rule templates per game

**Valorant regular season:**
```json
{
  "name": "Valorant Regular BO3",
  "gameId": "<valorant_id>",
  "formatType": "LEAGUE",
  "matchType": "BO3",
  "pointsWin": 3,
  "pointsDraw": 0,
  "pointsLoss": 0,
  "maxTeams": 10,
  "tiebreaker": "GAME_DIFF"
}
```

**Valorant / LoL playoff / knockout:**
```json
{
  "name": "Valorant Playoff BO5",
  "gameId": "<valorant_id>",
  "formatType": "KNOCKOUT",
  "matchType": "BO5",
  "pointsWin": 1,
  "pointsDraw": 0,
  "pointsLoss": 0,
  "maxTeams": 8,
  "tiebreaker": "POINTS"
}
```

**CS2 regular season (draws possible in BO1 maps):**
```json
{
  "name": "CS2 Regular BO3",
  "gameId": "<cs2_id>",
  "formatType": "LEAGUE",
  "matchType": "BO3",
  "pointsWin": 3,
  "pointsDraw": 1,
  "pointsLoss": 0,
  "maxTeams": 16,
  "tiebreaker": "GAME_DIFF"
}
```

---

## 3. League — Permanent Brand

A league never expires. It is the identity container (e.g. "VCT EMEA", "ArenaChain Valorant Tunisia").

### Create a league
```
POST /leagues
```

**Body:**
```json
{
  "name": "VCT EMEA",
  "level": "CONTINENTAL",
  "regionId": "EMEA",
  "gameId": "<catalog_id>",
  "description": "Valorant Champions Tour — Europe, Middle East & Africa",
  "logoUrl": "https://cdn.arenachain.gg/logos/vct-emea.png"
}
```

**`level` options:** `INTERNATIONAL` | `CONTINENTAL` | `NATIONAL` | `REGIONAL`

**Get available regions:**
```
GET /leagues/enums/regions
```
Returns all valid `regionId` values (continents + countries).

### Get all leagues
```
GET /leagues
```

### Get one league
```
GET /leagues/:id
```

### Update league
```
PATCH /leagues/:id
```

---

## 4. Season — One Competitive Run

A season links a league to a rule set and defines the competition window.

### Create a season
```
POST /seasons
```

**Body:**
```json
{
  "leagueId": "<league_id>",
  "rulesId": "<league_rule_id>",
  "name": "Spring Split 2026",
  "registrationDeadline": "2026-03-01",
  "startDate": "2026-03-10",
  "endDate": "2026-06-30",
  "description": "First split of the 2026 season"
}
```

**Business rules enforced server-side:**
- `registrationDeadline` must be before `startDate`
- Default status is `PLANNED`

**Response `201`:**
```json
{
  "_id": "6603bbdd...",
  "leagueId": "...",
  "rulesId": "...",
  "name": "Spring Split 2026",
  "registrationDeadline": "2026-03-01T00:00:00.000Z",
  "startDate": "2026-03-10T00:00:00.000Z",
  "endDate": "2026-06-30T00:00:00.000Z",
  "status": "PLANNED"
}
```

### Get seasons
```
GET /seasons                      → all seasons
GET /seasons?leagueId=<id>        → seasons for a specific league
GET /seasons/:id                  → one season
```

### Lifecycle transitions
```
PATCH /seasons/:id/activate       → PLANNED → ONGOING
PATCH /seasons/:id/close          → ONGOING → FINISHED
PATCH /seasons/:id                → update any field
DELETE /seasons/:id
```

---

## 5. SeasonTeam — Team Registration

### Register a team into a season
```
POST /season-teams
```

**Body:**
```json
{
  "seasonId": "<season_id>",
  "teamId": "<team_id>",
  "seed": 1,
  "qualifiedFromSeasonId": "<previous_season_id>",
  "qualifiedViaRank": 1
}
```

`seed`, `qualifiedFromSeasonId`, `qualifiedViaRank` are all optional.

**Server automatically enforces:**
- Season must be `PLANNED` (not started, not finished)
- Current date must be before `registrationDeadline`
- Active team count must be below `rule.maxTeams`
- Team cannot register twice in the same season
- A `Standings` row is auto-created for the team (all zeros) upon successful registration

**Error responses:**
| HTTP | Message |
|---|---|
| `400` | `Registration deadline has passed` |
| `400` | `The season has already started` |
| `400` | `Season is full: maximum of N teams allowed` |
| `409` | `Team is already registered for this season` |

### Get all teams in a season
```
GET /season-teams/season/:seasonId
```
Returns array sorted by `seed` ascending.

### Team status management
```
PATCH /season-teams/:id/withdraw      → status: WITHDRAWN  (team leaves)
PATCH /season-teams/:id/disqualify    → status: DISQUALIFIED (admin action)
PATCH /season-teams/:id               → update any field (seed, qualifiedViaRank, etc.)
```

> **Auto-disqualification:** When a team reaches `rule.maxForfeitsBeforeDisqualification` forfeits, the server automatically sets their status to `DISQUALIFIED`. No manual action needed.

---

## 6. Round — Matchday Slots

### Generate all rounds at once (recommended)
```
POST /rounds/generate
```

**Body:**
```json
{
  "seasonId": "<season_id>",
  "startDate": "2026-03-10",
  "weekCount": 9
}
```

Creates 9 rounds starting from `startDate`, each 7 days apart.

**For 10 teams (round-robin):** use `weekCount: 9` (each team plays 9 matches).

### Create a single round
```
POST /rounds
```

**Body:**
```json
{
  "seasonId": "<season_id>",
  "roundNumber": 1,
  "startDate": "2026-03-10",
  "endDate": "2026-03-16"
}
```

### Get rounds
```
GET /rounds?seasonId=<id>          → all rounds for a season
GET /rounds/:id                    → one round
```

### Round status
```
PATCH /rounds/:id                  → update status or dates
```

**`status` values:** `SCHEDULED` | `ONGOING` | `COMPLETED`

---

## 7. Match — Series Between Two Teams

### Schedule a match
```
POST /matches
```

**Body:**
```json
{
  "roundId": "<round_id>",
  "seasonId": "<season_id>",
  "team1Id": "<team_id>",
  "team2Id": "<team_id>",
  "scheduledStart": "2026-03-10T18:00:00Z",
  "scheduledEnd": "2026-03-10T21:00:00Z",
  "refereeId": "<referee_id>",
  "notes": "Stream on Twitch channel #main"
}
```

> The `format` (BO1/BO3/BO5) is **auto-set** from the season's rule. Do not send it.

### Get matches
```
GET /matches?roundId=<id>          → all matches in a round
GET /matches?seasonId=<id>         → all matches in a season
GET /matches/:id                   → one match
```

### Report results

#### Option A — Submit full series result at once
```
PATCH /matches/:id/result
```
**Body:**
```json
{
  "team1GamesWon": 2,
  "team2GamesWon": 1
}
```
Use this when you have the final score (e.g. 2-1 in a BO3).

#### Option B — Submit game by game (live tracking)
```
POST /matches/:id/game
```
**Body (game 1 result):**
```json
{
  "gameNumber": 1,
  "winnerId": "<team_id>",
  "durationMinutes": 38
}
```
Repeat for game 2, game 3. Server auto-detects when the series winner is reached and marks the match `COMPLETED`.

#### Declare a forfeit
```
PATCH /matches/:id/forfeit
```
**Body:**
```json
{
  "forfeitingTeamId": "<team_id>",
  "forfeitReason": "Team did not show up within the check-in window"
}
```

**Server automatically:**
1. Sets match status to `FORFEIT`
2. Awards win points to the non-forfeiting team
3. Increments `forfeits` counter in standings
4. If `forfeits >= rule.maxForfeitsBeforeDisqualification` → auto-disqualifies the team in SeasonTeam

#### Cancel a match
```
PATCH /matches/:id/cancel
```

### Match status values
| Status | Meaning |
|---|---|
| `SCHEDULED` | Match not yet started |
| `ONGOING` | Match in progress (game results being submitted one by one) |
| `COMPLETED` | Series finished, winner determined |
| `FORFEIT` | One team forfeited |
| `CANCELLED` | Match cancelled by admin |

---

## 8. Standings — Live Season Table

Standings are created automatically when a team registers. They update automatically after every match result or forfeit.

### Get standings for a season
```
GET /standings?seasonId=<season_id>
```

**Response (sorted by rank ascending):**
```json
[
  {
    "_id": "...",
    "seasonId": "...",
    "teamId": "...",
    "rank": 1,
    "played": 5,
    "wins": 4,
    "draws": 0,
    "losses": 1,
    "forfeits": 0,
    "points": 12,
    "gamesWon": 9,
    "gamesLost": 3,
    "gameDiff": 6,
    "scoreFor": 0,
    "scoreAgainst": 0
  }
]
```

**How points are calculated (server-side):**
```
points = (wins × rule.pointsWin) + (draws × rule.pointsDraw) + (losses × rule.pointsLoss)
```

**Ranking order:** `points DESC` → `gameDiff DESC` → `gamesWon DESC`

---

## Season Timeline & Progress Bar

This section describes how to build an admin timeline showing all seasons and their events on a single visual bar — including parallel leagues running at the same time.

### API calls needed to build the timeline

```
GET /leagues?gameId=<id>              → all leagues for a game
GET /seasons?leagueId=<league_id>     → seasons per league (repeat for each league)
GET /rounds?seasonId=<season_id>      → rounds per season
```

### Data shape for the timeline

After fetching, build a timeline dataset like this:

```json
{
  "timelineStart": "2026-01-01",
  "timelineEnd": "2026-12-31",
  "tracks": [
    {
      "leagueName": "VCT Americas",
      "leagueLogo": "https://cdn.../vct-americas.png",
      "color": "#1e3a8a",
      "seasons": [
        {
          "id": "...",
          "name": "VCT Americas 2026",
          "status": "ONGOING",
          "registrationDeadline": "2026-02-15",
          "startDate": "2026-03-01",
          "endDate": "2026-05-31",
          "rounds": [
            { "roundNumber": 1, "startDate": "2026-03-01", "endDate": "2026-03-07", "status": "COMPLETED" },
            { "roundNumber": 2, "startDate": "2026-03-08", "endDate": "2026-03-14", "status": "ONGOING" }
          ]
        }
      ]
    },
    {
      "leagueName": "VCT EMEA",
      "color": "#7c3aed",
      "seasons": [
        {
          "name": "VCT EMEA 2026",
          "startDate": "2026-05-01",
          "endDate": "2026-08-31"
        }
      ]
    },
    {
      "leagueName": "VCT Masters (Global)",
      "color": "#d97706",
      "seasons": [
        { "name": "Masters Jan 2026", "startDate": "2026-01-15", "endDate": "2026-01-25" },
        { "name": "Masters Jun 2026", "startDate": "2026-06-10", "endDate": "2026-06-20" }
      ]
    }
  ]
}
```

### Progress bar rendering logic

Each track is one horizontal row. Each season on that track is a colored segment. Rounds are sub-ticks inside each segment.

```
Position formula:
  left%  = ((season.startDate - timelineStart) / totalDays) * 100
  width% = ((season.endDate - season.startDate) / totalDays) * 100

Round tick position (inside the segment):
  tickLeft% = ((round.startDate - season.startDate) / seasonDays) * 100
```

### Visual legend

| Indicator | Meaning |
|---|---|
| Gray segment | Status = `PLANNED` |
| Blue/colored segment | Status = `ONGOING` |
| Dark/muted segment | Status = `FINISHED` |
| Dashed left border | Registration deadline marker |
| Vertical tick inside bar | Round start date |
| Filled tick | Round `COMPLETED` |
| Pulsing tick | Round `ONGOING` |
| Empty tick | Round `SCHEDULED` |

### React/Vue implementation hints

```js
// Convert date to timeline percentage position
function toPercent(date, timelineStart, totalDays) {
  const elapsed = (new Date(date) - new Date(timelineStart)) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.min(100, (elapsed / totalDays) * 100));
}

// Season bar width
function seasonWidth(season, totalDays) {
  const duration = (new Date(season.endDate) - new Date(season.startDate)) / (1000 * 60 * 60 * 24);
  return (duration / totalDays) * 100;
}

// Status color
const statusColor = {
  PLANNED:  '#6b7280',   // gray
  ONGOING:  '#3b82f6',   // blue
  FINISHED: '#1f2937',   // dark
};

// Round status dot color
const roundColor = {
  SCHEDULED: '#d1d5db',
  ONGOING:   '#f59e0b',
  COMPLETED: '#10b981',
};
```

### Full admin timeline component structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  JAN       FEB       MAR       APR       MAY       JUN       JUL ... DEC   │  ← month ruler
├─────────────────────────────────────────────────────────────────────────────┤
│ VCT Americas  [▓▓▓Registration▓▓▓|══════════════Season══════════════]       │
│ VCT EMEA                                   [▓▓Reg▓▓|═══════Season═══════]  │
│ VCT Pacific                                              [▓Reg|══Season══]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ VCT Masters   [◆]                      [◆]                                  │  ← point events
│ Last Chance Q                                       [◆]                     │
│ VCT Champions                                                         [◆]   │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:  ▓▓ = Registration window   ══ = Active season   ◆ = Tournament event
         | = Registration deadline
```

### Zoom levels for the timeline

Show different levels of detail depending on zoom:

| Zoom | Shows |
|---|---|
| Year view | All leagues, season bars only |
| Month view | Season bars + round ticks |
| Week view | Rounds + individual matches per day |

To get matches for week view:
```
GET /matches?roundId=<round_id>
```

---

## Error Reference

All errors follow this shape:
```json
{
  "statusCode": 400,
  "message": "Cannot register: registration deadline has passed",
  "error": "Bad Request"
}
```

| Code | When |
|---|---|
| `400` | Validation failed, deadline passed, season full, season wrong status |
| `404` | Resource not found (league, season, match, etc.) |
| `409` | Duplicate registration (team already in season) |

---

## Admin Workflow Summary

```
Phase 1 — Setup (one time)
  POST /catalog          → add Valorant, LoL, CS2
  POST /league-rules     → add rule templates per game

Phase 2 — Before Each Season
  POST /leagues          → create the league (if new)
  POST /seasons          → create season with dates + rulesId
  POST /rounds/generate  → generate all weekly matchday slots

Phase 3 — Registration Window
  POST /season-teams     → teams register (deadline enforced automatically)

Phase 4 — Season Start
  PATCH /seasons/:id/activate   → status: PLANNED → ONGOING
  POST /matches                 → schedule all matches per round

Phase 5 — During Season
  PATCH /rounds/:id             → update round status to ONGOING / COMPLETED
  PATCH /matches/:id/result     → submit match results (standings auto-update)
  PATCH /matches/:id/forfeit    → declare forfeit (auto-disqualification if threshold reached)

Phase 6 — Season End
  PATCH /seasons/:id/close      → status: ONGOING → FINISHED (standings frozen)
```

---

## Player-Facing Workflow (read-only)

```
GET /leagues                          → browse leagues by game / region
GET /seasons?leagueId=<id>            → see all seasons for a league
GET /season-teams/season/:seasonId    → see all registered teams
GET /standings?seasonId=<id>          → live rankings table
GET /rounds?seasonId=<id>             → see matchday schedule
GET /matches?roundId=<id>             → see matches in a round
GET /matches/:id                      → match detail with game-by-game results
```
