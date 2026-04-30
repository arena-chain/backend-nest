/**
 * Create or repair the default admin user + AdminProfile (no other seed data).
 * Run: npm run seed:admin
 *
 * Env:
 *   MONGO_URI (default mongodb://localhost/arenachain)
 *   SEED_ADMIN_EMAIL (default admin@arena.test)
 *   SEED_ADMIN_PASSWORD (optional — if unset, uses Arena123!)
 */
import mongoose, { Schema } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arenachain';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'arenachain';

function mongoUriForLog(uri: string): string {
  return uri.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@');
}

const m = (name: string, schema: Schema) =>
  (mongoose.models[name] as any) || mongoose.model(name, schema);

const UserModel = m(
  'User',
  new Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true },
      passwordHash: { type: String, required: true },
      nickname: { type: String, required: true },
      role: { type: String, default: 'player' },
      isActive: { type: Boolean, default: true },
      isEmailVerified: { type: Boolean, default: true },
      region: { type: String, default: 'EUROPE' },
      country: String,
      avatar: String,
    },
    { timestamps: true },
  ),
);

const AdminProfileModel = m(
  'AdminProfile',
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, required: true, unique: true },
      adminLevel: { type: Number, default: 1 },
      permissions: { type: [String], default: [] },
    },
    { timestamps: true },
  ),
);

async function main() {
  console.log('\n🔌 Connecting to:', mongoUriForLog(MONGO_URI), `(database: ${MONGO_DB_NAME})`);
  await mongoose.connect(MONGO_URI, { dbName: MONGO_DB_NAME });
  console.log('✅ Connected\n');

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@arena.test').toLowerCase();
  const adminPwPlain = process.env.SEED_ADMIN_PASSWORD || 'Arena123!';
  const adminPwHash = await bcrypt.hash(adminPwPlain, 10);

  let adminUser = await UserModel.findOne({ email: adminEmail });
  if (!adminUser) {
    adminUser = await UserModel.create({
      email: adminEmail,
      passwordHash: adminPwHash,
      nickname: 'ArenaAdmin',
      role: 'admin',
      country: 'TN',
      region: 'EUROPE',
      isEmailVerified: true,
    });
    await AdminProfileModel.create({ userId: adminUser._id, adminLevel: 1, permissions: [] });
    console.log('✅ Created admin user + AdminProfile');
  } else {
    adminUser.role = 'admin';
    adminUser.passwordHash = adminPwHash;
    adminUser.isEmailVerified = true;
    await adminUser.save();

    const prof = await AdminProfileModel.findOne({ userId: adminUser._id });
    if (!prof) {
      await AdminProfileModel.create({ userId: adminUser._id, adminLevel: 1, permissions: [] });
    }
    console.log('✅ Updated admin user + ensured AdminProfile');
  }

  console.log('\n  Log in with:');
  console.log(`    Email:    ${adminEmail}`);
  console.log(`    Password: ${adminPwPlain}`);
  console.log('');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.\n');
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message || err);
  process.exit(1);
});
