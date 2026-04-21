import mongoose, { Schema, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arenachain';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'arenachain';

/** Log line only — never print password. */
function mongoUriForLog(uri: string): string {
  return uri.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@');
}
const FRESH = process.argv.includes('--fresh');

// ─── Model factory (avoids "already registered" errors) ──────────────────────
const m = (name: string, schema: Schema) =>
  (mongoose.models[name] as any) || mongoose.model(name, schema);

// ─── Schema definitions ───────────────────────────────────────────────────────
const UserModel = m('User', new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  nickname: { type: String, required: true },
  role: { type: String, default: 'player' },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: true },
  region: { type: String, default: 'EUROPE' },
  country: String,
  avatar: String,
}, { timestamps: true }));

const AdminProfileModel = m('AdminProfile', new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  adminLevel: { type: Number, default: 1 },
  permissions: { type: [String], default: [] },
}, { timestamps: true }));

const PlayerProfileModel = m('PlayerProfile', new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  isPro: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  elo: { type: Number, default: 1000 },
  rank: { type: String, default: 'Unranked' },
  stats: { type: Object, default: {} },
  riotLinkStatus: { type: String, default: 'unlinked' },
}, { timestamps: true }));

const TeamManagerProfileModel = m('TeamManagerProfile', new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  team: Schema.Types.ObjectId,
  organizationName: String,
  firstName: String,
  lastName: String,
  status: { type: String, default: 'approved' },
  isVerified: { type: Boolean, default: true },
}, { timestamps: true }));

const TeamModel = m('Team', new Schema({
  name: { type: String, required: true, unique: true },
  organizationName: String,
  logo: String,
  description: String,
  captain: Schema.Types.ObjectId,
  members: [Schema.Types.ObjectId],
  teamManager: Schema.Types.ObjectId,
  type: { type: String, default: 'pro' },
  isVerified: { type: Boolean, default: true },
  elo: { type: Number, default: 1000 },
}, { timestamps: true }));

const CatalogModel = m('Catalog', new Schema({
  title: { type: String, required: true },
  description: String,
  genre: { type: String, required: true },
  publisher: String,
  platforms: [String],
  isActive: { type: Boolean, default: true },
  teamSize: { type: Number, default: 5 },
  supportsTeams: { type: Boolean, default: true },
  supportsSolo: { type: Boolean, default: false },
  coverImageUrl: String,
  metadata: { type: Object, default: {} },
}, { timestamps: true }));

const LeagueModel = m('League', new Schema({
  name: { type: String, required: true },
  level: String,
  regionId: String,
  gameId: String,
  description: String,
  logoUrl: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true }));

const SeasonModel = m('Season', new Schema({
  leagueId: { type: String, required: true },
  rulesId: String,
  name: { type: String, required: true },
  startDate: Date,
  endDate: Date,
  registrationDeadline: Date,
  status: { type: String, default: 'ONGOING' },
  description: String,
}, { timestamps: true }));

const SeasonRuleModel = m('SeasonRule', new Schema({
  seasonId: { type: String, required: true },
  name: String,
  gameId: Schema.Types.ObjectId,
  formatType: { type: String, default: 'LEAGUE' },
  matchType: { type: String, default: 'BO3' },
  pointsWin: { type: Number, default: 3 },
  pointsLoss: { type: Number, default: 0 },
  maxTeams: { type: Number, default: 16 },
  tiebreaker: { type: String, default: 'GAME_DIFF' },
  mapPool: [String],
  mapVetoEnabled: { type: Boolean, default: true },
  ruleUsage: [String],
  overtimeConfig: Object,
}, { timestamps: true }));

const SeasonTeamModel = m('SeasonTeam', new Schema({
  seasonId: String,
  teamId: String,
  seed: Number,
  status: { type: String, default: 'ACTIVE' },
}, { timestamps: true }));

const RoundModel = m('Round', new Schema({
  seasonId: String,
  roundNumber: Number,
  startDate: Date,
  endDate: Date,
  status: { type: String, default: 'SCHEDULED' },
}, { timestamps: true }));

