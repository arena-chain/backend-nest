import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GameParty, GamePartyDocument } from './schemas/game-party.schema';
import {
  PlayerGameProfile,
  PlayerGameProfileDocument,
} from '../player/schemas/player-game-profile.schema';
import {
  PlayerProfile,
  PlayerProfileDocument,
} from '../player/schemas/player-profile.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { FriendshipService } from '../friendship/friendship.service';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { Catalog, CatalogDocument } from '../catalog/schemas/catalog.entity';

type PartyMode = 'CUSTOM_1V1' | 'CUSTOM_2V2' | 'RANKED_5V5';
type PartyStatus =
  | 'FORMING'
  | 'READY'
  | 'IN_QUEUE'
  | 'MATCHED'
  | 'IN_GAME'
  | 'DISSOLVED';

export interface PartyMemberDto {
  userId: string;
  role: 'LEADER' | 'MEMBER';
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'LEFT';
  joinedAt?: Date;
}

export interface PartyDto {
  id: string;
  gameId: string;
  hostUserId: string;
  mode: PartyMode;
  status: PartyStatus;
  maxMembers: number;
  members: PartyMemberDto[];
  createdAt?: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

@Injectable()
export class PartyService {
  private readonly logger = new Logger(PartyService.name);

  private readonly MODE_MAX_MEMBERS: Record<PartyMode, number> = {
    CUSTOM_1V1: 1,
    CUSTOM_2V2: 2,
    RANKED_5V5: 5,
  };

  constructor(
    @InjectModel(GameParty.name)
    private readonly gamePartyModel: Model<GamePartyDocument>,
    @InjectModel(PlayerGameProfile.name)
    private readonly playerGameProfileModel: Model<PlayerGameProfileDocument>,
    @InjectModel(PlayerProfile.name)
    private readonly playerProfileModel: Model<PlayerProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Catalog.name)
    private readonly catalogModel: Model<CatalogDocument>,
    @Inject(forwardRef(() => FriendshipService))
    private readonly friendshipService: FriendshipService,
    @Inject(forwardRef(() => MatchmakingService))
    private readonly matchmakingService: MatchmakingService,
  ) {}

  async createParty(
    hostUserId: string,
    gameId?: string,
    mode?: string,
    game?: string,
  ): Promise<PartyDto> {
    const normalizedMode = this.normalizeMode(mode);
    const typedMode = normalizedMode as PartyMode;
    if (!(normalizedMode in this.MODE_MAX_MEMBERS)) {
      throw new BadRequestException(`Invalid mode: ${mode}`);
    }

    const resolvedGameId = await this.resolveGameId(gameId, game);
    if (!resolvedGameId) {
      // Last-resort fallback: pick any active catalog game so party create
      // does not hard-fail in local environments with incomplete game mapping.
      const anyActive = await this.catalogModel.findOne({ isActive: true });
      if (!anyActive) {
        throw new BadRequestException(
          'No active game found in catalog. Please seed catalog data.',
        );
      }
      this.logger.warn(
        `Could not resolve game "${game ?? gameId}". Falling back to active catalog game ${anyActive._id.toString()}`,
      );
      return this.createParty(
        hostUserId,
        anyActive._id.toString(),
        typedMode,
        game,
      );
    }

    const maxMembers = this.MODE_MAX_MEMBERS[typedMode];
    const now = new Date();

    const party = await this.gamePartyModel.create({
      gameId: new Types.ObjectId(resolvedGameId),
      hostUserId: new Types.ObjectId(hostUserId),
      mode: typedMode,
      maxMembers,
      status: 'FORMING',
      members: [
        {
          userId: new Types.ObjectId(hostUserId),
          role: 'LEADER',
          status: 'ACCEPTED',
          joinedAt: now,
        },
      ],
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
      lastActivityAt: now,
    });

    this.logger.log(
      `Party created: ${party._id.toString()} | host=${hostUserId} | game=${resolvedGameId} | mode=${typedMode}`,
    );
    return this.mapPartyToDto(party);
  }

