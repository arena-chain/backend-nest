const mongoose = require('mongoose');
const { Types } = mongoose;

async function debugRegistration() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  console.log('Connected to MongoDB');

  const ticketSchema = new mongoose.Schema({
    ticketNumber: { type: String, required: true, unique: true },
    league: { type: Types.ObjectId, ref: 'League', required: true },
    user: { type: Types.ObjectId, ref: 'User' },
    category: { type: String, required: true },
    qrCode: { type: String, required: true },
    status: { type: String, default: 'VALID' }
  }, { strict: false });
  const Ticket = mongoose.model('Ticket', ticketSchema);

  const leagueId = '698df41b6e402e72e8cd566e'; // LALIGUA
  const userId = '698df2f05d475d8a65d53489'; // One of the users

  console.log(`Attempting to create ticket for User ${userId} and League ${leagueId}`);

  try {
    const ticket = new Ticket({
      league: new Types.ObjectId(leagueId),
      user: new Types.ObjectId(userId),
      category: 'STANDARD',
      type: 'League Entry',
      ticketNumber: `TEST-${Date.now()}`,
      qrCode: 'DUMMY_QR'
    });
    const saved = await ticket.save();
    console.log('SUCCESS: Ticket saved!', saved._id);
  } catch (err) {
    console.error('ERROR during ticket save:', err);
  }

  process.exit();
}

debugRegistration();
