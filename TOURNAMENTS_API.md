# Tournaments API Documentation

## Base URL
`/tournements`

---

## Data Model: Tournament

### Main Tournament Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | String | Auto | Unique identifier |
| `name` | String | ✅ | Tournament name |
| `description` | String | ❌ | Detailed description |
| `gameId` | ObjectId (Ref: Catalog) | ✅ | Game reference |
| `organizerId` | ObjectId (Ref: User) | ✅ | Organizer reference |
| `startDate` | Date | ✅ | Tournament start date/time |
| `endDate` | Date | ✅ | Tournament end date/time |
| `registrationStart` | Date | ❌ | Registration opening date |
| `registrationEnd` | Date | ❌ | Registration closing date |
| `maxTeams` | Number | ✅ | Maximum teams (min: 2) |
| `currentTeams` | Number | Auto | Current registered teams count |
| `teams` | Array<ObjectId> | Auto | Registered team IDs |
| `registrationOpen` | Boolean | Auto | Registration status (default: true) |
| `prizePool` | Number | ❌ | Total prize pool (default: 0) |
| `firstPlace` | Number | ❌ | 1st place prize (default: 0) |
| `secondPlace` | Number | ❌ | 2nd place prize (default: 0) |
| `thirdPlace` | Number | ❌ | 3rd place prize (default: 0) |
| `format` | String (Enum) | ✅ | Tournament format |
| `phases` | Array<Phase> | Auto | Tournament phases/stages |
| `status` | String (Enum) | Auto | Tournament status (default: 'DRAFT') |
| `rules` | Object | ❌ | Custom tournament rules |
| `bannerImageUrl` | String | ❌ | Banner image URL |
| `streamUrl` | String | ❌ | Live stream URL |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

### Tournament Format Enum
- `SINGLE_ELIMINATION` - Single elimination bracket
- `DOUBLE_ELIMINATION` - Double elimination bracket
- `SWISS` - Swiss system
- `ROUND_ROBIN` - Round-robin format

### Tournament Status Enum
- `DRAFT` - Tournament created but not published
- `OPEN_REGISTRATION` - Accepting team registrations
- `ONGOING` - Tournament in progress
- `COMPLETED` - Tournament finished
- `CANCELLED` - Tournament cancelled

### Tournament Phase Schema

| Field | Type | Description |
|---|---|---|
| `name` | String | Phase name (PLAY_IN, GROUP_STAGE, QUARTERFINALS, SEMIFINALS, FINALS) |
| `status` | String | Phase status (PENDING, ONGOING, COMPLETED) |
| `startDate` | Date | Phase start date |
| `endDate` | Date | Phase end date |
| `matches` | Array<ObjectId> | Match references |

---

## Endpoints

### 1. Create Tournament
**POST** `/tournements`

**Request Body:**
```json
{
  "name": "Winter Championship 2026",
  "description": "The biggest winter esports event",
  "gameId": "65bf1234567890abcdef1234",
  "organizerId": "65bf1234567890abcdef5678",
  "startDate": "2026-12-01T10:00:00.000Z",
  "endDate": "2026-12-05T20:00:00.000Z",
  "registrationStart": "2026-11-01T00:00:00.000Z",
  "registrationEnd": "2026-11-25T23:59:59.000Z",
  "maxTeams": 16,
  "prizePool": 10000,
  "firstPlace": 5000,
  "secondPlace": 3000,
  "thirdPlace": 2000,
  "format": "SINGLE_ELIMINATION",
  "rules": {
    "bestOf": 3,
    "mapPool": ["Dust2", "Inferno", "Mirage"],
    "overtime": true
  },
  "bannerImageUrl": "https://example.com/banner.jpg",
  "streamUrl": "https://twitch.tv/tournament"
}
```

