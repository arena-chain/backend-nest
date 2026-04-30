const mongoose = require('mongoose');

async function checkLeagueData() {
  await mongoose.connect('mongodb://localhost:27017/arenachain');
  
  const leagueSchema = new mongoose.Schema({}, { strict: false });
  const League = mongoose.model('League', leagueSchema);

  const leagues = await League.find().lean();
  
  for (const l of leagues) {
    console.log(`League: ${l.name} | RegionValue: "${l.regionValue}" | LogoUrl: "${l.logoUrl}"`);
  }

  process.exit();
}

checkLeagueData();
