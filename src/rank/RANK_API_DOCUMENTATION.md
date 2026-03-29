# Ranking System API Documentation

## Overview

The ranking system provides a comprehensive ELO-based player ranking mechanism for competitive FPS games like Valorant and League of Legends. Each player has separate ranks per game with automatic tier progression, penalty tracking, and complete match history.

## Key Features

- **ELO System**: Win: +400 ELO, Loss: -400 ELO
- **9 Rank Tiers**: Iron → Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster → Challenger
- **Divisions**: 3 levels per tier (except Master/Grandmaster: 2, Challenger: 1)
- **Penalty System**: Deduct ELO for behavioral infractions
- **Match History**: Complete audit trail of all ELO changes
- **Leaderboards**: Global rankings per game

---

## Endpoints

### 1. Initialize Player Rank

Create a new rank entry for a player in a specific game.

**Endpoint**: `POST /rank/initialize`

**Request Body**:
```json
{
  "userId": "65a1b2c3d4e5f67890abcdef",
  "gameId": "65a1b2c3d4e5f67890fedcba"
}
```

**Response** (201 Created):
```json
{
  "_id": "65a1b2c3d4e5f67890123456",
  "user": "65a1b2c3d4e5f67890abcdef",
  "game": "65a1b2c3d4e5f67890fedcba",
  "elo": 0,
  "level": 1,
  "tier": "IRON",
  "division": 1,
  "peakElo": 0,
  "peakTier": "IRON",
  "peakDivision": 1,
  "wins": 0,
  "losses": 0,
  "winRate": 0,
  "totalMatches": 0,
  "currentStreak": 0,
  "longestWinStreak": 0,
  "season": 1,
  "createdAt": "2026-02-12T18:00:00.000Z",
  "updatedAt": "2026-02-12T18:00:00.000Z"
}
```

---

### 2. Get Player Rank

Retrieve a player's current rank for a specific game.

**Endpoint**: `GET /rank/:userId/:gameId`

**Example**: `GET /rank/65a1b2c3d4e5f67890abcdef/65a1b2c3d4e5f67890fedcba`

**Response** (200 OK):
```json
{
  "_id": "65a1b2c3d4e5f67890123456",
  "user": {
    "_id": "65a1b2c3d4e5f67890abcdef",
    "nickname": "Player123",
    "email": "player@example.com"
  },
  "game": {
    "_id": "65a1b2c3d4e5f67890fedcba",
    "title": "Valorant",
    "genre": "FPS"
  },
  "elo": 1600,
  "level": 5,
  "tier": "BRONZE",
  "division": 2,
  "peakElo": 1600,
  "wins": 4,
  "losses": 0,
  "winRate": 100,
  "totalMatches": 4
}
```

---

### 3. Update ELO After Match

Update a player's ELO based on match result (win or loss).

**Endpoint**: `POST /rank/update-elo`

**Request Body**:
```json
{
  "userId": "65a1b2c3d4e5f67890abcdef",
  "gameId": "65a1b2c3d4e5f67890fedcba",
  "result": "WIN",
  "matchId": "65a1b2c3d4e5f67890match1",
  "tournamentId": "65a1b2c3d4e5f67890tourn1",
  "reasonDetails": "Victory in quarterfinal match"
}
```

**Result Values**: `WIN` or `LOSS`

**Response** (200 OK):
```json
{
  "_id": "65a1b2c3d4e5f67890123456",
  "user": "65a1b2c3d4e5f67890abcdef",
  "game": "65a1b2c3d4e5f67890fedcba",
  "elo": 2000,
  "level": 7,
  "tier": "SILVER",
  "division": 1,
  "wins": 5,
  "losses": 0,
  "winRate": 100,
  "totalMatches": 5,
  "currentStreak": 5,
  "lastMatchDate": "2026-02-12T18:15:00.000Z"
}
```

---

### 4. Apply Penalty

Apply a behavioral penalty to a player (Admin only).

**Endpoint**: `POST /rank/penalty`

**Request Body**:
```json
{
  "userId": "65a1b2c3d4e5f67890abcdef",
  "gameId": "65a1b2c3d4e5f67890fedcba",
  "type": "TOXIC_BEHAVIOR",
  "severity": "MEDIUM",
  "eloDeduction": 200,
  "notes": "Verbal abuse in match chat",
  "evidence": ["https://example.com/screenshot1.png"],
  "matchId": "65a1b2c3d4e5f67890match1"
}
```

