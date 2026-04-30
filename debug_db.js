const mongoose = require('mongoose');
require('dotenv').config();

async function debugDb() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/arenachain';
    console.log('Connecting to:', uri);
    try {
        await mongoose.connect(uri);
        console.log('Connected');
        
        const leagues = await mongoose.connection.db.collection('leagues').find({}).toArray();
        console.log(`FOUND ${leagues.length} LEAGUES IN DB`);
        leagues.forEach(l => console.log(`- ${l.name} (${l._id})`));
        
        process.exit(0);
    } catch (err) {
        console.error('DB ERROR:', err.message);
        process.exit(1);
    }
}

debugDb();
