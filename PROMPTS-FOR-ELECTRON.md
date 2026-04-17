# Arena Chain Electron Desktop — Implementation Prompts

> **How to use:** Copy each prompt below into a new Cursor Agent chat (Opus 4.6) with both projects open:
> - `backend-nest1/` (read-only reference)
> - `front-end-desktop/` (where all changes go)
>
> Run them in order: Phase 0 → Phase 1 → Phase 2 → Phase 3.
> Each prompt is self-contained with all the backend context needed.

---

## PROMPT — PHASE 0: Authentication Integration (Login & Register)

```
## Task: Integrate Real Authentication into the Electron Desktop App

You are working on an Electron desktop app (Vanilla HTML/CSS/JS + Tailwind CSS v4).

### CRITICAL RULE
**NEVER modify any file in the backend NestJS project (`backend-nest1/`).** The backend is read-only reference. ALL changes go in `front-end-desktop/` ONLY.

### Project Location
- Electron frontend: `front-end-desktop/`
- Backend (READ-ONLY): `backend-nest1/`

### Backend API Reference (DO NOT MODIFY — just consume these endpoints)

**Base URL:** `http://localhost:3000` (make this configurable)

**POST /auth/login**
- Body: `{ "email": "string", "password": "string" }`
- Response: `{ "accessToken": "jwt...", "refreshToken": "jwt...", "user": { "id": "objectId", "email": "string", "nickname": "string", "roles": ["player"|"admin"|"referee"|"team_manager"], "profiles": { "player": {...}, "teamManager": {...}, ... } } }`

**POST /auth/register/player**
- Body: `{ "email": "string", "password": "string", "nickname": "string", "isPro": false, "isVerified": false }`
- Response: `{ "accessToken": "jwt...", "refreshToken": "jwt..." }`

**POST /auth/register/team-manager**
- Body: `{ "email": "string", "password": "string", "nickname": "string", "teamId": "string", ... }`

**POST /auth/register/referee**
- Body: `{ "email": "string", "password": "string", "nickname": "string" }`

**POST /auth/refresh**
- Body: `{ "refreshToken": "string" }`
- Response: `{ "accessToken": "jwt...", "refreshToken": "jwt..." }`

**JWT Usage:** All protected endpoints require header `Authorization: Bearer <accessToken>`

### Current State of the Electron App
- Login page: `auth/login/index.html` + `auth/login/renderer.js`
- Register page: `auth/register/index.html` + `auth/register/renderer.js`
- Main process: `index.js` (Electron BrowserWindow + IPC routing)
- Login currently uses hardcoded demo checks (no real HTTP calls)
- IPC sends `login-success` with `{ role }` to route to the correct dashboard

### What You Must Implement

1. **Create an API utility module** (`front-end-desktop/shared/api.js`):
   - Configurable `BASE_URL` (default `http://localhost:3000`)
   - `apiRequest(endpoint, options)` helper that:
     - Automatically adds `Authorization: Bearer <token>` from localStorage
     - Handles JSON Content-Type
     - On 401 response, attempts token refresh via POST /auth/refresh
     - If refresh fails, redirects to login (via IPC `navigate-to` → `login`)
     - Returns parsed JSON response
   - Export `login(email, password)`, `register(data, role)`, `refreshToken()` functions
   - Store tokens in `localStorage`: `arena_access_token`, `arena_refresh_token`, `arena_user` (JSON stringified user object)

2. **Update `auth/login/renderer.js`**:
   - Replace the hardcoded credential check with a real `fetch()` call to `POST /auth/login`
   - On success: store tokens + user in localStorage, extract the user's primary role from `roles[]`, send IPC `login-success` with `{ role }`
   - On failure: show error message on the login form (wrong credentials, network error, etc.)
   - Add loading state on the submit button while the request is in flight
   - Keep the QR code generation as-is (placeholder)
   - Keep the Google OAuth button as-is (placeholder)

3. **Update `auth/register/renderer.js`**:
   - Replace any demo logic with real `fetch()` call to the role-specific register endpoint
   - Player → `POST /auth/register/player`
   - Team Manager → `POST /auth/register/team-manager`
   - Referee → `POST /auth/register/referee`
   - On success: store tokens, redirect to login or directly to dashboard
   - On failure: show validation errors

4. **Update the player dashboard** (`player/dashboard.html` or `player/renderer.js`):
   - On page load, read `arena_user` from localStorage
   - Replace the hardcoded username "Krakken" in the sidebar with the actual user's `nickname`
   - If no token found in localStorage, redirect to login via IPC

