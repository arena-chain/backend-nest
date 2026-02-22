# ArenaChain — Frontend Update: Overtime System

This document covers the overtime configuration added to `LeagueRule`.
Apply this on top of `league_implementation.md` and `league_updates_map_system.md`.

---

## What Changed

One new nested object field added to `LeagueRule`:

```
overtimeConfig: {
  format
  enabled
  maxRoundsPerPeriod   (CS2 only)
  startMoney           (CS2 only)
  allowDrawIfDisabled  (CS2 only)
  maxOvertimePeriods
}
```

All other endpoints and fields are unchanged.

---

## Updated Request Body

**POST /league-rules** and **PATCH /league-rules/:id** now accept `overtimeConfig` as an optional nested object.

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
  "vetoFirstPick": "HIGHER_SEED",

  "overtimeConfig": {
    "format": "VALORANT_OT",
    "enabled": true,
    "maxOvertimePeriods": 0
  }
}
```

If you omit `overtimeConfig` entirely, it defaults to:
```json
{
  "format": "NONE",
  "enabled": false,
  "maxRoundsPerPeriod": 6,
  "startMoney": 10500,
  "allowDrawIfDisabled": false,
  "maxOvertimePeriods": 0
}
```

---

## Field Reference

### `format` — `enum` (required inside the object)

| Value | Game | Meaning |
|---|---|---|
| `NONE` | LoL / CS2 amateur | No overtime. Tie is either impossible (LoL) or a draw (CS2 with `allowDrawIfDisabled: true`) |
| `VALORANT_OT` | Valorant | 2-round OT, repeats until one team is ahead by 2 rounds |
| `CS2_OT` | CS2 pro | 6-round OT period with fixed start money, repeats until someone wins the period |

---

### `enabled` — `boolean` (default: `false`)

Turns overtime on or off for this rule set.

- `false` + Valorant → not realistic but allowed (admin config)
- `false` + CS2 → map can end in a draw if `allowDrawIfDisabled: true`
- `false` + LoL → normal (LoL can never draw, overtime is impossible)

---

### `maxRoundsPerPeriod` — `number` (default: `6`)

**CS2 only.** How many rounds are played in each overtime period.

Standard value: `6` (3 rounds per side, first to 4 wins the OT period).

Ignored by Valorant and LoL.

---

### `startMoney` — `number` (default: `10500`)

**CS2 only.** How much money each team starts with at the beginning of each OT period.

Standard pro value: `10500` (enough for a full buy without much leftover).

Ignored by Valorant and LoL.

---

### `allowDrawIfDisabled` — `boolean` (default: `false`)

**CS2 only.** When overtime is disabled (`enabled: false`) and a map ends tied, should it count as a draw?

- `true` → tied map = draw (counts toward standings `draws` counter)
- `false` → tied map = replay or admin decision (not handled automatically)

Ignored by Valorant (can never draw) and LoL (can never draw).

---

### `maxOvertimePeriods` — `number` (default: `0`)

How many OT periods are allowed before the game is considered a draw or goes to admin.

- `0` = unlimited (play until someone wins — standard pro format)
- `1` = one OT period only, then draw/admin if still tied
- `2` = two OT periods max, etc.

Used by both Valorant and CS2.

---

## Per-Game Configuration Examples

### Valorant (standard pro)

```json
"overtimeConfig": {
  "format": "VALORANT_OT",
  "enabled": true,
  "maxOvertimePeriods": 0
}
```

- OT triggers at 12–12
- 2 rounds per OT period (1 attack, 1 defense)
- Repeats infinitely until one team leads by 2
- `maxRoundsPerPeriod`, `startMoney`, `allowDrawIfDisabled` → ignored

---

### CS2 (pro — no draws, unlimited OT)

```json
"overtimeConfig": {
  "format": "CS2_OT",
  "enabled": true,
  "maxRoundsPerPeriod": 6,
  "startMoney": 10500,
  "allowDrawIfDisabled": false,
  "maxOvertimePeriods": 0
}
```

- OT triggers at 12–12 (MR13 format)
- 6 rounds per OT period (3 per side, first to 4 wins)
- Each team starts with 10,500$
- Repeats until someone wins an OT period

---

### CS2 (amateur league — draws allowed, no OT)

```json
"overtimeConfig": {
  "format": "NONE",
  "enabled": false,
  "allowDrawIfDisabled": true
}
```

- No overtime played
- A 15–15 or 12–12 map counts as a draw
- Standings `draws` counter increments for both teams

---

### CS2 (capped OT — 1 period max then draw)

```json
"overtimeConfig": {
  "format": "CS2_OT",
  "enabled": true,
  "maxRoundsPerPeriod": 6,
  "startMoney": 10500,
  "allowDrawIfDisabled": true,
  "maxOvertimePeriods": 1
}
```

- One OT period played (6 rounds)
- If still tied after that → draw

---

### League of Legends

```json
"overtimeConfig": {
  "format": "NONE",
  "enabled": false
}
```

Or omit the field entirely — it defaults to disabled. LoL cannot draw (Nexus must be destroyed), so this config has no effect.

---

## Updated GET Response

```json
{
  "_id": "...",
  "name": "Valorant Standard BO3",
  "gameId": {
    "_id": "...",
    "title": "Valorant",
    "genre": "Tactical Shooter",
    "teamSize": 5
  },
  "formatType": "LEAGUE",
  "matchType": "BO3",
  "pointsWin": 3,
  "pointsLoss": 0,
  "maxTeams": 10,
  "tiebreaker": "GAME_DIFF",
  "mapPool": ["Haven", "Bind", "Split", "Ascent", "Pearl", "Lotus", "Sunset"],
  "mapVetoEnabled": true,
  "mapVetoFormat": "BAN_BAN_PICK_PICK_BAN_BAN_DECIDER",
  "vetoFirstPick": "HIGHER_SEED",
  "overtimeConfig": {
    "format": "VALORANT_OT",
    "enabled": true,
    "maxRoundsPerPeriod": 6,
    "startMoney": 10500,
    "allowDrawIfDisabled": false,
    "maxOvertimePeriods": 0
  }
}
```

---

## Admin UI — Overtime Section in Rule Form

Add an **Overtime** section below the map system section:

```
─── Overtime ────────────────────────────────────────
Overtime Enabled     [toggle ON/OFF]

  (if ON)
  Overtime Format    [dropdown]
                       VALORANT_OT  — 2-round OT, repeat until +2
                       CS2_OT       — 6-round OT period, fixed money

  Max OT Periods     [number input]  0 = unlimited

  (if format = CS2_OT)
  Rounds per Period  [number input]  default: 6
  Start Money        [number input]  default: 10500

  (if Overtime Disabled)
  Allow Draw on Tie  [toggle ON/OFF] (CS2 amateur only)
