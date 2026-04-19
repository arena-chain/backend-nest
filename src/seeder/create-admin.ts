import mongoose, { Schema } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/arenachain';

const m = (name: string, schema: Schema) =>
    (mongoose.models[name] as any) || mongoose.model(name, schema);

const UserModel = m('User', new Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    nickname: { type: String, required: true },
    role: { type: String, default: 'admin' },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: true },
    region: { type: String, default: 'GLOBAL' },
}, { timestamps: true }));

const AdminProfileModel = m('AdminProfile', new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    adminLevel: { type: Number, default: 99 },
    permissions: { type: [String], default: ['*'] },
}, { timestamps: true }));

async function createAdmin() {
    const ADMIN_EMAIL = 'admin@gmail.com';
    const ADMIN_PASSWORD = 'azerty@985';
    const ADMIN_NICKNAME = 'SuperAdmin';

    console.log('\n🔌 Connecting to:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    // Check if already exists
    const existing = await UserModel.findOne({ email: ADMIN_EMAIL });
    if (existing) {
        console.log(`⚠️  User ${ADMIN_EMAIL} already exists (id: ${existing._id})`);
        const existingProfile = await AdminProfileModel.findOne({ userId: existing._id });
        if (!existingProfile) {
            const profile = await AdminProfileModel.create({
                userId: existing._id,
                adminLevel: 99,
                permissions: ['*'],
            });
            console.log('✅ Admin profile created for existing user:', profile._id);
        } else {
            console.log('✅ Admin profile already exists:', existingProfile._id);
        }
        await mongoose.disconnect();
        return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const user = await UserModel.create({
        email: ADMIN_EMAIL,
        passwordHash,
        nickname: ADMIN_NICKNAME,
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
        region: 'GLOBAL',
    });
    console.log(`✅ User created: ${user.email} (id: ${user._id})`);

    const profile = await AdminProfileModel.create({
        userId: user._id,
        adminLevel: 99,
        permissions: ['*'],
    });
    console.log(`✅ Admin profile created (id: ${profile._id})`);

    const border = '─'.repeat(50);
    console.log('\n' + border);
    console.log('✅  ADMIN ACCOUNT CREATED');
    console.log(border);
    console.log(`  📧 Email    : ${ADMIN_EMAIL}`);
    console.log(`  🔑 Password : ${ADMIN_PASSWORD}`);
    console.log(`  👤 Nickname : ${ADMIN_NICKNAME}`);
    console.log(`  🛡️  Level    : 99 (superadmin)`);
    console.log(border + '\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected.\n');
}

createAdmin().catch(err => {
    console.error('\n❌ Failed:', err.message || err);
    process.exit(1);
});
