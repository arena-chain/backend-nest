# ArenaChain — Complete Competitive System Guide
> **This is the definitive reference.** Every entity, endpoint, creation order, and rule is documented here.  
> Frontend developers: read this before writing a single API call.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Entity Reference](#2-entity-reference)
3. [Permanent Entities (Create Once)](#3-permanent-entities-create-once)
4. [Seasonal Entities (Created Per Season)](#4-seasonal-entities-created-per-season)
5. [Creation Order — Step by Step](#5-creation-order--step-by-step)
6. [All API Endpoints](#6-all-api-endpoints)
7. [Prize Pool & Sponsorship System](#7-prize-pool--sponsorship-system)
8. [Bracket System (Knockout)](#8-bracket-system-knockout)
9. [Check-In System](#9-check-in-system)
10. [Season Roster System](#10-season-roster-system)
11. [Match Dispute System](#11-match-dispute-system)
12. [Match Flow — Full Lifecycle](#12-match-flow--full-lifecycle)
13. [Season Timeline UI](#13-season-timeline-ui)
14. [Game-Specific Rules Reference](#14-game-specific-rules-reference)
15. [Error Handling](#15-error-handling)
16. [Status Enums Reference](#16-status-enums-reference)

---

## 1. Architecture Overview

```
PERMANENT (created once, reused forever)
├── Catalog          → Game catalog (Valorant, LoL, CS2...)
├── Partnership      → Sponsors & partners
├── League           → Competition brand (VCT, LEC, ESL...)
└── LeagueRule       → Reusable ruleset templates

SEASONAL (created per season, per event)
├── Season           → One run of a league (VCT 2026 Season 1)
├── PrizePool        → Prize money for that season
├── SeasonTeam       → Team registration for that season
├── SeasonRoster     → Player roster snapshot for that season
├── Round            → Weekly/daily matchday grouping
├── Match            → Individual series (BO1/BO3/BO5)
├── CheckIn          → Pre-match check-in per match
├── Standings        → Live rank table for the season
├── Bracket          → Knockout bracket (if format = KNOCKOUT)
└── MatchDispute     → Post-match dispute/protest
```

**Key rule:** A `League` never has dates, status, or teams. It is just a brand.  
A `Season` is what has dates, teams, prize pools, and standings.

---

## 2. Entity Reference

### Catalog (Game)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `name` | string | "Valorant", "League of Legends", "CS2" |
| `teamSize` | number | 5 for Valorant/LoL, 5 for CS2 |
| `supportsTeams` | boolean | true |
| `supportsSolo` | boolean | false for team games |

### Partnership (Sponsor)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `name` | string | "Red Bull", "Logitech" |
| `logo` | string | URL |
| `type` | string | "Event Sponsor" \| "Platform Sponsor" |
| `website` | string | |

### League
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `gameId` | ObjectId → Catalog | |
| `name` | string | "VCT EMEA 2026" |
| `type` | enum | INTERNATIONAL / CONTINENTAL / NATIONAL / REGIONAL |
| `region` | string | "EMEA", "NA", "Worldwide" |
| `description` | string? | |
| `logoUrl` | string? | |

### LeagueRule (Competition Ruleset)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `name` | string | "Valorant Standard BO3" |
| `gameId` | ObjectId → Catalog | Populated on fetch |
| `formatType` | enum | LEAGUE / SWISS / KNOCKOUT |
| `matchType` | enum | BO1 / BO3 / BO5 |
| `pointsWin` | number | 3 |
| `pointsLoss` | number | 0 |
| `maxTeams` | number | Max teams per season |
| `maxForfeitsBeforeDisqualification` | number | 2 |
| `mapPool` | string[] | ["Ascent","Bind",...] |
| `mapVetoEnabled` | bool | |
| `mapVetoFormat` | enum | See MapVetoFormat in code |
| `vetoFirstPick` | enum | HIGHER_SEED / COIN_FLIP / AWAY_TEAM |
| **ruleUsage** | enum[] | REGULAR_SEASON / PLAYOFFS / GRAND_FINAL / PLAY_IN / QUALIFICATION / GROUP_STAGE — which phase(s) this ruleset applies to |
| **sideSelection** | enum | HIGHER_SEED_CHOOSES / KNIFE_ROUND / COIN_TOSS / VETO_WINNER_CHOOSES / FIXED_TEAM_A_ATTACK |
| **scoreSubmissionMethod** | enum | ADMIN_VERIFIED / BOTH_TEAMS_CONFIRM / AUTO_FROM_API |
| **substitutionsAllowed** | bool | |
| **maxSubstitutions** | number | 0 = use only when substitutionsAllowed |
| **emergencySubsOnly** | bool | |
| **pauseAllowedForDisconnect** | bool | |
| **replayConditions** | string? | Free text for when a replay is allowed |
| **remakeConditions** | string? | Free text for when a remake is allowed |
| **adminDecisionRequired** | bool | |
| `overtimeConfig` | object | See overtime section |
| `extraRules` | object? | Custom JSON |

### Season
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `leagueId` | string | FK → League |
| `rulesId` | string | FK → LeagueRule |
| `name` | string | "2026 Season 1" |
| `startDate` | Date | |
| `endDate` | Date | |
| `registrationDeadline` | Date | Must be before startDate |
| `status` | enum | PLANNED / ONGOING / FINISHED |

### PrizePool
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `seasonId` | string | One per season |
| `leagueId` | string | For display |
| `totalAmount` | number | |
| `currency` | enum | USD / EUR / TND / GBP |
| `source` | enum | PLATFORM / SPONSORED / MIXED |
| `sponsorId` | ObjectId? → Partnership | Required if SPONSORED/MIXED |
| `distribution` | array | `[{ rank, amount, percentage }]` |
| `status` | enum | PENDING / CONFIRMED / DISTRIBUTED |
| `notes` | string? | Public description |

### SeasonTeam (Team Registration)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `seasonId` | string | |
| `teamId` | string | |
| `seed` | number? | 1 = highest seed |
| `status` | enum | ACTIVE / DISQUALIFIED / WITHDRAWN |
| `qualifiedFromSeasonId` | string? | Promotion from previous season |
| `qualifiedViaRank` | number? | What rank they got to qualify |

### SeasonRoster (Player Roster per Season)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `seasonId` | string | |
| `teamId` | string | |
| `playerIds` | ObjectId[] → User | |
| `minRosterSize` | number | Default 5 |
| `maxRosterSize` | number | Default 8 |
| `status` | enum | OPEN / LOCKED |
| `lockedAt` | Date? | Set when locked |

### Round
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `seasonId` | string | |
| `roundNumber` | number | 1, 2, 3... |
| `startDate` | Date | |
| `endDate` | Date | |
| `status` | enum | PLANNED / ACTIVE / COMPLETED |

### Match
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `roundId` | string | |
| `seasonId` | string | |
| `team1Id` | string | |
| `team2Id` | string | |
| `format` | enum | BO1 / BO3 / BO5 — auto-set from rules |
| `scheduledStart` | Date | |
| `scheduledEnd` | Date? | |
| `refereeId` | string? | |
| `status` | enum | SCHEDULED / ONGOING / COMPLETED / FORFEIT / CANCELLED |
| `games` | GameResult[] | Individual game scores |
| `team1GamesWon` | number | Series score |
| `team2GamesWon` | number | Series score |
| `winnerId` | string? | Set on completion |
| `loserId` | string? | |
| `forfeitingTeamId` | string? | |

### GameResult (embedded in Match)
| Field | Type | Notes |
|-------|------|-------|
| `gameNumber` | number | 1, 2, 3... |
| `winnerId` | string | Team that won this map |
| `mapName` | string? | "Ascent", "Dust2" |
| `team1Score` | number? | Rounds/kills won by team1 |
| `team2Score` | number? | Rounds/kills won by team2 |
| `durationMinutes` | number? | |

### CheckIn
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `matchId` | string | One per match |
| `seasonId` | string | |
| `deadline` | Date | When window closes |
| `team1CheckedIn` | bool | |
| `team1CheckedInAt` | Date? | |
| `team2CheckedIn` | bool | |
| `team2CheckedInAt` | Date? | |
| `status` | enum | OPEN / BOTH_READY / TEAM1_MISSED / TEAM2_MISSED / CANCELLED |

### Standings
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `seasonId` | string | |
| `teamId` | string | |
| `played` | number | |
| `wins` | number | |
| `losses` | number | |
| `points` | number | wins × pointsWin + losses × pointsLoss |
| `scoreFor` | number | Total games/rounds won |
| `scoreAgainst` | number | Total games/rounds lost |
| `rank` | number | Live rank (recalculated after each match) |
| `forfeits` | number | |

### Bracket
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `seasonId` | string | One per season |
| `format` | enum | SINGLE_ELIMINATION / DOUBLE_ELIMINATION |
| `totalRounds` | number | Auto-calculated from team count |
| `slots` | BracketSlot[] | All matches in the bracket |
| `status` | enum | PENDING / ACTIVE / COMPLETED |
| `championId` | string? | Winner of the tournament |

### BracketSlot (embedded)
| Field | Type | Notes |
|-------|------|-------|
| `slotId` | string | "R1S1", "R2S1"... |
| `roundNumber` | number | 1 = QF, 2 = SF, 3 = F |
| `position` | number | Left to right position |
| `team1Id` | string? | Filled as bracket progresses |
| `team2Id` | string? | |
| `winnerId` | string? | |
| `matchId` | string? | Linked Match document |
| `nextSlotId` | string? | Where winner advances |
| `status` | enum | PENDING / READY / COMPLETED / BYE |

### MatchDispute
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `matchId` | string | |
| `seasonId` | string | |
| `submittedByTeamId` | string | |
| `reason` | enum | CHEATING / WRONG_RESULT / NO_SHOW / TECHNICAL_ISSUE / RULE_VIOLATION / OTHER |
| `description` | string | |
| `evidenceUrls` | string[] | Screenshot/VOD links |
| `status` | enum | PENDING / UNDER_REVIEW / ACCEPTED / REJECTED |
| `adminNote` | string? | |
| `resolvedAt` | Date? | |
| `resolvedByAdminId` | string? | |

### Team (updated)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `name` | string | "Team Liquid" |
| `tag` | string | "TL" — uppercase, max 8 chars |
| `logo` | string? | |
| `description` | string? | |
| `country` | string? | "France", "Tunisia"... |
| `gameId` | ObjectId? → Catalog | Primary game |
| `captain` | ObjectId? → User | |
| `members` | ObjectId[] → User | |

---

## 3. Permanent Entities (Create Once)

These entities are **created once** and never change per event. They are the foundation.

### Step 1 — Create Game Catalogs
```
POST /catalog
{
  "name": "Valorant",
  "teamSize": 5,
  "supportsTeams": true,
  "supportsSolo": false
}
```
Do this for each game: Valorant, League of Legends, CS2.

### Step 2 — Create Partners/Sponsors (optional)
```
POST /partnerships
{
  "name": "Red Bull",
  "logo": "https://...",
  "type": "Event Sponsor",
  "website": "https://redbull.com"
}
```

### Step 3 — Create League Rule Templates
One ruleset per game configuration. You can have multiple per game (e.g., "Valorant BO3 League", "Valorant BO5 Playoffs").
```
POST /league-rules
{
  "name": "Valorant Standard BO3",
  "gameId": "<catalog-id>",
  "formatType": "LEAGUE",
  "matchType": "BO3",
  "pointsWin": 3,
  "pointsLoss": 0,
  "maxTeams": 10,
  "maxForfeitsBeforeDisqualification": 2,
  "mapPool": ["Ascent", "Bind", "Haven", "Icebox", "Lotus", "Pearl", "Split"],
  "mapVetoEnabled": true,
  "mapVetoFormat": "BAN_PICK_BAN",
  "vetoFirstPick": "HIGHER_SEED",
  "overtimeConfig": {
    "enabled": true,
    "format": "SUDDEN_DEATH",
    "maxOvertimePeriods": 2
  }
}
```

### Step 4 — Create Leagues
```
POST /leagues
{
  "gameId": "<catalog-id>",
  "name": "VCT EMEA",
  "type": "CONTINENTAL",
  "region": "EMEA",
  "description": "Valorant Champions Tour EMEA",
  "logoUrl": "https://..."
}
```

---

## 4. Seasonal Entities (Created Per Season)

These are created **each new season** and link back to permanent entities.

The full order per season:

```
Season → PrizePool → SeasonTeam registrations → SeasonRosters
  → Rounds → Matches → CheckIns → [Match Results] → Standings
  → [Bracket if KNOCKOUT] → Close Season → Distribute Prizes
```

---

## 5. Creation Order — Step by Step

### Phase 1: Setup (Admin)
```
1. Create Season
2. Create PrizePool for Season
3. Open registration (Season status = PLANNED)
4. Teams register → SeasonTeam created
5. Teams submit rosters → SeasonRoster created + players added
6. Registration deadline arrives → lock all rosters
7. Activate Season → Season status = ONGOING
```

### Phase 2: Competition (Admin + Auto)
```
8.  Create Rounds (Round 1, Round 2, ...)
9.  Create Matches inside each Round
10. Create CheckIn for each Match (set deadline = scheduledStart - 30min)
11. Teams check in via their app
12. Match goes ONGOING
13. Admin reports game results → standings auto-updated
14. Repeat for all rounds
```

### Phase 3: Playoffs (Knockout format)
```
15. Generate Bracket (POST /brackets/generate) with seeded teams from standings
16. As each bracket match completes → POST /brackets/:seasonId/advance
17. Bracket auto-propagates winners to next round
```

### Phase 4: Close
```
18. All matches done → Close Season (PATCH /seasons/:id/close)
19. Mark Prize Pool as DISTRIBUTED
20. Archive standings
```

---

## 6. All API Endpoints

### Catalog
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/catalog` | Create game |
| GET | `/catalog` | List all games |
| GET | `/catalog/:id` | Get game by ID |
| PATCH | `/catalog/:id` | Update game |
| DELETE | `/catalog/:id` | Delete game |

### Partnerships
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/partnerships` | Create partner |
| GET | `/partnerships` | List all partners |
| GET | `/partnerships/:id` | Get partner |
| PATCH | `/partnerships/:id` | Update partner |
| DELETE | `/partnerships/:id` | Delete partner |

### League Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/league-rules` | Create ruleset |
| GET | `/league-rules` | List all (optional `?gameId=`) |
| GET | `/league-rules/:id` | Get ruleset (populated with game) |
| PATCH | `/league-rules/:id` | Update ruleset |
| DELETE | `/league-rules/:id` | Delete ruleset |

### Leagues
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/leagues` | Create league |
| GET | `/leagues` | List all |
| GET | `/leagues/:id` | Get league |
| PATCH | `/leagues/:id` | Update league |
| DELETE | `/leagues/:id` | Delete league |

### Seasons
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/seasons` | Create season |
| GET | `/seasons` | List all (optional `?leagueId=`) |
| GET | `/seasons/:id` | Get season |
| PATCH | `/seasons/:id` | Update season |
| PATCH | `/seasons/:id/activate` | → status ONGOING |
| PATCH | `/seasons/:id/close` | → status FINISHED |

### Prize Pools
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/prize-pools` | Create prize pool for season |
| GET | `/prize-pools/by-season?seasonId=` | Get season's prize pool |
| GET | `/prize-pools/by-league?leagueId=` | All prize pools for league |
| GET | `/prize-pools/:id` | Get by ID |
| PATCH | `/prize-pools/:id` | Update |
| PATCH | `/prize-pools/:id/distribute` | Mark as DISTRIBUTED |
| DELETE | `/prize-pools/:id` | Delete |

### Season Teams (Registrations)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/season-teams` | Register team to season |
| GET | `/season-teams?seasonId=` | List teams in season |
| GET | `/season-teams/:id` | Get registration |
| PATCH | `/season-teams/:id` | Update seed/status |
| PATCH | `/season-teams/:id/withdraw` | Team withdraws |
| PATCH | `/season-teams/:id/disqualify` | Admin disqualifies |

### Season Rosters
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/season-rosters` | Create roster for team |
| POST | `/season-rosters/:seasonId/:teamId/players` | Add player `{ playerId }` |
| DELETE | `/season-rosters/:seasonId/:teamId/players` | Remove player `{ playerId }` |
| PATCH | `/season-rosters/:seasonId/:teamId/lock` | Lock roster |
| PATCH | `/season-rosters/:seasonId/lock-all` | Lock all rosters in season |
| GET | `/season-rosters/by-season?seasonId=` | All rosters in season |
| GET | `/season-rosters/:seasonId/:teamId` | Get team roster |

### Rounds
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rounds` | Create round |
| POST | `/rounds/generate` | Auto-generate rounds `{ seasonId, count, startDate, intervalDays }` |
| GET | `/rounds?seasonId=` | List rounds for season |
| GET | `/rounds/:id` | Get round |
| PATCH | `/rounds/:id` | Update round |
| PATCH | `/rounds/:id/activate` | → ACTIVE |
| PATCH | `/rounds/:id/complete` | → COMPLETED |

### Matches
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/matches` | Create match |
| GET | `/matches?seasonId=` | List matches for season |
| GET | `/matches?roundId=` | List matches for round |
| GET | `/matches/:id` | Get match |
| PATCH | `/matches/:id/start` | → ONGOING |
| PATCH | `/matches/:id/result` | Submit game result `{ gameNumber, winnerId, mapName, team1Score, team2Score }` |
| PATCH | `/matches/:id/full-result` | Submit complete series result |
| PATCH | `/matches/:id/forfeit` | Submit forfeit `{ forfeitingTeamId, reason }` |
| DELETE | `/matches/:id` | Delete match |

### Check-Ins
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/check-ins` | Create check-in for match `{ matchId, seasonId, deadline }` |
| POST | `/check-ins/:matchId/team/:teamId?team1Id=` | Team checks in |
| GET | `/check-ins/by-match/:matchId` | Get check-in for match |
| GET | `/check-ins/by-season?seasonId=` | All check-ins in season |
| PATCH | `/check-ins/:matchId/cancel` | Cancel check-in |
| POST | `/check-ins/process-expired` | Admin: mark missed check-ins |

### Standings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/standings?seasonId=` | Get standings for season (sorted by rank) |
| GET | `/standings/:id` | Get team's standing |

### Brackets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/brackets/generate` | Generate bracket `{ seasonId, format, seededTeamIds }` |
| PATCH | `/brackets/:seasonId/advance` | Advance winner `{ slotId, winnerId, matchId }` |
| GET | `/brackets/by-season?seasonId=` | Get bracket for season |
| GET | `/brackets/:id` | Get by ID |
| DELETE | `/brackets/:seasonId` | Delete bracket |

### Match Disputes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/match-disputes` | Submit dispute |
| GET | `/match-disputes/pending` | All open disputes (admin queue) |
| GET | `/match-disputes/by-match/:matchId` | Disputes for a match |
| GET | `/match-disputes/by-season?seasonId=&status=` | Season disputes |
| GET | `/match-disputes/:id` | Get dispute |
| PATCH | `/match-disputes/:id/review` | → UNDER_REVIEW |
| PATCH | `/match-disputes/:id/resolve` | `{ verdict: ACCEPTED|REJECTED, adminNote, resolvedByAdminId }` |

---

## 7. Prize Pool & Sponsorship System

### Source Types
| Source | Description |
|--------|-------------|
| `PLATFORM` | ArenaChain funds the entire prize pool |
| `SPONSORED` | An external partner (Partnership entity) funds it |
| `MIXED` | Both platform + sponsor contribute |

### Distribution Array
Each entry defines how much a specific rank receives:
```json
{
  "distribution": [
    { "rank": 1, "amount": 5000, "percentage": 50 },
    { "rank": 2, "amount": 2500, "percentage": 25 },
    { "rank": 3, "amount": 1500, "percentage": 15 },
    { "rank": 4, "amount": 1000, "percentage": 10 }
  ]
}
```

### Lifecycle
```
PENDING → (admin confirms) → CONFIRMED → (season ends) → DISTRIBUTED
```

### Frontend Display
- Show prize breakdown below the standings table
- Show sponsor logo if `sponsorId` is populated (use `sponsorId.logo`)
- Show `DISTRIBUTED` badge when season is finished

---

## 8. Bracket System (Knockout)

### Generate Bracket
After standings are computed for the regular season (or when a pure KNOCKOUT format starts), seed the qualifying teams and generate the bracket:

```json
POST /brackets/generate
{
  "seasonId": "...",
  "format": "SINGLE_ELIMINATION",
  "seededTeamIds": ["team1", "team2", "team3", "team4", "team5", "team6", "team7", "team8"]
}
```

Teams are paired: seed 1 vs seed 8, seed 2 vs seed 7, etc.

### Slot IDs
- `R1S1` = Round 1, Slot 1 (seed 1 vs seed 8)
- `R1S2` = Round 1, Slot 2 (seed 2 vs seed 7)
- `R2S1` = Semi-final 1 (winner R1S1 vs winner R1S2)
- `R3S1` = Grand Final

### After Each Bracket Match
When a match in a bracket is completed, call:
```json
PATCH /brackets/:seasonId/advance
{
  "slotId": "R1S1",
  "winnerId": "team1-id",
  "matchId": "match-id"
}
```
The system automatically places the winner into `nextSlotId` and sets that slot to `READY` when both teams are assigned.

### Bracket UI Rendering
```
Round 1 (QF)          Round 2 (SF)        Round 3 (Final)
[Seed 1 vs Seed 8] →
                        [Winner → ]
[Seed 4 vs Seed 5] →               →       [CHAMPION]
                        [Winner → ]
[Seed 2 vs Seed 7] →
                        [Winner → ]
[Seed 3 vs Seed 6] →
```

Render by grouping `slots` by `roundNumber`. Status colors:
- `PENDING` → grey (TBD)
- `READY` → yellow (teams assigned, waiting for match)
- `COMPLETED` → green (winner set)
- `BYE` → blue (auto-advance)

---

## 9. Check-In System

### Purpose
Ensures both teams are online and ready 15-30 minutes before a match starts. If a team misses check-in, the match can be auto-forfeited.

### Typical Deadline
```
deadline = match.scheduledStart - 30 minutes
```

### Flow
```
1. Admin creates match
2. Admin creates check-in: POST /check-ins { matchId, seasonId, deadline }
3. Team 1 captain presses "Check In": POST /check-ins/:matchId/team/:team1Id?team1Id=:team1Id
4. Team 2 captain presses "Check In": POST /check-ins/:matchId/team/:team2Id?team1Id=:team1Id
5. When both checked in → status = BOTH_READY
6. Admin processes expired: POST /check-ins/process-expired
   → Teams that didn't check in get status TEAM1_MISSED or TEAM2_MISSED
   → Admin can then call forfeit on the match
```

### Check-In UI
Show a countdown timer to the deadline. Each team's status is shown as:
- Not checked in → Red dot
- Checked in → Green checkmark with timestamp

---

## 10. Season Roster System

### Purpose
Locks the official player roster for each team at the time of the registration deadline. After locking, no additions or removals are allowed.

### Flow
```
1. Team registers: POST /season-teams
2. Team creates roster: POST /season-rosters { seasonId, teamId }
3. Team adds players: POST /season-rosters/:seasonId/:teamId/players { playerId }
4. Repeat until roster is complete
5. Registration deadline arrives:
   PATCH /season-rosters/:seasonId/lock-all
   → All rosters with enough players get locked
6. Locked rosters cannot be modified
```

### Rules Enforced
- Cannot add player if `status = LOCKED`
- Cannot exceed `maxRosterSize` (default 8)
- Cannot lock if players count < `minRosterSize` (default 5)

### Roster UI
Show the roster as a list of player cards. During OPEN period, show add/remove buttons. After deadline, show a "LOCKED" badge.

---

## 11. Match Dispute System

### Purpose
Allows teams to formally protest the result of a completed match. An admin reviews and can overturn the result.

### Dispute Reasons
| Reason | When to use |
|--------|-------------|
| `CHEATING` | Evidence of hacks or exploits |
| `WRONG_RESULT` | Score was reported incorrectly |
| `NO_SHOW` | Opponent didn't appear |
| `TECHNICAL_ISSUE` | Server crash, disconnect |
| `RULE_VIOLATION` | Opponent broke rules |
| `OTHER` | Anything else |

### Flow
```
1. Team submits dispute: POST /match-disputes
   { matchId, seasonId, submittedByTeamId, reason, description, evidenceUrls: [] }
2. Admin sees it in queue: GET /match-disputes/pending
3. Admin opens review: PATCH /match-disputes/:id/review
4. Admin resolves: PATCH /match-disputes/:id/resolve
   { verdict: "ACCEPTED" | "REJECTED", adminNote: "...", resolvedByAdminId: "..." }
```

### Status Flow
```
PENDING → UNDER_REVIEW → ACCEPTED | REJECTED
```

> **Note:** The system does not auto-revert standings on ACCEPTED. An admin must manually call the match forfeit or correct the standings. This is by design for full control.

---

## 12. Match Flow — Full Lifecycle

```
SCHEDULED → ONGOING → COMPLETED
          ↘          ↗
           FORFEIT
           CANCELLED
```

### Reporting a BO3 Series (Valorant example)
```
# Game 1: Team A wins Ascent 13-7
PATCH /matches/:id/result
{ "gameNumber": 1, "winnerId": "teamA", "mapName": "Ascent", "team1Score": 13, "team2Score": 7 }

# Game 2: Team B wins Bind 13-11
PATCH /matches/:id/result
{ "gameNumber": 2, "winnerId": "teamB", "mapName": "Bind", "team1Score": 11, "team2Score": 13 }

# Game 3: Team A wins Haven 13-9
PATCH /matches/:id/result
{ "gameNumber": 3, "winnerId": "teamA", "mapName": "Haven", "team1Score": 13, "team2Score": 9 }

→ series score: teamA 2 – 1 teamB
→ match.status → COMPLETED
→ match.winnerId → teamA
→ standings auto-updated (teamA +3pts, teamB +0pts)
→ forfeit count checked → auto-disqualify if exceeded
```

### Reporting a Forfeit
```
PATCH /matches/:id/forfeit
{ "forfeitingTeamId": "teamB", "reason": "No-show" }
→ match.status → FORFEIT
→ standings auto-updated
→ SeasonTeam forfeit count incremented
→ If forfeit count >= maxForfeitsBeforeDisqualification → SeasonTeam → DISQUALIFIED
```

---

## 13. Season Timeline UI

The timeline bar spans from `season.startDate` to `season.endDate`.

### What to show on the timeline
```
[Registration Deadline]──────[Round 1]──[Round 2]──...──[Round N]──[Playoffs]──[Season End]
```

#### Data to fetch
```
GET /seasons/:id          → season dates, status
GET /rounds?seasonId=     → all rounds (startDate, endDate, status, roundNumber)
GET /prize-pools/by-season?seasonId= → prize pool info
GET /brackets/by-season?seasonId=    → if format = KNOCKOUT
```

#### Position calculation
```javascript
function getPositionPercent(date, seasonStart, seasonEnd) {
  const total = seasonEnd - seasonStart;
  const elapsed = date - seasonStart;
  return (elapsed / total) * 100;
}
```

#### Rendering rules
- **Rounds:** Each round = a segment block with width proportional to duration
- **Registration Deadline:** Vertical red line at `season.registrationDeadline`
- **Today marker:** Vertical blue line at `new Date()`
- **Completed rounds:** green fill
- **Active round:** yellow fill with pulse animation
- **Upcoming rounds:** grey fill
- **Season status badge:** show `PLANNED` / `ONGOING` / `FINISHED`
- **Prize amount:** display under season title if prize pool exists

---

## 14. Game-Specific Rules Reference

### Valorant
| Setting | Value |
|---------|-------|
| Team size | 5v5 |
| Match types | BO1, BO3, BO5 |
| Map game | Each map = 1 game in the series |
| Overtime | Sudden death (most wins) — enabled by default |
| Max overtime periods | 2 (configurable) |
| Draws | Not possible (overtime resolves ties) |
| Veto | Yes — BAN_PICK_BAN for BO3, full alternating for BO5 |

### League of Legends
| Setting | Value |
|---------|-------|
| Team size | 5v5 |
| Match types | BO1, BO3, BO5 |
| Map game | Each game on Summoner's Rift |
| Overtime | None — game always ends with a winner |
| Draws | Not possible |
| Veto | Side selection / no map veto (single map game) |
| Map pool | Leave empty or `["Summoner's Rift"]` |

### CS2
| Setting | Value |
|---------|-------|
| Team size | 5v5 |
| Match types | BO1, BO3, BO5 |
| Map game | Each map = 1 game in the series |
| Overtime | MR3 format (3 rounds per half, starts at $10,000) |
| Max overtime periods | Unlimited (configurable) |
| Draws | Possible if `allowDrawIfDisabled = true` |
| Veto | Yes — SNAKE or ALTERNATING format |

### LeagueRule overtime config examples
```json
// Valorant
"overtimeConfig": {
  "enabled": true,
  "format": "SUDDEN_DEATH",
  "maxOvertimePeriods": 2,
  "allowDrawIfDisabled": false
}

// LoL
"overtimeConfig": {
  "enabled": false,
  "allowDrawIfDisabled": false
}

// CS2
"overtimeConfig": {
  "enabled": true,
  "format": "MR3",
  "maxRoundsPerPeriod": 3,
  "startMoney": 10000,
  "maxOvertimePeriods": null,
  "allowDrawIfDisabled": true
}
```

---

## 15. Error Handling

### Common Error Codes
| Status | Code | Meaning | Action |
|--------|------|---------|--------|
| 400 | BAD_REQUEST | Invalid data | Check request body |
| 409 | CONFLICT | Duplicate resource | E.g., team already registered |
| 404 | NOT_FOUND | Entity doesn't exist | Check IDs |
| 400 | `Season not PLANNED` | Tried to register after activation | Show error message |
| 400 | `Registration deadline has passed` | Registration window closed | Show deadline |
| 400 | `Season is full` | maxTeams reached | Show "waitlist" option |
| 400 | `Roster is locked` | Tried to modify after deadline | Inform user |
| 400 | `Roster has X players, minimum is Y` | Tried to lock too early | Prompt to add players |
| 409 | `Open dispute already exists` | Team submitted a second dispute | Show existing dispute |
| 409 | `Bracket already exists` | Generated bracket twice | Fetch existing bracket |

### Frontend Pattern
```javascript
try {
  const res = await api.post('/season-teams', payload);
  showSuccess('Team registered!');
} catch (err) {
  if (err.response?.status === 409) {
    showError('Team is already registered for this season.');
  } else if (err.response?.status === 400) {
    showError(err.response.data.message);
  } else {
    showError('Unexpected error. Please try again.');
  }
}
```

---

## 16. Status Enums Reference

```typescript
// Season
PLANNED | ONGOING | FINISHED

// SeasonTeam
ACTIVE | DISQUALIFIED | WITHDRAWN

// SeasonRoster
OPEN | LOCKED

// Round
PLANNED | ACTIVE | COMPLETED

// Match
SCHEDULED | ONGOING | COMPLETED | FORFEIT | CANCELLED

// CheckIn
OPEN | BOTH_READY | TEAM1_MISSED | TEAM2_MISSED | CANCELLED

// Standings — no status, always live

// Bracket
PENDING | ACTIVE | COMPLETED

// BracketSlot
PENDING | READY | COMPLETED | BYE

// PrizePool
PENDING | CONFIRMED | DISTRIBUTED

// MatchDispute
PENDING | UNDER_REVIEW | ACCEPTED | REJECTED

// LeagueRule formatType
LEAGUE | SWISS | KNOCKOUT

// LeagueRule matchType
BO1 | BO3 | BO5

// LeagueRule ruleUsage (array — which phase(s) this ruleset applies to)
REGULAR_SEASON | PLAYOFFS | GRAND_FINAL | PLAY_IN | QUALIFICATION | GROUP_STAGE

// LeagueRule sideSelection
HIGHER_SEED_CHOOSES | KNIFE_ROUND | COIN_TOSS | VETO_WINNER_CHOOSES | FIXED_TEAM_A_ATTACK

// LeagueRule scoreSubmissionMethod
ADMIN_VERIFIED | BOTH_TEAMS_CONFIRM | AUTO_FROM_API

// MapVetoFormat
SNAKE | ALTERNATING | BAN_PICK_BAN

// VetoFirstPick
HIGHER_SEED | COIN_FLIP | AWAY_TEAM

// OvertimeFormat
SUDDEN_DEATH | MR3 | EXTRA_TIME

// PrizeSource
PLATFORM | SPONSORED | MIXED

// PrizeCurrency
USD | EUR | TND | GBP

// DisputeReason
CHEATING | WRONG_RESULT | NO_SHOW | TECHNICAL_ISSUE | RULE_VIOLATION | OTHER

// BracketFormat
SINGLE_ELIMINATION | DOUBLE_ELIMINATION

// League type
INTERNATIONAL | CONTINENTAL | NATIONAL | REGIONAL
```

---

*This document covers every entity, endpoint, and business rule in the ArenaChain competitive system. No other documentation file supersedes this one.*
