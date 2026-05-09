/**
 * After `forge script ... Deploy` on Anvil (31337), upsert GAME_TOKEN_CONTRACT_ADDRESS (+ RPC_URL) in .env.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const chainId = process.env.GTK_ANVIL_CHAIN_ID || '31337';
const broadcastRel =
  process.env.GTK_BROADCAST_JSON ||
  path.join('game-token', 'broadcast', 'Deploy.s.sol', chainId, 'run-latest.json');
const broadcastPath = path.isAbsolute(broadcastRel) ? broadcastRel : path.join(root, broadcastRel);
const envPath = path.join(root, '.env');

function extractGameTokenAddress(json) {
  const txs = json.transactions || [];
  for (const t of txs) {
    if (t.contractName === 'GameToken' && t.contractAddress) {
      return t.contractAddress;
    }
  }
  for (let i = txs.length - 1; i >= 0; i--) {
    if (txs[i].contractAddress) return txs[i].contractAddress;
  }
  throw new Error('No contractAddress found in broadcast JSON');
}

function upsertLine(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*`, 'm');
  if (re.test(content)) {
    return content.replace(re, line);
  }
  const trimmed = content.replace(/\s+$/, '');
  const sep = trimmed.length ? '\n' : '';
  return `${trimmed}${sep}${line}\n`;
}

function main() {
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${envPath} — copy .env.example to .env first.`);
    process.exit(1);
  }
  if (!fs.existsSync(broadcastPath)) {
    console.error(`Missing ${broadcastPath} — run deploy on Anvil first (npm run gtk:bootstrap).`);
    process.exit(1);
  }

  const json = JSON.parse(fs.readFileSync(broadcastPath, 'utf8'));
  const addr = extractGameTokenAddress(json);
  let env = fs.readFileSync(envPath, 'utf8');
  env = upsertLine(env, 'GAME_TOKEN_CONTRACT_ADDRESS', addr);
  env = upsertLine(env, 'RPC_URL', 'http://127.0.0.1:8545');
  fs.writeFileSync(envPath, env, 'utf8');
  console.log(`Updated .env: GAME_TOKEN_CONTRACT_ADDRESS=${addr}`);
  console.log('Updated .env: RPC_URL=http://127.0.0.1:8545');
}

main();
