# View All – API Guide

API reference for listing all **Players**, **Leagues**, **Matches**, and **Tournaments**.

---

## Base Configuration

| Setting       | Value                                   |
|---------------|-----------------------------------------|
| Base URL      | `http://localhost:3000` (or your backend URL) |
| Content-Type  | `application/json`                      |
| Auth header   | `Authorization: Bearer <accessToken>` (if required) |

---

## 1. View All Players

**Endpoint:** `GET /player`

Returns all player profiles with populated user info (nickname, email, etc.).

### Request

```
GET /player
```

### Response

Array of player profiles:

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": {
      "_id": "507f1f77bcf86cd799439012",
      "nickname": "PlayerOne",
      "email": "player@example.com"
    },
    "isPro": false,
    "isVerified": false,
    "elo": 1000,
    "rank": "Unranked",
    "points": 0,
    "stats": {}
  }
]
```

### Fields

| Field      | Type    | Description                    |
|------------|---------|--------------------------------|
| `_id`      | string  | Player profile ID              |
| `userId`   | object  | Populated User (nickname, email) |
| `isPro`    | boolean | Pro player flag                |
| `isVerified` | boolean | Verified badge               |
| `elo`      | number  | ELO rating                     |
| `rank`     | string  | Rank label                     |
| `points`   | number  | Points                         |
| `stats`    | object  | Custom stats                   |

### Single Player

```
GET /player/:userId
```

Returns one player profile by user ID.

---

## 2. View All Leagues

**Endpoint:** `GET /leagues`

Returns all leagues with populated organiser info.

### Request

```
GET /leagues
```

### Response

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Valorant Regional League",
    "level": "REGIONAL",
    "regionId": "tn",
    "gameId": "507f1f77bcf86cd799439012",
    "description": "Regional Valorant competition",
    "logoUrl": "/uploads/league-logo.png",
    "isActive": true,
    "organiserId": {
      "_id": "507f1f77bcf86cd799439013",
      "nickname": "OrganiserName"
    }
  }
]
```

### Fields

| Field         | Type   | Description                          |
|---------------|--------|--------------------------------------|
| `_id`         | string | League ID                            |
| `name`        | string | League name                          |
| `level`       | enum   | `INTERNATIONAL`, `CONTINENTAL`, `NATIONAL`, `REGIONAL` |
| `regionId`    | string | Region identifier                    |
| `gameId`      | string | Game ID                              |
| `description` | string | Optional description                 |
| `logoUrl`     | string | Logo URL                             |
| `isActive`    | boolean | Active status                       |
| `organiserId` | object | Populated organiser user             |

### Region Enums

```
GET /leagues/enums/regions
```

Returns `continents` and `countries` for region selection.

### Single League

```
GET /leagues/:id
```

---

## 3. View All Matches

Matches are scoped by **round** or **season**. There is no global “all matches” endpoint.

### By Round

**Endpoint:** `GET /matches?roundId=:roundId`

Returns all matches for a round, ordered by `matchOrder` and `scheduledStart`.

### Request

```
GET /matches?roundId=507f1f77bcf86cd799439011
```

### By Season

**Endpoint:** `GET /matches?seasonId=:seasonId`

Returns all matches for a season, ordered by `scheduledStart`.

### Request

```
GET /matches?seasonId=507f1f77bcf86cd799439011
```

### Response

```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "roundId": "507f1f77bcf86cd799439011",
    "seasonId": "507f1f77bcf86cd799439012",
    "team1Id": "507f1f77bcf86cd799439015",
    "team2Id": "507f1f77bcf86cd799439016",
    "format": "BO3",
    "scheduledStart": "2025-03-01T18:00:00.000Z",
    "scheduledEnd": null,
    "matchOrder": 1,
    "status": "SCHEDULED",
    "games": [],
    "team1GamesWon": 0,
    "team2GamesWon": 0,
    "winnerId": null,
    "loserId": null
  }
]
```

### Fields