**Response (201 Created):**
```json
{
  "_id": "65c1234567890abcdef12345",
  "name": "Winter Championship 2026",
  "description": "The biggest winter esports event",
  "gameId": "65bf1234567890abcdef1234",
  "organizerId": "65bf1234567890abcdef5678",
  "startDate": "2026-12-01T10:00:00.000Z",
  "endDate": "2026-12-05T20:00:00.000Z",
  "registrationStart": "2026-11-01T00:00:00.000Z",
  "registrationEnd": "2026-11-25T23:59:59.000Z",
  "maxTeams": 16,
  "currentTeams": 0,
  "teams": [],
  "registrationOpen": true,
  "prizePool": 10000,
  "firstPlace": 5000,
  "secondPlace": 3000,
  "thirdPlace": 2000,
  "format": "SINGLE_ELIMINATION",
  "phases": [],
  "status": "DRAFT",
  "rules": {
    "bestOf": 3,
    "mapPool": ["Dust2", "Inferno", "Mirage"],
    "overtime": true
  },
  "bannerImageUrl": "https://example.com/banner.jpg",
  "streamUrl": "https://twitch.tv/tournament",
  "createdAt": "2026-02-07T10:00:00.000Z",
  "updatedAt": "2026-02-07T10:00:00.000Z"
}
```

---

### 2. Get All Tournaments
**GET** `/tournements`

**Response (200 OK):**
```json
[
  {
    "_id": "65c1234567890abcdef12345",
    "name": "Winter Championship 2026",
    "gameId": {
      "_id": "65bf1234567890abcdef1234",
      "title": "CS:GO",
      "genre": "FPS",
      "coverImageUrl": "https://example.com/csgo.jpg"
    },
    "organizerId": {
      "_id": "65bf1234567890abcdef5678",
      "username": "TournamentOrg",
      "email": "org@example.com"
    },
    "startDate": "2026-12-01T10:00:00.000Z",
    "endDate": "2026-12-05T20:00:00.000Z",
    "currentTeams": 8,
    "maxTeams": 16,
    "prizePool": 10000,
    "status": "OPEN_REGISTRATION",
    "format": "SINGLE_ELIMINATION",
    "createdAt": "2026-02-07T10:00:00.000Z",
    "updatedAt": "2026-02-07T10:00:00.000Z"
  }
]
```

---

### 3. Get Tournament by ID
**GET** `/tournements/:id`

**Response (200 OK):**
```json
{
  "_id": "65c1234567890abcdef12345",
  "name": "Winter Championship 2026",
  "description": "The biggest winter esports event",
  "gameId": {
    "_id": "65bf1234567890abcdef1234",
    "title": "CS:GO",
    "genre": "FPS",
    "coverImageUrl": "https://example.com/csgo.jpg",
    "publisher": "Valve"
  },
  "organizerId": {
    "_id": "65bf1234567890abcdef5678",
    "username": "TournamentOrg",
    "email": "org@example.com"
  },
  "startDate": "2026-12-01T10:00:00.000Z",
  "endDate": "2026-12-05T20:00:00.000Z",
  "registrationStart": "2026-11-01T00:00:00.000Z",
  "registrationEnd": "2026-11-25T23:59:59.000Z",
  "maxTeams": 16,
  "currentTeams": 8,
  "teams": ["65bf...", "65bf..."], // Array of team IDs or populated teams
  "registrationOpen": true,
  "prizePool": 10000,
  "firstPlace": 5000,
  "secondPlace": 3000,
  "thirdPlace": 2000,
  "format": "SINGLE_ELIMINATION",
  "phases": [
    {
      "name": "QUARTERFINALS",
      "status": "PENDING",
      "startDate": "2026-12-02T10:00:00.000Z",
      "endDate": "2026-12-02T20:00:00.000Z",
      "matches": []
    },
    {
      "name": "SEMIFINALS",
      "status": "PENDING",
      "matches": []
    }
  ],
  "status": "OPEN_REGISTRATION",
  "rules": {
    "bestOf": 3,
    "mapPool": ["Dust2", "Inferno", "Mirage"]
  },
  "bannerImageUrl": "https://example.com/banner.jpg",
  "streamUrl": "https://twitch.tv/tournament",
  "createdAt": "2026-02-07T10:00:00.000Z",
  "updatedAt": "2026-02-07T10:00:00.000Z"
}
```

