# Valorant platform setup — full season & leagues (VCT-style)

Step-by-step **what to fill and do** to create a complete Valorant competitive platform (VCT + regional leagues). Do these in order.

---

## Overview

| Step | What you create | Count (example) |
|------|------------------|------------------|
| 1 | Catalog (game) | 1 = Valorant |
| 2 | LeagueRule (rulesets) | 4 = Regular, Play-In, Playoffs, Grand Final |
| 3 | Leagues | 4+ = VCT International, VCT EMEA, VCT Americas, VCT Pacific, … |
| 4 | Season (per league) | 1 per league per year (e.g. 2026 Season 1) |
| 5 | PrizePool (per season) | 1 per season |
| 6 | Rounds → Matches | After teams register & season is activated |

You will have **one Valorant game**, **several rulesets** (for different phases), and **several leagues** (international + regions). Each league has its own **seasons**. This gives you a “100% Valorant platform” structure.

---

## Step 1 — Create the Valorant game (Catalog)

**API:** `POST /catalog`

| Field | Value |
|-------|--------|
| `title` | Valorant |
| `description` | 5v5 tactical shooter, Riot Games |
| `genre` | Tactical FPS |
| `publisher` | Riot Games |
| `platforms` | ["PC"] |
| `isActive` | true |
| `teamSize` | 5 |
| `supportsTeams` | true |
| `supportsSolo` | false |
| `coverImageUrl` | (optional) URL to Valorant logo |

**Save the returned `_id`** — you need it as `gameId` everywhere below (e.g. `GAME_ID_VALORANT`).

---

## Step 2 — Create LeagueRules (one per phase)

Use the same `gameId` = Valorant catalog id for all.

---

### 2.1 Regular Season (BO3 league)

**API:** `POST /league-rules`

| Field | Value |
|-------|--------|
| `name` | Valorant VCT — Regular Season BO3 |
| `gameId` | `GAME_ID_VALORANT` |
| `formatType` | LEAGUE |
| `matchType` | BO3 |
| `pointsWin` | 3 |
| `pointsLoss` | 0 |
| `maxTeams` | 12 (or 10) |
| `maxForfeitsBeforeDisqualification` | 2 |
| `tiebreaker` | GAME_DIFF (or HEAD_TO_HEAD) |
| `mapPool` | ["Ascent","Bind","Haven","Icebox","Lotus","Pearl","Split"] |
| `mapVetoEnabled` | true |
| `mapVetoFormat` | BAN_BAN_PICK_PICK_BAN_BAN_DECIDER |
| `vetoFirstPick` | HIGHER_SEED |
| `ruleUsage` | ["REGULAR_SEASON"] |
| `sideSelection` | VETO_WINNER_CHOOSES |
| `scoreSubmissionMethod` | ADMIN_VERIFIED |
| `substitutionsAllowed` | true |
| `maxSubstitutions` | 1 |
| `pauseAllowedForDisconnect` | true |
| `overtimeConfig` | `{ "format": "VALORANT_OT", "enabled": true, "maxOvertimePeriods": 0 }` |

**Save `_id`** → e.g. `RULES_REGULAR_SEASON`.

---

### 2.2 Play-In (BO1 or BO3)

**API:** `POST /league-rules`

| Field | Value |
|-------|--------|
| `name` | Valorant VCT — Play-In BO1 |
| `gameId` | `GAME_ID_VALORANT` |
| `formatType` | SWISS or LEAGUE |
| `matchType` | BO1 |
| `pointsWin` | 1 |
| `pointsLoss` | 0 |
| `maxTeams` | 8 (or 4) |
| `ruleUsage` | ["PLAY_IN"] |
| `mapPool` | (same as above) |
| `mapVetoFormat` | BAN_BAN_DECIDER |
| `sideSelection` | KNIFE_ROUND or COIN_TOSS |
| (rest) | Same as 2.1 where it makes sense |

**Save `_id`** → e.g. `RULES_PLAY_IN`.

---

### 2.3 Playoffs (BO3)

**API:** `POST /league-rules`

