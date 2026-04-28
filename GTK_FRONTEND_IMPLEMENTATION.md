# GTK (GameToken) — frontend implementation

This guide wires your UI to the backend so a logged-in user can see **how much GTK** they hold. Auth stays **JWT**; the chain address is stored on the server after the user links a wallet.

## Prerequisites

1. Backend running with:
   - `GAME_TOKEN_CONTRACT_ADDRESS` = deployed `GameToken` address  
   - `RPC_URL` **or** `ALCHEMY_API_KEY` + `ALCHEMY_NETWORK` (same chain as the contract)
2. For **local Anvil**: keep `anvil` running, use `RPC_URL=http://127.0.0.1:8545`, chain id **31337** (from `GET .../config`).

## API base

All routes below are under your API origin, e.g. `http://localhost:3000`, with global prefix **`/api`**.

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/currency/game-token/config` | None |
| `PATCH` | `/api/inventory/wallet/:walletAddress` | Bearer JWT |
| `GET` | `/api/currency/game-token/me` | Bearer JWT |

Headers for protected routes:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Step 1 — Load token metadata (labels + network)

Call once when opening the wallet / currency screen (or on app bootstrap).

**`GET /api/currency/game-token/config`**

Example response:

```json
{
  "contractAddress": "0x5FbDb2315678afecb367f032d93F642f64180aa3",
  "name": "GameToken",
  "symbol": "GTK",
  "decimals": 18,
  "chainId": 31337,
  "displayName": "Vex currency",
  "displaySymbol": "VEX"
}
```

- **`name` / `symbol`** = on-chain ERC-20 (truth for explorers / MetaMask token list).
- **`displayName` / `displaySymbol`** = optional branding from env (`GAME_TOKEN_DISPLAY_NAME`, `GAME_TOKEN_DISPLAY_SYMBOL`); if unset, they match `name` / `symbol`.

Use **`displaySymbol`** (or `displayName` for titles) in the navbar; use **`decimals`** for formatting. Use **`chainId`** to configure MetaMask (or your wallet connector): add or switch to a network whose chain id matches (e.g. Anvil: `http://127.0.0.1:8545`, chain id `31337`).

If this returns **503**, the server is missing GTK env vars — fix `.env` before building UI states that depend on balance.

---

## Step 2 — Ensure the user’s wallet matches that chain

1. Request `ethereum` from the browser (`window.ethereum` / MetaMask).
2. Call `wallet_switchEthereumChain` or `wallet_addEthereumChain` with `chainId: '0x' + config.chainId.toString(16)` (e.g. `0x7a69` for 31337).
3. For **Anvil**, add a custom network:
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH` (native gas on local chain)

---

## Step 3 — Link wallet address to the logged-in account

After the user is logged in (you already have a JWT) and MetaMask exposes an address:

**`PATCH /api/inventory/wallet/<address>`**

Replace `<address>` with the checksummed `0x` from `eth_accounts` / `eth_requestAccounts` (no body required).

Example (fetch):

```javascript
const API = 'http://localhost:3000/api';
const token = localStorage.getItem('access_token'); // however you store JWT
const address = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];

const res = await fetch(`${API}/inventory/wallet/${address}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) throw new Error(await res.text());
```

The backend validates the address and stores it on the user’s **inventory** document.

---

## Step 4 — Show balance (“what he got”)

**`GET /api/currency/game-token/me`**

Example when wallet is **not** linked yet:

```json
{
  "linked": false,
  "walletAddress": null,
  "balanceRaw": null,
  "balanceFormatted": null,
  "symbol": null,
  "decimals": null,
  "displayName": "Vex currency",
  "displaySymbol": "VEX",
  "hint": "Link a wallet with PATCH /api/inventory/wallet/{yourChecksummedAddress}"
}
```

Show a **“Link wallet”** CTA → run Step 3, then refetch `/me`.

Example when linked:

```json
{
  "linked": true,
  "walletAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "balanceRaw": "1000000000000000000000000",
  "balanceFormatted": "1000000.0",
  "symbol": "GTK",
  "decimals": 18,
  "chainId": 31337,
  "displayName": "Vex currency",
  "displaySymbol": "VEX"
}
```

Display **`balanceFormatted`** + **`displaySymbol`** for the badge (e.g. `1000000.0 VEX`). On-chain **`symbol`** stays `GTK` for explorers; use **`displayName`** for tooltips or headings.

Example (fetch):

```javascript
const res = await fetch(`${API}/currency/game-token/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();

if (!data.linked) {
  // show "Connect & link wallet" → PATCH inventory wallet, then retry
} else {
  // show `${data.balanceFormatted} ${data.symbol}`
}
```

---

## Suggested UI flow

1. User opens “Currency” / “Wallet” screen.
2. `GET .../config` → if 503, show maintenance / misconfiguration message.
3. Prompt wallet connection + correct **`chainId`**.
4. If user has JWT → `PATCH .../inventory/wallet/{address}`.
5. `GET .../me` → render balance or errors.

Refresh balance after transfers (user action or polling every N seconds if you need live-ish updates).

---

## Anvil / local testing tips

- Default deployer **`0xf39F…`** holds the initial GTK mint; import that test key in MetaMask only on **local** dev, never for mainnet.
- To show GTK for **another** address, **transfer** GTK to that address on Anvil, then link that address in Step 3.
- Contract address may change if you redeploy; update `GAME_TOKEN_CONTRACT_ADDRESS` and use the new address from `game-token/broadcast/.../run-latest.json`.

---

## Optional: read balance only in the browser

You can also call `balanceOf` with **ethers.js** / **viem** using `contractAddress` from `config` and the connected wallet, without hitting `/me`. The backend route is still useful for a **single source of truth**, server-driven UI, and when the client should not bundle RPC keys.

---

## Security reminders

- Never send seed phrases or private keys to your API.
- Only **`PATCH`** the **public** `0x` address.
- `GET .../config` is public by design (contract addresses are already public on-chain).
