# ArenaChain — Competitive League System

Full reference for every entity in the competitive system: its purpose, its rules, its fields, and its relations to other entities and to specific games (Valorant, League of Legends, CS2).

---

## Entity Map

```
Catalog (game registry)
    │
    └──▶ LeagueRule (competition rules template, reusable)
    │
    └──▶ League (permanent brand/identity)
                │
                └──▶ Season (one competitive run)
                            │
                            ├──▶ SeasonTeam × N   (team enrollments)
                            │
                            ├──▶ Round × N         (weekly matchdays)
                            │         │
                            │         └──▶ Match × N    (one series between two teams)
                            │                   │
                            │                   └──▶ GameResult[] (individual maps/games)
                            │
                            └──▶ Standings × N    (one row per team, live updated)

                            ▲
                            │
                        LeagueRule ──────────────────── (referenced by Season.rulesId)
```

---

## 1. Catalog — Game Registry

**File:** `src/catalog/schemas/catalog.entity.ts`

**Purpose:** The master list of supported games on the platform. Every league, rule set, and match traces back to a Catalog entry. Think of it as the game's identity card.

### Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `title` | string | yes | Official game name (e.g. "Valorant") |
| `description` | string | no | Short description of the game |
| `genre` | string | yes | e.g. "Tactical Shooter", "MOBA" |
| `publisher` | string | no | e.g. "Riot Games" |
| `platforms` | string[] | no | e.g. `["PC"]` |
| `isActive` | boolean | no | Whether this game is available for leagues (default: true) |
| `releaseDate` | Date | no | — |
| `coverImageUrl` | string | no | — |
| `teamSize` | number | no | How many players per team (default: 5) |
| `supportsTeams` | boolean | no | Whether team-based competitions are supported (default: true) |
| `supportsSolo` | boolean | no | Whether 1v1 competitions are supported (default: false) |
| `metadata` | JSON | no | Any extra game-specific data |

### Relations

- **Referenced by** `League.gameId` → a league is always tied to one game
- **Referenced by** `LeagueRule.gameId` → rules are written for a specific game

### Game-Specific Values

| | Valorant | League of Legends | CS2 |
|---|---|---|---|
| `genre` | Tactical Shooter | MOBA | Tactical Shooter |
| `publisher` | Riot Games | Riot Games | Valve |
| `teamSize` | 5 | 5 | 5 |
| `supportsTeams` | true | true | true |
| `supportsSolo` | false | false | false |

---

## 2. LeagueRule — Competition Rules Template

**File:** `src/league-rule/schemas/league-rule.schema.ts`

**Purpose:** A reusable configuration template that defines how a competition is run. You create it once and attach it to as many seasons as you want. Changing the template does not affect seasons that already reference it.

### Fields

| Field | Type | Required | Default | Rule |
|---|---|---|---|---|
| `name` | string | yes | — | Human label, e.g. "Valorant Standard BO3" |
| `gameId` | string | yes | — | FK → Catalog |
| `formatType` | enum | yes | `LEAGUE` | `LEAGUE` = full round-robin table / `SWISS` = Swiss-system brackets / `KNOCKOUT` = single/double elimination |
| `matchType` | enum | yes | `BO3` | Default series format: `BO1`, `BO3`, or `BO5` |
| `pointsWin` | number | yes | 3 | Points awarded to the winner of a match |
| `pointsDraw` | number | yes | 1 | Points awarded to each team in a draw |
| `pointsLoss` | number | yes | 0 | Points awarded to the loser |
| `maxTeams` | number | yes | 16 | Maximum teams allowed per season using these rules |
| `maxForfeitsBeforeDisqualification` | number | yes | 3 | How many forfeits before a team is auto-disqualified |
| `forfeitCountsAsLoss` | boolean | no | true | Whether a forfeit counts as a loss in the standings |
| `tiebreaker` | enum | yes | `GAME_DIFF` | What breaks a points tie: `POINTS` (secondary calc) / `GAME_DIFF` (maps won−lost) / `HEAD_TO_HEAD` (direct result) |
| `extraRules` | JSON | no | — | Any additional custom rules as a JSON object |

### Relations

