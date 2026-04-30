const mongoose = require('mongoose');

async function checkTicketsLeagues() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  
  const ticketSchema = new mongoose.Schema({}, { strict: false });
  const Ticket = mongoose.model('Ticket', ticketSchema);

  const tickets = await Ticket.find().lean();
  
  for (const t of tickets) {
    console.log(`Ticket: ${t.ticketNumber} | User: ${t.user} | LeagueID: ${t.league}`);
  }

  process.exit();
}

checkTicketsLeagues();