const MatchModel = m('Match', new Schema({
  roundId: String,
  seasonId: String,
  team1Id: String,
  team2Id: String,
  format: { type: String, default: 'BO3' },
  scheduledStart: Date,
  scheduledEnd: Date,
  matchOrder: Number,
  status: { type: String, default: 'SCHEDULED' },
  games: [{
    gameNumber: Number,
    winnerId: String,
    mapName: String,
    team1Score: Number,
    team2Score: Number,
    durationMinutes: Number,
    _id: false,
  }],
  team1GamesWon: { type: Number, default: 0 },
  team2GamesWon: { type: Number, default: 0 },
  winnerId: String,
  loserId: String,
  notes: String,
}, { timestamps: true }));

const StandingsModel = m('Standings', new Schema({
  seasonId: String,
  teamId: String,
  played: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  gameDiff: { type: Number, default: 0 },
  scoreFor: { type: Number, default: 0 },
  scoreAgainst: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
}, { timestamps: true }));

const BracketModel = m('Bracket', new Schema({
  seasonId: String,
  format: { type: String, default: 'SINGLE_ELIMINATION' },
  totalRounds: Number,
  slots: [{
    slotId: String,
    roundNumber: Number,
    position: Number,
    team1Id: String,
    team2Id: String,
    winnerId: String,
    matchId: String,
    nextSlotId: String,
    status: { type: String, default: 'PENDING' },
    _id: false,
  }],
  status: { type: String, default: 'ACTIVE' },
  championId: String,
}, { timestamps: true }));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const MAPS = ['Ascent', 'Bind', 'Fracture', 'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset'];
const rMap = () => MAPS[Math.floor(Math.random() * MAPS.length)];

function buildBO3Result(t1: string, t2: string, win1: boolean, sweep: boolean) {
  const winner = win1 ? t1 : t2;
  const loser = win1 ? t2 : t1;
  const games: any[] = [];
  if (sweep) {
    games.push({ gameNumber: 1, winnerId: winner, mapName: rMap(), team1Score: win1 ? 13 : 5,  team2Score: win1 ? 5 : 13,  durationMinutes: 35 });
    games.push({ gameNumber: 2, winnerId: winner, mapName: rMap(), team1Score: win1 ? 13 : 7,  team2Score: win1 ? 7 : 13,  durationMinutes: 38 });
    return { games, team1GamesWon: win1 ? 2 : 0, team2GamesWon: win1 ? 0 : 2, winnerId: winner, loserId: loser };
  }
  games.push({ gameNumber: 1, winnerId: winner, mapName: rMap(), team1Score: win1 ? 13 : 9,  team2Score: win1 ? 9 : 13,  durationMinutes: 42 });
  games.push({ gameNumber: 2, winnerId: loser,  mapName: rMap(), team1Score: win1 ? 7  : 13, team2Score: win1 ? 13 : 7,  durationMinutes: 40 });
  games.push({ gameNumber: 3, winnerId: winner, mapName: rMap(), team1Score: win1 ? 13 : 11, team2Score: win1 ? 11 : 13, durationMinutes: 45 });
  return { games, team1GamesWon: win1 ? 2 : 1, team2GamesWon: win1 ? 1 : 2, winnerId: winner, loserId: loser };
}