- **References** `Catalog` via `gameId`
- **Referenced by** `Season.rulesId` — a season locks in exactly one rule set

### Enums

```
FormatType:    LEAGUE | SWISS | KNOCKOUT
MatchFormat:   BO1 | BO3 | BO5
TiebreakerRule: POINTS | GAME_DIFF | HEAD_TO_HEAD
```

### Game-Specific Rule Templates

| | Valorant (regular) | Valorant (finals) | LoL (regular) | LoL (finals) | CS2 (regular) |
|---|---|---|---|---|---|
| `formatType` | LEAGUE | KNOCKOUT | LEAGUE | KNOCKOUT | LEAGUE |
| `matchType` | BO3 | BO5 | BO3 | BO5 | BO3 |
| `pointsWin` | 3 | — | 3 | — | 3 |
| `pointsDraw` | 0 | — | 0 | — | 1 |
| `pointsLoss` | 0 | — | 0 | — | 0 |
| `tiebreaker` | GAME_DIFF | — | GAME_DIFF | — | GAME_DIFF |
| `maxTeams` | 8–16 | — | 8–16 | — | 8–16 |

> Valorant and LoL do not have draws. CS2 individual maps can end in a draw (15–15 regulation).

---

## 3. League — Permanent Brand Container

**File:** `src/league/schemas/league.schema.ts`

**Purpose:** The long-lived identity of a competition. A league never expires — it exists as long as the brand does (e.g. "Tunisia Valorant Championship"). Each competitive run is a Season inside it.

### Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `name` | string | yes | Official league name |
| `level` | enum | yes | Hierarchy level: `INTERNATIONAL` / `CONTINENTAL` / `NATIONAL` / `REGIONAL` |
| `regionId` | string | yes | Region code from the regions constant (e.g. "TN", "EUROPE") |
| `gameId` | string | yes | FK → Catalog — which game this league is for |
| `description` | string | no | Public description shown to players |

### Relations

- **References** `Catalog` via `gameId`
- **Has many** `Season` — each season is one competitive run under this league

### Constraint

A league has no dates and no status. It is permanent. Dates and lifecycle belong to **Season**.

---

## 4. Season — One Competitive Run

**File:** `src/season/schemas/season.schema.ts`

**Purpose:** One execution of a league with fixed dates, a registered pool of teams, and a linked rule set. The season is the core operational unit — everything else (rounds, matches, standings) belongs to a season.

### Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `leagueId` | string | yes | FK → League |
| `rulesId` | string | yes | FK → LeagueRule — locks in the rules for this season |
| `name` | string | yes | e.g. "Spring Split 2026" |
| `registrationDeadline` | Date | yes | Teams cannot register after this date |
| `startDate` | Date | yes | First match day |
| `endDate` | Date | yes | Last match day |
| `status` | enum | yes | `PLANNED` → `ONGOING` → `FINISHED` |
| `description` | string | no | — |

### Status Lifecycle

```
PLANNED ──▶ ONGOING ──▶ FINISHED
```

- `PLANNED`: Season created, registration open until `registrationDeadline`
- `ONGOING`: Competition has started, no more registrations
- `FINISHED`: All rounds completed, final standings frozen

### Relations

- **References** `League` via `leagueId`
- **References** `LeagueRule` via `rulesId`
- **Has many** `SeasonTeam` — all enrolled teams
- **Has many** `Round` — all matchdays
- **Has many** `Standings` — live ranking table

---

## 5. SeasonTeam — Team Enrollment

**File:** `src/league-registration/schemas/season-team.schema.ts`

**Purpose:** Links a team to a specific season. Acts as the enrollment record. A team does not participate in a season until a `SeasonTeam` record exists. The same team can participate in multiple seasons across different years.

### Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `seasonId` | string | yes | FK → Season |
| `teamId` | string | yes | FK → Team |
| `seed` | number | no | Optional initial seeding (1 = strongest). Used to generate balanced brackets |
| `status` | enum | yes | `ACTIVE` / `DISQUALIFIED` / `WITHDRAWN` (default: `ACTIVE`) |

### Status Lifecycle

