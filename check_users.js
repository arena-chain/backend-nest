const mongoose = require('mongoose');

async function checkUsers() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/arenachain');
        console.log('Connected to MongoDB (arenachain)');
        
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log(`Found ${users.length} users:`);
        users.forEach(u => console.log(`- ${u.username || u.email} (Role: ${u.role}, ID: ${u._id})`));
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUsers();
