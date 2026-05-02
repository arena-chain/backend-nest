const mongoose = require('mongoose');

async function forceClear() {
  try {
    await mongoose.connect('mongodb://localhost:27017/arenachain');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // List of all possible collection names for participants
    const collectionsToClear = [
      'leagueparticipants',
      'registrations',
      'league_participants',
      'tickets',
      'leagues',
      'seasons'
    ];

    for (const name of collectionsToClear) {
      const collections = await db.listCollections({ name }).toArray();
      if (collections.length > 0) {
        await db.collection(name).deleteMany({});
        console.log(`✅ Cleared all documents from: ${name}`);
      } else {
        console.log(`ℹ️ Collection ${name} does not exist.`);
      }
    }

    console.log('\nDatabase is now clean for League testing.');
    process.exit();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

forceClear();
