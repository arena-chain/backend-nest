/**
 * One-time script: drop the old unique index "leagueId_1" from leaguerules.
 * LeagueRule no longer has leagueId (rules are reusable per game), so this index
 * causes E11000 duplicate key when creating multiple rules.
 *
 * Run from project root: node scripts/drop-leaguerule-league-id-index.js
 * Set MONGO_URI in env or use default mongodb://localhost/arenachain
 */

try { require('dotenv').config(); } catch (_) {}

const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb://localhost/arenachain';

async function run() {
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('leaguerules');
  const indexes = await col.indexes();
  const hasLeagueId = indexes.some((i) => i.name === 'leagueId_1' || (i.key && i.key.leagueId));
  if (hasLeagueId) {
    await col.dropIndex('leagueId_1');
    console.log('Dropped index leagueId_1 on leaguerules.');
  } else {
    console.log('No leagueId index found on leaguerules — nothing to drop.');
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
