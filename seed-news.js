const mongoose = require('mongoose');

const mongoUri = 'mongodb://localhost:27017/arenachain';

const NewsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    content: { type: String },
    coverImageUrl: { type: String },
    sourceName: { type: String, required: true },
    sourceUrl: { type: String, required: true, unique: true },
    publishedAt: { type: Date, default: Date.now },
    language: { type: String, default: 'en' },
    category: { type: String, enum: ['patch_notes', 'esports', 'community', 'tech', 'release', 'general'], default: 'general' },
    game: { type: String, enum: ['valorant', 'lol', 'cs2', 'fortnite', 'other'], default: 'other' },
    tags: [String],
    status: { type: String, enum: ['published', 'draft'], default: 'published' },
    isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

const News = mongoose.model('News', NewsSchema);

async function seed() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const articles = [
            {
                title: 'Valorant Patch 8.05: Premier Season Updates',
                slug: 'valorant-patch-8-05-' + Math.random().toString(36).substring(7),
                summary: 'New agent fixes, meta shifts, and everything you need to know about the latest Valorant update.',
                content: 'Valorant Patch 8.05 is here bringing significant changes to the competitive map pool and several agent balance updates. Clove has received some minor adjustments to their smoke regeneration speed...',
                coverImageUrl: 'https://cmsassets.rgpub.io/pb/gymf9db7/a380e227/patch_8_05_notes.jpg',
                sourceName: 'Riot Games',
                sourceUrl: 'https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-8-05/',
                publishedAt: new Date(),
                category: 'patch_notes',
                game: 'valorant',
                tags: ['patch', 'competitive', 'clove'],
                isFeatured: true
            },
            {
                title: 'League of Legends: MSI 2024 Schedule Announced',
                slug: 'lol-msi-2024-schedule-' + Math.random().toString(36).substring(7),
                summary: 'The biggest international LoL tournament is back. Check out the brackets and group stages here.',
                content: 'Riot Games has officially released the schedule for the 2024 Mid-Season Invitational (MSI). Teams from around the globe will gather to compete for the championship title...',
                coverImageUrl: 'https://images.contentstack.io/v3/assets/blt7311d6adef7c11d2/blt90731a5f4f810168/6618456860f38104aba9e965/MSI24_KeyArt_1920x1080.jpg',
                sourceName: 'LoL Esports',
                sourceUrl: 'https://lolesports.com/en-US/news/msi-2024-dates-venue-and-ticket-information',
                publishedAt: new Date(Date.now() - 3600000),
                category: 'esports',
                game: 'lol',
                tags: ['msi', 'tournament', 'esports']
            },
            {
                title: 'CS2: Copenhagen Major Grand Finals Results',
                slug: 'cs2-copenhagen-major-results-' + Math.random().toString(36).substring(7),
                summary: 'An incredible showdown between the worlds best CS2 teams. Highlights and final scores.',
                content: 'The first ever CS2 Major has come to an end in Copenhagen. The grand finals delivered high-octane action across three maps...',
                coverImageUrl: 'https://img-cdn.hltv.org/gallery/oYd6Wp2tG6P6Wp2t.jpg',
                sourceName: 'HLTV',
                sourceUrl: 'https://www.hltv.org/news/38668/major-champions-copenhagen-2024',
                publishedAt: new Date(Date.now() - 7200000),
                category: 'esports',
                game: 'cs2',
                tags: ['major', 'skins', 'finals']
            }
        ];

        for (const article of articles) {
            const exists = await News.findOne({ sourceUrl: article.sourceUrl });
            if (!exists) {
                await News.create(article);
                console.log(`Created article: ${article.title}`);
            } else {
                console.log(`Article already exists: ${article.title}`);
            }
        }

        console.log('Seeding complete');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed', err);
        process.exit(1);
    }
}

seed();
