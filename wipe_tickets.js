const mongoose = require('mongoose');

async function wipeTickets() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  console.log('Connected to MongoDB');

  const ticketSchema = new mongoose.Schema({}, { strict: false });
  const Ticket = mongoose.model('Ticket', ticketSchema);

  const result = await Ticket.deleteMany({});
  console.log(`SUCCESS: Deleted ${result.deletedCount} tickets.`);

  process.exit();
}

wipeTickets();
