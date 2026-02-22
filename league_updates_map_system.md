# ArenaChain — Frontend Update: Map System & Rule Changes

This document covers everything that changed since the initial `league_implementation.md` guide.
Share this with your frontend developer to apply the updates.

---

## Summary of Changes

| # | What changed | Impact |
|---|---|---|
| 1 | `LeagueRule` — 4 new map system fields added | Update create/edit rule form |
| 2 | `LeagueRule` GET — `gameId` is now a populated object | Update how you read `gameId` |
| 3 | `LeagueRule` GET endpoint — query param renamed | Change `?leagueId=` to `?gameId=` |
| 4 | `pointsDraw` removed from `LeagueRule` | Remove from form, never send it |

---

## Change 1 — LeagueRule: 4 New Map System Fields

### Updated request body

**POST /league-rules** and **PATCH /league-rules/:id** now accept 4 new optional fields:

```json
{
  "name": "Valorant Standard BO3",
  "gameId": "<catalog_id>",
  "formatType": "LEAGUE",
  "matchType": "BO3",
  "pointsWin": 3,
  "pointsLoss": 0,
  "maxTeams": 10,
  "tiebreaker": "GAME_DIFF",

  "mapPool": ["Haven", "Bind", "Split", "Ascent", "Pearl", "Lotus", "Sunset"],
  "mapVetoEnabled": true,
  "mapVetoFormat": "BAN_BAN_PICK_PICK_BAN_BAN_DECIDER",
  "vetoFirstPick": "HIGHER_SEED"
}
```

---

### Field: `mapPool` — `string[]` (default: `[]`)

List of map names available for this rule set. One string per map.

```json
"mapPool": ["Haven", "Bind", "Split", "Ascent", "Pearl", "Lotus", "Sunset"]
```

Use a tag/chip multi-input on the form. Provide game presets (see bottom of this file).

---

### Field: `mapVetoEnabled` — `boolean` (default: `true`)

Whether teams perform a map veto before each match.

- `true` → show `mapVetoFormat` and `vetoFirstPick` fields
- `false` → hide both fields (League of Legends use case)

---

### Field: `mapVetoFormat` — `enum` (default: `BAN_BAN_PICK_PICK_BAN_BAN_DECIDER`)

The sequence of bans and picks performed before a match.

| Value | Use case | Full sequence |
|---|---|---|
| `BAN_BAN_PICK_PICK_BAN_BAN_DECIDER` | **Valorant BO3 / CS2 BO3** (standard) | A bans → B bans → A picks → B picks → A bans → B bans → last = decider |
| `BAN_BAN_PICK_PICK_PICK_PICK_DECIDER` | **Valorant BO5 / CS2 BO5** | A bans → B bans → A picks → B picks → A picks → B picks → last = decider |
| `PICK_PICK_DECIDER` | Simple BO3 | A picks → B picks → last remaining = decider |
| `BAN_BAN_DECIDER` | Simple BO1 | Teams alternate banning, last map is played |
| `RANDOM` | Casual BO1 | Random map selected from pool automatically |
| `ADMIN_PICK` | Admin-controlled BO1 | Admin manually selects the map |

> **UI tip:** Filter the shown options based on `matchType`. BO1 formats for BO1, BO3 formats for BO3, BO5 formats for BO5.

---

### Field: `vetoFirstPick` — `enum` (default: `HIGHER_SEED`)

Who performs the first action in the veto.

| Value | Meaning |
|---|---|
| `HIGHER_SEED` | Higher seeded team goes first |
| `LOWER_SEED` | Lower seeded team goes first |
| `COIN_FLIP` | Decided randomly on match day |
| `ADMIN` | Admin decides manually before match |

---

### Updated full GET response

```json
{
  "_id": "6602aacc...",
  "name": "Valorant Standard BO3",
  "gameId": {
    "_id": "6601aabb...",
    "title": "Valorant",
    "genre": "Tactical Shooter",
    "publisher": "Riot Games",
    "teamSize": 5,
    "supportsTeams": true,
    "coverImageUrl": "/uploads/valorant.jpg"
  },
  "formatType": "LEAGUE",
  "matchType": "BO3",
  "pointsWin": 3,
  "pointsLoss": 0,
  "maxTeams": 10,
  "maxForfeitsBeforeDisqualification": 3,
  "forfeitCountsAsLoss": true,
  "tiebreaker": "GAME_DIFF",
  "mapPool": ["Haven", "Bind", "Split", "Ascent", "Pearl", "Lotus", "Sunset"],
  "mapVetoEnabled": true,
  "mapVetoFormat": "BAN_BAN_PICK_PICK_BAN_BAN_DECIDER",
  "vetoFirstPick": "HIGHER_SEED",
  "extraRules": null,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

## Change 2 — `gameId` is now a populated object

Every GET response for `/league-rules` now returns the **full Catalog object** inside `gameId` instead of just the ID string.

### Before
```json
{
  "gameId": "6601aabb..."
}
```

### After
```json
{
  "gameId": {
    "_id": "6601aabb...",
    "title": "Valorant",
    "genre": "Tactical Shooter",
    "teamSize": 5,
    "coverImageUrl": "/uploads/valorant.jpg"
  }
}
```

### What to update in the frontend

Anywhere you read `rule.gameId` as a plain string, update to:

```js
// Get the game's ObjectId
rule.gameId._id