| Field | Value |
|-------|--------|
| `name` | Valorant VCT — Playoffs BO3 |
| `gameId` | `GAME_ID_VALORANT` |
| `formatType` | KNOCKOUT |
| `matchType` | BO3 |
| `pointsWin` | (not used in knockout, can keep 3) |
| `pointsLoss` | 0 |
| `maxTeams` | 8 (or 6) |
| `ruleUsage` | ["PLAYOFFS"] |
| `mapPool` | (same) |
| `mapVetoFormat` | BAN_BAN_PICK_PICK_BAN_BAN_DECIDER |
| `sideSelection` | VETO_WINNER_CHOOSES |
| (rest) | Same as 2.1 |

**Save `_id`** → e.g. `RULES_PLAYOFFS`.

---

### 2.4 Grand Final (BO5)

**API:** `POST /league-rules`

| Field | Value |
|-------|--------|
| `name` | Valorant VCT — Grand Final BO5 |
| `gameId` | `GAME_ID_VALORANT` |
| `formatType` | KNOCKOUT |
| `matchType` | BO5 |
| `maxTeams` | 2 |
| `ruleUsage` | ["GRAND_FINAL"] |
| `mapPool` | (same) |
| `mapVetoFormat` | BAN_BAN_PICK_PICK_PICK_PICK_DECIDER |
| `sideSelection` | VETO_WINNER_CHOOSES |
| (rest) | Same as 2.1 |

**Save `_id`** → e.g. `RULES_GRAND_FINAL`.

---

## Step 3 — Create Leagues

Each league is a **brand** (no dates, no teams). You attach **seasons** to them later.

---

### 3.1 VCT — International (Masters / Champions)

**API:** `POST /leagues`

| Field | Value |
|-------|--------|
| `name` | VCT Masters |
| `level` | INTERNATIONAL |
| `regionId` | worldwide (or your region id for “global”) |
| `gameId` | `GAME_ID_VALORANT` |
| `description` | Valorant Champions Tour — International Masters |
| `logoUrl` | (optional) |

**Save `_id`** → e.g. `LEAGUE_VCT_MASTERS`.

---

### 3.2 VCT EMEA

**API:** `POST /leagues`

| Field | Value |
|-------|--------|
| `name` | VCT EMEA |
| `level` | CONTINENTAL |
| `regionId` | EMEA |
| `gameId` | `GAME_ID_VALORANT` |
| `description` | Valorant Champions Tour — EMEA League |
| `logoUrl` | (optional) |

---

### 3.3 VCT Americas

**API:** `POST /leagues`

| Field | Value |
|-------|--------|
| `name` | VCT Americas |
| `level` | CONTINENTAL |
| `regionId` | Americas |
| `gameId` | `GAME_ID_VALORANT` |
| `description` | Valorant Champions Tour — Americas League |
| `logoUrl` | (optional) |

---

### 3.4 VCT Pacific

**API:** `POST /leagues`

| Field | Value |
|-------|--------|
| `name` | VCT Pacific |
| `level` | CONTINENTAL |
| `regionId` | Pacific |
| `gameId` | `GAME_ID_VALORANT` |
| `description` | Valorant Champions Tour — Pacific League |
| `logoUrl` | (optional) |

---

### 3.5 (Optional) National / Regional

Examples: VCT France, VCT Tunisia, ESL National. Same pattern:

| Field | Value |
|-------|--------|
| `name` | VCT France |
| `level` | NATIONAL |
| `regionId` | France |
| `gameId` | `GAME_ID_VALORANT` |
| `description` | … |
| `logoUrl` | (optional) |

You can create as many leagues as you want; each will have its own seasons.

---

## Step 4 — Create a full season (example: VCT EMEA 2026 Stage 1)

One season = one **ruleset** + one **league** + dates. For a full VCT-style year you can create **multiple seasons per league** (e.g. Stage 1, Stage 2, Playoffs).

---

### 4.1 Regular season (Stage 1)

**API:** `POST /seasons`