  private normalizeMode(mode?: string): PartyMode {
    if (!mode) return 'CUSTOM_1V1';
    if (mode === 'CUSTOM_5V5') return 'RANKED_5V5';
    if (mode === 'CUSTOM_1V1' || mode === 'CUSTOM_2V2' || mode === 'RANKED_5V5') {
      return mode;
    }
    return 'CUSTOM_1V1';
  }

  private async resolveGameId(
    gameId?: string,
    gameKey?: string,
  ): Promise<string | null> {
    if (gameId) return gameId;
    if (!gameKey) return null;

    const key = gameKey.toLowerCase();
    const aliases: Record<string, string[]> = {
      lol: ['league of legends', 'lol'],
      valorant: ['valorant'],
      cs2: ['counter-strike 2', 'cs2', 'csgo'],
      dota2: ['dota 2', 'dota2'],
    };

    const words = aliases[key] || [key];
    for (const w of words) {
      const game = await this.catalogModel.findOne({
        $or: [
          { title: { $regex: new RegExp(w, 'i') } },
          { genre: { $regex: new RegExp(w, 'i') } },
          { description: { $regex: new RegExp(w, 'i') } },
          { 'metadata.key': { $regex: new RegExp(w, 'i') } },
          { 'metadata.slug': { $regex: new RegExp(w, 'i') } },
          { 'metadata.game': { $regex: new RegExp(w, 'i') } },
        ],
      });
      if (game) return game._id.toString();
    }

    // Final fallback: bootstrap a minimal catalog entry so party flow can work
    // even when catalog seed data is missing in local/dev environments.
    try {
      const canonicalTitle: Record<string, string> = {
        lol: 'League of Legends',
        valorant: 'Valorant',
        cs2: 'Counter-Strike 2',
        dota2: 'Dota 2',
      };
      const title = canonicalTitle[key] || gameKey;
      const created = await this.catalogModel.create({
        title,
        genre: key.toUpperCase(),
        description: `Auto-created catalog entry for ${title}`,
        isActive: true,
        supportsSolo: true,
        metadata: { key, autoCreated: true },
      });
      this.logger.warn(
        `Catalog entry missing for "${gameKey}", auto-created ${created._id.toString()}`,
      );
      return created._id.toString();
    } catch (e) {
      this.logger.error(
        `Failed to auto-create catalog for "${gameKey}": ${(e as Error).message}`,
      );
    }

    return null;
  }

  async inviteMember(
    partyId: string,
    targetUserId: string,
    requestingUserId: string,
  ): Promise<PartyDto> {
    const party = await this.gamePartyModel.findById(partyId);
    if (!party) throw new NotFoundException('Party not found');

    if (party.hostUserId.toString() !== requestingUserId) {
      throw new ForbiddenException('Only host can invite members');
    }

    if (!['FORMING', 'READY'].includes(party.status)) {
      throw new BadRequestException('Party is already in queue or in-game');
    }

    const acceptedCount = party.members.filter(
      (member) => member.status === 'ACCEPTED',
    ).length;
    if (acceptedCount >= party.maxMembers) {
      throw new BadRequestException('Party full');
    }

    const existingMember = party.members.find(
      (member) => member.userId.toString() === targetUserId,
    );
    if (existingMember) {
      throw new BadRequestException('Already in party');
    }

    const areFriends = await this.friendshipService.areFriends(
      requestingUserId,
      targetUserId,
    );
    if (!areFriends) {
      throw new ForbiddenException('Not friends');
    }

    const isVerified = await this.isMemberLinkVerifiedForPartyGame(
      targetUserId,
      party.gameId.toString(),
    );
    if (!isVerified) {
      throw new ForbiddenException(
        `${targetUserId} has not verified their account link for this game`,
      );
    }

    party.members.push({
      userId: new Types.ObjectId(targetUserId),
      role: 'MEMBER',
      status: 'INVITED',
    });
    party.lastActivityAt = new Date();
    await party.save();

    this.logger.log(`Member invited: ${targetUserId} to party ${partyId}`);
    return this.mapPartyToDto(party);
  }

