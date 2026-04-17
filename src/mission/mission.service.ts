import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { Mission, MissionDocument } from './schemas/mission.schema';
import { UserMissionProgress, UserMissionProgressDocument } from './schemas/user-mission-progress.schema';
import { MissionEventLog, MissionEventLogDocument } from './schemas/mission-event-log.schema';

@Injectable()
export class MissionService {
    constructor(
        @InjectModel(Mission.name) private missionModel: Model<MissionDocument>,
        @InjectModel(UserMissionProgress.name) private progressModel: Model<UserMissionProgressDocument>,
        @InjectModel(MissionEventLog.name) private eventLogModel: Model<MissionEventLogDocument>,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    private normalizeGame(game?: string): 'lol' | 'valorant' | 'all' {
        if (!game) return 'all';
        const value = game.toLowerCase();
        if (value.includes('val')) return 'valorant';
        if (value.includes('lol') || value.includes('league')) return 'lol';
        return 'all';
    }

    private async hasProcessedEvent(
        userId: string,
        criteriaType: string,
        dedupeKey?: string,
    ): Promise<boolean> {
        if (!dedupeKey) return false;
        try {
            await this.eventLogModel.create({
                userId: new Types.ObjectId(userId),
                criteriaType,
                dedupeKey,
            });
            return false;
        } catch (error: any) {
            // E11000 means this event was already processed for this user/criteria.
            if (error?.code === 11000) {
                return true;
            }
            throw error;
        }
    }

    async incrementProgressForCriteria(
        userId: string,
        payload: {
            criteriaType: string;
            game?: 'lol' | 'valorant' | 'all' | string;
            scope?: 'individual' | 'friends';
            amount?: number;
            dedupeKey?: string;
        },
    ) {
        const { criteriaType, scope, amount = 1, dedupeKey } = payload;
        const normalizedGame = this.normalizeGame(payload.game);

        const alreadyProcessed = await this.hasProcessedEvent(userId, criteriaType, dedupeKey);
        if (alreadyProcessed) return { updatedMissionIds: [], skipped: true };

        const missionQuery: Record<string, any> = {
            isActive: true,
            'criteria.type': criteriaType,
        };

        if (scope) {
            missionQuery.scope = scope;
        }

        if (normalizedGame !== 'all') {
            missionQuery.game = { $in: ['all', normalizedGame] };
        }

        const missions = await this.missionModel.find(missionQuery).lean().exec();
        if (missions.length === 0) return { updatedMissionIds: [], skipped: false };

        const results = await Promise.all(
            missions.map((mission: any) =>
                this.incrementProgress(userId, mission._id.toString(), amount),
            ),
        );

        return {
            updatedMissionIds: missions.map((m: any) => m._id.toString()),
            skipped: false,
            results,
        };
    }

    async onTrainingCompleted(userId: string, payload?: { game?: string; amount?: number }) {
        return this.incrementProgressForCriteria(userId, {
            criteriaType: 'complete_training',
            game: payload?.game ?? 'all',
            scope: 'individual',
            amount: payload?.amount ?? 1,
        });
    }

    async onFriendRequestSent(userId: string, payload?: { amount?: number }) {
        return this.incrementProgressForCriteria(userId, {
            criteriaType: 'send_friend_request',
            scope: 'friends',
            amount: payload?.amount ?? 1,
        });
    }

    async onFriendshipAccepted(userId: string, payload?: { amount?: number }) {
        return this.incrementProgressForCriteria(userId, {
            criteriaType: 'add_friend',
            scope: 'friends',
            amount: payload?.amount ?? 1,
        });
    }

    async onMatchCompleted(
        userId: string,
        payload: {
            game: string;
            amount?: number;
            withFriends?: boolean;
            dedupeKey?: string;
        },
    ) {
        const amount = payload.amount ?? 1;

        await this.incrementProgressForCriteria(userId, {
            criteriaType: 'play_match',
            game: payload.game,
            amount,
            dedupeKey: payload.dedupeKey,
        });

        if (payload.withFriends) {
            await this.incrementProgressForCriteria(userId, {
                criteriaType: 'play_with_friends',
                game: payload.game,
                scope: 'friends',
                amount,
                dedupeKey: payload.dedupeKey,
            });
        }
    }

    // ── Cycle key helpers ──────────────────────────────────────

    private getDailyCycleKey(): string {
        return new Date().toISOString().slice(0, 10);
    }

    private getWeeklyCycleKey(): string {
        const now = new Date();
        const jan1 = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
        const week = Math.ceil((days + jan1.getDay() + 1) / 7);
        return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }

    private getCycleKey(type: string): string {
        if (type === 'daily') return this.getDailyCycleKey();
        if (type === 'weekly') return this.getWeeklyCycleKey();
        return 'permanent';
    }

    private getDailyResetTime(): Date {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        return tomorrow;
    }

    private getWeeklyResetTime(): Date {
        const now = new Date();
        const dayOfWeek = now.getUTCDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        const nextMonday = new Date(now);
        nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
        nextMonday.setUTCHours(0, 0, 0, 0);
        return nextMonday;
    }

    // ── Player-facing methods ──────────────────────────────────

    async getActiveMissionsForUser(userId: string) {
        const missions = await this.missionModel
            .find({ isActive: true })
            .sort({ type: 1, sortOrder: 1 })
            .lean()
            .exec();

        const progressDocs = await this.progressModel
            .find({ userId: new Types.ObjectId(userId) })
            .lean()
            .exec();

        const progressMap = new Map<string, any>();
        for (const p of progressDocs) {
            const key = `${p.missionId.toString()}_${p.cycleKey}`;
            progressMap.set(key, p);
        }

        const result = missions.map((m: any) => {
            const cycleKey = this.getCycleKey(m.type);
            const key = `${m._id.toString()}_${cycleKey}`;
            const prog = progressMap.get(key);
            return {
                ...m,
                userProgress: {
                    current: prog?.progress || 0,
                    completed: prog?.completed || false,
                    claimed: prog?.claimed || false,
                    completedAt: prog?.completedAt || null,
                },
            };
        });

        return {
            missions: result,
            dailyResetsAt: this.getDailyResetTime().toISOString(),
            weeklyResetsAt: this.getWeeklyResetTime().toISOString(),
        };
    }

    async incrementProgress(userId: string, missionId: string, amount = 1) {
        const mission = await this.missionModel.findById(missionId).exec();
        if (!mission) throw new NotFoundException('Mission not found');
        if (!mission.isActive) throw new BadRequestException('Mission is not active');

        const cycleKey = this.getCycleKey(mission.type);
        const uid = new Types.ObjectId(userId);
        const mid = new Types.ObjectId(missionId);

        let progress = await this.progressModel.findOne({
            userId: uid,
            missionId: mid,
            cycleKey,
        }).exec();

        if (!progress) {
            progress = new this.progressModel({
                userId: uid,
                missionId: mid,
                cycleKey,
                progress: 0,
                completed: false,
                claimed: false,
            });
        }

        if (progress.completed) {
            return { progress: progress.progress, completed: true, claimed: progress.claimed };
        }

        progress.progress = Math.min(progress.progress + amount, mission.criteria.target);

        if (progress.progress >= mission.criteria.target) {
            progress.completed = true;
            progress.completedAt = new Date();
        }

        await progress.save();

        return {
            progress: progress.progress,
            target: mission.criteria.target,
            completed: progress.completed,
            claimed: progress.claimed,
        };
    }

    async claimReward(userId: string, missionId: string) {
        const mission = await this.missionModel.findById(missionId).exec();
        if (!mission) throw new NotFoundException('Mission not found');

        const cycleKey = this.getCycleKey(mission.type);
        const progress = await this.progressModel.findOne({
            userId: new Types.ObjectId(userId),
            missionId: new Types.ObjectId(missionId),
            cycleKey,
        }).exec();

        if (!progress || !progress.completed) {
            throw new BadRequestException('Mission not completed yet');
        }
        if (progress.claimed) {
            throw new BadRequestException('Reward already claimed');
        }

        progress.claimed = true;
        progress.claimedAt = new Date();
        await progress.save();

        if (mission.rewardType === 'xp' && mission.rewardAmount > 0) {
            this.eventEmitter.emit('mission.completed', {
                userId,
                missionId: mission._id.toString(),
                xpReward: mission.rewardAmount,
                eventId: `mission_claim_${userId}_${mission._id.toString()}_${cycleKey}`,
            });
        }

        return {
            rewardType: mission.rewardType,
            rewardAmount: mission.rewardAmount,
            claimed: true,
        };
    }

    async getActiveCount(userId: string): Promise<number> {
        const missions = await this.missionModel.find({ isActive: true }).lean().exec();
        let unclaimed = 0;
        for (const m of missions) {
            const cycleKey = this.getCycleKey((m as any).type);
            const prog = await this.progressModel.findOne({
                userId: new Types.ObjectId(userId),
                missionId: (m as any)._id,
                cycleKey,
            }).lean().exec();
            if (!prog || !prog.claimed) unclaimed++;
        }
        return unclaimed;
    }

    // ── Admin CRUD ─────────────────────────────────────────────

    async create(dto: CreateMissionDto): Promise<Mission> {
        return new this.missionModel(dto).save();
    }

    async findAll(): Promise<Mission[]> {
        return this.missionModel.find().sort({ type: 1, sortOrder: 1 }).exec();
    }

    async findOne(id: string): Promise<Mission> {
        const mission = await this.missionModel.findById(id).exec();
        if (!mission) throw new NotFoundException(`Mission ${id} not found`);
        return mission;
    }

    async update(id: string, dto: UpdateMissionDto): Promise<Mission> {
        const updated = await this.missionModel.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!updated) throw new NotFoundException(`Mission ${id} not found`);
        return updated;
    }