| Field | Value |
|-------|--------|
| `leagueId` | `LEAGUE_VCT_EMEA` (from step 3.2) |
| `rulesId` | `RULES_REGULAR_SEASON` (from 2.1) |
| `name` | 2026 Stage 1 |
| `startDate` | 2026-01-15 (example) |
| `endDate` | 2026-03-30 |
| `registrationDeadline` | 2026-01-08 (before startDate) |
| `status` | PLANNED |
| `description` | (optional) VCT EMEA 2026 Stage 1 — Regular Season |

**Save `_id`** → e.g. `SEASON_EMEA_STAGE1`.

---

### 4.2 (Optional) Play-In season

If you model Play-In as a **separate season** under the same league:

| Field | Value |
|-------|--------|
| `leagueId` | `LEAGUE_VCT_EMEA` |
| `rulesId` | `RULES_PLAY_IN` |
| `name` | 2026 Play-In |
| `startDate` | 2026-04-01 |
| `endDate` | 2026-04-10 |
| `registrationDeadline` | 2026-03-25 |
| `status` | PLANNED |

---

### 4.3 (Optional) Playoffs season

| Field | Value |
|-------|--------|
| `leagueId` | `LEAGUE_VCT_EMEA` |
| `rulesId` | `RULES_PLAYOFFS` |
| `name` | 2026 Playoffs |
| `startDate` | 2026-04-15 |
| `endDate` | 2026-05-01 |
| `registrationDeadline` | 2026-04-10 |
| `status` | PLANNED |

(Teams here are usually the top N from Stage 1 — you register them manually or via qualification logic.)

---

## Step 5 — Prize pool (per season)

**API:** `POST /prize-pools`

Example for **SEASON_EMEA_STAGE1**:

| Field | Value |
|-------|--------|
| `seasonId` | `SEASON_EMEA_STAGE1` |
| `leagueId` | `LEAGUE_VCT_EMEA` |
| `totalAmount` | 250000 |
| `currency` | USD |
| `source` | PLATFORM or SPONSORED |
| `sponsorId` | (optional, if SPONSORED) |
| `distribution` | [{"rank":1,"amount":100000,"percentage":40},{"rank":2,"amount":50000,"percentage":20},{"rank":3,"amount":35000,"percentage":14},{"rank":4,"amount":25000,"percentage":10},{"rank":5,"amount":20000,"percentage":8},{"rank":6,"amount":20000,"percentage":8}] |
| `status` | PENDING or CONFIRMED |
| `notes` | (optional) |

Repeat for Play-In / Playoffs / Grand Final seasons if you create separate seasons for them.

---

## Step 6 — What to do next (same for every season)

1. **Teams register** → `POST /season-teams` with `seasonId` + `teamId`.
2. **Rosters** → Create `SeasonRoster`, add players, then lock before deadline.
3. **Activate season** → `PATCH /seasons/:id/activate` → status ONGOING.
4. **Rounds** → `POST /rounds/generate` or create rounds manually.
5. **Matches** → Create matches per round; create CheckIn per match.
6. **Results** → Report results; standings update automatically.
7. **Playoffs (if KNOCKOUT)** → Generate bracket, create matches, advance winners.
8. **Close** → `PATCH /seasons/:id/close`, mark prize pool DISTRIBUTED.

---

## Checklist — “100% Valorant platform”

- [ ] 1 Catalog entry: Valorant (`gameId` saved).
- [ ] 4 LeagueRules: Regular Season BO3, Play-In BO1, Playoffs BO3, Grand Final BO5 (ids saved).
- [ ] 4+ Leagues: VCT International, VCT EMEA, VCT Americas, VCT Pacific (+ national if needed).
- [ ] 1+ Season per league (e.g. 2026 Stage 1) with correct `leagueId` and `rulesId`.
- [ ] 1 PrizePool per season.
- [ ] Then: registrations → rosters → activate → rounds → matches → results → (bracket) → close.

Use **ruleUsage** and **rulesId** to show the right rules in the UI (e.g. “Regular Season”, “Play-In”, “Playoffs”, “Grand Final”) and to pick the correct ruleset when creating a new season.
