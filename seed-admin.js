
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arenachain';

async function seedAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // User collection is typically 'users'
        const userSchema = new mongoose.Schema({
            email: { type: String, unique: true },
            passwordHash: String,
            nickname: String,
            isActive: { type: Boolean, default: true },
            isEmailVerified: { type: Boolean, default: true },
        }, { collection: 'users' });

        // AdminProfile collection is pluralized class name: 'adminprofiles'
        const adminProfileSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            adminLevel: { type: Number, default: 1 },
            permissions: [String],
        }, { collection: 'adminprofiles' });

        const User = mongoose.model('User', userSchema);
        const AdminProfile = mongoose.model('AdminProfile', adminProfileSchema);

        const email = 'admin@admin.com';
        const password = '123456';

        const passwordHash = await bcrypt.hash(password, 10);

        // 1. Create/Update User
        let user = await User.findOne({ email });
        if (user) {
            console.log('User admin@admin.com already exists, updating password...');
            user.passwordHash = passwordHash;
            await user.save();
        } else {
            user = await User.create({
                email,
                passwordHash,
                nickname: 'System Admin',
                isActive: true,
                isEmailVerified: true
            });
            console.log('User admin@admin.com created.');
        }

        // 2. Create/Update Admin Profile in 'adminprofiles'
        // Also cleanup old 'admins' collection if it exists
        try {
            await mongoose.connection.db.collection('admins').drop().catch(() => { });
        } catch (e) { }

        let adminProfile = await AdminProfile.findOne({ userId: user._id });
        if (!adminProfile) {
            await AdminProfile.create({
                userId: user._id,
                adminLevel: 10,
                permissions: ['ALL']
            });
            console.log('Admin profile created in adminprofiles.');
        } else {
            console.log('Admin profile already exists in adminprofiles.');
        }

        // 3. Remove Player Profile for Admin (Reverting last change)
        const playerProfileSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
        }, { collection: 'playerprofiles' });

        const PlayerProfile = mongoose.models.PlayerProfile || mongoose.model('PlayerProfile', playerProfileSchema);
        const deleted = await PlayerProfile.deleteOne({ userId: user._id });
        if (deleted.deletedCount > 0) {
            console.log('Player profile removed from admin account.');
        }

        console.log('\n✅ DONE! Admin account restored: admin@admin.com / 123456');

    } catch (err) {
        console.error('Error seeding admin:', err);
    } finally {
        await mongoose.disconnect();
    }
}

seedAdmin();
