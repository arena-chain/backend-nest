const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in database:');
  collections.forEach(c => console.log(` - ${c.name}`));
  process.exit();
}

check();