```
ACTIVE ──▶ WITHDRAWN   (team leaves voluntarily)
ACTIVE ──▶ DISQUALIFIED (admin action, e.g. too many forfeits)
```

### Constraints

- A team can only be registered **once** per season (`unique: { seasonId, teamId }`)
- The total number of `ACTIVE` teams must not exceed `LeagueRule.maxTeams`
- Registration must happen before `Season.registrationDeadline`

### Relations

- **References** `Season` via `seasonId`
- **References** `Team` via `teamId`

---

## 6. Round — Weekly Matchday

**File:** `src/round/schemas/round.schema.ts`

**Purpose:** Groups all the matches that take place in a given week or phase of a season. In a 16-team round-robin league, there are 15 rounds. In a knockout bracket, each round is an elimination phase.

### Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `seasonId` | string | yes | FK → Season |
| `roundNumber` | number | yes | Sequential number starting at 1 (unique per season) |
| `startDate` | Date | yes | Start of the matchday window |
| `endDate` | Date | yes | End of the matchday window |
| `status` | enum | yes | `SCHEDULED` / `ONGOING` / `COMPLETED` (default: `SCHEDULED`) |

### Constraints

- `{ seasonId, roundNumber }` is **unique** — no two rounds can share the same number in the same season
- `roundNumber` must be ≥ 1

### Relations

- **References** `Season` via `seasonId`
- **Has many** `Match`
- League is reachable via `Round.seasonId → Season.leagueId` (no need to store it directly)

---

## 7. Match — Series Between Two Teams

**File:** `src/match/schemas/match.schema.ts`

**Purpose:** One competitive series between two teams within a round. For a BO3, this document tracks all three individual game results and determines the series winner. The `games[]` array holds the result of each individual map or game played.

### Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `roundId` | string | yes | FK → Round |
| `seasonId` | string | yes | FK → Season (kept for direct queries without joining) |
| `team1Id` | string | yes | FK → Team |
| `team2Id` | string | yes | FK → Team |
| `format` | enum | yes | `BO1` / `BO3` / `BO5` — copied from `LeagueRule.matchType` at creation time, can be overridden |
| `scheduledStart` | Date | yes | Planned start time |
| `scheduledEnd` | Date | no | Planned end time |
| `refereeId` | string | no | FK → Referee (optional assignment) |
| `status` | enum | yes | `SCHEDULED` → `ONGOING` → `COMPLETED` / `FORFEIT` / `CANCELLED` |
| `games` | GameResult[] | — | Individual game results within the series (see below) |
| `team1GamesWon` | number | — | Count of individual games won by team 1 (default: 0) |
| `team2GamesWon` | number | — | Count of individual games won by team 2 (default: 0) |
| `winnerId` | string | no | Set when status = COMPLETED or FORFEIT |
| `loserId` | string | no | Set when status = COMPLETED or FORFEIT |
| `forfeitingTeamId` | string | no | Which team forfeited |
| `forfeitReason` | string | no | Reason text |
| `notes` | string | no | Admin notes |

### GameResult (embedded subdocument)

Each element in `games[]` represents one individual game (map) played within the series:

| Field | Type | Rule |
|---|---|---|
| `gameNumber` | number | 1, 2, 3 — position in the series |
| `winnerId` | string | teamId of the map/game winner |
| `durationMinutes` | number | How long this game lasted (optional) |

### Status Lifecycle

```
SCHEDULED ──▶ ONGOING ──▶ COMPLETED
                      ──▶ FORFEIT
                      ──▶ CANCELLED
```

### Win Condition per Format

| Format | Win Condition |
|---|---|
| BO1 | First to win 1 game |
| BO3 | First to win 2 games |
| BO5 | First to win 3 games |

### Game-Specific Notes

| | Valorant | League of Legends | CS2 |
|---|---|---|---|
| `format` (regular) | BO3 | BO3 | BO3 |
| `format` (finals) | BO5 | BO5 | BO5 |
| Individual game = | one map | one game | one map |
| `durationMinutes` typical | 35–50 min | 25–45 min | 30–50 min |
| Draws possible? | No | No | Yes (map can end 15–15) |

### Relations

