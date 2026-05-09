# ArenaChain — League System: Frontend Implementation Guide

> Generated from the live backend schemas. All seeded data uses password **`Arena123!`**.

---

## 1. Seeded Data Reference

| Entity | Count | Details |
|---|---|---|
| Game (Catalog) | 1 | VALORANT |
| Players | 20 | `shadowstrike@arena.test` … `solarflare@arena.test` |
| Teams | 6 | Team Phantom, Nexus Force, Eclipse Guild, Vortex United, Blaze Collective, Cipher Protocol |
| Team Managers | 6 | `phantomgm@arena.test` … `ciphergm@arena.test` |
| League | 1 | ArenaChain Valorant League (NATIONAL / EUROPE) |
| Season | 1 | Season 1 — Spring 2025 (ONGOING) |
| Rounds | 5 | 3 COMPLETED · 1 ONGOING · 1 SCHEDULED |
| Regular-season Matches | 15 | 9 COMPLETED (with scores) · 6 SCHEDULED |
| Playoff Matches | 3 | 2 semis COMPLETED · Grand Final SCHEDULED |
| Standings | 6 rows | Pre-computed from completed matches |
| Bracket | 1 | SINGLE_ELIMINATION · Grand Final READY |

---

## 2. Full League Workflow

```
Admin creates League
       ↓
Admin creates Season  →  Admin creates SeasonRule
       ↓
Registration opens (teams register)  →  SeasonTeam records created
       ↓
Admin closes registration & generates Rounds + Matches
       ↓
Matches are played (Rounds 1-N, ONGOING)
  • Referee / Admin submits game-by-game scores
  • Standings auto-update after each match
       ↓
Regular season ends  →  Top N teams qualify for Playoffs
       ↓
Admin generates Bracket  →  Playoff matches played
       ↓
Grand Final  →  Champion crowned  →  Season FINISHED
```

---

## 3. API Endpoints Cheat-Sheet

### Auth
| Method | URL | Notes |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ access_token, user }` |
| GET  | `/auth/me` | Returns current user (needs Bearer token) |

### Catalog (Games)
| Method | URL |
|---|---|
| GET | `/catalog` |
| GET | `/catalog/:id` |

### Leagues
| Method | URL | Notes |
|---|---|---|
| GET | `/leagues` | List all leagues |
| GET | `/leagues/:id` | Single league |
| POST | `/leagues` | Admin only |
| PATCH | `/leagues/:id` | Admin only |

### Seasons
| Method | URL | Notes |
|---|---|---|
| GET | `/seasons` | All seasons |
| GET | `/seasons/:id` | Single season |
| POST | `/seasons` | Admin: `{ leagueId, name, startDate, endDate, registrationDeadline }` |
| PATCH | `/seasons/:id` | Update status: `PLANNED → ONGOING → FINISHED` |

### Season Rules
| Method | URL |
|---|---|
| GET | `/season-rules/season/:seasonId` |
| POST | `/season-rules` |
| PATCH | `/season-rules/:id` |

### League Registration (Season Teams)
| Method | URL | Notes |
|---|---|---|
| GET | `/league-registration/season/:seasonId` | All teams in a season |
| POST | `/league-registration` | Register team: `{ seasonId, teamId }` |
| DELETE | `/league-registration/:id` | Withdraw team |

### Rounds
| Method | URL | Notes |
|---|---|---|
| GET | `/rounds/season/:seasonId` | All rounds for a season |
| POST | `/rounds` | Admin: `{ seasonId, roundNumber, startDate, endDate }` |
| PATCH | `/rounds/:id` | Update status |

### Matches
| Method | URL | Notes |
|---|---|---|
| GET | `/matches/season/:seasonId` | All matches |
| GET | `/matches/round/:roundId` | Matches in a round |
| POST | `/matches` | Admin schedules a match |
| PATCH | `/matches/:id/result` | Submit game result `{ games[], winnerId }` |
| PATCH | `/matches/:id/forfeit` | Forfeit `{ forfeitingTeamId, reason }` |

### Standings
| Method | URL | Notes |
|---|---|---|
| GET | `/standings/season/:seasonId` | Returns sorted array |
| POST | `/standings/season/:seasonId/recalculate` | Admin: recomputes from match history |

### Bracket
| Method | URL | Notes |
|---|---|---|
| GET | `/brackets/season/:seasonId` | Get bracket |
| POST | `/brackets` | Admin: generate bracket `{ seasonId, format, teamIds[] }` |
| PATCH | `/brackets/:bracketId/slot/:slotId/result` | Update slot winner |

### Team Manager
| Method | URL |
|---|---|
| GET | `/team-manager/me` | Manager profile + team |
| GET | `/team-manager/me/team` | Full team with roster |
| POST | `/team-manager/me/team` | Create team |
| POST | `/team-manager/me/team/roster/invite` | Invite player `{ playerUserId }` |

---

## 4. Pages to Build

### Public Pages (no auth)
- **`/leagues`** — Grid of all leagues (name, game, region, level)
- **`/leagues/:id`** — League detail: description + list of seasons
- **`/leagues/:id/seasons/:seasonId`** — Season hub (standings, rounds, bracket tabs)

### Player Pages (role: `player`)
- **`/profile`** — ELO, rank, stats, Riot link status
- **`/teams`** — Teams the player belongs to
- **`/matches`** — Upcoming scheduled matches for the player's team

### Team Manager Pages (role: `team_manager`)
- **`/manager/settings`** — Edit profile, create/edit team, manage roster
- **`/manager/league`** — Register team for open seasons, view registration status
- **`/manager/season/:seasonId`** — Season standings + match schedule for own team

### Admin Pages (role: `admin`)
- **`/admin/leagues`** — CRUD leagues
- **`/admin/leagues/:id/seasons`** — Create / manage seasons
- **`/admin/seasons/:id`** — Season dashboard:
  - Set season rules (BO3, map pool, points system)
  - View registered teams
  - Generate rounds & matches
  - Close registration
  - Mark season as ONGOING / FINISHED
- **`/admin/seasons/:id/matches`** — Match table: submit scores, mark forfeits
- **`/admin/seasons/:id/bracket`** — Generate and update playoff bracket

---

## 5. Key Components

### `<LeagueCard />` — used on `/leagues`
```tsx
// Props: { league: League }
// Shows: name, game logo, level badge, region, active/inactive chip
```

### `<StandingsTable />` — used on season hub
```tsx
// Props: { seasonId: string }
// Fetches: GET /standings/season/:seasonId
// Columns: Rank | Team | W | L | Pts | GD
// Highlight top 4 (playoff zone) in green, bottom 2 in red
```

### `<RoundSchedule />` — used on season hub
```tsx
// Props: { seasonId: string, roundNumber?: number }
// Fetches: GET /rounds/season/:seasonId  then  GET /matches/round/:roundId
// Shows: round tabs (R1…R5), match cards per round
```

### `<MatchCard />` — used inside RoundSchedule
```tsx
// Props: { match: Match }
// Shows: teams, scores (if COMPLETED), status badge, scheduled time
// COMPLETED → show game-by-game scores (collapsible)
```

### `<BracketView />` — used on season hub "Playoffs" tab
```tsx
// Props: { seasonId: string }
// Fetches: GET /brackets/season/:seasonId
// Renders: visual single/double elimination bracket
// Each slot: team names, score if COMPLETED, "TBD" if PENDING
```

### `<MatchScoreForm />` — admin only, inside MatchCard
```tsx
// Appears when match status is SCHEDULED or ONGOING
// For each game: map picker + team1Score + team2Score
// On submit: PATCH /matches/:id/result
```

---

## 6. State Management Suggestion

Use **React Query** (`@tanstack/react-query`) for all server state:

```ts
// Example: standings
const { data: standings } = useQuery({
  queryKey: ['standings', seasonId],
  queryFn: () => api.get(`/standings/season/${seasonId}`).then(r => r.data),
});

