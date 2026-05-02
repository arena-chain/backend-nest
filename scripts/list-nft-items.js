const mongoose = require('mongoose');

async function listItems() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  const items = await mongoose.connection.db.collection('nftitems').find({}).toArray();
  console.log('NFT Items:', JSON.stringify(items, null, 2));
  process.exit(0);
}

listItems().catch(err => { console.error(err); process.exit(1); });
