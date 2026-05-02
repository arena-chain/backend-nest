const mongoose = require('mongoose');

async function checkDb() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  for (const name of ['nfts', 'nftitems', 'users', 'leagues', 'tickets']) {
    const count = await mongoose.connection.db.collection(name).countDocuments();
    console.log(`Collection ${name}: ${count} documents`);
  }
  
  process.exit(0);
}

checkDb().catch(err => { console.error(err); process.exit(1); });
