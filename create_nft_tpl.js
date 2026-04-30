const mongoose = require('mongoose');

async function createNftTemplate() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  console.log('Connected to MongoDB');

  const leagueSchema = new mongoose.Schema({}, { strict: false });
  const League = mongoose.model('League', leagueSchema);

  const ticketSchema = new mongoose.Schema({}, { strict: false });
  const Ticket = mongoose.model('Ticket', ticketSchema);

  const targetLeague = await League.findOne({ name: 'LAligua' });
  if (!targetLeague) {
    console.error('League not found');
    process.exit(1);
  }

  const nftTemplate = new Ticket({
    ticketNumber: `NFT-TPL-${Date.now()}`,
    league: targetLeague._id,
    user: null,
    category: 'NFT',
    status: 'VALID',
    price: 150, // Premium price
    type: 'NFT League Pass',
    qrCode: 'NFT_MOCK_QR'
  });

  await nftTemplate.save();
  console.log('SUCCESS: Created NFT Template for LAligua');

  process.exit();
}

createNftTemplate();
