# Assets, presets, NFT pieces & marketplace — frontend guide

This document matches the **Arena Chain** Nest API after the `game-assets`, `asset-presets`, and extended `nft` routes were added.

## Base URLs

| Kind | Pattern | Example |
|------|---------|---------|
| JSON API | `{API_BASE}/api/...` | `http://localhost:3000/api/nft` |
| Uploaded images | `{ORIGIN}/uploads/...` | `http://localhost:3000/uploads/foo.png` |
| Raw inventory files (GLB/OBJ/textures) | `{ORIGIN}/inventory-files/...` | `http://localhost:3000/inventory-files/weapens/cs2/ak-47-based.glb` |

**Important:** Static files are **not** under `/api`. Only REST controllers use the global prefix `api`.

Set `API_BASE` in your web app (e.g. `http://localhost:3000`). For auth, send:

```http
Authorization: Bearer <JWT>
```

---

## 1. Games catalog (for filters)

List games you can attach to NFTs (`compatibleGames`):

```http
GET {API_BASE}/api/catalog
```

Use each document’s `_id` as `gameId` when filtering NFTs or marketplace listings.

Create/update games via existing catalog admin endpoints (see Swagger under **catalog**).

---

## 2. Raw files on disk (`src/inventory`)

### Discover files (paths for your 3D loader)

```http
GET {API_BASE}/api/game-assets
```

**Response (shape):**

- `files[]`: each entry has `relativePath`, `urlPath`, `rootFolder`, `subFolder`, `extension`, …
- Build a full URL: `` `${window.location.origin}/${entry.urlPath}` ``  
  (`urlPath` already looks like `/inventory-files/weapens/cs2/ak-47-based.glb`)

### Optional env (server)

- `INVENTORY_FILES_ROOT` — if set, must be a **path relative to `process.cwd()`** for the folder to scan and serve (default when unset: `src/inventory`).

The server also registers static hosting for `src/inventory` at **`/inventory-files`** when that folder exists at startup.

---

## 3. NFT definitions (templates for weapons / avatars / …)

List templates with filters:

```http
GET {API_BASE}/api/nft?category=WEAPON
GET {API_BASE}/api/nft?gameId=<CATALOG_ID>
GET {API_BASE}/api/nft?tag=valorant
```

Combine query params as needed. Each NFT can include:

- `imageUrl` — preview
- `metadata` — put `modelUrl` here (e.g. `/inventory-files/...` or `/uploads/...`) so the client knows what to load
- `compatibleGames` — populated catalog docs when you use `findAll`

**Admin** creates/updates NFTs via `POST/PATCH /api/nft` (see Swagger **nft**).

**Recommended:** For each real asset, create one NFT row whose `metadata.modelUrl` matches a file under `/inventory-files/...`, and set `compatibleGames` to the right catalog ids. Use `tags` for quick filters (`cs2`, `valorant`, `dota2`, `lol`, etc.).

---

## 4. Save a configuration **without** NFT (normal preset)

For “I configured a look but I don’t mint / own it as an item yet”:

```http
POST {API_BASE}/api/asset-presets
Content-Type: application/json

{
  "name": "My AK build",
  "baseNftId": "<optional nft template _id>",
  "assetPath": "weapens/cs2/ak-47-based.glb",
  "config": { "tint": "#00ff87", "attachments": ["scope-a"] },
  "previewImageUrl": "/uploads/preview.png"
}
```

**My presets:**

```http
GET {API_BASE}/api/asset-presets/mine
PATCH {API_BASE}/api/asset-presets/:id
DELETE {API_BASE}/api/asset-presets/:id
GET {API_BASE}/api/asset-presets/:id
```

---

## 5. Save configuration **as** an owned NFT piece

Creates a new **`NftItem`** (your copy), stores the editor JSON in **`item.metadata`**, increments template `supply`, and **adds the item to your inventory**:

```http
POST {API_BASE}/api/nft/items/save-configured
Content-Type: application/json

{
  "baseNftId": "<NFT template _id>",
  "config": { "tint": "#00ff87", "parts": ["barrel-2"] },
  "displayName": "Neon AK"
}
```

Then use existing inventory endpoints (`GET /api/inventory`, equip, etc.) — see `NFT_FRONTEND_GUIDE.md`.

`acquiredVia` on the item will be **`CRAFTED`**.

---

## 6. Marketplace (browse → list → buy)

### Browse (no auth)

```http
GET {API_BASE}/api/nft/marketplace/listings?gameId=<optional>&category=WEAPON&skip=0&limit=20
```

Each listing is an **`NftItem`** with `status: "LISTED"` and `metadata.marketplace.price` / `currency`.

### List my item

```http
POST {API_BASE}/api/nft/marketplace/list
Content-Type: application/json

{
  "nftItemId": "<item _id>",
  "price": 49.99,
  "currency": "USD"
}
```

Rules: you must **own** the item, it must **not** be equipped, and the template must be **`isTradeable`**.

### Unlist

```http
POST {API_BASE}/api/nft/marketplace/unlist
{ "nftItemId": "<item _id>" }
```

### Purchase

```http
POST {API_BASE}/api/nft/marketplace/purchase
{ "nftItemId": "<item _id>" }
```

**Note:** This endpoint only moves ownership and clears the listing metadata. **Payment / escrow is not implemented** — run your checkout first, then call `purchase` (or replace this with a server route that verifies payment).

---

## 7. Minimal front-end flow (checklist)

1. **Games:** `GET /api/catalog` → cache ids for CS2 / Valorant / …
2. **Optional disk scan:** `GET /api/game-assets` → build picker from `files`
3. **Templates:** `GET /api/nft?gameId=...&category=...` → show cards + load `metadata.modelUrl` in Three.js / Babylon / etc.
4. **Editor:** keep state in memory; optional `POST /api/asset-presets` for drafts
5. **Finish as NFT:** `POST /api/nft/items/save-configured`
6. **Marketplace:** `GET /api/nft/marketplace/listings` → show grid; seller uses `marketplace/list`; buyer uses `marketplace/purchase` after payment

---

## 8. Swagger

Interactive docs: `{API_BASE}/docs` (e.g. `http://localhost:3000/docs`).

Look for tags **game-assets**, **asset-presets**, **nft**, **inventory**, **catalog**.

---

## 9. Related doc

- `NFT_FRONTEND_GUIDE.md` — collections, mint, airdrop, inventory, transfer, attributes.
