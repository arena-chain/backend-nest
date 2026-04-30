const mongoose = require('mongoose');

async function testRegistration() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  console.log('Connected to MongoDB');

  const leagueSchema = new mongoose.Schema({}, { strict: false });
  const League = mongoose.model('League', leagueSchema);

  const ticketSchema = new mongoose.Schema({}, { strict: false });
  const Ticket = mongoose.model('Ticket', ticketSchema);

  const userSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.model('User', userSchema);

  const lpSchema = new mongoose.Schema({}, { strict: false });
  const LP = mongoose.model('LeagueParticipant', lpSchema);

  const testUser = await User.findOne({ username: 'hatem' }) || await User.findOne({});
  const testLeague = await League.findOne({ name: 'LAligua' }) || await League.findOne({});

  if (!testUser || !testLeague) {
    console.error('Test data not found');
    process.exit(1);
  }

  console.log('Testing registration for user:', testUser.username, 'league:', testLeague.name);

  // Simulate category resolution logic
  const categoryInput = 'NFT';
  const TicketCategory = { NFT: 'NFT', STANDARD: 'STANDARD' };
  const category = categoryInput === 'NFT' ? TicketCategory.NFT : TicketCategory.STANDARD;
  
  console.log('Resolved category:', category);

  const prefix = category === 'NFT' ? 'NFT' : 'STD';
  const ticketNumber = `${prefix}-${Date.now()}`;

  const newTicket = new Ticket({
    ticketNumber,
    league: testLeague._id,
    user: testUser._id,
    category: category,
    status: 'VALID',
    qrCode: 'TEST_QR'
  });

  await newTicket.save();
  console.log('SUCCESS: Created ticket manually with category NFT');

  const found = await Ticket.find({ user: testUser._id });
  console.log('Tickets found for user:', found.length);
  
  process.exit();
}

testRegistration();