- **References** `Round` via `roundId`
- **References** `Season` via `seasonId`
- **References** `Team` via `team1Id` and `team2Id`
- **References** `Referee` via `refereeId` (optional)

---

## 8. Standings — Live Season Table

**File:** `src/standings/schemas/standings.schema.ts`

**Purpose:** The live ranking table for one season. One row per team. Updated after every match completes. Frozen permanently when the season reaches `FINISHED`. Historical seasons keep their standings forever.

### Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `seasonId` | string | yes | FK → Season |
| `teamId` | string | yes | FK → Team |
| `played` | number | yes | Total matches played (default: 0) |
| `wins` | number | yes | Match wins (default: 0) |
| `draws` | number | yes | Match draws (default: 0) |
| `losses` | number | yes | Match losses (default: 0) |
| `forfeits` | number | yes | Forfeits received (default: 0) — used to trigger disqualification |
| `points` | number | yes | `wins × pointsWin + draws × pointsDraw` (default: 0) |
| `scoreFor` | number | no | Total score/rounds won across all matches (game-specific) |
| `scoreAgainst` | number | no | Total score/rounds lost across all matches |
| `gamesWon` | number | no | Individual maps/games won across all series |
| `gamesLost` | number | no | Individual maps/games lost across all series |
| `gameDiff` | number | no | `gamesWon − gamesLost` — primary tiebreaker in most game formats |
| `rank` | number | yes | Live position: 1 = first place (default: 0 = not yet ranked) |

### Constraints

- `{ seasonId, teamId }` is **unique** — one row per team per season
- Points are always computed from the rule set: `points = (wins × rule.pointsWin) + (draws × rule.pointsDraw)`
- `rank` is recomputed after every match result

### Tiebreaker Order (from LeagueRule)

1. `POINTS` — total points
2. `GAME_DIFF` — `gamesWon − gamesLost`
3. `HEAD_TO_HEAD` — result of the direct match between the tied teams

### Relations

- **References** `Season` via `seasonId`
- **References** `Team` via `teamId`
- Rules for point calculation come from `Season.rulesId → LeagueRule`

### Game-Specific Standings Usage

| Field | Valorant | League of Legends | CS2 |
|---|---|---|---|
| `gamesWon/Lost` | Maps won/lost | Games won/lost | Maps won/lost |
| `scoreFor/Against` | Not standard | Not standard | Rounds won/lost across all maps |
| `draws` | Always 0 | Always 0 | Can be > 0 (map draws) |

---

## Full Relation Summary

| Entity | References (FK out) | Referenced by (FK in) |
|---|---|---|
| `Catalog` | — | `League.gameId`, `LeagueRule.gameId` |
| `League` | `Catalog` via `gameId` | `Season.leagueId` |
| `LeagueRule` | `Catalog` via `gameId` | `Season.rulesId` |
| `Season` | `League`, `LeagueRule` | `SeasonTeam`, `Round`, `Standings` |
| `SeasonTeam` | `Season`, `Team` | — |
| `Round` | `Season` | `Match` |
| `Match` | `Round`, `Season`, `Team` (×2), `Referee` | — |
| `Standings` | `Season`, `Team` | — |

---

## Creation Order (Strict)

You must respect this order — each step depends on the previous one:

```
1. Catalog        → create game entries (Valorant, LoL, CS2)
2. LeagueRule     → create reusable rule templates per game
3. League         → create the permanent competition brand
4. Season         → create a competitive run (needs leagueId + rulesId)
5. SeasonTeam     → register teams into the season
6. Round          → create matchday slots
7. Match          → schedule matches per round
8. (auto) Standings → initialized per team when SeasonTeam is created
```

---

## Lifecycle State Machines

### Season
```
PLANNED ──▶ ONGOING ──▶ FINISHED
```

### Round
```
SCHEDULED ──▶ ONGOING ──▶ COMPLETED
```

### Match
```
SCHEDULED ──▶ ONGOING ──▶ COMPLETED
                      ──▶ FORFEIT
                      ──▶ CANCELLED
```

### SeasonTeam
```
ACTIVE ──▶ WITHDRAWN
ACTIVE ──▶ DISQUALIFIED
```