**Penalty Types**:
- `TOXIC_BEHAVIOR` - General toxic behavior
- `TRASH_TALKING` - Excessive trash talking
- `AFK` - Away from keyboard during match
- `LEAVING_MATCH` - Left match early
- `GRIEFING` - Intentionally ruining game
- `INTENTIONAL_FEEDING` - Purposely losing
- `CHEATING` - Using cheats/hacks
- `ACCOUNT_SHARING` - Sharing account
- `VERBAL_ABUSE` - Verbal harassment
- `HARASSMENT` - Harassment of other players
- `OTHER` - Other infractions

**Severity Levels**:
- `LOW` - Minor infractions (-100 to -200 ELO)
- `MEDIUM` - Moderate infractions (-200 to -400 ELO)
- `HIGH` - Serious infractions (-400 to -600 ELO)
- `SEVERE` - Very serious (-600 to -1000 ELO or rank reset)

**Response** (200 OK):
```json
{
  "penalty": {
    "_id": "65a1b2c3d4e5f67890penalty",
    "user": "65a1b2c3d4e5f67890abcdef",
    "game": "65a1b2c3d4e5f67890fedcba",
    "type": "TOXIC_BEHAVIOR",
    "severity": "MEDIUM",
    "eloDeducted": 200,
    "issuedBy": "65a1b2c3d4e5f67890admin01",
    "notes": "Verbal abuse in match chat",
    "status": "ACTIVE",
    "createdAt": "2026-02-12T18:20:00.000Z"
  },
  "updatedRank": {
    "_id": "65a1b2c3d4e5f67890123456",
    "elo": 1800,
    "tier": "BRONZE",
    "division": 3
  }
}
```

---

### 5. Get Rank History

Retrieve a player's ELO change history for a specific game.

**Endpoint**: `GET /rank/history/:userId/:gameId?limit=50`

**Example**: `GET /rank/history/65a1b2c3d4e5f67890abcdef/65a1b2c3d4e5f67890fedcba?limit=20`

**Query Parameters**:
- `limit` (optional): Number of records to return (default: 50)

**Response** (200 OK):
```json
[
  {
    "_id": "65a1b2c3d4e5f67890hist01",
    "playerRank": "65a1b2c3d4e5f67890123456",
    "user": "65a1b2c3d4e5f67890abcdef",
    "game": "65a1b2c3d4e5f67890fedcba",
    "previousElo": 2000,
    "newElo": 1800,
    "eloChange": -200,
    "reason": "PENALTY",
    "reasonDetails": "Penalty: TOXIC_BEHAVIOR (MEDIUM)",
    "previousTier": "SILVER",
    "newTier": "BRONZE",
    "isTierPromotion": false,
    "isTierDemotion": true,
    "createdAt": "2026-02-12T18:20:00.000Z"
  },
  {
    "_id": "65a1b2c3d4e5f67890hist02",
    "previousElo": 1600,
    "newElo": 2000,
    "eloChange": 400,
    "reason": "WIN",
    "reasonDetails": "Match win",
    "previousTier": "BRONZE",
    "newTier": "SILVER",
    "isTierPromotion": true,
    "createdAt": "2026-02-12T18:15:00.000Z"
  }
]
```

---

### 6. Get Leaderboard

Get top players by ELO for a specific game.

**Endpoint**: `GET /rank/leaderboard/:gameId?season=1&limit=100`

**Example**: `GET /rank/leaderboard/65a1b2c3d4e5f67890fedcba?limit=10`

**Query Parameters**:
- `season` (optional): Filter by season number
- `limit` (optional): Number of players to return (default: 100)

**Response** (200 OK):
```json
[
  {
    "_id": "65a1b2c3d4e5f67890rank01",
    "user": {
      "_id": "65a1b2c3d4e5f67890user01",
      "nickname": "ProPlayer1",
      "email": "pro1@example.com"
    },
    "game": {
      "_id": "65a1b2c3d4e5f67890fedcba",
      "title": "Valorant"
    },
    "elo": 8500,
    "level": 24,
    "tier": "CHALLENGER",
    "division": 1,
    "wins": 85,
    "losses": 15,
    "winRate": 85
  },
  {
    "elo": 7200,
    "tier": "GRANDMASTER",
    "nickname": "ProPlayer2"
  }
]
```

---

### 7. Get User Ranks

Get all ranks for a user across all games.

**Endpoint**: `GET /rank/user/:userId/all`

**Example**: `GET /rank/user/65a1b2c3d4e5f67890abcdef/all`