  async respondToInvite(
    partyId: string,
    userId: string,
    accept: boolean,
  ): Promise<PartyDto> {
    const party = await this.gamePartyModel.findById(partyId);
    if (!party) throw new NotFoundException('Party not found');

    const member = party.members.find((m) => m.userId.toString() === userId);
    if (!member) throw new NotFoundException('User not invited');
    if (member.status !== 'INVITED') {
      throw new BadRequestException('Already responded');
    }

    if (accept) {
      member.status = 'ACCEPTED';
      member.joinedAt = new Date();
    } else {
      member.status = 'DECLINED';
    }

    party.lastActivityAt = new Date();
    await party.save();
    this.logger.log(
      `Member ${accept ? 'accepted' : 'declined'} invite: ${userId} in party ${partyId}`,
    );

    return this.mapPartyToDto(party);
  }

  async kickMember(
    partyId: string,
    targetUserId: string,
    requestingUserId: string,
  ): Promise<PartyDto> {
    const party = await this.gamePartyModel.findById(partyId);
    if (!party) throw new NotFoundException('Party not found');

    if (party.hostUserId.toString() !== requestingUserId) {
      throw new ForbiddenException('Only host can kick members');
    }

    const memberIndex = party.members.findIndex(
      (m) => m.userId.toString() === targetUserId,
    );
    if (memberIndex === -1) {
      throw new NotFoundException('User not in party');
    }

    party.members.splice(memberIndex, 1);
    const now = new Date();
    party.lastActivityAt = now;

    if (party.members.length === 1) {
      const remaining = party.members[0];
      if (
        remaining &&
        remaining.userId.toString() === party.hostUserId.toString()
      ) {
        party.status = 'DISSOLVED';
        party.disbandReason = 'last_member_kicked';
        party.disbandedAt = now;
      }
    }

    await party.save();
    this.logger.log(`Member kicked: ${targetUserId} from party ${partyId}`);
    return this.mapPartyToDto(party);
  }

  async leaveParty(partyId: string, userId: string): Promise<void> {
    const party = await this.gamePartyModel.findById(partyId);
    if (!party) throw new NotFoundException('Party not found');

    const memberIndex = party.members.findIndex(
      (m) => m.userId.toString() === userId,
    );
    if (memberIndex === -1) {
      throw new NotFoundException('User not in party');
    }

    const wasLeader = party.members[memberIndex].role === 'LEADER';
    party.members.splice(memberIndex, 1);
    const now = new Date();
    party.lastActivityAt = now;

    if (wasLeader && party.members.length > 0) {
      const nextLeader = party.members.find((m) => m.status === 'ACCEPTED');
      if (nextLeader) {
        nextLeader.role = 'LEADER';
        party.hostUserId = nextLeader.userId;
        this.logger.log(
          `Leadership transferred: party=${partyId} newLeader=${nextLeader.userId.toString()}`,
        );
      } else {
        party.status = 'DISSOLVED';
        party.disbandReason = 'leader_left_no_members';
        party.disbandedAt = now;
      }
    }

    if (party.members.length === 0) {
      party.status = 'DISSOLVED';
      party.disbandReason = 'all_members_left';
      party.disbandedAt = now;
    }

    await party.save();
    this.logger.log(`Member left: ${userId} from party ${partyId}`);
  }

  async markPartyReady(
    partyId: string,
    requestingUserId: string,
  ): Promise<PartyDto> {
    const party = await this.gamePartyModel.findById(partyId);
    if (!party) throw new NotFoundException('Party not found');

    if (party.hostUserId.toString() !== requestingUserId) {
      throw new ForbiddenException('Only host can mark party ready');
    }

    const allAccepted = party.members.every((m) => m.status === 'ACCEPTED');
    if (!allAccepted) {
      throw new BadRequestException('Not all members have accepted');
    }

    party.status = 'READY';
    party.lastActivityAt = new Date();
    await party.save();
    this.logger.log(`Party marked ready: ${partyId}`);
    return this.mapPartyToDto(party);
  }

