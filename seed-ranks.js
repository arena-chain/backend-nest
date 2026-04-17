const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arenachain';

async function seed() {
    try {
        await mongoose.connect(URI);
        console.log('Connected to MongoDB');

        const catalogColl = mongoose.connection.db.collection('catalogs');
        const userColl = mongoose.connection.db.collection('users');
        const rankColl = mongoose.connection.db.collection('playerranks');

        // Check if game exists
        let valorant = await catalogColl.findOne({ title: 'Valorant' });
        if (!valorant) {
            const res = await catalogColl.insertOne({
                title: 'Valorant',
                genre: 'FPS',
                description: 'Tactical Shooter',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            valorant = { _id: res.insertedId, title: 'Valorant' };
            console.log('Seed: Added Valorant game');
        }

        // Check for some players
        let playersCount = await userColl.countDocuments();
        if (playersCount === 0) {
            console.log('Seed: No users found, creating dummy users...');
            const dummyUsers = [
                { nickname: 'ShadowBlade', email: 'shadow@arena.com', password: 'hashed_password', region: 'EUROPE', country: '🇫🇷 France', createdAt: new Date() },
                { nickname: 'NeonPhoenix', email: 'neon@arena.com', password: 'hashed_password', region: 'EUROPE', country: '🇺🇸 USA', createdAt: new Date() },
                { nickname: 'VoidHunter', email: 'void@arena.com', password: 'hashed_password', region: 'ASIA', country: '🇯🇵 Japan', createdAt: new Date() },
                { nickname: 'CyberWolf', email: 'cyber@arena.com', password: 'hashed_password', region: 'EUROPE', country: '🇩🇪 Germany', createdAt: new Date() },
                { nickname: 'StormRider', email: 'storm@arena.com', password: 'hashed_password', region: 'EUROPE', country: '🇨🇦 Canada', createdAt: new Date() }
            ];
            await userColl.insertMany(dummyUsers);
            console.log('Seed: Created 5 dummy users');
        }

        const TIER_THRESHOLDS = [
            { tier: 'IRON', minElo: 0, maxElo: 999, divisions: 3 },
            { tier: 'BRONZE', minElo: 1000, maxElo: 1999, divisions: 3 },
            { tier: 'SILVER', minElo: 2000, maxElo: 2999, divisions: 3 },
            { tier: 'GOLD', minElo: 3000, maxElo: 3999, divisions: 3 },
            { tier: 'PLATINUM', minElo: 4000, maxElo: 4999, divisions: 3 },
            { tier: 'DIAMOND', minElo: 5000, maxElo: 5999, divisions: 3 },
            { tier: 'MASTER', minElo: 6000, maxElo: 6999, divisions: 2 },
            { tier: 'GRANDMASTER', minElo: 7000, maxElo: 7999, divisions: 2 },
            { tier: 'CHALLENGER', minElo: 8000, maxElo: 99999, divisions: 1 },
        ];

        function calculateTierAndLevel(elo) {
            let cumulativeLevel = 1;
            for (const threshold of TIER_THRESHOLDS) {
                if (elo >= threshold.minElo && elo <= threshold.maxElo) {
                    const eloRange = threshold.maxElo - threshold.minElo;
                    const eloInTier = elo - threshold.minElo;
                    const divisionSize = eloRange / threshold.divisions;
                    let div = Math.floor(eloInTier / divisionSize) + 1;
                    div = Math.min(div, threshold.divisions);
                    const level = cumulativeLevel + (div - 1);
                    return {
                        tier: threshold.tier,
                        division: threshold.divisions - div + 1,
                        level,
                    };
                }
                cumulativeLevel += threshold.divisions;
            }
            return { tier: 'CHALLENGER', division: 1, level: cumulativeLevel };
        }

        const users = await userColl.find().limit(5).toArray();
        for (const user of users) {
            const existingRank = await rankColl.findOne({ user: user._id, game: valorant._id });
            if (!existingRank) {
                const wins = Math.floor(Math.random() * 120) + 10;
                const losses = Math.floor(Math.random() * 100) + 5;
                const totalMatches = wins + losses;
                const winRate = Math.round((wins / totalMatches) * 100);

                // Random ELO between 500 and 7000 to cover various tiers
                const elo = Math.floor(Math.random() * 6500) + 500;
                const { tier, division, level } = calculateTierAndLevel(elo);

                await rankColl.insertOne({
                    user: user._id,
                    game: valorant._id,
                    elo: elo,
                    level: level,
                    tier: tier,
                    division: division,
                    wins: wins,
                    losses: losses,
                    winRate: winRate,
                    totalMatches: totalMatches,
                    currentStreak: Math.floor(Math.random() * 10) - 5,
                    longestWinStreak: Math.floor(Math.random() * 15) + 5,
                    season: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`Seed: Added rank for ${user.nickname} (ELO: ${elo}, Tier: ${tier}, Lv: ${level})`);
            }
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
