const mongoose = require('mongoose');

async function checkCounts() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`Collection: ${col.name} | Count: ${count}`);
  }

  process.exit();
}

checkCounts();
