# Team Manager — Frontend Implementation Guide

## Overview of the full flow

```
Register → Verify OTP → Login → Complete Profile → Create Team → Invite Players
```

All authenticated endpoints require the `Authorization: Bearer <accessToken>` header.

---

## 1. Registration

**POST** `/auth/register`

```json
{
  "email": "manager@example.com",
  "password": "StrongPass1!",
  "nickname": "CoachKhalil",
  "role": "team_manager",
  "organizationName": "Elite Gaming Org",
  "firstName": "Khalil",
  "lastName": "Mouscou",
  "cin": "12345678",
  "age": 28,
  "gender": "male",
  "description": "Head coach and team manager",
  "phoneNumber": "+21612345678"
}
```

> `teamId` is **optional** at registration — the manager creates their team later.

**Response:**
```json
{ "message": "Verification code sent to your email" }
```

---

## 2. Email Verification (OTP)

**POST** `/auth/verify-email`

```json
{
  "email": "manager@example.com",
  "otp": "847261"
}
```

**Response:**
```json
{
  "message": "Registration complete",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "6601abc...",
    "email": "manager@example.com",
    "nickname": "CoachKhalil",
    "role": "team_manager",
    "profile": { "organizationName": "Elite Gaming Org", "status": "pending", ... }
  }
}
```

> Store `accessToken` and `user.id` in your state/storage.

---

## 3. Login

**POST** `/auth/login`

```json
{
  "email": "manager@example.com",
  "password": "StrongPass1!"
}
```

**Response:** Same shape as verify-email (accessToken + user + profile).

---

## 4. Get My Profile

**GET** `/team-manager/me`
**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "_id": "...",
  "userId": "...",
  "organizationName": "Elite Gaming Org",
  "firstName": "Khalil",
  "lastName": "Mouscou",
  "cin": "12345678",
  "age": 28,
  "gender": "male",
  "description": "Head coach and team manager",
  "phoneNumber": "+21612345678",
  "status": "pending",
  "isVerified": false,
  "team": null
}
```

---

## 5. Update My Profile

**PATCH** `/team-manager/me`
**Headers:** `Authorization: Bearer <accessToken>`

Send only the fields you want to update:
```json
{
  "firstName": "Khalil",
  "lastName": "Mouscou",
  "organizationName": "Pro Esports TN",
  "phoneNumber": "+21698765432",
  "description": "Updated bio"
}
```

**Response:** Updated profile document.

---

## 6. Create a Team

> Only possible **once**. After creation, use PATCH to update.

**POST** `/team-manager/me/team`
**Headers:** `Authorization: Bearer <accessToken>`

```json
{
  "name": "Phoenix Squad",
  "organizationName": "Elite Gaming Org",
  "logo": "https://example.com/logo.png",
  "description": "Our competitive LoL team",
  "type": "amateur"
}
```

### Uploading a Team Photo
The `logo` field accepts:
- **A URL** — if you store images on Cloudinary, Firebase, S3, etc.
- **A base64 string** — encode the image on the client and send it directly.

#### React Native example (base64):
```js
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const pickAndEncodeImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({ base64: true });
  if (!result.canceled) {
    const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
    return base64; // pass this as the `logo` field
  }
};
```

**Response:**
```json
{
  "_id": "team_id_here",
  "name": "Phoenix Squad",
  "organizationName": "Elite Gaming Org",
  "logo": "https://...",
  "description": "Our competitive LoL team",
  "type": "amateur",
  "members": [],
  "isVerified": false
}
```

> The manager's profile `team` field is automatically linked.

---

## 7. Update Team (logo, name, description, etc.)

**PATCH** `/team-manager/me/team`
**Headers:** `Authorization: Bearer <accessToken>`

```json
{
  "logo": "data:image/png;base64,iVBORw0KGgo...",
  "description": "New description"
}
```

---

## 8. Get My Team (with full roster)

**GET** `/team-manager/me/team`
**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "_id": "team_id_here",
  "name": "Phoenix Squad",
  "logo": "https://...",
  "members": [
    { "_id": "user_id_1", "nickname": "ProPlayer1", "avatar": "...", "email": "..." },
    { "_id": "user_id_2", "nickname": "ProPlayer2", "avatar": "...", "email": "..." }
  ]
}
```