// ─── Static seed definitions ──────────────────────────────────────────────────
const PLAYER_DEFS = [
  { nick: 'ShadowStrike', country: 'TN', elo: 2800, rank: 'Radiant',     isPro: true  },
  { nick: 'NightHawk',    country: 'FR', elo: 2450, rank: 'Immortal 3',  isPro: true  },
  { nick: 'FrostByte',    country: 'DE', elo: 2200, rank: 'Immortal 1',  isPro: false },
  { nick: 'CyberPulse',   country: 'ES', elo: 2050, rank: 'Diamond 3',   isPro: false },
  { nick: 'ArcFlash',     country: 'IT', elo: 1950, rank: 'Diamond 2',   isPro: false },
  { nick: 'VoidWalker',   country: 'PL', elo: 1800, rank: 'Diamond 1',   isPro: false },
  { nick: 'IronClad',     country: 'PT', elo: 1650, rank: 'Platinum 3',  isPro: false },
  { nick: 'StormBolt',    country: 'NL', elo: 1580, rank: 'Platinum 2',  isPro: false },
  { nick: 'NeonBlade',    country: 'BE', elo: 1520, rank: 'Platinum 1',  isPro: false },
  { nick: 'DarkMatter',   country: 'SE', elo: 1450, rank: 'Gold 3',      isPro: false },
  { nick: 'QuickSilver',  country: 'NO', elo: 1380, rank: 'Gold 2',      isPro: false },
  { nick: 'ThunderForce', country: 'DK', elo: 1300, rank: 'Gold 1',      isPro: false },
  { nick: 'LunarEdge',    country: 'FI', elo: 1250, rank: 'Silver 3',    isPro: false },
  { nick: 'CrimsonFang',  country: 'CZ', elo: 1180, rank: 'Silver 2',    isPro: false },
  { nick: 'SteelNova',    country: 'SK', elo: 1120, rank: 'Silver 1',    isPro: false },
  { nick: 'PhantomRush',  country: 'HU', elo: 1050, rank: 'Bronze 3',    isPro: false },
  { nick: 'BlazeCrest',   country: 'RO', elo: 990,  rank: 'Bronze 2',    isPro: false },
  { nick: 'QuantumFist',  country: 'BG', elo: 930,  rank: 'Bronze 1',    isPro: false },
  { nick: 'MidnightAce',  country: 'HR', elo: 880,  rank: 'Iron 3',      isPro: false },
  { nick: 'SolarFlare',   country: 'SI', elo: 820,  rank: 'Iron 2',      isPro: false },
];

