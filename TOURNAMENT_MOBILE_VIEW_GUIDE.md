# Tournament Mobile View Guide

This guide shows how to implement tournament features on mobile using the data in `src/tournements/schemas/tournament.schema.ts`.

## 1) Screen Structure

Implement these main screens:

1. Tournament List
2. Tournament Details
3. Optional: My Invitations

### Tournament List (cards)
- `name`
- `status`
- `startDate` / `endDate`
- Team progress: `currentTeams / maxTeams`
- `format`

### Tournament Details (tabs)
- **Overview**: description, dates, format, status, prize pool
- **Phases**: `phases[]`
- **Teams**: `teams[]` and team count
- **Tickets**: `ticketTypes[]`
- **Rules**: `rules`

## 2) Field-to-UI Mapping

Use this schema mapping:

- Header
  - `name`
  - `description`
  - `bannerImageUrl`
  - `status`
  - `type`

- Dates section
  - `startDate`, `endDate`
  - `registrationStart`, `registrationEnd`
  - `ticketSalesStart`

- Capacity section
  - `maxTeams`
  - `currentTeams`
  - `registrationOpen`

- Prize section
  - `prizePool`
  - `firstPlace`, `secondPlace`, `thirdPlace`

- Phases section
  - `phases[].name`
  - `phases[].status`
  - `phases[].startDate`
  - `phases[].endDate`
  - `phases[].matches`

- Other
  - `streamUrl`
  - `rules`
  - `invitations`

## 3) Mobile UI Logic

### Status badge colors
- `PENDING_APPROVAL`: gray
- `OPEN_REGISTRATION`: green
- `ONGOING`: blue/cyan
- `COMPLETED`: dark green
- `CANCELLED` / `REJECTED` / `BLOCKED`: red/orange

### Join/Register button conditions
Enable register button only if:
- `registrationOpen === true`
- now is between `registrationStart` and `registrationEnd` (if both exist)
- `currentTeams < maxTeams`
- tournament status allows registration (`OPEN_REGISTRATION`)

### Empty states
- No phases: show `No phases yet`
- No teams: show `No teams registered yet`
- No tickets: show `No ticket types available`
- No rules: show `No rules provided`

## 4) Suggested Frontend Models

Create frontend view models so UI is simple and stable:

```ts
export type TournamentListItem = {
  id: string;
  name: string;
  status: string;
  format: string;
  startDate: string;
  endDate: string;
  currentTeams: number;
  maxTeams: number;
  bannerImageUrl?: string;
};

export type TournamentPhaseVM = {
  name: string;
  status: 'PENDING' | 'ONGOING' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  matchesCount: number;
};

export type TournamentDetailsVM = {
  id: string;
  name: string;
  description?: string;
  status: string;
  format: string;
  type: string;
  startDate: string;
  endDate: string;
  registrationStart?: string;
  registrationEnd?: string;
  ticketSalesStart?: string;
  maxTeams: number;
  currentTeams: number;
  registrationOpen: boolean;
  prizePool: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  phases: TournamentPhaseVM[];
  teams: string[];
  ticketTypes: string[];
  rules: Record<string, any>;
  bannerImageUrl?: string;
  streamUrl?: string;
};
```

## 5) Example Rendering Flow

1. Fetch tournament list
2. Render cards with status + date + progress
3. On card click, open details
4. Fetch tournament by id
5. Render tabs (Overview, Phases, Teams, Tickets, Rules)
6. Show CTA (Register/Join) if conditions are valid

## 6) API Integration Notes

- Convert all date strings to readable mobile format
- Normalize missing values with safe defaults
- Use loading, error, and retry states on every fetch
- Cache list/details requests to improve UX

## 7) Quick Checklist

- [ ] Tournament list screen done
- [ ] Tournament details tabs done
- [ ] Status badge mapping done
- [ ] Registration button guard logic done
- [ ] Empty states done
- [ ] Date formatting done
- [ ] Error/loading/retry states done