---

## 9. Search Available Players

**GET** `/team-manager/me/team/roster/search?q=khalil`
**Headers:** `Authorization: Bearer <accessToken>`

- `q` is optional — omit to list all players
- Searches by `nickname` or `email`

**Response:**
```json
[
  {
    "_id": "player_profile_id",
    "userId": {
      "_id": "user_id_here",
      "nickname": "Khalil123",
      "avatar": "https://...",
      "email": "khalil@example.com",
      "country": "TN"
    },
    "elo": 1200,
    "rank": "Gold II"
  }
]
```

> Use `userId._id` as the `playerUserId` when inviting.

---

## 10. Invite a Player to the Roster

**POST** `/team-manager/me/team/roster/invite`
**Headers:** `Authorization: Bearer <accessToken>`

```json
{
  "playerUserId": "user_id_here"
}
```

**Response:** Updated team with full `members` array populated.

**Error cases:**
| Status | Meaning |
|--------|---------|
| 404 | Player profile doesn't exist |
| 409 | Player is already in the roster |
| 400 | No team created yet |

---

## 11. Remove a Player from the Roster

**DELETE** `/team-manager/me/team/roster/:playerUserId`
**Headers:** `Authorization: Bearer <accessToken>`

```
DELETE /team-manager/me/team/roster/6601abc123def456ghi789
```

**Response:** Updated team with revised `members` array.

---

## 12. Complete Frontend State Flow

```
App Start
  └── Check storage for accessToken
        ├── No token → Login / Register screen
        └── Token exists → GET /team-manager/me
              ├── profile.team === null → Show "Create Team" screen
              └── profile.team exists  → Show Dashboard (profile + team)
```

### Suggested screens:

| Screen | API Call |
|--------|----------|
| Register | `POST /auth/register` |
| OTP Verify | `POST /auth/verify-email` |
| Login | `POST /auth/login` |
| My Profile (view/edit) | `GET /team-manager/me` + `PATCH /team-manager/me` |
| Create Team | `POST /team-manager/me/team` |
| Team Dashboard | `GET /team-manager/me/team` |
| Edit Team | `PATCH /team-manager/me/team` |
| Invite Player | `GET /team-manager/me/team/roster/search?q=` + `POST /team-manager/me/team/roster/invite` |
| Manage Roster | `GET /team-manager/me/team` + `DELETE /team-manager/me/team/roster/:id` |

---

## 13. Axios / Fetch helper example

```js
// api.js
import axios from 'axios';

const API = axios.create({ baseURL: 'http://<YOUR_IP>:3000' });

API.interceptors.request.use((config) => {
  const token = /* get from AsyncStorage or Zustand */;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const teamManagerAPI = {
  getProfile:     ()           => API.get('/team-manager/me'),
  updateProfile:  (data)       => API.patch('/team-manager/me', data),
  createTeam:     (data)       => API.post('/team-manager/me/team', data),
  getTeam:        ()           => API.get('/team-manager/me/team'),
  updateTeam:     (data)       => API.patch('/team-manager/me/team', data),
  searchPlayers:  (q)          => API.get(`/team-manager/me/team/roster/search?q=${q ?? ''}`),
  invitePlayer:   (playerUserId) => API.post('/team-manager/me/team/roster/invite', { playerUserId }),
  removePlayer:   (playerUserId) => API.delete(`/team-manager/me/team/roster/${playerUserId}`),
};
```

---

## Summary of Backend Fixes Applied