const TEAM_DEFS = [
  { name: 'Team Phantom',     org: 'Phantom Esports',      mgr: { nick: 'PhantomGM', country: 'TN', first: 'Karim',  last: 'Ben Ali'  }, pIdx: [0,  1,  2 ] },
  { name: 'Nexus Force',      org: 'Nexus Gaming',         mgr: { nick: 'NexusGM',   country: 'FR', first: 'Jean',   last: 'Dupont'   }, pIdx: [3,  4,  5 ] },
  { name: 'Eclipse Guild',    org: 'Eclipse Organization', mgr: { nick: 'EclipseGM', country: 'PL', first: 'Adam',   last: 'Kowalski' }, pIdx: [6,  7,  8 ] },
  { name: 'Vortex United',    org: 'Vortex Sports',        mgr: { nick: 'VortexGM',  country: 'DE', first: 'Klaus',  last: 'Müller'   }, pIdx: [9,  10, 11] },
  { name: 'Blaze Collective', org: 'Blaze Esports',        mgr: { nick: 'BlazeGM',   country: 'ES', first: 'Carlos', last: 'García'   }, pIdx: [12, 13, 14] },
  { name: 'Cipher Protocol',  org: 'Cipher Gaming',        mgr: { nick: 'CipherGM',  country: 'IT', first: 'Marco',  last: 'Rossi'    }, pIdx: [15, 16, 17] },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🔌 Connecting to:', mongoUriForLog(MONGO_URI), `(database: ${MONGO_DB_NAME})`);
  await mongoose.connect(MONGO_URI, { dbName: MONGO_DB_NAME });
  console.log('✅ Connected\n');

  if (FRESH) {
    console.log('🗑  --fresh: wiping collections...');
    for (const mdl of [AdminProfileModel, UserModel, PlayerProfileModel, TeamManagerProfileModel, TeamModel,
      CatalogModel, LeagueModel, SeasonModel, SeasonRuleModel, SeasonTeamModel,
      RoundModel, MatchModel, StandingsModel, BracketModel]) {
      await (mdl as any).deleteMany({});
    }
    console.log('   Done.\n');
  }

  const pwHash = await bcrypt.hash('Arena123!', 10);

  // ── 0. Default admin (idempotent — safe to re-run) ───────────────────────
  console.log('👤 Ensuring default admin account...');
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@arena.test').toLowerCase();
  const adminPwPlain = process.env.SEED_ADMIN_PASSWORD || 'Arena123!';
  const adminPwHash = process.env.SEED_ADMIN_PASSWORD
    ? await bcrypt.hash(adminPwPlain, 10)
    : pwHash;

  let adminUser = await UserModel.findOne({ email: adminEmail });
  if (!adminUser) {
    adminUser = await UserModel.create({
      email: adminEmail,
      passwordHash: adminPwHash,
      nickname: 'ArenaAdmin',
      role: 'admin',
      country: 'TN',
      region: 'EUROPE',
      isEmailVerified: true,
    });
    await AdminProfileModel.create({ userId: adminUser._id, adminLevel: 1, permissions: [] });
    console.log(`   ✅ Created admin: ${adminEmail}`);
  } else {
    if ((adminUser.role as string) !== 'admin') {
      adminUser.role = 'admin';
      await adminUser.save();
    }
    if (process.env.SEED_ADMIN_PASSWORD) {
      adminUser.passwordHash = adminPwHash;
      await adminUser.save();
    }
    const prof = await AdminProfileModel.findOne({ userId: adminUser._id });
    if (!prof) {
      await AdminProfileModel.create({ userId: adminUser._id, adminLevel: 1, permissions: [] });
    }
    console.log(`   ✅ Admin present: ${adminEmail} (profile ensured)`);
  }
  console.log('');

  // ── 1. Catalog ───────────────────────────────────────────────────────────
  console.log('📦 [1/9] Seeding catalog (VALORANT)...');
  const catalog = await CatalogModel.create({
    title: 'VALORANT', genre: 'FPS', publisher: 'Riot Games',
    description: 'Tactical hero shooter by Riot Games',
    platforms: ['PC'], teamSize: 5, supportsTeams: true, supportsSolo: false,
    coverImageUrl: 'https://i.imgur.com/valorant-cover.jpg',
    metadata: { maxRounds: 25, attackDefense: true },
  });
  console.log(`   ✅ ${catalog.title} (id: ${catalog._id})\n`);

  // ── 2. Players (20) ──────────────────────────────────────────────────────
  console.log('👥 [2/9] Seeding 20 players...');
  const playerUsers: any[] = [];
  for (const p of PLAYER_DEFS) {
    const u = await UserModel.create({
      email: `${p.nick.toLowerCase()}@arena.test`,
      passwordHash: pwHash,
      nickname: p.nick, role: 'player',
      country: p.country, region: 'EUROPE', isEmailVerified: true,
    });
    await PlayerProfileModel.create({ userId: u._id, isPro: p.isPro });
    playerUsers.push(u);
  }
  console.log(`   ✅ 20 players created (last 2 are free agents)\n`);

  // ── 3. Teams (6) ─────────────────────────────────────────────────────────
  console.log('🏆 [3/9] Seeding 6 teams...');
  const teams: any[] = [];
  for (const td of TEAM_DEFS) {
    const mgrUser = await UserModel.create({
      email: `${td.mgr.nick.toLowerCase()}@arena.test`,
      passwordHash: pwHash,
      nickname: td.mgr.nick, role: 'team_manager',
      country: td.mgr.country, region: 'EUROPE', isEmailVerified: true,
    });
    const memberIds = td.pIdx.map(i => playerUsers[i]._id);
    const team = await TeamModel.create({
      name: td.name, organizationName: td.org, type: 'pro', isVerified: true,
      description: `${td.org} — official ArenaChain squad`,
      captain: memberIds[0], members: memberIds,
      elo: 900 + Math.floor(Math.random() * 400),
    });
    const mgrProfile = await TeamManagerProfileModel.create({
      userId: mgrUser._id, team: team._id,
      organizationName: td.org, firstName: td.mgr.first, lastName: td.mgr.last,
      status: 'approved', isVerified: true,
    });
    await TeamModel.findByIdAndUpdate(team._id, { teamManager: mgrProfile._id });
    teams.push(team);
    console.log(`   ✅ ${td.name} (${memberIds.length} players)`);
  }
  console.log();

  // ── 4. League ────────────────────────────────────────────────────────────
  console.log('🏅 [4/9] Seeding league...');
  const league = await LeagueModel.create({
    name: 'ArenaChain Valorant League',
    level: 'NATIONAL', regionId: 'EUROPE', gameId: catalog._id.toString(),
    description: 'The premier VALORANT competition in the ArenaChain ecosystem',
    logoUrl: 'https://i.imgur.com/league-logo.png', isActive: true,
  });
  console.log(`   ✅ ${league.name}\n`);

  // ── 5. Season ────────────────────────────────────────────────────────────
  console.log('📅 [5/9] Seeding season...');
  const season = await SeasonModel.create({
    leagueId: league._id.toString(),
    name: 'Season 1 — Spring 2025',
    startDate: daysAgo(60), endDate: daysFromNow(30),
    registrationDeadline: daysAgo(65),
    status: 'ONGOING',
    description: 'First official season of the ArenaChain Valorant League',
  });
  const rule = await SeasonRuleModel.create({
    seasonId: season._id.toString(),
    name: 'Standard BO3 Round-Robin', gameId: catalog._id,
    formatType: 'LEAGUE', matchType: 'BO3',
    pointsWin: 3, pointsLoss: 0, maxTeams: 6, tiebreaker: 'GAME_DIFF',
    mapPool: MAPS, mapVetoEnabled: true,
    ruleUsage: ['REGULAR_SEASON'],
    overtimeConfig: { format: 'VALORANT_OT', enabled: true, maxOvertimePeriods: 0 },
  });
  await SeasonModel.findByIdAndUpdate(season._id, { rulesId: rule._id.toString() });
  console.log(`   ✅ ${season.name} | rule: ${rule.name}\n`);

  // ── 6. Season Teams ──────────────────────────────────────────────────────
  console.log('📋 [6/9] Registering 6 teams to season...');
  for (let i = 0; i < teams.length; i++) {
    await SeasonTeamModel.create({
      seasonId: season._id.toString(),
      teamId: teams[i]._id.toString(),
      seed: i + 1, status: 'ACTIVE',
    });
  }
  console.log(`   ✅ 6 teams registered\n`);

  // ── 7. Rounds (5) ────────────────────────────────────────────────────────
  console.log('🔄 [7/9] Seeding 5 rounds...');
  const roundDefs = [
    { num: 1, start: daysAgo(49), end: daysAgo(43), status: 'COMPLETED' },
    { num: 2, start: daysAgo(42), end: daysAgo(36), status: 'COMPLETED' },
    { num: 3, start: daysAgo(35), end: daysAgo(29), status: 'COMPLETED' },
    { num: 4, start: daysAgo(14), end: daysFromNow(1), status: 'ONGOING'   },
    { num: 5, start: daysFromNow(7),  end: daysFromNow(14), status: 'SCHEDULED' },
  ];
  const rounds: any[] = [];
  for (const r of roundDefs) {
    rounds.push(await RoundModel.create({
      seasonId: season._id.toString(),
      roundNumber: r.num, startDate: r.start, endDate: r.end, status: r.status,
    }));
  }
  console.log('   ✅ 5 rounds created\n');

  // ── 8. Matches (15 regular season) ───────────────────────────────────────
  console.log('⚔️  [8/9] Seeding matches...');
  // Team ID shortcuts
  const [t1, t2, t3, t4, t5, t6] = teams.map(t => t._id.toString());
  const sId = season._id.toString();

  // Round-robin schedule (circle algorithm) with pre-defined results for rounds 1–3.
  // Results: win1=true means first team in pair wins; sweep=true means 2-0.
  // Standings after 3 rounds:  T2(9pts +5gd) | T4(9pts +4gd) | T1(6pts) | T5(3pts) | T3(0pts) | T6(0pts)
  const schedule: Array<{
    roundIdx: number;
    pairs: [string, string][];
    results: Array<{ win1: boolean; sweep: boolean }> | null;
  }> = [
    {
      roundIdx: 0,
      pairs: [[t1, t6], [t2, t5], [t3, t4]],
      results: [
        { win1: true,  sweep: true  },   // T1 beats T6 2-0
        { win1: true,  sweep: false },   // T2 beats T5 2-1
        { win1: false, sweep: false },   // T4 beats T3 2-1
      ],
    },
    {
      roundIdx: 1,
      pairs: [[t1, t5], [t6, t4], [t2, t3]],
      results: [
        { win1: true,  sweep: false },   // T1 beats T5 2-1
        { win1: false, sweep: true  },   // T4 beats T6 2-0
        { win1: true,  sweep: true  },   // T2 beats T3 2-0
      ],
    },
    {
      roundIdx: 2,
      pairs: [[t1, t4], [t5, t3], [t6, t2]],
      results: [
        { win1: false, sweep: false },   // T4 beats T1 2-1
        { win1: true,  sweep: false },   // T5 beats T3 2-1
        { win1: false, sweep: true  },   // T2 beats T6 2-0
      ],
    },
    { roundIdx: 3, pairs: [[t1, t3], [t4, t2], [t5, t6]], results: null },
    { roundIdx: 4, pairs: [[t1, t2], [t3, t6], [t4, t5]], results: null },
  ];

  for (const s of schedule) {
    const round = rounds[s.roundIdx];
    for (let i = 0; i < s.pairs.length; i++) {
      const [team1Id, team2Id] = s.pairs[i];
      const startTime = new Date(round.startDate.getTime() + i * 2 * 3600 * 1000);
      const endTime   = new Date(startTime.getTime() + 3 * 3600 * 1000);
      if (s.results) {
        const r = s.results[i];
        const res = buildBO3Result(team1Id, team2Id, r.win1, r.sweep);
        await MatchModel.create({
          roundId: round._id.toString(), seasonId: sId,
          team1Id, team2Id, format: 'BO3',
          scheduledStart: startTime, scheduledEnd: endTime,
          matchOrder: i + 1, status: 'COMPLETED',
          ...res,
        });
      } else {
        await MatchModel.create({
          roundId: round._id.toString(), seasonId: sId,
          team1Id, team2Id, format: 'BO3',
          scheduledStart: startTime, scheduledEnd: endTime,
          matchOrder: i + 1, status: 'SCHEDULED',
        });
      }
    }
  }
  console.log('   ✅ 15 matches (9 COMPLETED | 3 ONGOING round | 3 SCHEDULED)\n');

  // ── 9. Standings + Playoff Bracket ──────────────────────────────────────
  console.log('📊 [9/9] Seeding standings & playoff bracket...');

  // Pre-computed from match results above
  const standingsRows = [
    { teamId: t2, rank: 1, played: 3, wins: 3, losses: 0, points: 9, gamesWon: 6, gamesLost: 1, gameDiff:  5, scoreFor: 6, scoreAgainst: 1 },
    { teamId: t4, rank: 2, played: 3, wins: 3, losses: 0, points: 9, gamesWon: 6, gamesLost: 2, gameDiff:  4, scoreFor: 6, scoreAgainst: 2 },
    { teamId: t1, rank: 3, played: 3, wins: 2, losses: 1, points: 6, gamesWon: 5, gamesLost: 3, gameDiff:  2, scoreFor: 5, scoreAgainst: 3 },
    { teamId: t5, rank: 4, played: 3, wins: 1, losses: 2, points: 3, gamesWon: 4, gamesLost: 5, gameDiff: -1, scoreFor: 4, scoreAgainst: 5 },
    { teamId: t3, rank: 5, played: 3, wins: 0, losses: 3, points: 0, gamesWon: 2, gamesLost: 6, gameDiff: -4, scoreFor: 2, scoreAgainst: 6 },
    { teamId: t6, rank: 6, played: 3, wins: 0, losses: 3, points: 0, gamesWon: 0, gamesLost: 6, gameDiff: -6, scoreFor: 0, scoreAgainst: 6 },
  ];
  for (const row of standingsRows) {
    await StandingsModel.create({ seasonId: sId, ...row });
  }
  console.log('   ✅ Standings seeded');

  // Playoff bracket — top 4 qualify: T2(1), T4(2), T1(3), T5(4)
  const sfFakeRoundId = new Types.ObjectId().toString();
  const sf1 = await MatchModel.create({
    roundId: sfFakeRoundId, seasonId: sId,
    team1Id: t2, team2Id: t5, format: 'BO3',
    scheduledStart: daysAgo(7), scheduledEnd: daysAgo(7),
    matchOrder: 1, status: 'COMPLETED',
    ...buildBO3Result(t2, t5, true, true),
  });
  const sf2 = await MatchModel.create({
    roundId: sfFakeRoundId, seasonId: sId,
    team1Id: t4, team2Id: t1, format: 'BO3',
    scheduledStart: daysAgo(7), scheduledEnd: daysAgo(7),
    matchOrder: 2, status: 'COMPLETED',
    ...buildBO3Result(t4, t1, true, false),
  });
  const grandFinal = await MatchModel.create({
    roundId: new Types.ObjectId().toString(), seasonId: sId,
    team1Id: t2, team2Id: t4, format: 'BO5',
    scheduledStart: daysFromNow(7), scheduledEnd: daysFromNow(7),
    matchOrder: 1, status: 'SCHEDULED',
  });

  await BracketModel.create({
    seasonId: sId,
    format: 'SINGLE_ELIMINATION',
    totalRounds: 2,
    status: 'ACTIVE',
    slots: [
      { slotId: 'sf-1', roundNumber: 1, position: 1, team1Id: t2, team2Id: t5, winnerId: t2, matchId: sf1._id.toString(),        nextSlotId: 'gf-1', status: 'COMPLETED' },
      { slotId: 'sf-2', roundNumber: 1, position: 2, team1Id: t4, team2Id: t1, winnerId: t4, matchId: sf2._id.toString(),        nextSlotId: 'gf-1', status: 'COMPLETED' },
      { slotId: 'gf-1', roundNumber: 2, position: 1, team1Id: t2, team2Id: t4,               matchId: grandFinal._id.toString(), status: 'READY' },
    ],
  });
  console.log('   ✅ Playoff bracket ACTIVE — Grand Final: Nexus Force vs Vortex United\n');

  // ── Summary ───────────────────────────────────────────────────────────────
  const border = '─'.repeat(60);
  console.log(border);
  console.log('✅  SEED COMPLETE');
  console.log(border);
  console.log(`  Game:    VALORANT  (id: ${catalog._id})`);
  console.log(`  League:  ${league.name}  (id: ${league._id})`);
  console.log(`  Season:  ${season.name}  (id: ${season._id})`);
  console.log(`  Teams:   ${teams.map(t => t.name).join(' | ')}`);
  console.log(`  Rounds:  3 COMPLETED | 1 ONGOING | 1 SCHEDULED`);
  console.log(`  Bracket: ACTIVE — Grand Final pending`);
  console.log(border);
  console.log('  🔑 All seeded passwords: Arena123! (override admin with SEED_ADMIN_PASSWORD)');
  console.log('  📧 Admin login    : admin@arena.test');
  console.log('  📧 Player logins  : shadowstrike@arena.test … solarflare@arena.test');
  console.log('  📧 Manager logins : phantomgm@arena.test … ciphergm@arena.test');
  console.log(border + '\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.\n');
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message || err);
  process.exit(1);
});
