# NFT System — Frontend Implementation Guide

> **Base URL**: `http://localhost:3000` (or your server IP)
> **Swagger**: `http://localhost:3000/api`
> **Auth**: All authenticated endpoints require `Authorization: Bearer <JWT_TOKEN>`

---

## Table of Contents

1. [Data Models](#1-data-models)
2. [API Endpoints Reference](#2-api-endpoints-reference)
3. [Admin Panel — Collections Management](#3-admin-panel--collections-management)
4. [Admin Panel — NFT Creation (Weapons, Avatars, etc.)](#4-admin-panel--nft-creation)
5. [Admin Panel — NFT Attributes](#5-admin-panel--nft-attributes)
6. [Admin Panel — Minting & Airdrop](#6-admin-panel--minting--airdrop)
7. [Admin Panel — Statistics Dashboard](#7-admin-panel--statistics-dashboard)
8. [User — NFT Marketplace / Browse](#8-user--nft-marketplace--browse)
9. [User — My Items](#9-user--my-items)
10. [User — Inventory & Equipment](#10-user--inventory--equipment)
11. [User — Transfer NFTs](#11-user--transfer-nfts)
12. [TypeScript Interfaces](#12-typescript-interfaces)
13. [API Service (Axios)](#13-api-service-axios)
14. [Complete Workflow Examples](#14-complete-workflow-examples)

---

## 1. Data Models

### NFT Collection
Groups NFTs into themed sets (e.g., "Warrior Avatars", "Dragon Weapons").

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Collection ID |
| `name` | string | Collection name |
| `description` | string | Collection description |
| `imageUrl` | string | Cover image |
| `creatorId` | User | Creator (admin) |
| `category` | enum | `AVATARS`, `WEAPONS`, `SKINS`, `CHARACTERS`, `BADGES`, `TROPHIES`, `ARMOR`, `ACCESSORIES`, `MIXED` |
| `compatibleGames` | Catalog[] | Compatible games |
| `isActive` | boolean | Whether collection is active |
| `totalMinted` | number | Total minted count |
| `maxSupply` | number | Max supply (0 = unlimited) |
| `metadata` | object | Extra data |

### NFT
A single NFT definition (template). Multiple items can be minted from one NFT.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | NFT ID |
| `name` | string | NFT name |
| `description` | string | Description |
| `imageUrl` | string | Image path (e.g., `/uploads/sword.png`) |
| `creatorId` | User | Creator (admin) |
| `collectionId` | NftCollection | Parent collection |
| `category` | enum | `WEAPON`, `AVATAR`, `SKIN`, `CHARACTER`, `CONSUMABLE`, `BADGE`, `TROPHY`, `EMOTE`, `ARMOR`, `ACCESSORY`, `OTHER` |
| `rarity` | enum | `COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `LEGENDARY`, `MYTHIC` |
| `compatibleGames` | Catalog[] | Compatible games |
| `tags` | string[] | Search tags |
| `contractAddress` | string | Blockchain contract address |
| `tokenId` | string | On-chain token ID |
| `transactionHash` | string | Mint transaction hash |
| `status` | enum | `DRAFT`, `MINTED`, `LISTED`, `BURNED` |
| `mintedAt` | Date | When it was minted |
| `isEquippable` | boolean | Can be equipped |
| `isConsumable` | boolean | One-time use |
| `isTradeable` | boolean | Can be traded |
| `supply` | number | Current supply |
| `maxSupply` | number | Max supply (0 = unlimited) |
| `metadata` | object | Extra data |

### NFT Attribute
Stats/traits attached to an NFT (e.g., Damage: 150, Element: Fire).

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Attribute ID |
| `nftId` | string | Parent NFT ID |
| `traitType` | string | Trait name (e.g., "Damage") |
| `value` | string | Trait value (e.g., "150") |
| `displayType` | string | Display format (`number`, `date`, etc.) |
| `numericValue` | number | Numeric value for progress bars |
| `maxValue` | number | Max value for progress bars |

### NFT Item
An individual owned copy of an NFT. One NFT can have many items (editions).

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Item ID |
| `nftId` | NFT | Reference to the NFT template |
| `ownerId` | User | Current owner |
| `walletAddress` | string | Owner's wallet address |
| `tokenId` | string | On-chain token ID |
| `transactionHash` | string | Transaction hash |
| `edition` | number | Edition number |
| `status` | enum | `OWNED`, `EQUIPPED`, `LISTED`, `TRANSFERRED`, `BURNED` |
| `acquiredAt` | Date | When acquired |
| `acquiredVia` | enum | `MINTED`, `PURCHASED`, `REWARD`, `TRANSFER`, `AIRDROP` |

### Inventory
Per-user inventory containing items and equipped slots.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Inventory ID |
| `userId` | User | Owner (unique per user) |
| `items` | NftItem[] | All items in inventory |
| `equippedItems` | Array | `{ nftItemId, slot, equippedAt }` |
| `walletAddress` | string | User's wallet address |

---

## 2. API Endpoints Reference

### Collections (Admin creates, everyone can view)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/nft/collections` | Yes | Admin | Create a collection |
| `GET` | `/nft/collections` | No | — | List all collections |
| `GET` | `/nft/collections/:collectionId` | No | — | Get collection by ID |
| `GET` | `/nft/collections/:collectionId/nfts` | No | — | Get all NFTs in a collection |
| `PATCH` | `/nft/collections/:collectionId` | Yes | Admin | Update a collection |
| `DELETE` | `/nft/collections/:collectionId` | Yes | Admin | Delete a collection (must be empty) |

### NFTs (Admin creates, everyone can view)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/nft` | Yes | Admin | Create an NFT (multipart/form-data with image) |
| `GET` | `/nft` | No | — | List NFTs (query: `category`, `rarity`, `status`, `collectionId`) |
| `GET` | `/nft/:id` | No | — | Get NFT details + attributes |
| `PATCH` | `/nft/:id` | Yes | Admin | Update an NFT |
| `DELETE` | `/nft/:id` | Yes | Admin | Delete an NFT (only if DRAFT) |
| `GET` | `/nft/stats` | Yes | Admin | Get NFT statistics |

### NFT Attributes (Admin only)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/nft/attributes` | Yes | Admin | Add attribute to an NFT |
| `GET` | `/nft/:id/attributes` | No | — | Get attributes of an NFT |
| `DELETE` | `/nft/attributes/:attributeId` | Yes | Admin | Remove an attribute |

### Minting & Airdrop (Admin only)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/nft/mint` | Yes | Admin | Mint NFT on blockchain |
| `POST` | `/nft/airdrop` | Yes | Admin | Airdrop NFT to a user |

### NFT Items (User)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/nft/items/my` | Yes | Any | Get my NFT items |
| `GET` | `/nft/items/:itemId` | No | — | Get item details |
| `POST` | `/nft/items/transfer` | Yes | Any | Transfer item to another user |

### Inventory (User — all require auth)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/inventory` | Yes | Get my inventory |
| `POST` | `/inventory/add/:nftItemId` | Yes | Add item to inventory |
| `DELETE` | `/inventory/remove/:nftItemId` | Yes | Remove item from inventory |
| `POST` | `/inventory/equip` | Yes | Equip item to a slot |
| `POST` | `/inventory/unequip/:nftItemId` | Yes | Unequip item |
| `GET` | `/inventory/equipped` | Yes | Get equipped items only |
| `PATCH` | `/inventory/wallet/:walletAddress` | Yes | Set wallet address |

---

## 3. Admin Panel — Collections Management

### Create a Collection

```http
POST /nft/collections
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "Arena Warriors Avatars",
  "description": "Exclusive avatar collection for Arena Chain warriors",
  "category": "AVATARS",
  "maxSupply": 10000,
  "compatibleGames": ["<catalog_game_id>"],
  "metadata": { "season": "1", "theme": "dark fantasy" }
}
```

**Response (201)**:
```json
{
  "_id": "665a1b2c3d4e5f6a7b8c9d0e",
  "name": "Arena Warriors Avatars",
  "description": "Exclusive avatar collection for Arena Chain warriors",
  "category": "AVATARS",
  "isActive": true,
  "totalMinted": 0,
  "maxSupply": 10000,
  "compatibleGames": [],
  "metadata": { "season": "1", "theme": "dark fantasy" },
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

### List Collections (with optional filter)

```http
GET /nft/collections
GET /nft/collections?category=AVATARS
GET /nft/collections?category=WEAPONS
```

### Update a Collection

```http
PATCH /nft/collections/<collectionId>
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "description": "Updated description",
  "isActive": false
}
```

### Delete a Collection

```http
DELETE /nft/collections/<collectionId>
Authorization: Bearer <ADMIN_TOKEN>
```

> Will fail if the collection still contains NFTs.

---

## 4. Admin Panel — NFT Creation

### Create an NFT with Image Upload

Use `multipart/form-data` to upload the NFT image:

```javascript
const formData = new FormData();
formData.append('name', 'Dragon Slayer Sword');
formData.append('description', 'A legendary sword forged in dragon fire');
formData.append('category', 'WEAPON');
formData.append('rarity', 'LEGENDARY');
formData.append('collectionId', '<collection_id>');          // optional
formData.append('tags', JSON.stringify(['fire', 'melee']));
formData.append('compatibleGames', JSON.stringify(['<game_catalog_id>']));
formData.append('isEquippable', 'true');
formData.append('isTradeable', 'true');
formData.append('maxSupply', '100');
formData.append('metadata', JSON.stringify({ damage: 150, element: 'fire' }));
formData.append('file', imageFile);  // File object from <input type="file">

const response = await axios.post('/nft', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data',
  },
});
```

**Response (201)**:
```json
{
  "_id": "665b2c3d4e5f6a7b8c9d0e1f",
  "name": "Dragon Slayer Sword",
  "description": "A legendary sword forged in dragon fire",
  "imageUrl": "/uploads/nft-1718000000000-dragon-slayer.png",
  "category": "WEAPON",
  "rarity": "LEGENDARY",
  "collectionId": "665a1b2c3d4e5f6a7b8c9d0e",
  "status": "DRAFT",
  "isEquippable": true,
  "isTradeable": true,
  "supply": 1,
  "maxSupply": 100,
  "tags": ["fire", "melee"],
  "metadata": { "damage": 150, "element": "fire" }
}
```

### Category Values for the Create Form

```
WEAPON    — Swords, guns, bows, etc.
AVATAR    — Profile avatars / profile pictures
SKIN      — Character or weapon skins
CHARACTER — Playable characters
CONSUMABLE— Potions, boosts (one-time use)
BADGE     — Achievement badges
TROPHY    — Tournament trophies
EMOTE     — In-game emotes
ARMOR     — Helmets, chestplates, etc.
ACCESSORY — Rings, capes, wings, etc.
OTHER     — Anything else
```

### Rarity Values

```
COMMON    — Gray   — #9E9E9E
UNCOMMON  — Green  — #4CAF50
RARE      — Blue   — #2196F3
EPIC      — Purple — #9C27B0
LEGENDARY — Orange — #FF9800
MYTHIC    — Red    — #F44336
```

### List NFTs with Filters

```http
GET /nft
GET /nft?category=WEAPON
GET /nft?rarity=LEGENDARY
GET /nft?status=MINTED
GET /nft?collectionId=665a1b2c3d4e5f6a7b8c9d0e
GET /nft?category=AVATAR&rarity=RARE&collectionId=665a1b2c3d4e5f6a7b8c9d0e
```

### Get NFT Detail (includes attributes)

```http
GET /nft/<nftId>
```

**Response**:
```json
{
  "_id": "665b2c3d...",
  "name": "Dragon Slayer Sword",
  "imageUrl": "/uploads/nft-dragon-slayer.png",
  "category": "WEAPON",
  "rarity": "LEGENDARY",
  "collectionId": {
    "_id": "665a1b2c...",
    "name": "Dragon Weapons",
    "category": "WEAPONS"
  },
  "compatibleGames": [
    { "_id": "664...", "title": "League of Legends", "genre": "MOBA" }
  ],
  "creatorId": {
    "_id": "663...",
    "nickname": "AdminUser",
    "email": "admin@arenachain.com"
  },
  "status": "DRAFT",
  "attributes": [
    { "_id": "665c...", "traitType": "Damage", "value": "150", "numericValue": 150, "maxValue": 500 },
    { "_id": "665d...", "traitType": "Element", "value": "Fire" },
    { "_id": "665e...", "traitType": "Speed", "value": "85", "numericValue": 85, "maxValue": 100 }
  ]
}
```

---

## 5. Admin Panel — NFT Attributes

### Add Attribute

```http
POST /nft/attributes
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "nftId": "<nft_id>",
  "traitType": "Damage",
  "value": "150",
  "displayType": "number",
  "numericValue": 150,
  "maxValue": 500
}
```

### Common Attribute Examples

```javascript
// Weapon stats
{ nftId, traitType: "Damage",     value: "150",   numericValue: 150, maxValue: 500 }
{ nftId, traitType: "Speed",      value: "85",    numericValue: 85,  maxValue: 100 }
{ nftId, traitType: "Element",    value: "Fire" }
{ nftId, traitType: "Critical %", value: "25",    numericValue: 25,  maxValue: 100 }

// Avatar traits
{ nftId, traitType: "Background", value: "Galaxy" }
{ nftId, traitType: "Eyes",       value: "Glowing Red" }
{ nftId, traitType: "Outfit",     value: "Samurai Armor" }

// Armor stats
{ nftId, traitType: "Defense",    value: "200",   numericValue: 200, maxValue: 500 }
{ nftId, traitType: "Weight",     value: "Heavy" }
```

### Get Attributes of an NFT

```http
GET /nft/<nftId>/attributes
```

### Remove Attribute

```http
DELETE /nft/attributes/<attributeId>
Authorization: Bearer <ADMIN_TOKEN>
```

---

## 6. Admin Panel — Minting & Airdrop

### Mint an NFT on Blockchain

```http
POST /nft/mint
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "nftId": "<nft_id>",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD5e"
}
```

**Response (201)**:
```json
{
  "_id": "665f...",
  "nftId": "665b...",
  "ownerId": "663...",
  "walletAddress": "0x742d35Cc...",
  "tokenId": "1",
  "transactionHash": "0xabc123...",
  "edition": 1,
  "status": "OWNED",
  "acquiredAt": "2025-01-15T11:00:00.000Z",
  "acquiredVia": "MINTED"
}
```

> If blockchain is not configured, the item is still created in the database with `status: OWNED` but without on-chain data.

### Airdrop an NFT to a User

```http
POST /nft/airdrop
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "nftId": "<nft_id>",
  "toUserId": "<user_id>",
  "walletAddress": "0x..."
}
```

This creates an NftItem owned by the target user, incrementing the NFT supply.

---

## 7. Admin Panel — Statistics Dashboard

```http
GET /nft/stats
Authorization: Bearer <ADMIN_TOKEN>
```

**Response**:
```json
{
  "totalNfts": 42,
  "totalMinted": 15,
  "totalItems": 120,
  "totalCollections": 5,
  "byCategory": [
    { "_id": "WEAPON", "count": 12 },
    { "_id": "AVATAR", "count": 18 },
    { "_id": "SKIN", "count": 8 },
    { "_id": "ARMOR", "count": 4 }
  ],
  "byRarity": [
    { "_id": "COMMON", "count": 15 },
    { "_id": "RARE", "count": 12 },
    { "_id": "EPIC", "count": 8 },
    { "_id": "LEGENDARY", "count": 5 },
    { "_id": "MYTHIC", "count": 2 }
  ]
}
```

---

## 8. User — NFT Marketplace / Browse

### Browse All NFTs

```http
GET /nft
GET /nft?category=AVATAR
GET /nft?rarity=LEGENDARY
GET /nft?collectionId=<id>
```

### Browse Collections

```http
GET /nft/collections
GET /nft/collections?category=AVATARS
```

### View a Collection's NFTs

```http
GET /nft/collections/<collectionId>/nfts
```

### View NFT Details

```http
GET /nft/<nftId>
```

Returns the NFT with its attributes, compatible games, and collection info.

---

## 9. User — My Items

### Get My NFT Items

```http
GET /nft/items/my
Authorization: Bearer <USER_TOKEN>
```

**Response**:
```json
[
  {
    "_id": "665f...",
    "nftId": {
      "_id": "665b...",
      "name": "Dragon Slayer Sword",
      "imageUrl": "/uploads/nft-sword.png",
      "category": "WEAPON",
      "rarity": "LEGENDARY",
      "compatibleGames": [{ "_id": "664...", "title": "League of Legends", "genre": "MOBA" }]
    },
    "ownerId": "663...",
    "edition": 1,
    "status": "OWNED",
    "acquiredAt": "2025-01-15T11:00:00.000Z",
    "acquiredVia": "AIRDROP"
  }
]
```

### Get Item Detail

```http
GET /nft/items/<itemId>
```

---

## 10. User — Inventory & Equipment

### Get My Inventory

```http
GET /inventory
Authorization: Bearer <USER_TOKEN>
```

**Response**:
```json
{
  "_id": "666a...",
  "userId": "663...",
  "items": [
    {
      "_id": "665f...",
      "nftId": {
        "name": "Dragon Slayer Sword",
        "imageUrl": "/uploads/nft-sword.png",
        "category": "WEAPON",
        "rarity": "LEGENDARY"
      },
      "status": "OWNED",
      "edition": 1
    }
  ],
  "equippedItems": [
    {
      "nftItemId": {
        "_id": "665f...",
        "nftId": { "name": "Shadow Armor", "category": "ARMOR" }
      },
      "slot": "body",
      "equippedAt": "2025-01-15T12:00:00.000Z"
    }
  ],
  "walletAddress": "0x742d35Cc..."
}
```

### Add Item to Inventory

```http
POST /inventory/add/<nftItemId>
Authorization: Bearer <USER_TOKEN>
```

### Remove Item from Inventory

```http
DELETE /inventory/remove/<nftItemId>
Authorization: Bearer <USER_TOKEN>
```

> Fails if item is currently equipped.

### Equip an Item

```http
POST /inventory/equip
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "nftItemId": "<nft_item_id>",
  "slot": "weapon"
}
```

**Available slots** (use as needed in your game):
```
weapon     — Primary weapon
secondary  — Secondary weapon
head       — Helmet / hat
body       — Chest armor
legs       — Leg armor
feet       — Boots
accessory  — Ring / cape / wings
avatar     — Profile avatar
emote      — Equipped emote
```

> If a slot already has an item, the old item is automatically unequipped.

### Unequip an Item

```http
POST /inventory/unequip/<nftItemId>
Authorization: Bearer <USER_TOKEN>
```

### Get Equipped Items Only

```http
GET /inventory/equipped
Authorization: Bearer <USER_TOKEN>
```

### Set Wallet Address

```http
PATCH /inventory/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f2bD5e
Authorization: Bearer <USER_TOKEN>
```

---

## 11. User — Transfer NFTs

### Transfer an Item to Another User

```http
POST /nft/items/transfer
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "nftItemId": "<nft_item_id>",
  "toUserId": "<recipient_user_id>",
  "toWalletAddress": "0x..."
}
```

**Rules**:
- You must own the item
- Item must not be equipped (unequip first)
- NFT must have `isTradeable: true`
- If blockchain is configured, an on-chain transfer is executed

---

## 12. TypeScript Interfaces

```typescript
// ─── Enums ───

export type NftCategory = 'WEAPON' | 'AVATAR' | 'SKIN' | 'CHARACTER' | 'CONSUMABLE' | 'BADGE' | 'TROPHY' | 'EMOTE' | 'ARMOR' | 'ACCESSORY' | 'OTHER';
export type NftRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
export type NftStatus = 'DRAFT' | 'MINTED' | 'LISTED' | 'BURNED';
export type NftItemStatus = 'OWNED' | 'EQUIPPED' | 'LISTED' | 'TRANSFERRED' | 'BURNED';
export type AcquiredVia = 'MINTED' | 'PURCHASED' | 'REWARD' | 'TRANSFER' | 'AIRDROP';
export type CollectionCategory = 'AVATARS' | 'WEAPONS' | 'SKINS' | 'CHARACTERS' | 'BADGES' | 'TROPHIES' | 'ARMOR' | 'ACCESSORIES' | 'MIXED';

// ─── Interfaces ───

export interface NftCollection {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  creatorId: string | { _id: string; nickname: string; email: string };
  category: CollectionCategory;
  compatibleGames: string[] | { _id: string; title: string; genre: string }[];
  isActive: boolean;
  totalMinted: number;
  maxSupply: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Nft {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  creatorId: string | { _id: string; nickname: string; email: string };
  collectionId?: string | { _id: string; name: string; category: string };
  category: NftCategory;
  rarity: NftRarity;
  compatibleGames: string[] | { _id: string; title: string; genre: string }[];
  tags: string[];
  contractAddress?: string;
  tokenId?: string;
  transactionHash?: string;
  status: NftStatus;
  mintedAt?: string;
  isEquippable: boolean;
  isConsumable: boolean;
  isTradeable: boolean;
  supply: number;
  maxSupply: number;
  externalUrl?: string;
  metadata: Record<string, any>;
  attributes?: NftAttribute[];
  createdAt: string;
  updatedAt: string;
}

export interface NftAttribute {
  _id: string;
  nftId: string;
  traitType: string;
  value: string;
  displayType?: string;
  numericValue?: number;
  maxValue?: number;
}

export interface NftItem {
  _id: string;
  nftId: string | Nft;
  ownerId: string;
  walletAddress?: string;
  tokenId?: string;
  transactionHash?: string;
  edition: number;
  status: NftItemStatus;
  acquiredAt: string;
  acquiredVia: AcquiredVia;
  metadata: Record<string, any>;
}

export interface EquippedSlot {
  nftItemId: string | NftItem;
  slot: string;
  equippedAt: string;
}

export interface Inventory {
  _id: string;
  userId: string;
  items: NftItem[];
  equippedItems: EquippedSlot[];
  walletAddress?: string;
  metadata: Record<string, any>;
}

export interface NftStats {
  totalNfts: number;
  totalMinted: number;
  totalItems: number;
  totalCollections: number;
  byCategory: { _id: string; count: number }[];
  byRarity: { _id: string; count: number }[];
}

// ─── DTOs ───

export interface CreateNftCollectionDto {
  name: string;
  description?: string;
  imageUrl?: string;
  category: CollectionCategory;
  compatibleGames?: string[];
  isActive?: boolean;
  maxSupply?: number;
  metadata?: Record<string, any>;
}

export interface CreateNftDto {
  name: string;
  description?: string;
  imageUrl?: string;
  category: NftCategory;
  rarity: NftRarity;
  collectionId?: string;
  compatibleGames?: string[];
  tags?: string[];
  isEquippable?: boolean;
  isConsumable?: boolean;
  isTradeable?: boolean;
  supply?: number;
  maxSupply?: number;
  externalUrl?: string;
  metadata?: Record<string, any>;
}

export interface CreateNftAttributeDto {
  nftId: string;
  traitType: string;
  value: string;
  displayType?: string;
  numericValue?: number;
  maxValue?: number;
}

export interface MintNftDto {
  nftId: string;
  walletAddress: string;
}

export interface AirdropNftDto {
  nftId: string;
  toUserId: string;
  walletAddress?: string;
}

export interface TransferNftItemDto {
  nftItemId: string;
  toUserId: string;
  toWalletAddress: string;
}

export interface EquipItemDto {
  nftItemId: string;
  slot: string;
}
```

---

## 13. API Service (Axios)

```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3000'; // or your server IP

const api = axios.create({ baseURL: API_BASE });

// Set token after login
export const setAuthToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// ─── Collections ───

export const nftCollectionApi = {
  create: (data: CreateNftCollectionDto) =>
    api.post<NftCollection>('/nft/collections', data),

  getAll: (category?: string) =>
    api.get<NftCollection[]>('/nft/collections', { params: { category } }),

  getOne: (id: string) =>
    api.get<NftCollection>(`/nft/collections/${id}`),

  getNfts: (id: string) =>
    api.get<Nft[]>(`/nft/collections/${id}/nfts`),

  update: (id: string, data: Partial<CreateNftCollectionDto>) =>
    api.patch<NftCollection>(`/nft/collections/${id}`, data),

  delete: (id: string) =>
    api.delete(`/nft/collections/${id}`),
};

// ─── NFTs ───

export const nftApi = {
  create: (formData: FormData) =>
    api.post<Nft>('/nft', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getAll: (filters?: { category?: string; rarity?: string; status?: string; collectionId?: string }) =>
    api.get<Nft[]>('/nft', { params: filters }),

  getOne: (id: string) =>
    api.get<Nft & { attributes: NftAttribute[] }>(`/nft/${id}`),

  update: (id: string, formData: FormData) =>
    api.patch<Nft>(`/nft/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    api.delete(`/nft/${id}`),

  getStats: () =>
    api.get<NftStats>('/nft/stats'),
};

// ─── NFT Attributes ───

export const nftAttributeApi = {
  add: (data: CreateNftAttributeDto) =>
    api.post<NftAttribute>('/nft/attributes', data),

  getByNft: (nftId: string) =>
    api.get<NftAttribute[]>(`/nft/${nftId}/attributes`),

  remove: (attributeId: string) =>
    api.delete(`/nft/attributes/${attributeId}`),
};

// ─── Minting & Airdrop ───

export const nftMintApi = {
  mint: (data: MintNftDto) =>
    api.post<NftItem>('/nft/mint', data),

  airdrop: (data: AirdropNftDto) =>
    api.post<NftItem>('/nft/airdrop', data),
};

// ─── NFT Items ───

export const nftItemApi = {
  getMyItems: () =>
    api.get<NftItem[]>('/nft/items/my'),

  getOne: (itemId: string) =>
    api.get<NftItem>(`/nft/items/${itemId}`),

  transfer: (data: TransferNftItemDto) =>
    api.post<NftItem>('/nft/items/transfer', data),
};

// ─── Inventory ───

export const inventoryApi = {
  getMyInventory: () =>
    api.get<Inventory>('/inventory'),

  addItem: (nftItemId: string) =>
    api.post<Inventory>(`/inventory/add/${nftItemId}`),

  removeItem: (nftItemId: string) =>
    api.delete<Inventory>(`/inventory/remove/${nftItemId}`),

  equip: (data: EquipItemDto) =>
    api.post<Inventory>('/inventory/equip', data),

  unequip: (nftItemId: string) =>
    api.post<Inventory>(`/inventory/unequip/${nftItemId}`),

  getEquipped: () =>
    api.get('/inventory/equipped'),

  setWallet: (walletAddress: string) =>
    api.patch<Inventory>(`/inventory/wallet/${walletAddress}`),
};
```

---

## 14. Complete Workflow Examples

### Admin Workflow: Create a Full Weapon NFT

```typescript
// Step 1: Create a collection
const collection = await nftCollectionApi.create({
  name: 'Dragon Weapons',
  description: 'Legendary weapons forged in dragon fire',
  category: 'WEAPONS',
  maxSupply: 500,
});

// Step 2: Create the NFT with image
const formData = new FormData();
formData.append('name', 'Dragon Slayer Sword');
formData.append('description', 'A legendary sword forged in dragon fire');
formData.append('category', 'WEAPON');
formData.append('rarity', 'LEGENDARY');
formData.append('collectionId', collection.data._id);
formData.append('isEquippable', 'true');
formData.append('isTradeable', 'true');
formData.append('maxSupply', '100');
formData.append('file', swordImageFile);

const nft = await nftApi.create(formData);

// Step 3: Add attributes/stats
await nftAttributeApi.add({ nftId: nft.data._id, traitType: 'Damage',  value: '150', numericValue: 150, maxValue: 500 });
await nftAttributeApi.add({ nftId: nft.data._id, traitType: 'Element', value: 'Fire' });
await nftAttributeApi.add({ nftId: nft.data._id, traitType: 'Speed',   value: '85',  numericValue: 85,  maxValue: 100 });

// Step 4: Mint on blockchain (optional)
const mintedItem = await nftMintApi.mint({
  nftId: nft.data._id,
  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD5e',
});

// Step 5: Airdrop to a player
await nftMintApi.airdrop({
  nftId: nft.data._id,
  toUserId: '<player_user_id>',
  walletAddress: '0xPlayerWallet...',
});
```

### Admin Workflow: Create Avatar NFT

```typescript
// Step 1: Create avatar collection
const avatarCollection = await nftCollectionApi.create({
  name: 'Season 1 Avatars',
  category: 'AVATARS',
  maxSupply: 10000,
});

// Step 2: Create avatar NFT
const formData = new FormData();
formData.append('name', 'Shadow Warrior');
formData.append('description', 'A mysterious warrior from the shadow realm');
formData.append('category', 'AVATAR');
formData.append('rarity', 'EPIC');
formData.append('collectionId', avatarCollection.data._id);
formData.append('isEquippable', 'true');
formData.append('isTradeable', 'true');
formData.append('file', avatarImageFile);

const avatar = await nftApi.create(formData);

// Step 3: Add traits
await nftAttributeApi.add({ nftId: avatar.data._id, traitType: 'Background', value: 'Galaxy' });
await nftAttributeApi.add({ nftId: avatar.data._id, traitType: 'Eyes',       value: 'Glowing Red' });
await nftAttributeApi.add({ nftId: avatar.data._id, traitType: 'Outfit',     value: 'Shadow Cloak' });
await nftAttributeApi.add({ nftId: avatar.data._id, traitType: 'Aura',       value: 'Dark Mist' });
```

### User Workflow: Equip Items for a Game

```typescript
// Step 1: Get my items
const myItems = await nftItemApi.getMyItems();

// Step 2: Add items to inventory
for (const item of myItems.data) {
  await inventoryApi.addItem(item._id);
}

// Step 3: Equip a weapon and avatar
const weaponItem = myItems.data.find(i => (i.nftId as Nft).category === 'WEAPON');
const avatarItem = myItems.data.find(i => (i.nftId as Nft).category === 'AVATAR');

if (weaponItem) {
  await inventoryApi.equip({ nftItemId: weaponItem._id, slot: 'weapon' });
}
if (avatarItem) {
  await inventoryApi.equip({ nftItemId: avatarItem._id, slot: 'avatar' });
}

// Step 4: View equipped items
const equipped = await inventoryApi.getEquipped();
console.log('Equipped:', equipped.data);
```

### User Workflow: Transfer NFT to Friend

```typescript
// Step 1: Unequip first if equipped
await inventoryApi.unequip('<nft_item_id>');

// Step 2: Remove from inventory
await inventoryApi.removeItem('<nft_item_id>');

// Step 3: Transfer
await nftItemApi.transfer({
  nftItemId: '<nft_item_id>',
  toUserId: '<friend_user_id>',
  toWalletAddress: '0xFriendWallet...',
});
```

---

## Rarity Color Map (for UI)

```typescript
export const RARITY_COLORS: Record<string, string> = {
  COMMON:    '#9E9E9E',
  UNCOMMON:  '#4CAF50',
  RARE:      '#2196F3',
  EPIC:      '#9C27B0',
  LEGENDARY: '#FF9800',
  MYTHIC:    '#F44336',
};

export const RARITY_GRADIENTS: Record<string, string> = {
  COMMON:    'linear-gradient(135deg, #9E9E9E, #BDBDBD)',
  UNCOMMON:  'linear-gradient(135deg, #4CAF50, #81C784)',
  RARE:      'linear-gradient(135deg, #2196F3, #64B5F6)',
  EPIC:      'linear-gradient(135deg, #9C27B0, #CE93D8)',
  LEGENDARY: 'linear-gradient(135deg, #FF9800, #FFB74D)',
  MYTHIC:    'linear-gradient(135deg, #F44336, #EF5350)',
};
```

## Image URL

All NFT images are served as static files. Construct full URL:

```typescript
const getImageUrl = (imageUrl: string) => {
  if (!imageUrl) return '/placeholder.png';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${API_BASE}${imageUrl}`;  // e.g., http://localhost:3000/uploads/nft-sword.png
};
```

---

## Swagger Documentation

All endpoints are fully documented in Swagger. Access it at:

```
http://localhost:3000/api
```

Look for the `nft` and `inventory` tags.