| Bug | Fix |
|-----|-----|
| `registerTeamManager` only saved `organizationName` to roleData → profile creation failed | All fields now saved to `roleData` |
| `team` was `required: true` → crash when no teamId at registration | Made `team` optional |
| `UpdateTeamManagerDto` only had `organizationName` → whitelist stripped all profile fields | All fields added to DTO |
| `create` controller used `userId` from body (insecure, no auth) | Now all routes use JWT `req.user.userId` |
| No team photo support | `logo` field accepts URL or base64 |
| No roster invite/remove endpoints | Added `POST/DELETE /team-manager/me/team/roster/*` |
| No player search endpoint | Added `GET /team-manager/me/team/roster/search?q=` |
| `team.schema.ts` missing `organizationName` | Added `organizationName` field to Team schema |

---

# Part 2 — Tournament & League Invitation Flow

---

## Overview

```
Admin/Organiser sends invitation to team
  └── Team manager sees it in GET /invitations/my
        ├── ACCEPT → team is automatically registered in tournament or league season
        └── DECLINE → invitation marked declined
```

After accepting, the team manager can view all teams in the event and their full player rosters.

---

## 14. View My Invitations

**GET** `/invitations/my`
**Headers:** `Authorization: Bearer <accessToken>`

Optional filter by status:
```
GET /invitations/my?status=PENDING
GET /invitations/my?status=ACCEPTED
GET /invitations/my?status=DECLINED
```

**Response:**
```json
[
  {
    "_id": "inv_id_1",
    "teamId": { "_id": "team_id", "name": "Phoenix Squad", "logo": "..." },
    "type": "TOURNAMENT",
    "tournamentId": { "_id": "tourn_id", "name": "Spring Cup 2025", "startDate": "...", "endDate": "..." },
    "seasonId": null,
    "senderId": { "nickname": "AdminUser", "email": "admin@arena.com" },
    "status": "PENDING",
    "message": "You are invited to compete in Spring Cup 2025",
    "expiresAt": "2025-04-01T00:00:00.000Z",
    "createdAt": "2025-03-24T..."
  },
  {
    "_id": "inv_id_2",
    "teamId": { "_id": "team_id", "name": "Phoenix Squad", "logo": "..." },
    "type": "LEAGUE_SEASON",
    "tournamentId": null,
    "seasonId": { "_id": "season_id", "name": "Season 1", "startDate": "...", "leagueId": "..." },
    "senderId": { "nickname": "LeagueOrg", "email": "org@arena.com" },
    "status": "PENDING",
    "message": "Join our national league season",
    "expiresAt": null,
    "createdAt": "2025-03-24T..."
  }
]
```

**Status values:** `PENDING` | `ACCEPTED` | `DECLINED` | `EXPIRED`
**Type values:** `TOURNAMENT` | `LEAGUE_SEASON`

---

## 15. View a Single Invitation

**GET** `/invitations/:invitationId`

---

## 16. Accept an Invitation

**POST** `/invitations/:invitationId/accept`
**Headers:** `Authorization: Bearer <accessToken>`
**Body:** *(none — userId is taken from JWT)*

**What happens on accept:**
- If `type === TOURNAMENT` → your team is added to `tournament.teams` and `currentTeams` is incremented
- If `type === LEAGUE_SEASON` → a `SeasonTeam` registration entry is created and standings are initialized

**Response:** The updated invitation with `status: "ACCEPTED"`.

**Error cases:**

| Status | Meaning |
|--------|---------|
| 400 | Invitation already accepted/declined or expired |
| 403 | Your profile's team does not match the invited team |
| 400 | Tournament registration closed or full |
| 400 | League season deadline passed or season already started |

---

## 17. Decline an Invitation

**POST** `/invitations/:invitationId/decline`
**Headers:** `Authorization: Bearer <accessToken>`
**Body:** *(none)*

**Response:** The updated invitation with `status: "DECLINED"`.

---

## 18. View All Teams in a Tournament (with player rosters)

After accepting a tournament invitation, use this to see who you'll compete against:

**GET** `/tournements/:tournamentId/teams`

