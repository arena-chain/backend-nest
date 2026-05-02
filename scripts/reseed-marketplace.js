const mongoose = require('mongoose');
const { Types } = mongoose;

async function seedMarketplace() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  console.log('Connected to MongoDB');

  // 1. Get an Admin or User to be the owner/creator
  const user = await mongoose.connection.db.collection('users').findOne({});
  if (!user) {
    console.error('No users found. Run seed-admin.js first.');
    process.exit(1);
  }
  const userId = user._id;

  // 2. Clear existing NFT data if desired (optional)
  // await mongoose.connection.db.collection('nfts').deleteMany({});
  // await mongoose.connection.db.collection('nftitems').deleteMany({});

  // 3. Create some NFTs
  const nfts = [
    {
      name: 'Cyber Blade',
      description: 'A neon-infused blade for close quarters combat.',
      category: 'WEAPON',
      rarity: 'EPIC',
      price: 1500,
      imageUrl: 'https://images.unsplash.com/photo-1590013330462-0949397686a3?auto=format&fit=crop&q=80&w=400',
      creatorId: userId,
      status: 'MINTED',
      supply: 10,
      maxSupply: 100,
      isTradeable: true,
      isEquippable: true
    },
    {
      name: 'Shadow Stalker Avatar',
      description: 'Exclusive character skin for stealth enthusiasts.',
      category: 'AVATAR',
      rarity: 'LEGENDARY',
      price: 5000,
      imageUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&q=80&w=400',
      creatorId: userId,
      status: 'MINTED',
      supply: 5,
      maxSupply: 50,
      isTradeable: true,
      isEquippable: true
    }
  ];

  for (const nftData of nfts) {
    const res = await mongoose.connection.db.collection('nfts').insertOne(nftData);
    const nftId = res.insertedId;

    // 4. Create an Item for this NFT and list it
    await mongoose.connection.db.collection('nftitems').insertOne({
      nftId: nftId,
      ownerId: userId,
      status: 'LISTED',
      listPrice: nftData.price * 1.2,
      edition: 1,
      acquiredVia: 'MINTED',
      acquiredAt: new Date(),
      isFeatured: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  console.log('Marketplace seeded successfully!');
  process.exit(0);
}

seedMarketplace().catch(err => {
  console.error(err);
  process.exit(1);
});