5. **Logout flow**:
   - Clear `arena_access_token`, `arena_refresh_token`, `arena_user` from localStorage
   - Navigate to login page

### Design Requirements
- Keep the existing dark theme, glassmorphism, neon accent styling
- Error messages should use red text/border styling consistent with the app
- Loading states: add a subtle spinner or "Signing in..." text on buttons
- All new files must use the same Tailwind CDN + font loading as existing pages

### File Structure for New Files
```
front-end-desktop/
├── shared/
│   └── api.js          ← NEW: API utility with auth helpers
├── auth/
│   ├── login/
│   │   └── renderer.js ← MODIFY: real login
│   └── register/
│       └── renderer.js ← MODIFY: real registration
├── player/
│   ├── dashboard.html  ← MODIFY: read user from localStorage, show real nickname
│   └── renderer.js     ← MODIFY: auth check on load, logout clears tokens
└── index.js            ← MODIFY if needed: ensure IPC routing still works
```

Read the existing files before making changes. Preserve all existing UI and functionality.
```

---

## PROMPT — PHASE 1: Game Account Linking & Verification (Icon-Based)

```
## Task: Implement Riot Account Linking & Verification on the LoL and Valorant Game Screens

You are working on an Electron desktop app (Vanilla HTML/CSS/JS + Tailwind CSS v4).

### CRITICAL RULE
**NEVER modify any file in the backend NestJS project (`backend-nest1/`).** The backend is read-only reference. ALL changes go in `front-end-desktop/` ONLY.

### Prerequisites
- Phase 0 is complete: `shared/api.js` exists with `apiRequest()` that handles JWT auth
- User is logged in, tokens are in localStorage

### Backend API Reference (DO NOT MODIFY — just consume these endpoints)

**POST /riot-api/link-account** (requires JWT)
- Body: `{ "gameName": "string", "tagLine": "string", "region": "euw1"|"na1"|"eun1"|"kr"|"br1"|"jp1"|"la1"|"la2"|"oc1"|"tr1"|"ru" }`
- Response: `{ "message": "Account link initiated...", "originalIconId": 4567, "summonerName": "Player#EUW", "status": "pending_verification" }`
- This captures the player's CURRENT profile icon ID and stores it

**POST /riot-api/verify-account** (requires JWT)
- No body needed
- Response (success): `{ "verified": true, "message": "Account verified successfully!", "summonerName": "Player#EUW" }`
- Response (not yet): `{ "verified": false, "message": "Icon has not changed yet...", "originalIconId": 4567, "currentIconId": 4567 }`
- Compares current icon with the stored original — if different → verified

**GET /riot-api/link-status** (requires JWT)
- Response: `{ "status": "unlinked"|"pending_verification"|"verified", "riotGameName": "string"|null, "riotTagLine": "string"|null, "riotRegion": "string"|null, "riotPuuid": "string"|null, "originalIconId": number|null }`

**POST /riot-api/disconnect-account** (requires JWT)
- Response: `{ "message": "Game account disconnected successfully." }`

### Verification Flow (Icon-Based)
1. User enters their Riot Game Name, Tag Line, and selects Region
2. User clicks "Link Game Account" → calls POST /riot-api/link-account
3. Backend captures their current summoner icon ID and stores it
4. User is instructed: "Go to the League of Legends client and change your summoner icon to any different icon"
5. User clicks "Verify Account" → calls POST /riot-api/verify-account
6. Backend fetches their current icon and compares with the stored original:
   - If icon changed → VERIFIED (account is now linked and verified)
   - If icon same → NOT YET (user needs to change icon and try again)

### What You Must Implement

**On the League of Legends game screen** (`content-game-lol` section in `player/dashboard.html`):

