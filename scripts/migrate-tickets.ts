import { MongoClient, ObjectId } from 'mongodb';
import * as QRCode from 'qrcode';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arenachain';
const DB_NAME = process.env.MONGO_DB_NAME || 'arenachain';

async function migrate() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(DB_NAME);
        
        const participantsCol = db.collection('leagueparticipants');
        const ticketsCol = db.collection('tickets');
        const leaguesCol = db.collection('leagues');

        const participants = await participantsCol.find({ playerId: { $exists: true, $ne: null } }).toArray();
        console.log(`Found ${participants.length} participants`);

        let createdCount = 0;

        for (const p of participants) {
            const leagueId = p.leagueId;
            const userId = p.playerId;

            if (!leagueId || !userId) continue;

            const existing = await ticketsCol.findOne({
                league: leagueId,
                user: userId
            });

            if (existing) {
                console.log(`Ticket already exists for user ${userId} in league ${leagueId}`);
                continue;
            }

            const ticketNumber = `LTK-${leagueId.toString().slice(-6).toUpperCase()}-${Date.now()}-${userId.toString().slice(-4).toUpperCase()}`;
            const qrData = JSON.stringify({ 
                ticketNumber, 
                league: leagueId.toString(), 
                user: userId.toString(), 
                type: 'STANDARD' 
            });
            
            const qrCodeUrl = await QRCode.toDataURL(qrData);
            
            await ticketsCol.insertOne({
                ticketNumber,
                qrCode: qrCodeUrl,
                purchaseDate: new Date(),
                league: leagueId,
                user: userId,
                type: 'STANDARD',
                category: 'STANDARD',
                status: 'VALID',
                price: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                __v: 0
            });

            createdCount++;
            console.log(`Created ticket ${ticketNumber} for user ${userId}`);
        }

        console.log(`Migration finished. Created ${createdCount} tickets.`);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.close();
    }
}

migrate();
