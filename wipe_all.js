const mongoose = require('mongoose');

async function wipeAll() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  console.log('Connected to MongoDB');

  const ticketSchema = new mongoose.Schema({}, { strict: false });
  const Ticket = mongoose.model('Ticket', ticketSchema);

  const participantSchema = new mongoose.Schema({}, { strict: false });
  const Participant = mongoose.model('LeagueParticipant', participantSchema);

  const tResult = await Ticket.deleteMany({});
  const pResult = await Participant.deleteMany({});

  console.log(`DELETED: ${tResult.deletedCount} tickets`);
  console.log(`DELETED: ${pResult.deletedCount} league registrations`);

  process.exit();
}

wipeAll();
