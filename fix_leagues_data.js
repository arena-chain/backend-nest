const mongoose = require('mongoose');

async function fixLeagues() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  
  const leagueSchema = new mongoose.Schema({}, { strict: false });
  const League = mongoose.model('League', leagueSchema);

  // SIM
  await League.updateOne({ name: 'SIM' }, { 
    regionValue: 'EUROPE',
    logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop'
  });

  // LAligua
  await League.updateOne({ name: 'LAligua' }, { 
    regionValue: 'SPAIN',
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop'
  });

  // Arena Alpha League 2026
  await League.updateOne({ name: 'Arena Alpha League 2026' }, { 
    regionValue: 'GLOBAL',
    logoUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2070&auto=format&fit=crop'
  });

  console.log('Leagues updated with real data!');
  process.exit();
}

fixLeagues();