**Response** (200 OK):
```json
[
  {
    "_id": "65a1b2c3d4e5f67890rank01",
    "user": "65a1b2c3d4e5f67890abcdef",
    "game": {
      "_id": "65a1b2c3d4e5f67890game01",
      "title": "Valorant",
      "genre": "FPS",
      "coverImageUrl": "https://..."
    },
    "elo": 5200,
    "tier": "DIAMOND",
    "division": 1
  },
  {
    "game": {
      "title": "League of Legends"
    },
    "elo": 3400,
    "tier": "GOLD"
  }
]
```

---

### 8. Get User Penalties

Get all penalties issued to a user.

**Endpoint**: `GET /rank/penalties/:userId?gameId=...`

**Example**: `GET /rank/penalties/65a1b2c3d4e5f67890abcdef`

**Query Parameters**:
- `gameId` (optional): Filter by specific game

**Response** (200 OK):
```json
[
  {
    "_id": "65a1b2c3d4e5f67890penalty1",
    "user": "65a1b2c3d4e5f67890abcdef",
    "game": {
      "_id": "65a1b2c3d4e5f67890fedcba",
      "title": "Valorant"
    },
    "type": "TOXIC_BEHAVIOR",
    "severity": "MEDIUM",
    "eloDeducted": 200,
    "issuedBy": {
      "_id": "65a1b2c3d4e5f67890admin01",
      "nickname": "AdminUser"
    },
    "notes": "Verbal abuse in match chat",
    "status": "ACTIVE",
    "createdAt": "2026-02-12T18:20:00.000Z"
  }
]
```

---

### 9. Reset Season Ranks

Reset all ranks for a new season (Admin only).

**Endpoint**: `POST /rank/reset-season/:gameId`

**Request Body**:
```json
{
  "newSeason": 2
}
```

**Response** (200 OK):
```json
{
  "message": "Reset 150 ranks for season 2"
}
```

**Note**: Season reset applies a soft reset, keeping 50% of current ELO and resetting match statistics.

---

## Tier System

### Tier Breakdown

| Tier | ELO Range | Divisions | Levels |
|------|-----------|-----------|--------|
| Iron | 0 - 999 | 3 | 1-3 |
| Bronze | 1000 - 1999 | 3 | 4-6 |
| Silver | 2000 - 2999 | 3 | 7-9 |
| Gold | 3000 - 3999 | 3 | 10-12 |
| Platinum | 4000 - 4999 | 3 | 13-15 |
| Diamond | 5000 - 5999 | 3 | 16-18 |
| Master | 6000 - 6999 | 2 | 19-20 |
| Grandmaster | 7000 - 7999 | 2 | 21-22 |
| Challenger | 8000+ | 1 | 23+ |

### Division System

Within each tier, divisions work as sub-ranks:
- **Division 3**: Highest within tier (e.g., Iron 3, Bronze 3)
- **Division 2**: Middle
- **Division 1**: Lowest (entry to tier)

---

## Usage Examples

### Scenario 1: New Player Journey

```bash
# 1. Initialize rank
POST /rank/initialize
{"userId": "user1", "gameId": "valorant"}
→ ELO: 0, Tier: IRON 1

# 2. Win first match
POST /rank/update-elo
{"userId": "user1", "gameId": "valorant", "result": "WIN"}
→ ELO: 400, Tier: IRON 2

# 3. Win 3 more matches
# After 4 wins: ELO: 1600, Tier: BRONZE 2
```

### Scenario 2: Penalty Applied

```bash
# Player with 2000 ELO (SILVER 1) gets penalized
POST /rank/penalty
{
  "userId": "user1",
  "gameId": "valorant",
  "type": "TOXIC_BEHAVIOR",
  "severity": "MEDIUM",
  "eloDeduction": 200
}
→ ELO: 1800, Tier: BRONZE 3 (demoted)
```

### Scenario 3: Check Leaderboard

```bash
# Get top 10 players
GET /rank/leaderboard/valorant?limit=10
→ Returns top 10 players sorted by ELO
```

---

## Error Responses

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Player rank not found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Player rank already exists for this game"
}
```

---

## Integration Notes

1. **Authentication**: Add guards to admin-only endpoints (penalty, reset-season)
2. **Match Integration**: Call `updateElo` after each competitive match
3. **Tournament Integration**: Pass `tournamentId` when updating ELO in tournaments
4. **Frontend Display**: Use tier colors for UI rendering
5. **Real-time Updates**: Consider WebSocket for live leaderboard updates