1. **Add a "Connect Game Account" section** at the top of the LoL screen (between the header and the Quick Match section):
   - Check link status on screen load via `GET /riot-api/link-status`
   - **If UNLINKED**: Show a collapsible/expandable panel:
     - Title: "CONNECT YOUR RIOT ACCOUNT"
     - Subtitle: "Link your account to access matchmaking, stats, and ranked play"
     - Form fields:
       - Game Name (text input, placeholder: "Summoner Name")
       - Tag Line (text input, placeholder: "EUW" — without the #)
       - Region (dropdown select with all 11 regions: NA1, EUW1, EUN1, KR, BR1, JP1, LA1, LA2, OC1, TR1, RU)
     - "Link Game Account" button (orange/cyan gradient, disabled until form is filled)
   - **If PENDING_VERIFICATION**: Show verification panel:
     - Message: "Account link initiated! Now change your summoner icon in the League client."
     - Show the original icon: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/{originalIconId}.png`
     - Instruction: "Change your summoner icon to any different icon, then click Verify below"
     - "Verify Account" button (cyan, with loading state)
     - "Cancel" button to disconnect and start over
   - **If VERIFIED**: Show verified badge:
     - Green border panel with checkmark icon
     - "Riot Account Verified" with the summoner name displayed
     - "Disconnect" button (subtle, red outline) with confirmation dialog

2. **Apply the same section to the Valorant game screen** (`content-game-valorant`):
   - Same verification flow (Valorant uses Riot accounts too)
   - Adjust colors to match Valorant's red theme (#ff4654) instead of LoL's cyan
   - Share the same link status (one Riot account covers both games)

3. **JavaScript logic** (can be inline in dashboard.html or in a separate file):
   - Import/use the `apiRequest` function from `shared/api.js`
   - `checkLinkStatus()` → GET /riot-api/link-status → update UI based on status
   - `linkAccount(gameName, tagLine, region)` → POST /riot-api/link-account → show verification panel
   - `verifyAccount()` → POST /riot-api/verify-account → show result
   - `disconnectAccount()` → POST /riot-api/disconnect-account → reset to unlinked
   - Call `checkLinkStatus()` when the LoL or Valorant screen becomes visible

### Design Requirements
- Match the existing glassmorphism dark theme
- Use `glass-panel` class for card backgrounds
- Verified state: green border glow (`border-[#00ff87]`, `shadow-[0_0_20px_rgba(0,255,135,0.3)]`)
- Pending state: orange/amber border glow
- Unlinked state: subtle white/gray border
- Form inputs: dark background (`bg-white/5`), white text, rounded-xl, focus ring with accent color
- Buttons: match existing gradient styles in the dashboard
- Transitions: smooth show/hide with opacity + transform animations
- Profile icon images from Data Dragon CDN: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/{iconId}.png`

Read the existing dashboard.html file carefully before making changes. Preserve ALL existing UI.
```

---

## PROMPT — PHASE 2: Fetch Riot Account & Display Real Profile Data

```
## Task: Fetch and Display Real Riot Account Data (Stats, Rank, Match History)

You are working on an Electron desktop app (Vanilla HTML/CSS/JS + Tailwind CSS v4).

### CRITICAL RULE
**NEVER modify any file in the backend NestJS project (`backend-nest1/`).** The backend is read-only reference. ALL changes go in `front-end-desktop/` ONLY.

### Prerequisites
- Phase 0 (auth) and Phase 1 (account linking) are complete
- User has a verified Riot account linked
- `shared/api.js` exists with `apiRequest()` helper

### Backend API Reference (DO NOT MODIFY — just consume these endpoints)

**POST /riot-api/account** (requires JWT)
- Body: `{ "gameName": "string", "tagLine": "string", "region": "euw1"|"na1"|"eun1"|... }`
- Response:
```json
{
  "puuid": "string",
  "summonerName": "Name#Tag",
  "level": 245,
  "profileIconId": 4567,
  "accountId": "string",
  "region": "euw1",
  "ranks": [
    {
      "queueType": "RANKED_SOLO_5x5",
      "tier": "PLATINUM",
      "rank": "II",
      "leaguePoints": 58,
      "wins": 156,
      "losses": 132
    }
  ],
  "matchHistory": [
    {
      "matchId": "EUW1_1234567890",
      "championName": "Ahri",
      "championId": 103,
      "kills": 8,
      "deaths": 2,
      "assists": 11,
      "kda": "9.50:1",
      "win": true,
      "duration": 1823,
      "items": [3157, 3089, 3020, 3165, 3135, 3102, 3363],
      "gameMode": "CLASSIC",
      "gameCreation": 1708012800000
    }
  ]
}
```

**GET /riot-api/match/:matchId?region=euw1&puuid=xxx** (requires JWT)
- Response: Detailed match info with team stats, player stats, items, spells, runes

**GET /riot-api/link-status** (requires JWT)
- Returns the linked account info including gameName, tagLine, region, puuid

### What You Must Implement

1. **Auto-fetch account data when the LoL screen loads** (if account is verified):
   - On navigating to the LoL screen, check link status
   - If verified, automatically call `POST /riot-api/account` with the linked gameName, tagLine, region
   - Show a loading skeleton while fetching

2. **Replace the hardcoded YOUR STATS section** with real data:
   - **Profile icon**: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/{profileIconId}.png` (rounded, with level badge overlay)
   - **Rank display**: Show the actual tier + rank (e.g., "PLATINUM II") with the correct tier color:
     - IRON: #5c5c5c, BRONZE: #a0522d, SILVER: #c0c0c0, GOLD: #ffc107, PLATINUM: #0bc6e3, EMERALD: #00ff87, DIAMOND: #b9f2ff, MASTER: #9b59b6, GRANDMASTER: #ff4654, CHALLENGER: #f0e68c
   - **League Points**: Show LP bar (percentage based on 100 LP)
   - **Win Rate**: Calculate from `wins / (wins + losses) * 100`
   - **Wins/Losses**: Show actual numbers
   - **KDA**: Calculate average from match history
   - If UNRANKED (no ranks returned), show "Unranked" with a neutral style

3. **Replace the hardcoded RECENT MATCHES section** with real match history:
   - Show up to 10 matches from the `matchHistory` array
   - Each match card shows:
     - Champion icon: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/{championName}.png`
     - Champion name
     - Win/Loss indicator (green W / red L badge — keep existing style)
     - KDA: `kills/deaths/assists`
     - Game mode badge (CLASSIC → "Ranked Solo", ARAM → "ARAM", etc.)
     - Duration: format seconds to "Xm Ys"
     - Time ago: format `gameCreation` timestamp to relative time ("2 hours ago", "Yesterday", etc.)
     - Items row: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/item/{itemId}.png` (skip items with ID 0)
   - Each match card is clickable → opens a detailed match view panel (expandable or modal):
     - Calls `GET /riot-api/match/{matchId}?region={region}&puuid={puuid}`
     - Shows: KDA, CS, Gold, Damage, Vision Score, items, summoner spells, team objectives (towers, barons, dragons)

4. **Handle the Quick Match section**:
   - Replace the hardcoded Region/Mode/Position with:
     - Region: show the user's linked region (from link-status)
     - Mode: keep dropdown but make it functional (will be used in Phase 3)
     - The "FIND MATCH" button stays but will be connected in Phase 3
   - Update the "in queue" count display (keep as static for now, or hide it)

5. **Apply equivalent changes to the Valorant screen**:
   - Valorant also uses Riot accounts, so the same data applies
   - The account data fetch is the same (POST /riot-api/account)
   - Adjust the visual theme to Valorant's red (#ff4654) styling

6. **Error & empty states**:
   - If account fetch fails: show a retry button with error message
   - If no matches found: show "No recent matches found"
   - If no rank data: show "Unranked" with placement games info
   - Network errors: show inline error with retry option

### Design Requirements
- Keep all existing glassmorphism, gradients, and animation styles
- Match history items: use `glass-panel` background, hover effect with slight lift
- Loading skeletons: pulsing `bg-white/5` rectangles matching the layout
- Champion/item images: rounded corners, with fallback if image fails to load
- Preserve the existing layout grid (col-span-8 for Quick Match, col-span-4 for Stats)

### Data Dragon CDN URLs
- Profile icon: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/{id}.png`
- Champion icon: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/{championName}.png`
- Item icon: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/item/{itemId}.png`

Read the existing dashboard.html file carefully before making changes. Preserve ALL existing UI and navigation.
```

---

## PROMPT — PHASE 3: Matchmaking System (Queue, Match Found, Accept/Decline)

```
## Task: Implement Real Matchmaking System (Queue, Polling, Match Accept/Decline, Game Room)

You are working on an Electron desktop app (Vanilla HTML/CSS/JS + Tailwind CSS v4).

### CRITICAL RULE
**NEVER modify any file in the backend NestJS project (`backend-nest1/`).** The backend is read-only reference. ALL changes go in `front-end-desktop/` ONLY.

### Prerequisites
- Phases 0–2 are complete
- User is logged in with JWT, has a verified Riot account linked
- `shared/api.js` exists with `apiRequest()` helper
- The LoL and Valorant screens show real data from the Riot API

### Backend API Reference (DO NOT MODIFY — just consume these endpoints)

**POST /matchmaking/queue** (requires JWT)
- Body:
```json
{
  "game": "LOL",
  "mode": "CUSTOM_1V1" | "CUSTOM_2V2" | "CUSTOM_5V5",
  "server": "euw1",
  "region": "EUW1",
  "scheduledAt": "2024-01-15T14:00:00Z" (optional — for scheduled matches),
  "riotAccountInfo": {
    "originalIconId": 4567,
    "riotGameName": "PlayerName",
    "riotLinkStatus": "verified",
    "riotPuuid": "puuid-string",
    "riotRegion": "euw1",
    "riotTagLine": "EUW"
  }
}
```
- Response: `{ "id": "ticketId", "game": "LOL", "mode": "CUSTOM_1V1", "server": "euw1", "region": "EUW1", "elo": 1000, "status": "SEARCHING", "scheduledAt": null }`

**DELETE /matchmaking/queue/:ticketId** (requires JWT)
- Response: `{ "message": "Queue cancelled" }`

**GET /matchmaking/my-active-ticket** (requires JWT)
- Response: `{ "ticket": { "id": "...", "game": "LOL", "mode": "CUSTOM_1V1", "server": "euw1", "region": "EUW1", "elo": 1000, "status": "SEARCHING"|"MATCHED", "gameId": "..." } }` or `{ "ticket": null }`

**GET /matchmaking/my-active-game** (requires JWT)
- Response: `{ "game": { "_id": "gameId", "status": "PENDING_ACCEPTANCE"|"ACCEPTED", "mode": "CUSTOM_1V1", "server": "euw1", "participants": [{ "userId": "...", "team": "BLUE"|"RED", "accepted": true|false|null, "elo": 1000, "riotAccountInfo": { "riotGameName": "...", "riotTagLine": "...", "riotPuuid": "...", "riotRegion": "...", "originalIconId": 4567 } }], "roomInfo": { "roomId": "X-ABC123", "map": "Summoner's Rift" } } }` or `{ "game": null }`

**POST /matchmaking/games/:gameId/response** (requires JWT)
- Body: `{ "accept": true|false }`
- Response: Updated game object

**GET /matchmaking/games/:gameId** (requires JWT)
- Response: Full game object with all participants and status

### Matchmaking Modes
- `CUSTOM_1V1`: 2 players, matched within 150 ELO difference
- `CUSTOM_2V2`: 4 players, matched within 250 ELO difference
- `CUSTOM_5V5`: 10 players, matched within 250 ELO difference

### Matchmaking Flow
1. User selects mode (1v1, 2v2, 5v5) and clicks "FIND MATCH"
2. Frontend calls POST /matchmaking/queue with game info + riot account info
3. Frontend starts POLLING every 3 seconds:
   - GET /matchmaking/my-active-ticket → check if status changed to "MATCHED"
   - GET /matchmaking/my-active-game → check if a game was created
4. When a game is found (status: PENDING_ACCEPTANCE):
   - Show a MATCH FOUND modal/overlay (full-screen overlay with animation)
   - Display both teams with player info (riot game name, elo, icon)
   - Show countdown timer (15 seconds to accept — after that, game expires on backend)
   - ACCEPT / DECLINE buttons
5. User clicks ACCEPT → POST /matchmaking/games/:gameId/response with accept: true
6. Continue polling the game status:
   - If all players accepted → status becomes "ACCEPTED" → show GAME ROOM
   - If any player declined → status becomes "CANCELLED" → show "Match cancelled" and return to queue
7. GAME ROOM display:
   - Room ID (e.g., "X-ABC123")
   - Map: "Summoner's Rift"
   - Blue team vs Red team with all player names, icons, elo
   - Instructions: "Create a custom game in League of Legends with Room ID: X-ABC123"

### What You Must Implement

1. **Update the QUICK MATCH section** on the LoL screen:
   - Replace hardcoded Region/Mode/Position with functional controls:
     - Region: Auto-filled from the user's linked Riot region (read-only display)
     - Mode selector: Dropdown or button group for 1v1 / 2v2 / 5v5
     - Server: Auto-filled from linked region
   - "FIND MATCH" button:
     - Disabled if account not verified (show tooltip: "Link your Riot account first")
     - On click: call POST /matchmaking/queue
     - Changes to "SEARCHING..." with animated pulse/spinner
     - Shows elapsed time counter (0:00, 0:01, 0:02...)
     - Shows "Cancel" button to call DELETE /matchmaking/queue/:ticketId

2. **Implement polling system**:
   - Start polling every 3 seconds after joining queue
   - Poll both /my-active-ticket and /my-active-game
   - Stop polling when:
     - Match found (game exists)
     - User cancels
     - Page navigates away
   - Use `setInterval` / `clearInterval` pattern

3. **Match Found overlay/modal**:
   - Full-screen semi-transparent overlay (glass effect, dark backdrop)
   - Animated entrance (scale up + fade in)
   - Center content:
     - "MATCH FOUND!" title with glow effect
     - Mode badge (1v1 / 2v2 / 5v5)
     - Two team columns: BLUE TEAM vs RED TEAM
     - Each player row: profile icon (from Data Dragon), riot game name#tag, elo badge
     - Highlight the current user's row
     - Acceptance status indicators per player (checkmark for accepted, hourglass for pending, X for declined)
   - Countdown timer: 15 second circular progress or bar
   - Two buttons: "ACCEPT" (green, large) and "DECLINE" (red, smaller)
   - Sound effect consideration: add a subtle CSS animation pulse to grab attention

4. **Post-acceptance states**:
   - All accepted → transition to GAME ROOM view:
     - Glass panel with room details
     - Room ID prominently displayed (large, copyable to clipboard)
     - Map name
     - Full team rosters with player details
     - "Copy Room ID" button
     - Instructions text
   - Someone declined → show "Match Cancelled" message, auto-return to queue option

5. **Scheduled Matches** (bonus):
   - Add a "Schedule Match" option (small link/button near Find Match)
   - Opens a date/time picker
   - Calls POST /matchmaking/queue with `scheduledAt` field
   - Shows scheduled matches list via GET /matchmaking/my-scheduled-tickets

6. **Apply to Valorant screen** as well:
   - Same matchmaking flow but with `"game": "VALORANT"` in the queue body
   - Valorant red theme for the match found overlay
   - Same modes: 1v1, 2v2, 5v5

7. **Restore state on page load**:
   - On loading the LoL/Valorant screen, check for active ticket/game
   - If SEARCHING → resume the searching UI with polling
   - If MATCHED → show the match found overlay
   - If game is ACCEPTED → show the game room

### Design Requirements
- Searching state: pulsing gradient animation on the Find Match button area, elapsed timer
- Match Found overlay: dramatic entrance animation, dark backdrop blur, neon glow borders
- Accept button: large, green (#00ff87) with hover glow
- Decline button: smaller, red (#ff4654) outline
- Countdown timer: circular SVG progress or horizontal bar with color transition (green → yellow → red)
- Team cards: glass panels with team color accent (blue: #0bc6e3, red: #ff4654)
- Player rows: show profile icon, name, elo badge
- Game Room: prominent room ID with copy button, clean team display
- All animations: use CSS transitions/transforms, no external animation libraries needed

### Polling Cleanup
- Clear all intervals when navigating away from the game screen
- Clear polling when match is found or cancelled
- Handle edge cases: what if user navigates away during queue? Resume on return.

Read the existing dashboard.html file carefully before making changes. Preserve ALL existing UI, navigation, and styling.
```

---

## PROMPT — PHASE 3.5: Game Room Screen (Post-Acceptance Navigation)

```
## Task: Implement the Game Room Screen — Navigated to When All Players Accept the Match

You are working on an Electron desktop app (Vanilla HTML/CSS/JS + Tailwind CSS v4).

### CRITICAL RULE
**NEVER modify any file in the backend NestJS project (`backend-nest1/`).** The backend is read-only reference. ALL changes go in `front-end-desktop/` ONLY.

### Prerequisites
- Phases 0–3 are complete
- The matchmaking flow is functional: queue → polling → match found → accept/decline
- The game object polling is already in place (Phase 3)

### Context — How This Works in the Flutter Mobile App (Replicate Exactly)

In the Flutter app, when all players accept a match, the following happens:

1. The polling detects the game status changed to `"ACCEPTED"` and `roomInfo` is now populated
2. The MatchmakingViewModel updates its status to `MatchmakingStatus.accepted`
3. A global listener on the home screen (`PlayerHomeScreen`) detects this status change
4. The app **automatically navigates** to a dedicated **Game Room Screen** (`GameRoomScreen`)
5. This is NOT a modal or overlay — it is a **full-page navigation** to a separate screen

The Electron desktop app must replicate this exact behavior: when polling detects all players accepted (game status is `"ACCEPTED"` AND `game.roomInfo` exists), automatically transition to a dedicated Game Room view.

### Trigger Condition

In your Phase 3 polling loop that watches the game status via `GET /matchmaking/games/:gameId`:
- When `game.status === "ACCEPTED"` AND `game.roomInfo !== null` → navigate to / show the Game Room view
- Stop all polling at this point
- This should happen **automatically** — the user does not click anything to get here

### What the Game Room Screen Must Display

The Game Room is a full-screen view with the following sections, laid out vertically:

#### 1. Header Bar
- Left side: green room icon + "Game Room" title text (white, bold)
- Right side: a status badge showing "READY" in green (green border, green dot indicator, green text)
  - Badge has: green dot (8px circle) + "READY" text
  - Subtle green tinted background (`rgba(0, 255, 0, 0.1)`), green border, rounded

#### 2. Game Pass Key Section (TOP PRIORITY — most prominent element)
- Full-width card with a green-tinted gradient background (green at top fading to dark)
- Green glowing border (`rgba(0, 255, 0, 0.3)`)
- Contains (centered, stacked vertically):
  - Key icon (green)
  - Label: "GAME PASS KEY" — small, muted, uppercase, letter-spacing: 2px
  - **The Room ID** displayed in a dark inner container:
    - Large text (28px), bold, white, monospace font, letter-spacing: 3px
    - Example: `X-ABC123`
    - Dark background (`#1A1F36`), rounded, green-tinted border
  - **"Copy Pass Key" button**: green background, black text, copy icon, rounded
    - On click: copies the room ID to clipboard
    - Shows a brief "Pass key copied!" success notification (green toast/snackbar)

#### 3. Match Details Section
- Dark card (`#0F1221`) with subtle border (`#1A1F36`)
- Title: "Match Details" (white, bold, 16px)
- Grid of info tiles (2 columns, then a full-width row):
  - **Mode**: game controller icon (green) + mode label ("1v1", "2v2", or "5v5")
  - **Players**: people icon (green) + total player count (2, 4, or 10)
  - **Server**: server icon (green) + server label (e.g., "EUW")
  - **Region**: globe icon (green) + region label (e.g., "EUW1")
  - **Map**: map icon (green) + map name ("Summoner's Rift") — full width
- Each info tile: dark background (`#0A0E1A`), rounded, icon on the left, label (muted `#7A86AC`, 10px) above value (white, 14px, semibold)
- **If scheduled match**: show an additional info bar below the tiles:
  - Cyan-tinted background, cyan border, clock icon + "Scheduled Match · {formatted date}" in cyan text

#### 4. Teams Section — Blue Side vs Red Side
- Section title: "Teams" (white, bold)
- **BLUE SIDE** header: blue-tinted badge (`#4488FF` text, blue background `rgba(68,136,255,0.1)`, blue border), uppercase, letter-spacing 1.5px
- Then a list of **Blue Team player cards** (one per player)
- **RED SIDE** header: red-tinted badge (`#FF4444` text, red background, red border), same style
- Then a list of **Red Team player cards**

Each **Player Card** contains:
- Left: **Profile icon** (44×44px, rounded 10px):
  - If Riot account linked: load from `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/{originalIconId}.png`
  - Gold border (`#C89B3C`) if account is linked, dark border if not
  - Fallback: show a person icon in team color or "LoL" text
- Center: **Player info** (stacked):
  - Line 1: `{riotGameName}#{riotTagLine}` — white, 14px, semibold (or "Player" if no Riot account)
  - Line 2: `ELO: {elo}  ·  {region label}` — muted `#7A86AC`, 12px
- Right: **ELO badge** — team-colored background (faint), team-colored text, bold, rounded
- Card styling: dark background (`#0F1221`), rounded 12px, team-colored border (faint `rgba(teamColor, 0.2)`)

Data source: `game.participants` array — filter by `participant.team === "BLUE"` or `"RED"`. Each participant has:
```json
{
  "userId": "string",
  "team": "BLUE" | "RED",
  "accepted": true,
  "elo": 1000,
  "riotAccountInfo": {
    "riotGameName": "PlayerName",
    "riotTagLine": "EUW",
    "riotPuuid": "...",
    "riotRegion": "euw1",
    "originalIconId": 4567
  }
}
```

Region label mapping:
- `euw1` → "EUW", `eun1` → "EUNE", `na1` → "NA", `kr` → "KR", `br1` → "BR", `tr1` → "TR", `ru` → "RU", `la1` → "LAN", `la2` → "LAS", `jp1` → "JP", `oc1` → "OCE"

#### 5. Instructions Section
- Orange-tinted card (orange background `rgba(255,165,0,0.08)`, orange border `rgba(255,165,0,0.25)`)
- Header row: info icon (orange) + "How to join" (orange, bold, 14px)
- 4 numbered steps, each with:
  - Circle badge (orange-tinted, 20px) containing the step number
  - Instruction text (orange, 13px)
- Steps:
  1. "Open League of Legends on your PC"
  2. "Go to Play > Custom Game > Create"
  3. "Use the pass key above as the room name"
  4. "Wait for all players to join, then start!"

#### 6. Done Button (bottom)
- Full-width outlined button: white text, dark border (`#1A1F36`), rounded 12px
- Text: "Done — Return to Home"
- On click: 
  - Calls `POST /matchmaking/games/:gameId/acknowledge` (if this endpoint exists) or simply resets the matchmaking state
  - Navigates back to the main dashboard / LoL game screen
  - Clears the active game from local state and localStorage

### Navigation & State Management

1. **Auto-navigation trigger**: In the Phase 3 game polling callback, when you detect `game.status === "ACCEPTED"` and `game.roomInfo !== null`:
   - Stop all polling intervals
   - Store the game data
   - Navigate to / reveal the Game Room view (could be a new HTML section that replaces the current content, or a new page)

2. **Restore on page load**: If the user refreshes the page while a game is in ACCEPTED state:
   - On page load, call `GET /matchmaking/my-active-game`
   - If the game is ACCEPTED with roomInfo → show the Game Room immediately (skip queue/match found)

3. **"Done" action**: When the user clicks "Done — Return to Home":
   - Reset the matchmaking state completely (clear ticket, game, gameId from memory and localStorage)
   - Return to the normal dashboard view with the Find Match button in idle state

4. **Handle edge case**: If the game data becomes null or unavailable:
   - Show a fallback message: "Game data unavailable" with an error icon and a "Go Back" button

### API Reference Reminder (DO NOT MODIFY — just consume)

**GET /matchmaking/games/:gameId** (requires JWT)
- Response: Full game object:
```json
{
  "_id": "gameId",
  "status": "ACCEPTED",
  "mode": "CUSTOM_1V1",
  "server": "euw1",
  "region": "EUW1",
  "number_of_participant": 2,
  "isScheduled": false,
  "roomInfo": {
    "roomId": "X-ABC123",
    "map": "Summoner's Rift"
  },
  "participants": [
    {
      "userId": "...",
      "team": "BLUE",
      "accepted": true,
      "elo": 1000,
      "riotAccountInfo": {
        "riotGameName": "Player1",
        "riotTagLine": "EUW",
        "riotPuuid": "...",
        "riotRegion": "euw1",
        "originalIconId": 4567
      }
    },
    {
      "userId": "...",
      "team": "RED",
      "accepted": true,
      "elo": 1050,
      "riotAccountInfo": {
        "riotGameName": "Player2",
        "riotTagLine": "NA1",
        "riotPuuid": "...",
        "riotRegion": "na1",
        "originalIconId": 1234
      }
    }
  ],
  "createdAt": "2024-02-01T14:30:00.000Z"
}
```

### Design Requirements
- Background: `#0A0E1A` (same as all other screens)
- Cards: `#0F1221` with `#1A1F36` borders
- Accent color: green (`#00FF00`) — used for the pass key, status badge, icons, buttons
- Team colors: Blue Side `#4488FF`, Red Side `#FF4444`
- Muted text: `#7A86AC`
- Keep the glassmorphism dark theme consistent with the rest of the app
- The Game Room should feel like a "lobby" or "pre-game" screen — clean, informative, and clear
- Smooth entrance transition when navigating to this view (fade-in or slide-up)
- The Pass Key section should be the visual focal point — it's the most important info on the screen

### File Changes
- Modify the existing dashboard HTML/JS (or create a new game-room section within it)
- This should integrate with the Phase 3 matchmaking polling system
- Update the Phase 3 accepted-state handler to navigate here instead of just showing an inline room code

Read the existing dashboard.html and Phase 3 matchmaking code before making changes. Preserve ALL existing UI and functionality.
```

---

## Notes for All Prompts

- The backend runs on `http://localhost:3000` — make sure it's running before testing
- The backend uses MongoDB — make sure it's connected
- The `.cursor/rules/no-backend-modifications.mdc` rule file should be present in both projects to enforce the read-only constraint on the backend
- Each phase builds on the previous — run them in order
- If the AI asks to modify backend files, remind it of the rule
