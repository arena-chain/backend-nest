const mongoose = require('mongoose');

// Use environment variable or default local MongoDB URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arenachain';

const games = [
    {
        title: 'Valorant',
        genre: 'Tactical Shooter',
        description: 'A 5v5 character-based tactical shooter where precise gunplay meets unique agent abilities.',
        publisher: 'Riot Games',
        platforms: ['PC'],
        isActive: true,
        teamSize: 5,
        supportsTeams: true,
        supportsSolo: false,
        coverImageUrl: 'https://images.unsplash.com/photo-1624138784614-87fd1b6528f8?auto=format&fit=crop&q=80&w=800',
    },
    {
        title: 'League of Legends',
        genre: 'MOBA',
        description: 'A team-based strategy game where two teams of five powerful champions face off to destroy the other\'s base.',
        publisher: 'Riot Games',
        platforms: ['PC', 'macOS'],
        isActive: true,
        teamSize: 5,
        supportsTeams: true,
        supportsSolo: false,
        coverImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
    },
    {
        title: 'Counter-Strike 2',
        genre: 'Tactical Shooter',
        description: 'The world\'s premier tactical shooter, featuring competitive play, community-driven content, and precision gunplay.',
        publisher: 'Valve',
        platforms: ['PC'],
        isActive: true,
        teamSize: 5,
        supportsTeams: true,
        supportsSolo: false,
        coverImageUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800',
    },
    {
        title: 'Rocket League',
        genre: 'Sports / Action',
        description: 'Soccer meets driving in this high-powered, physics-based action game.',
        publisher: 'Psyonix',
        platforms: ['PC', 'PlayStation', 'Xbox', 'Switch'],
        isActive: true,
        teamSize: 3,
        supportsTeams: true,
        supportsSolo: true,
        coverImageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=800',
    },
    {
        title: 'Fortnite',
        genre: 'Battle Royale',
        description: 'Create, play, and battle with friends for free in Fortnite.',
        publisher: 'Epic Games',
        platforms: ['PC', 'PlayStation', 'Xbox', 'Switch', 'Mobile'],
        isActive: true,
        teamSize: 4,
        supportsTeams: true,
        supportsSolo: true,
        coverImageUrl: 'https://images.unsplash.com/photo-1589118949245-7d38baf380d6?auto=format&fit=crop&q=80&w=800',
    },
    {
        title: 'Apex Legends',
        genre: 'Battle Royale',
        description: 'The next evolution of hero shooter. Show them what you\'re made of in Apex Legends.',
        publisher: 'EA / Respawn',
        platforms: ['PC', 'PlayStation', 'Xbox', 'Switch'],
        isActive: true,
        teamSize: 3,
        supportsTeams: true,
        supportsSolo: false,
        coverImageUrl: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&q=80&w=800',
    }
];

async function seedGames() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // Collection name is pluralized 'catalogs'
        const Catalog = mongoose.connection.db.collection('catalogs');

        for (const game of games) {
            const existing = await Catalog.findOne({ title: game.title });
            if (existing) {
                console.log(`Game "${game.title}" already exists, skipping...`);
                continue;
            }

            // Add timestamps manually since we are using raw collection
            const gameToInsert = {
                ...game,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await Catalog.insertOne(gameToInsert);
            console.log(`Game "${game.title}" created.`);
        }

        console.log('\n✅ DONE! Game catalog seeded.');

    } catch (err) {
        console.error('Error seeding games:', err);
    } finally {
        await mongoose.disconnect();
    }
}

seedGames();