// Invalidate after submitting a match result:
queryClient.invalidateQueries({ queryKey: ['standings', seasonId] });
queryClient.invalidateQueries({ queryKey: ['matches', roundId] });
```

---

## 7. Admin Season Setup Checklist (workflow steps)

```
1. POST /leagues              → create the league
2. POST /seasons              → create season (status: PLANNED)
3. POST /season-rules         → attach rules to the season
4. Teams register             → POST /league-registration (per team)
5. Close registration         → PATCH /seasons/:id { status: 'ONGOING' }
6. Generate rounds + matches  → POST /rounds (x N)  + POST /matches (per matchup)
7. Play rounds                → PATCH /matches/:id/result (after each match)
8. Auto-standings update      → GET /standings/season/:seasonId
9. Generate bracket           → POST /brackets { seasonId, format, teamIds[] }
10. Play playoffs             → PATCH /brackets/:id/slot/:slotId/result
11. Finish season             → PATCH /seasons/:id { status: 'FINISHED' }
```

---

## 8. Data Shapes (TypeScript interfaces)

```ts
interface League {
  _id: string; name: string; level: 'INTERNATIONAL'|'CONTINENTAL'|'NATIONAL'|'REGIONAL';
  regionId: string; gameId: string; description?: string; logoUrl?: string; isActive: boolean;
}

interface Season {
  _id: string; leagueId: string; rulesId?: string; name: string;
  startDate: string; endDate: string; registrationDeadline: string;
  status: 'PLANNED'|'ONGOING'|'FINISHED'; description?: string;
}

interface Standings {
  _id: string; seasonId: string; teamId: string;
  played: number; wins: number; losses: number; points: number;
  gamesWon: number; gamesLost: number; gameDiff: number; rank: number;
}

interface Match {
  _id: string; roundId: string; seasonId: string;
  team1Id: string; team2Id: string; format: 'BO1'|'BO3'|'BO5';
  scheduledStart: string; status: 'SCHEDULED'|'ONGOING'|'COMPLETED'|'FORFEIT'|'CANCELLED';
  team1GamesWon: number; team2GamesWon: number;
  winnerId?: string; loserId?: string;
  games: { gameNumber: number; winnerId: string; mapName?: string; team1Score?: number; team2Score?: number }[];
}

interface BracketSlot {
  slotId: string; roundNumber: number; position: number;
  team1Id?: string; team2Id?: string; winnerId?: string;
  matchId?: string; nextSlotId?: string;
  status: 'PENDING'|'READY'|'COMPLETED'|'BYE';
}

interface Bracket {
  _id: string; seasonId: string; format: 'SINGLE_ELIMINATION'|'DOUBLE_ELIMINATION';
  totalRounds: number; slots: BracketSlot[];
  status: 'PENDING'|'ACTIVE'|'COMPLETED'; championId?: string;
}
```

---

## 9. Running the Seeder

```bash
# First time (inserts data, fails if emails already exist)
npm run seed

# Wipe all collections first, then re-seed (safe to re-run anytime)
npm run seed:fresh
```

> The seeder connects using `MONGO_URI` from `.env`, falling back to `mongodb://localhost/arenachain`.
