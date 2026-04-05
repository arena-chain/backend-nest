const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arenachain';

async function seed() {
    try {
        await mongoose.connect(URI);
        console.log('Connected to MongoDB');

        const catalogColl = mongoose.connection.db.collection('catalogs');
        const userColl = mongoose.connection.db.collection('users');
        const rankColl = mongoose.connection.db.collection('playerranks');
        const generalConfigColl = mongoose.connection.db.collection('rankgeneralconfigs');
        const tierConfigColl = mongoose.connection.db.collection('ranktierconfigs');

        // 1. Seed General Config
        const existingGeneral = await generalConfigColl.findOne({});
        if (!existingGeneral) {
            await generalConfigColl.insertOne({
                baseEloGain: 25,
                streakMultiplier: 1.2,
                maxStreakBonus: 50,
                underdogBonus: 10,
                inactivityPenalty: 15,
                seasonNumber: 1,
                lastReset: new Date(),
                updatedAt: new Date()
            });
            console.log('Seed: Created Rank General Config');
        }

        // 2. Seed Tier Configs
        const existingTiers = await tierConfigColl.countDocuments();
        if (existingTiers === 0) {
            const tiers = [
                { tier: 'IRON', minElo: 0, maxElo: 999, divisions: 3, displayOrder: 1, color: '#A19D94' },
                { tier: 'BRONZE', minElo: 1000, maxElo: 1999, divisions: 3, displayOrder: 2, color: '#CD7F32' },
                { tier: 'SILVER', minElo: 2000, maxElo: 2999, divisions: 3, displayOrder: 3, color: '#C0C0C0' },
                { tier: 'GOLD', minElo: 3000, maxElo: 3999, divisions: 3, displayOrder: 4, color: '#FFD700' },
                { tier: 'PLATINUM', minElo: 4000, maxElo: 4999, divisions: 3, displayOrder: 5, color: '#E5E4E2' },
                { tier: 'DIAMOND', minElo: 5000, maxElo: 5999, divisions: 3, displayOrder: 6, color: '#B9F2FF' },
                { tier: 'MASTER', minElo: 6000, maxElo: 6999, divisions: 2, displayOrder: 7, color: '#FF00FF' },
                { tier: 'GRANDMASTER', minElo: 7000, maxElo: 7999, divisions: 2, displayOrder: 8, color: '#FF4500' },
                { tier: 'CHALLENGER', minElo: 8000, maxElo: 99999, divisions: 1, displayOrder: 9, color: '#00FF88' },
            ];
            await tierConfigColl.insertMany(tiers);
            console.log('Seed: Created Rank Tier Configs (9 levels)');
        }

        // 3. Game & User Seed
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

        let playersCount = await userColl.countDocuments();
        if (playersCount === 0) {
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

        // 4. Rank Seed
        const users = await userColl.find().limit(5).toArray();
        const tierConfigs = await tierConfigColl.find().sort({ displayOrder: 1 }).toArray();

        function getTierInfo(elo) {
            let cumulativeLevel = 1;
            for (const threshold of tierConfigs) {
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
            const last = tierConfigs[tierConfigs.length - 1];
            return { tier: last.tier, division: 1, level: cumulativeLevel };
        }

        for (const user of users) {
            const existingRank = await rankColl.findOne({ user: user._id, game: valorant._id });
            if (!existingRank) {
                const wins = Math.floor(Math.random() * 120) + 10;
                const losses = Math.floor(Math.random() * 100) + 5;
                const totalMatches = wins + losses;
                const winRate = Math.round((wins / totalMatches) * 100);

                const elo = Math.floor(Math.random() * 6500) + 500;
                const { tier, division, level } = getTierInfo(elo);

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