**Response:**
```json
[
  {
    "_id": "team_id_1",
    "name": "Phoenix Squad",
    "organizationName": "Elite Gaming Org",
    "logo": "https://...",
    "type": "pro",
    "members": [
      { "_id": "user_id_1", "nickname": "Striker99", "avatar": "...", "email": "...", "country": "TN" },
      { "_id": "user_id_2", "nickname": "CoachK", "avatar": "...", "email": "...", "country": "TN" }
    ]
  },
  {
    "_id": "team_id_2",
    "name": "Dragon Force",
    "organizationName": "Pro Esports TN",
    "logo": "https://...",
    "type": "amateur",
    "members": [
      { "_id": "user_id_3", "nickname": "IceWolf", "avatar": "...", "email": "...", "country": "DZ" }
    ]
  }
]
```

> You can also see all teams without player details via `GET /tournements/:id` which returns the full tournament object.

---

## 19. View All Teams in a League Season (with player rosters)

After accepting a league season invitation:

**GET** `/season-teams/season/:seasonId/teams`

**Response:**
```json
[
  {
    "registration": {
      "_id": "reg_id_1",
      "seed": 1,
      "status": "ACTIVE",
      "qualifiedFromSeasonId": null,
      "qualifiedViaRank": null
    },
    "team": {
      "_id": "team_id_1",
      "name": "Phoenix Squad",
      "organizationName": "Elite Gaming Org",
      "logo": "https://...",
      "members": [
        { "_id": "user_id_1", "nickname": "Striker99", "avatar": "...", "email": "..." }
      ]
    }
  }
]
```

---

## 20. Updated Axios helper (invitations)

```js
export const invitationAPI = {
  getMyInvitations: (status) =>
    API.get(`/invitations/my${status ? `?status=${status}` : ''}`),

  getInvitation: (id) =>
    API.get(`/invitations/${id}`),

  accept: (id) =>
    API.post(`/invitations/${id}/accept`),

  decline: (id) =>
    API.post(`/invitations/${id}/decline`),
};

export const tournamentAPI = {
  getAll:            ()   => API.get('/tournements'),
  getOne:            (id) => API.get(`/tournements/${id}`),
  getTeamsWithRosters: (id) => API.get(`/tournements/${id}/teams`),
};

export const leagueAPI = {
  getSeasonTeams:       (seasonId) => API.get(`/season-teams/season/${seasonId}`),
  getSeasonTeamsRosters: (seasonId) => API.get(`/season-teams/season/${seasonId}/teams`),
};
```

---

## 21. Complete Invitation Screen Flow

```
Invitation List Screen
  └── GET /invitations/my?status=PENDING
        ├── Show card per invitation:
        │     type === TOURNAMENT → show tournament name, dates, prize pool
        │     type === LEAGUE_SEASON → show season name, league name, deadline
        │
        ├── [Accept] → POST /invitations/:id/accept
        │     → on success: move to tournament/league dashboard
        │
        └── [Decline] → POST /invitations/:id/decline
              → on success: remove from pending list

Tournament Dashboard (after accepting)
  ├── GET /tournements/:id           → tournament details
  └── GET /tournements/:id/teams     → all competing teams + rosters

League Season Dashboard (after accepting)
  ├── GET /season-teams/season/:seasonId          → registrations + seeds
  └── GET /season-teams/season/:seasonId/teams    → teams + rosters
```

---

## Summary of Invitation Fixes Applied

| Bug | Fix |
|-----|-----|
| `invitation.controller.ts` used `@Body('senderId')` (insecure) | Now uses JWT `req.user.userId` |
| `invitation.controller.ts` `accept`/`decline` used `@Body('teamManagerUserId')` | Now uses JWT `req.user.userId` |
| `invitation.service.ts` `findByTeamManager` referenced non-existent `managedTeams` field | Fixed to use `profile.team` |
| `invitation.service.ts` `accept`/`decline` auth check used `managedTeams` | Fixed to compare `profile.team` directly |
| No endpoint to list tournament teams with player rosters | Added `GET /tournements/:id/teams` |
| No endpoint to list league season teams with player rosters | Added `GET /season-teams/season/:seasonId/teams` |
| Tournament module registered wrong Team schema | Fixed to use `team/schemas/team.schema.ts` |
