const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const uri = 'mongodb://localhost:27017/arenachain';

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Define schemas minimally to access data
        const UserSchema = new mongoose.Schema({
            email: String,
            passwordHash: String,
            nickname: String,
            role: String,
            isActive: Boolean,
            isEmailVerified: Boolean
        }, { collection: 'users' });

        const User = mongoose.model('UserDebug', UserSchema);

        // Schema for AdminProfile
        const AdminProfileSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            adminLevel: Number
        }, { collection: 'adminprofiles' });

        const AdminProfile = mongoose.model('AdminProfileDebug', AdminProfileSchema);

        const email = 'admin@admin.com';
        console.log(`Searching for user with email: "${email}"...`);

        // Case-insensitive search to be sure
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (!user) {
            console.log('❌ User NOT FOUND.');

            // List all users to see what's there
            const count = await User.countDocuments();
            console.log(`Total users in DB: ${count}`);
            if (count > 0) {
                const sample = await User.findOne();
                console.log('Sample user email:', sample.email);
            }
        } else {
            console.log('✅ User FOUND:', {
                _id: user._id,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                isEmailVerified: user.isEmailVerified,
                passwordHashBeginning: user.passwordHash ? user.passwordHash.substring(0, 10) + '...' : 'NULL'
            });

            // Check Password
            if (user.passwordHash) {
                const isMatch = await bcrypt.compare('123456', user.passwordHash);
                console.log(`🔐 Password '123456' match result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);

                if (!isMatch) {
                    // Try rehashing 123456 to see what it looks like
                    const testHash = await bcrypt.hash('123456', 10);
                    console.log(`(For reference, a new hash of '123456' looks like: ${testHash})`);
                }
            } else {
                console.log('❌ User has NO passwordHash!');
            }

            // Check Admin Profile
            console.log(`Checking AdminProfile for userId: ${user._id}`);
            const profile = await AdminProfile.findOne({ userId: user._id });

            if (profile) {
                console.log('✅ AdminProfile FOUND:', profile);
            } else {
                console.log('❌ AdminProfile NOT FOUND for this user.');

                // Check other collections just in case the role matches but profile is missing
                // (Player, TeamManager, Referee) - usually unrelated but good context
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