// Display the game name
rule.gameId.title

// Display the cover image
rule.gameId.coverImageUrl

// Check team size
rule.gameId.teamSize
```

---

## Change 3 — GET endpoint query param renamed

The filter query param for listing rules by game has changed.

```
// OLD — does not work anymore
GET /league-rules?leagueId=<id>

// NEW
GET /league-rules?gameId=<catalog_id>    → all rules for a specific game
GET /league-rules                        → all rules across all games
GET /league-rules/:id                    → one rule by ID
```

---

## Change 4 — `pointsDraw` removed

`pointsDraw` no longer exists in `LeagueRule`. Do not send it in any request.

There are no draws in this system (Valorant and LoL never draw; CS2 map draws are not tracked at the series level).

Remove `pointsDraw` from:
- Rule creation form
- Rule edit form
- Any display of rule details

---

## Admin UI — Rule Creation Form

Recommended form layout with the new fields included:

```
Rule Name        [__________________________]

Game             [dropdown: GET /catalog   ]   ← selecting this sets presets below

Format Type      [LEAGUE | SWISS | KNOCKOUT]
Match Type       [BO1    | BO3   | BO5    ]

Points Win       [3]
Points Loss      [0]
Max Teams        [10]

Max Forfeits before Disqualification  [3]
Forfeit Counts as Loss               [toggle ON]

Tiebreaker       [GAME_DIFF | POINTS | HEAD_TO_HEAD]

─── Map System ──────────────────────────────────────
Map Veto Enabled [toggle ON/OFF]

  (if ON)
  Map Veto Format  [dropdown — filtered by Match Type]
  Veto First Pick  [HIGHER_SEED | LOWER_SEED | COIN_FLIP | ADMIN]
  Map Pool         [chip/tag input — add maps one by one]
                   [Preset button: "Load Valorant maps"]
                   [Preset button: "Load CS2 maps"]

Extra Rules      [JSON textarea — optional]
```

---

## Veto Sequence Visualizer

When displaying a rule or a match with a veto, parse `mapVetoFormat` into steps to show the sequence visually.

### Parse helper (JavaScript)

```js
function parseVetoSteps(vetoFormat) {
  if (!vetoFormat) return [];

  const parts = vetoFormat.split('_');
  const steps = [];
  let teamTurn = 'A';
  let stepNum = 1;

  for (const part of parts) {
    if (part === 'DECIDER') {
      steps.push({ step: stepNum++, team: 'AUTO', action: 'DECIDER' });
    } else if (part === 'BAN' || part === 'PICK') {
      steps.push({ step: stepNum++, team: `Team ${teamTurn}`, action: part });
      teamTurn = teamTurn === 'A' ? 'B' : 'A';
    }
  }

  return steps;
}
```

### Example output for `BAN_BAN_PICK_PICK_BAN_BAN_DECIDER`

```
Step 1 — Team A   →  BAN
Step 2 — Team B   →  BAN
Step 3 — Team A   →  PICK   ✓ Map 1 confirmed
Step 4 — Team B   →  PICK   ✓ Map 2 confirmed
Step 5 — Team A   →  BAN
Step 6 — Team B   →  BAN
Step 7 — AUTO     →  DECIDER (last remaining map)
```

---

## Game Presets (copy-paste ready)

Use these to auto-fill the map system fields when the admin selects a game.

```js
const MAP_PRESETS = {
  Valorant: {
    mapPool: ['Haven', 'Bind', 'Split', 'Ascent', 'Pearl', 'Lotus', 'Sunset'],
    mapVetoEnabled: true,
    mapVetoFormat: 'BAN_BAN_PICK_PICK_BAN_BAN_DECIDER',
    vetoFirstPick: 'HIGHER_SEED',
  },

  'League of Legends': {
    mapPool: ["Summoner's Rift"],
    mapVetoEnabled: false,
    mapVetoFormat: null,
    vetoFirstPick: null,
  },

  CS2: {
    mapPool: ['Mirage', 'Inferno', 'Nuke', 'Overpass', 'Vertigo', 'Ancient', 'Anubis'],
    mapVetoEnabled: true,
    mapVetoFormat: 'BAN_BAN_PICK_PICK_BAN_BAN_DECIDER',
    vetoFirstPick: 'COIN_FLIP',
  },
};
```

---

## No Other Changes

Everything else documented in `league_implementation.md` remains identical:
- All other endpoints (`/leagues`, `/seasons`, `/season-teams`, `/rounds`, `/matches`, `/standings`)
- Creation order (Catalog → Rule → League → Season → Teams → Rounds → Matches)
- Status lifecycles (Season, Round, Match, SeasonTeam)
- Auto-behaviors (standings init, auto-disqualify, points update after match)
- Season timeline / progress bar implementation