    async remove(id: string): Promise<Mission> {
        const deleted = await this.missionModel.findByIdAndDelete(id).exec();
        if (!deleted) throw new NotFoundException(`Mission ${id} not found`);
        return deleted;
    }

    // ── Seed ───────────────────────────────────────────────────

    async seed() {
        const count = await this.missionModel.countDocuments().exec();
        if (count > 0) return { message: `Already seeded (${count} missions exist)` };

        const missions: CreateMissionDto[] = [
            // Daily — Individual
            {
                title: 'Arena Warrior',
                description: 'Play 3 competitive matches on Arena Chain.',
                type: 'daily', scope: 'individual', game: 'all',
                criteria: { type: 'play_match', target: 3 },
                rewardType: 'xp', rewardAmount: 150,
                iconColor: '#00ff87', sortOrder: 1,
            },
            {
                title: 'Training Day',
                description: 'Complete 2 aim training sessions in the Training Lab.',
                type: 'daily', scope: 'individual', game: 'all',
                criteria: { type: 'complete_training', target: 2 },
                rewardType: 'xp', rewardAmount: 100,
                iconColor: '#22d3ee', sortOrder: 2,
            },
            {
                title: 'Rift Walker',
                description: 'Play 1 League of Legends match on the platform.',
                type: 'daily', scope: 'individual', game: 'lol',
                criteria: { type: 'play_match', target: 1 },
                rewardType: 'xp', rewardAmount: 100,
                iconColor: '#0bc6e3', sortOrder: 3,
            },
            {
                title: 'Valorant Agent',
                description: 'Play 1 Valorant match on Arena Chain.',
                type: 'daily', scope: 'individual', game: 'valorant',
                criteria: { type: 'play_match', target: 1 },
                rewardType: 'xp', rewardAmount: 100,
                iconColor: '#ff4654', sortOrder: 4,
            },
            // Daily — Friends
            {
                title: 'Battle Buddies',
                description: 'Play 2 matches with a friend in your party.',
                type: 'daily', scope: 'friends', game: 'all',
                criteria: { type: 'play_with_friends', target: 2 },
                rewardType: 'xp', rewardAmount: 200,
                iconColor: '#a855f7', sortOrder: 5,
            },
            {
                title: 'Social Spark',
                description: 'Send a friend request to a new player.',
                type: 'daily', scope: 'friends', game: 'all',
                criteria: { type: 'send_friend_request', target: 1 },
                rewardType: 'xp', rewardAmount: 50,
                iconColor: '#f59e0b', sortOrder: 6,
            },
            // Weekly — Individual
            {
                title: 'Arena Gladiator',
                description: 'Play and complete 25 competitive matches across any supported game on Arena Chain.',
                type: 'weekly', scope: 'individual', game: 'all',
                criteria: { type: 'play_match', target: 25 },
                rewardType: 'tokens', rewardAmount: 1500,
                iconColor: '#a855f7', sortOrder: 1,
            },
            {
                title: 'Valorant Specialist',
                description: 'Play 10 Valorant matches on Arena Chain this week.',
                type: 'weekly', scope: 'individual', game: 'valorant',
                criteria: { type: 'play_match', target: 10 },
                rewardType: 'tokens', rewardAmount: 800,
                iconColor: '#ff4654', sortOrder: 2,
            },
            {
                title: 'Aim Master',
                description: 'Complete 10 training sessions this week.',
                type: 'weekly', scope: 'individual', game: 'all',
                criteria: { type: 'complete_training', target: 10 },
                rewardType: 'tokens', rewardAmount: 500,
                iconColor: '#22d3ee', sortOrder: 3,
            },
            // Weekly — Friends
            {
                title: 'Squad Goals',
                description: 'Play 10 matches with friends in your party this week.',
                type: 'weekly', scope: 'friends', game: 'all',
                criteria: { type: 'play_with_friends', target: 10 },
                rewardType: 'tokens', rewardAmount: 1000,
                iconColor: '#a855f7', sortOrder: 4,
            },
            {
                title: 'Friendship Drive',
                description: 'Add 3 new friends on Arena Chain this week.',
                type: 'weekly', scope: 'friends', game: 'all',
                criteria: { type: 'add_friend', target: 3 },
                rewardType: 'tokens', rewardAmount: 400,
                iconColor: '#f59e0b', sortOrder: 5,
            },
        ];

        await this.missionModel.insertMany(missions);
        return { message: `Seeded ${missions.length} missions` };
    }
}
