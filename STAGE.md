# Stage — Frontend Implementation Guide

Stage controls phases within a season (Regular Season, Playoffs, Play-In, etc.) and links each phase to a ruleset and optional bracket.

---

## Schema Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `leagueId` | string | no | Optional |
| `seasonId` | string | yes | |
| `name` | string | yes | e.g. "Regular Season", "Playoffs" |
| `stageType` | enum | yes | LEAGUE \| BRACKET \| SWISS \| GROUPS |
| `orderIndex` | number | yes | Display order (0, 1, 2...) |
| `startAt` | Date | yes | |
| `endAt` | Date | yes | |
| `status` | enum | yes | DRAFT \| SCHEDULED \| LIVE \| COMPLETED |
| `rulesetId` | ObjectId → SeasonRule | yes | Links to rules (BO3/BO5, format) |
| `bracketId` | ObjectId → Bracket | no | Only for BRACKET stage type |
| `standingsId` | string | no | For league/swiss/groups |
| `description` | string | no | |
| `createdAt`, `updatedAt` | Date | auto | |

---

## API Endpoints

**Base path:** `/stages`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/stages` | Create stage |
| GET | `/stages` | List all stages |
| GET | `/stages?seasonId=xxx` | Stages for a season |
| GET | `/stages?leagueId=xxx` | Stages for a league |
| GET | `/stages/by-season/:seasonId` | Stages for a season (path) |
| GET | `/stages/:id` | Get one stage (rulesetId, bracketId populated) |
| PATCH | `/stages/:id` | Update stage |
| PATCH | `/stages/:id/bracket` | Link bracket `{ bracketId }` |
| PATCH | `/stages/:id/status` | Update status `{ status }` |
| DELETE | `/stages/:id` | Delete stage |

---

## Create Stage — Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `seasonId` | string | yes | — | Season `_id` |
| `name` | string | yes | — | "Regular Season", "Playoffs" |
| `stageType` | enum | yes | LEAGUE | LEAGUE \| BRACKET \| SWISS \| GROUPS |
| `orderIndex` | number | no | 0 | For progression |
| `startAt` | string (ISO) | yes | — | e.g. "2026-01-15T00:00:00.000Z" |
| `endAt` | string (ISO) | yes | — | |
| `status` | enum | no | DRAFT | DRAFT \| SCHEDULED \| LIVE \| COMPLETED |
| `rulesetId` | string | yes | — | SeasonRule `_id` |
| `leagueId` | string | no | — | Optional |
| `bracketId` | string | no | — | For BRACKET type |
| `standingsId` | string | no | — | For league/swiss/groups |
| `description` | string | no | — | |

---

## Enums

### stageType
`LEAGUE` | `BRACKET` | `SWISS` | `GROUPS`

### status
`DRAFT` | `SCHEDULED` | `LIVE` | `COMPLETED`

---

## Response Shape

```ts
interface Stage {
  _id: string;
  leagueId?: string;
  seasonId: string;
  name: string;
  stageType: string;
  orderIndex: number;
  startAt: string;
  endAt: string;
  status: string;
  rulesetId: string | SeasonRule;  // populated
  bracketId?: string | Bracket;   // populated
  standingsId?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Service Logic (Backend)

| Method | Behavior |
|--------|----------|
| `create` | Creates stage, returns populated |
| `findAll(seasonId?, leagueId?)` | Filter by season or league, sort by orderIndex then startAt |
| `findBySeason` | Same as findAll(seasonId) |
| `findOne` | Get by id, populate rulesetId & bracketId |
| `update` | Partial update, return populated |
| `linkBracket` | Set bracketId for BRACKET stage |
| `updateStatus` | Set status (DRAFT → SCHEDULED → LIVE → COMPLETED) |
| `remove` | Delete stage |

---

## Creation Order & Flow

1. **Create Season** — `POST /seasons`
2. **Create SeasonRules** for that season — `POST /league-rules` with `seasonId`
3. **Create Stages** — `POST /stages` with `seasonId`, `rulesetId` (SeasonRule id), `stageType`, dates
4. **For BRACKET stages:** Generate bracket → `POST /brackets/generate` → `PATCH /stages/:id/bracket` with `{ bracketId }`
5. **Update status** as season runs — `PATCH /stages/:id/status` with `{ status }`

---

## Frontend Implementation

### Load season timeline

```
GET /stages?seasonId=xxx
→ Returns stages ordered by orderIndex, startAt
→ Each stage has rulesetId (populated) and bracketId (populated if BRACKET)
```

### Timeline UI

```
[Stage 0: Regular Season] ——— [Stage 1: Play-In] ——— [Stage 2: Playoffs] ——— [Stage 3: Grand Final]
   DRAFT/SCHEDULED/LIVE/COMPLETED
```

- Use `orderIndex` for left-to-right order
- Use `startAt`, `endAt` for position on a time bar
- Use `status` for color/badge (DRAFT=grey, SCHEDULED=yellow, LIVE=green pulse, COMPLETED=green)
- Show `name` and `stageType` label

### Ruleset display

- `rulesetId` is populated → show `rulesetId.name`, `rulesetId.matchType` (BO1/BO3/BO5)
- Use for match creation and format display

### Bracket stage

- When `stageType === 'BRACKET'` and `bracketId` is set, fetch bracket: `GET /brackets/by-season?seasonId=xxx` or use `bracketId` directly
- Link to bracket view UI

### Status transitions

- DRAFT → SCHEDULED (when dates are confirmed)
- SCHEDULED → LIVE (when stage starts)
- LIVE → COMPLETED (when stage ends)

Call `PATCH /stages/:id/status` with `{ status: "LIVE" }` etc.

---

## Related Endpoints

| Purpose | Endpoint |
|---------|----------|
| Rules for stage | `GET /league-rules?seasonId=xxx` |
| Bracket for stage | `GET /brackets/by-season?seasonId=xxx` |
| Rounds in stage | `GET /rounds?stageId=xxx` |
| Matches | `GET /matches?seasonId=` |
