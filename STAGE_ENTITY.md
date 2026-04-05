# Stage Entity

The **Stage** entity controls phases within a season (Regular Season, Playoffs, etc.) and links each phase to a ruleset, optional bracket, and optional standings.

---

## Schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `leagueId` | string | no | Optional; season has leagueId |
| `seasonId` | string | yes | |
| `name` | string | yes | e.g. "Regular Season", "Playoffs" |
| `stageType` | enum | yes | LEAGUE \| BRACKET \| SWISS \| GROUPS |
| `orderIndex` | number | yes | For display and progression (0, 1, 2...) |
| `startAt` | Date | yes | |
| `endAt` | Date | yes | |
| `status` | enum | yes | DRAFT \| SCHEDULED \| LIVE \| COMPLETED |
| `rulesetId` | ObjectId → LeagueRule | yes | Links to rules (BO3/BO5, OT, format) |
| `bracketId` | ObjectId → Bracket | no | Only for BRACKET stage type |
| `standingsId` | string | no | For league/swiss/groups (flexible ref) |
| `description` | string | no | |
| `createdAt`, `updatedAt` | Date | auto | |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/stages` | Create stage |
| GET | `/stages?seasonId=&leagueId=` | List stages (filter by season/league) |
| GET | `/stages/by-season/:seasonId` | Stages for a season (ordered by orderIndex) |
| GET | `/stages/:id` | Get stage (populated: rulesetId, bracketId) |
| PATCH | `/stages/:id` | Update stage |
| PATCH | `/stages/:id/bracket` | Link bracket `{ bracketId }` |
| PATCH | `/stages/:id/status` | Update status `{ status }` |
| DELETE | `/stages/:id` | Delete stage |

---

## Example: VCT Season with Stages

```
Season: VCT EMEA 2026
├── Stage 1: Regular Season (LEAGUE, ruleset: BO3 League, orderIndex: 0)
├── Stage 2: Play-In (SWISS, ruleset: BO1 Play-In, orderIndex: 1)
├── Stage 3: Playoffs (BRACKET, ruleset: BO3 Playoffs, bracketId: xxx, orderIndex: 2)
└── Stage 4: Grand Final (BRACKET, ruleset: BO5 Grand Final, bracketId: yyy, orderIndex: 3)
```

Each stage uses a different **LeagueRule** (ruleset) for format, points, maps, etc.

---

## Create Stage Payload

```json
{
  "seasonId": "...",
  "name": "Regular Season",
  "stageType": "LEAGUE",
  "orderIndex": 0,
  "startAt": "2026-01-15T00:00:00.000Z",
  "endAt": "2026-03-30T23:59:59.000Z",
  "status": "DRAFT",
  "rulesetId": "<league-rule-id>",
  "leagueId": "...",
  "description": "Optional"
}
```

For a BRACKET stage, create the stage first, then generate the bracket, then `PATCH /stages/:id/bracket` with `{ bracketId }`.

---

## Round → Stage link

**Round** has optional `stageId`. When creating rounds (or generating them via `POST /rounds/generate`), you can pass `stageId` to associate rounds with a stage. Query rounds by stage: `GET /rounds?stageId=xxx` or `GET /rounds?seasonId=xxx&stageId=xxx`.