---

### 4. Update Tournament
**PATCH** `/tournements/:id`

**Request Body (Partial Update):**
```json
{
  "status": "ONGOING",
  "registrationOpen": false,
  "prizePool": 12000
}
```

**Response (200 OK):**
```json
{
  "_id": "65c1234567890abcdef12345",
  // ... full tournament object with updates applied
  "status": "ONGOING",
  "registrationOpen": false,
  "prizePool": 12000
}
```

---

### 5. Delete Tournament
**DELETE** `/tournements/:id`

**Response (200 OK):**
```json
{
  "message": "Tournament deleted successfully"
}
```

---

### 6. Register Team
**POST** `/tournements/:id/register-team`

**Request Body:**
```json
{
  "teamId": "65bf1234567890abcdef9999"
}
```

**Response (200 OK):**
```json
{
  "_id": "65c1234567890abcdef12345",
  // ... full tournament object
  "currentTeams": 9,
  "teams": ["65bf...", "65bf...", "65bf1234567890abcdef9999"]
}
```

**Error Responses:**
- `400 Bad Request` - Registration closed or tournament full
- `404 Not Found` - Tournament not found

---

### 7. Unregister Team
**DELETE** `/tournements/:id/unregister-team/:teamId`

**Response (200 OK):**
```json
{
  "_id": "65c1234567890abcdef12345",
  // ... full tournament object
  "currentTeams": 8,
  "teams": ["65bf...", "65bf..."] // teamId removed
}
```

**Error Responses:**
- `404 Not Found` - Tournament or team not found in tournament

---

### 8. Add Phase
**POST** `/tournements/:id/phases`

**Request Body:**
```json
{
  "name": "QUARTERFINALS",
  "startDate": "2026-12-02T10:00:00.000Z",
  "endDate": "2026-12-02T20:00:00.000Z"
}
```

**Response (200 OK):**
```json
{
  "_id": "65c1234567890abcdef12345",
  // ... full tournament object
  "phases": [
    {
      "name": "QUARTERFINALS",
      "status": "PENDING",
      "startDate": "2026-12-02T10:00:00.000Z",
      "endDate": "2026-12-02T20:00:00.000Z",
      "matches": []
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Phase already exists
- `404 Not Found` - Tournament not found

---

### 9. Update Phase Status
**PATCH** `/tournements/:id/phases/:phaseName`

**Request Body:**
```json
{
  "status": "ONGOING"
}
```

**Response (200 OK):**
```json
{
  "_id": "65c1234567890abcdef12345",
  // ... full tournament object with updated phase status
  "phases": [
    {
      "name": "QUARTERFINALS",
      "status": "ONGOING",
      "startDate": "2026-12-02T10:00:00.000Z",
      "endDate": "2026-12-02T20:00:00.000Z",
      "matches": []
    }
  ]
}
```

**Error Responses:**
- `404 Not Found` - Tournament or phase not found

---

## Common Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid tournament ID" // or other validation error
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Tournament with ID 65c... not found"
}
```

---

## Phase Names (Esports Standard)

The following phase names are commonly used in esports tournaments:

- `PLAY_IN` - Qualifying stage for lower-seeded teams
- `GROUP_STAGE` - Round-robin or swiss group play
- `QUARTERFINALS` - Top 8 teams
- `SEMIFINALS` - Top 4 teams
- `FINALS` - Championship match

You can add phases in any order or use custom phase names as needed.

---

## Usage Tips

1. **Creating a Tournament:** Start with status `DRAFT`, then update to `OPEN_REGISTRATION` when ready
2. **Team Registration:** Check `registrationOpen` and `currentTeams < maxTeams` before allowing registration
3. **Phase Management:** Add phases before tournament starts, update status as tournament progresses
4. **Prize Distribution:** Ensure `firstPlace + secondPlace + thirdPlace <= prizePool`
5. **Dates:** Use ISO 8601 format for all dates (`YYYY-MM-DDTHH:mm:ss.sssZ`)

