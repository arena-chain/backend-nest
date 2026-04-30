const mongoose = require('mongoose');

async function checkDb() {
  try {
    await mongoose.connect('mongodb://localhost:27017/arenachain');
    console.log('Connected to DB');
    
    const leagues = await mongoose.connection.db.collection('leagues').find({}).toArray();
    console.log(`Leagues found in DB: ${leagues.length}`);
    
    const tickets = await mongoose.connection.db.collection('tickets').find({}).toArray();
    console.log(`Total tickets in DB: ${tickets.length}`);
    
    const templates = await mongoose.connection.db.collection('tickets').find({ user: null }).toArray();
    console.log(`Templates (user: null) in DB: ${templates.length}`);
    
    templates.forEach(t => {
      console.log(`- Ticket: ${t.ticketNumber}, League: ${t.league}, Category: ${t.category}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('DB Error:', err);
  }
}

checkDb();
