# Last updates — LeagueRule (phase, side selection, match reporting)

This file describes **only** the latest changes added to the LeagueRule entity.

---

## 1. Rule usage (phase types)

You can now define **which phase(s)** a ruleset applies to (e.g. Regular Season, Playoffs, Play-In).

| Field       | Type     | Values |
|------------|----------|--------|
| `ruleUsage` | enum[]   | `REGULAR_SEASON` \| `PLAYOFFS` \| `GRAND_FINAL` \| `PLAY_IN` \| `QUALIFICATION` \| `GROUP_STAGE` |

- **Default:** `[REGULAR_SEASON]`
- One ruleset can apply to multiple phases (e.g. `[PLAYOFFS, GRAND_FINAL]`).
- Use different LeagueRules for different phases (e.g. one for “Regular Season BO3”, one for “Playoffs BO5”, one for “Play-In BO1”).

---

## 2. Side selection

How attack/defense (or blue/red) is decided for a match.

| Field           | Type   | Values |
|----------------|--------|--------|
| `sideSelection` | enum   | `HIGHER_SEED_CHOOSES` \| `KNIFE_ROUND` \| `COIN_TOSS` \| `VETO_WINNER_CHOOSES` \| `FIXED_TEAM_A_ATTACK` |

- **Default:** `HIGHER_SEED_CHOOSES`

---

## 3. Match reporting / score validation

Used for disputes and consistency: how scores are submitted and what substitution/pause/replay rules apply.

| Field                     | Type    | Description |
|---------------------------|---------|-------------|
| `scoreSubmissionMethod`   | enum    | `ADMIN_VERIFIED` \| `BOTH_TEAMS_CONFIRM` \| `AUTO_FROM_API` — default: `ADMIN_VERIFIED` |
| `substitutionsAllowed`   | boolean | Default: `false` |
| `maxSubstitutions`        | number  | Default: `0` (meaningful when substitutions are allowed) |
| `emergencySubsOnly`       | boolean | Default: `false` |
| `pauseAllowedForDisconnect` | boolean | Default: `true` |
| `replayConditions`        | string? | Free text: when a replay is allowed |
| `remakeConditions`        | string? | Free text: when a remake is allowed |
| `adminDecisionRequired`   | boolean | Default: `false` |

---

## Files changed

- `src/league-rule/schemas/league-rule.schema.ts` — new enums and fields.
- `src/league-rule/dto/create-league-rule.dto.ts` — new optional fields and validators.
- `ARENA_CHAIN_COMPLETE_GUIDE.md` — LeagueRule table and enums section updated.

No new endpoints; create/update LeagueRule (POST/PATCH `/league-rules`) accept these fields.
