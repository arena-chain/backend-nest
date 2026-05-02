const mongoose = require('mongoose');

async function reseed() {
  try {
    await mongoose.connect('mongodb://localhost:27017/arenachain');
    console.log('Connected to MongoDB');

    // 1. Clear relevant collections
    const collections = ['leagues', 'seasons', 'leagueparticipants', 'tickets', 'playerprofiles'];
    for (const name of collections) {
      await mongoose.connection.collection(name).deleteMany({});
      console.log(`Cleared ${name}`);
    }

    // 2. Models (Minimal schemas for seeding)
    const League = mongoose.model('League', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }, { strict: false }));
    const PlayerProfile = mongoose.model('PlayerProfile', new mongoose.Schema({}, { strict: false }));

    // 3. Find/Create Admin
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = new User({
        email: 'admin@arena.test',
        passwordHash: '$2b$10$YourHashedPasswordHere', // placeholder
        nickname: 'ArenaAdmin',
        role: 'admin',
        isEmailVerified: true
      });
      await admin.save();
      console.log('Created admin user');
    }

    // 4. Create Player Profiles for existing users if missing
    const users = await User.find({ role: 'player' });
    for (const u of users) {
      const exists = await PlayerProfile.findOne({ userId: u._id });
      if (!exists) {
        await new PlayerProfile({
          userId: u._id,
          elo: 1200,
          rank: 'Gold',
          isPro: false
        }).save();
      }
    }

    // 5. Create Leagues with Ticket Types
    const leaguesData = [
      {
        name: 'Arena Alpha League 2026',
        gameId: 'valorant_01',
        regionValue: 'GLOBAL',
        logoUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2070&auto=format&fit=crop',
        status: 'UPCOMING',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-03-01'),
        createdBy: admin._id,
        ticketTypes: [
          { name: 'Standard Entry', price: 0, capacity: 500, category: 'STANDARD' },
          { name: 'VIP NFT', price: 1000, capacity: 50, category: 'NFT' },
          { name: 'Valoo', price: 50, capacity: 100, category: 'STANDARD' },
          { name: 'VALO', price: 75, capacity: 80, category: 'STANDARD' }
        ]
      },
      {
        name: 'SIM',
        gameId: 'sim_racing_01',
        regionValue: 'EUROPE',
        logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
        status: 'UPCOMING',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-02-15'),
        createdBy: admin._id,
        ticketTypes: [
          { name: 'SIM Entry', price: 20, capacity: 100, category: 'STANDARD' },
          { name: 'VIP Access', price: 150, capacity: 20, category: 'STANDARD' }
        ]
      }
    ];

    for (const ld of leaguesData) {
      const l = new League(ld);
      await l.save();
      console.log(`Created league: ${l.name}`);
    }

    // 6. Create Tickets for the player
    const player = await User.findOne({ email: 'hatemaidi09@gmail.com' });
    if (player) {
      const alphaLeague = await League.findOne({ name: 'Arena Alpha League 2026' });
      const simLeague = await League.findOne({ name: 'SIM' });
      const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));

      if (alphaLeague) {
        await new Ticket({
          ticketNumber: `NFT-${Date.now()}-7338`,
          league: alphaLeague._id,
          user: player._id,
          category: 'NFT',
          status: 'VALID',
          price: 1000,
          purchaseDate: new Date(),
          type: 'VIP NFT',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        }).save();
        console.log('Created NFT ticket for hatem');
      }

      if (simLeague) {
        await new Ticket({
          ticketNumber: `STD-${Date.now()}-2041`,
          league: simLeague._id,
          user: player._id,
          category: 'STANDARD',
          status: 'VALID',
          price: 20,
          purchaseDate: new Date(),
          type: 'SIM Entry',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        }).save();
        console.log('Created STANDARD ticket for hatem');
      }
    }

    console.log('\n🚀 Reseed completed successfully!');
    process.exit();
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

reseed();