| Field            | Type   | Description                          |
|------------------|--------|--------------------------------------|
| `_id`            | string | Match ID                             |
| `roundId`        | string | Round ID                             |
| `seasonId`       | string | Season ID                            |
| `team1Id`        | string | Team 1 ID                            |
| `team2Id`        | string | Team 2 ID                            |
| `format`         | string | `BO1`, `BO3`, `BO5`                  |
| `scheduledStart` | Date   | Scheduled start time                 |
| `status`         | enum   | `SCHEDULED`, `ONGOING`, `COMPLETED`, `FORFEIT`, `CANCELLED` |
| `games`          | array  | Individual game results              |
| `team1GamesWon`  | number | Games won by team 1                  |
| `team2GamesWon`  | number | Games won by team 2                  |
| `winnerId`       | string | Winner team ID (when completed)      |
| `loserId`        | string | Loser team ID (when completed)      |

### No Query Params

If neither `roundId` nor `seasonId` is provided, the API returns an empty array `[]`.

To list matches:

1. Get seasons: `GET /seasons`
2. For each season (or a selected one): `GET /matches?seasonId=<id>`

Or use rounds:

1. Get rounds: `GET /rounds` or `GET /rounds/by-season/:seasonId`
2. For each round: `GET /matches?roundId=<id>`

### Single Match

```
GET /matches/:id
```

---

## 4. View All Tournaments

**Endpoint:** `GET /tournements`

Returns all tournaments, sorted by creation date (newest first), with populated game info.

### Request

```
GET /tournements
```

### Response

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Valorant Championship 2025",
    "description": "Annual Valorant championship",
    "gameId": {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Valorant",
      "genre": "FPS",
      "coverImageUrl": "/uploads/valorant.png"
    },
    "organizerId": "507f1f77bcf86cd799439013",
    "startDate": "2025-06-01T00:00:00.000Z",
    "endDate": "2025-06-15T00:00:00.000Z",
    "maxTeams": 16,
    "currentTeams": 8,
    "registrationOpen": true,
    "prizePool": 10000,
    "firstPlace": 5000,
    "secondPlace": 3000,
    "thirdPlace": 2000,
    "format": "SINGLE_ELIMINATION",
    "status": "DRAFT",
    "phases": [],
    "teams": [],
    "bannerImageUrl": "/uploads/tournament-banner.jpg"
  }
]
```

### Fields

| Field              | Type   | Description                          |
|--------------------|--------|--------------------------------------|
| `_id`              | string | Tournament ID                        |
| `name`             | string | Tournament name                      |
| `description`      | string | Description                           |
| `gameId`           | object | Populated game (title, genre, cover)  |
| `organizerId`      | string | Organizer user ID                    |
| `startDate`        | Date   | Start date                           |
| `endDate`          | Date   | End date                             |
| `maxTeams`         | number | Max teams                            |
| `currentTeams`     | number | Registered teams count               |
| `registrationOpen` | boolean | Registration open                  |
| `prizePool`        | number | Total prize pool                     |
| `firstPlace`       | number | 1st place prize                      |
| `secondPlace`      | number | 2nd place prize                      |
| `thirdPlace`       | number | 3rd place prize                      |
| `format`           | string | `SINGLE_ELIMINATION`, `DOUBLE_ELIMINATION`, `SWISS`, `ROUND_ROBIN` |
| `status`           | string | `DRAFT`, `OPEN_REGISTRATION`, `ONGOING`, `COMPLETED`, `CANCELLED` |
| `phases`           | array  | Tournament phases                    |
| `teams`            | array  | Registered team IDs                  |
| `bannerImageUrl`   | string | Banner image URL                    |

### Single Tournament

```
GET /tournements/:id
```

Returns full tournament with populated `teams` and `gameId`.

---

## Summary Table

| View            | Endpoint                    | Query Params              | Notes                          |
|-----------------|-----------------------------|---------------------------|--------------------------------|
| All players     | `GET /player`               | —                         | Returns all player profiles    |
| All leagues     | `GET /leagues`              | —                         | Returns all leagues            |
| All matches     | `GET /matches`              | `roundId` or `seasonId`    | Must filter by round or season |
| All tournaments | `GET /tournements`          | —                         | Returns all tournaments        |
