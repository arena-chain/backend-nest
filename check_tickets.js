const mongoose = require('mongoose');

async function checkAllTickets() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  console.log('Connected to MongoDB');

  const ticketSchema = new mongoose.Schema({}, { strict: false });
  const Ticket = mongoose.model('Ticket', ticketSchema);

  const userSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.model('User', userSchema);

  const tickets = await Ticket.find().lean();
  console.log(`Found ${tickets.length} total tickets.`);

  const users = await User.find().lean();
  console.log(`Found ${users.length} total users.`);

  tickets.forEach(t => {
    console.log(`Ticket: ${t.ticketNumber} | UserID: ${t.user || 'NONE (Template)'} | Status: ${t.status}`);
  });

  process.exit();
}

checkAllTickets();