```

### UI Logic Rules

```
if game = "League of Legends"
  → hide entire Overtime section (impossible to draw)

if overtimeEnabled = false
  → hide format, maxOvertimePeriods, rounds, money
  → show "Allow Draw on Tie" toggle (CS2 only)

if overtimeFormat = "VALORANT_OT"
  → hide maxRoundsPerPeriod, startMoney, allowDrawIfDisabled
  → show maxOvertimePeriods only

if overtimeFormat = "CS2_OT"
  → show all fields
```

---

## Game Presets (updated — includes overtime)

```js
const GAME_PRESETS = {
  Valorant: {
    mapPool: ['Haven', 'Bind', 'Split', 'Ascent', 'Pearl', 'Lotus', 'Sunset'],
    mapVetoEnabled: true,
    mapVetoFormat: 'BAN_BAN_PICK_PICK_BAN_BAN_DECIDER',
    vetoFirstPick: 'HIGHER_SEED',
    overtimeConfig: {
      format: 'VALORANT_OT',
      enabled: true,
      maxOvertimePeriods: 0,
    },
  },

  'League of Legends': {
    mapPool: ["Summoner's Rift"],
    mapVetoEnabled: false,
    mapVetoFormat: null,
    vetoFirstPick: null,
    overtimeConfig: {
      format: 'NONE',
      enabled: false,
    },
  },

  'CS2 Pro': {
    mapPool: ['Mirage', 'Inferno', 'Nuke', 'Overpass', 'Vertigo', 'Ancient', 'Anubis'],
    mapVetoEnabled: true,
    mapVetoFormat: 'BAN_BAN_PICK_PICK_BAN_BAN_DECIDER',
    vetoFirstPick: 'COIN_FLIP',
    overtimeConfig: {
      format: 'CS2_OT',
      enabled: true,
      maxRoundsPerPeriod: 6,
      startMoney: 10500,
      allowDrawIfDisabled: false,
      maxOvertimePeriods: 0,
    },
  },

  'CS2 Amateur': {
    mapPool: ['Mirage', 'Inferno', 'Nuke', 'Overpass', 'Vertigo', 'Ancient', 'Anubis'],
    mapVetoEnabled: true,
    mapVetoFormat: 'BAN_BAN_PICK_PICK_BAN_BAN_DECIDER',
    vetoFirstPick: 'COIN_FLIP',
    overtimeConfig: {
      format: 'NONE',
      enabled: false,
      allowDrawIfDisabled: true,
    },
  },
};
```

---

## Documents Order

Apply frontend updates in this order:

```
1. league_implementation.md        ← base guide (all endpoints + creation order)
2. league_updates_map_system.md    ← map pool + veto system
3. league_updates_overtime.md      ← this file (overtime config)
```
