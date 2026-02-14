const mongoose = require('mongoose');

async function seedLeague() {
    try {
        await mongoose.connect('mongodb://localhost:27017/arenachain');
        console.log('Connected to MongoDB');

        const LeagueSchema = new mongoose.Schema({
            name: String,
            gameId: String,
            tier: String,
            mode: String,
            regionFilter: String,
            startDate: Date,
            endDate: Date,
            maxParticipants: { type: Number, default: 100 },
            minElo: { type: Number, default: 0 },
            rewards: [{ rank: Number, prize: String, points: Number }],
            status: String,
            createdBy: mongoose.Schema.Types.ObjectId
        });

        const League = mongoose.model('League', LeagueSchema);

        // Find an admin user to be the creator
        const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
        const admin = await User.findOne({ role: 'admin' }) || await User.findOne();

        if (!admin) {
            console.log('No user found to create league. Please register a user first.');
            return;
        }

        const newLeague = new League({
            name: 'Arena Alpha League 2026',
            gameId: 'super_striker_01',
            tier: 'OFFICIAL',
            mode: 'SOLO',
            regionFilter: 'GLOBAL',
            startDate: new Date('2026-02-01'),
            endDate: new Date('2026-03-01'),
            maxParticipants: 50,
            minElo: 800,
            status: 'UPCOMING',
            createdBy: admin._id,
            rewards: [
                { rank: 1, prize: 'Champion Trophy + Pro Badge', points: 1000 },
                { rank: 2, prize: 'Silver Medal', points: 500 },
                { rank: 3, prize: 'Bronze Medal', points: 250 }
            ]
        });

        await newLeague.save();
        console.log('Seed: Official League created successfully!');
        process.exit();
    } catch (err) {
        console.error('Seed Error:', err);
        process.exit(1);
    }
}

seedLeague();
