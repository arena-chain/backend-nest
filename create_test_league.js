const mongoose = require('mongoose');

async function createTestLeague() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/arenachain');
        console.log('Connected to MongoDB (arenachain)');
        
        const db = mongoose.connection.db;
        
        // Find a game first to link to
        const game = await db.collection('games').findOne({});
        const gameId = game ? game._id.toString() : 'game_123';
        
        // Find an admin user to link to
        const admin = await db.collection('users').findOne({ role: /admin/i });
        if (!admin) {
             console.error('No admin user found. Please create an admin first.');
             process.exit(1);
        }

        const league = {
            name: 'Elite Pro League 2026',
            gameId: gameId,
            logoUrl: 'https://arena-chain.com/logo.png',
            description: 'The premier league for professional players.',
            tier: 'OFFICIAL',
            mode: 'SOLO',
            regionFilter: 'GLOBAL',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            maxParticipants: 100,
            minElo: 0,
            createdBy: admin._id,
            status: 'UPCOMING',
            rewards: [],
            rewardsDistributed: false,
            ticketTypes: []
        };

        const result = await db.collection('leagues').insertOne(league);
        console.log('Successfully created test league:', result.insertedId);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

createTestLeague();