  async startQueueing(
    partyId: string,
    requestingUserId: string,
    ticketId: string,
  ): Promise<PartyDto> {
    const party = await this.gamePartyModel.findById(partyId);
    if (!party) throw new NotFoundException('Party not found');

    if (party.hostUserId.toString() !== requestingUserId) {
      throw new ForbiddenException('Only host can start queueing');
    }

    if (party.status !== 'READY') {
      throw new BadRequestException('Party must be READY');
    }

    party.status = 'IN_QUEUE';
    party.matchmakingTicketId = new Types.ObjectId(ticketId);
    party.lastActivityAt = new Date();
    await party.save();
    this.logger.log(`Party started queueing: ${partyId} with ticket ${ticketId}`);
    return this.mapPartyToDto(party);
  }

  async matchParty(partyId: string, gameId: string): Promise<PartyDto> {
    const party = await this.gamePartyModel.findById(partyId);
    if (!party) throw new NotFoundException('Party not found');

    party.status = 'MATCHED';
    party.gameId_inProgress = new Types.ObjectId(gameId);
    party.lastActivityAt = new Date();
    await party.save();
    this.logger.log(`Party matched: ${partyId} with game ${gameId}`);
    return this.mapPartyToDto(party);
  }

  async getParty(partyId: string): Promise<PartyDto> {
    const party = await this.gamePartyModel.findById(partyId);
    if (!party) throw new NotFoundException('Party not found');
    return this.mapPartyToDto(party);
  }

  async getPartyByUserId(userId: string): Promise<PartyDto | null> {
    const now = new Date();
    const party = await this.gamePartyModel.findOne({
      'members.userId': new Types.ObjectId(userId),
      status: { $nin: ['DISSOLVED'] },
      expiresAt: { $gt: now },
    });
    return party ? this.mapPartyToDto(party) : null;
  }

  async listUserParties(userId: string): Promise<PartyDto[]> {
    const parties = await this.gamePartyModel
      .find({
        'members.userId': new Types.ObjectId(userId),
        status: { $nin: ['DISSOLVED'] },
      })
      .sort({ createdAt: -1 });

    return parties.map((party) => this.mapPartyToDto(party));
  }

  async expireOldParties(): Promise<number> {
    const now = new Date();
    const result = await this.gamePartyModel.updateMany(
      { status: { $nin: ['DISSOLVED'] }, expiresAt: { $lte: now } },
      {
        $set: {
          status: 'DISSOLVED',
          disbandedAt: now,
          disbandReason: 'ttl_expired',
        },
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Expired ${result.modifiedCount} old parties`);
    }
    return result.modifiedCount;
  }

  private mapPartyToDto(party: GamePartyDocument): PartyDto {
    return {
      id: party._id.toString(),
      gameId: party.gameId.toString(),
      hostUserId: party.hostUserId.toString(),
      mode: party.mode,
      status: party.status,
      maxMembers: party.maxMembers,
      members: party.members.map((member) => ({
        userId: member.userId.toString(),
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt,
      })),
      createdAt: (party as any).createdAt,
      expiresAt: party.expiresAt,
      lastActivityAt: party.lastActivityAt,
    };
  }

  private async isMemberLinkVerifiedForPartyGame(
    userId: string,
    gameId: string,
  ): Promise<boolean> {
    const perGame = await this.playerGameProfileModel.findOne({
      userId: new Types.ObjectId(userId),
      gameId: new Types.ObjectId(gameId),
      linkStatus: 'VERIFIED',
    });
    if (perGame) return true;

    const catalog = await this.catalogModel.findById(gameId).lean();
    const gameText = `${catalog?.title || ''} ${catalog?.genre || ''} ${catalog?.description || ''}`.toLowerCase();
    const isRiotGame = /league|lol|valorant/.test(gameText);

    if (isRiotGame) {
      const profile = await this.playerProfileModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .lean();
      return (
        profile?.riotLinkStatus === 'verified'
      );
    }

    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select('steamVerified steamId')
      .lean();
    return !!(user?.steamVerified || user?.steamId);
  }
}
