import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { League, LeagueStatus } from './schemas/league.schema';
import { LeagueParticipant } from './schemas/league-participant.schema';
import { CreateLeagueDto } from './dto/create-league.dto';
import { PlayerService } from '../player/player.service';
import { TicketsService } from '../tickets/tickets.service';
import { TicketCategory } from '../tickets/schemas/ticket.schema';

@Injectable()
export class LeagueService {
  constructor(
    @InjectModel(League.name) private leagueModel: Model<League>,
    @InjectModel(LeagueParticipant.name)
    private participantModel: Model<LeagueParticipant>,
    private playerService: PlayerService,
    private ticketsService: TicketsService,
  ) {}

  async create(
    createLeagueDto: CreateLeagueDto,
    adminId: string,
  ): Promise<League> {
    const league = new this.leagueModel({
      ...createLeagueDto,
      createdBy: new Types.ObjectId(adminId),
      status: LeagueStatus.UPCOMING,
    });
    const savedLeague = await league.save();

    // Automatically generate the Standard Ticket for this League
    await this.ticketsService.createStandardTicket(savedLeague._id.toString());

    return savedLeague;
  }

  async findAll(query?: any): Promise<League[]> {
    return this.leagueModel.find(query).exec();
  }

  async findMyLeagues(userId: string): Promise<League[]> {
    const participations = await this.participantModel
      .find({ playerId: new Types.ObjectId(userId) })
      .exec();
    const leagueIds = participations.map((p) => p.leagueId);
    return this.leagueModel.find({ _id: { $in: leagueIds } }).exec();
  }

  async findOne(id: string): Promise<League> {
    const league = await this.leagueModel.findById(id).exec();
    if (!league) throw new NotFoundException('League not found');
    return league;
  }

  async update(id: string, updateData: any): Promise<League> {
    const league = await this.leagueModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!league) throw new NotFoundException('League not found');
    return league;
  }

  async delete(id: string): Promise<void> {
    const league = await this.findOne(id);
    await this.participantModel.deleteMany({ leagueId: league._id }).exec();
    await this.leagueModel.findByIdAndDelete(id).exec();
  }

  async addSupervisors(id: string, moderatorIds: string[]): Promise<League> {
    const league = await this.findOne(id);
    const objectIds = moderatorIds.map((mId) => new Types.ObjectId(mId));
    league.supervisedBy = [
      ...new Set([
        ...league.supervisedBy.map((s) => s.toString()),
        ...moderatorIds,
      ]),
    ].map((id) => new Types.ObjectId(id));
    return league.save();
  }

  async registerParticipant(
    leagueId: string,
    userId: string,
    categoryInput?: string,
  ): Promise<LeagueParticipant> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        'Your session is invalid or has expired. Please log out and log in again.',
      );
    }

    if (!Types.ObjectId.isValid(leagueId)) {
      throw new BadRequestException('League reference is invalid.');
    }

    const league = await this.findOne(leagueId);

    // 1. Check if league is still open
    if (league.status !== LeagueStatus.UPCOMING) {
      throw new BadRequestException(
        `Registration for this league is ${league.status.toLowerCase()}.`,
      );
    }

    // 2. Profile Check/Init
    const playerIdObj = new Types.ObjectId(userId);
    let playerProfile;

    try {
      playerProfile = await this.playerService.findByUserId(playerIdObj);
    } catch (error) {
      // Profile not found - try to auto-init
      console.log(`Auto-initializing profile for user ${userId}`);
      try {
        playerProfile = await this.playerService.create(playerIdObj, {
          isPro: false,
          isVerified: false,
        });
      } catch (createError) {
        console.error('Profile creation failed:', createError);
        // Last ditch effort: if creation fails due to unique constraint, try fetching one last time
        if (createError.code === 11000) {
          playerProfile = await this.playerService.findByUserId(playerIdObj);
        } else {
          throw new BadRequestException(
            'Unable to initialize your player profile. Please contact support.',
          );
        }
      }
    }

    // Check ELO eligibility
    const requiredElo = league.minElo || 0;
    const playerElo = playerProfile.elo || 0;
    if (playerElo < requiredElo) {
      throw new BadRequestException(
        `Minimum ELO required is ${requiredElo}. You have ${playerElo}.`,
      );
    }

    // 3. Check if already registered (This enforces "One use per gamer" for Standard Ticket)
    const leagueIdObj = new Types.ObjectId(leagueId);

    const existing = await this.participantModel
      .findOne({
        leagueId: leagueIdObj,
        playerId: playerIdObj,
      })
      .exec();

    if (existing) {
      throw new BadRequestException(
        'You are already registered for this league',
      );
    }

    // 4. Check capacity
    const count = await this.participantModel.countDocuments({
      leagueId: leagueIdObj,
    });
    if (count >= league.maxParticipants) {
      throw new BadRequestException(
        `League is full (${league.maxParticipants} participants max)`,
      );
    }

    // 5. Create participant record
    const participant = new this.participantModel({
      leagueId: leagueIdObj,
      playerId: playerIdObj,
    });

    const savedParticipant = await participant.save();

    // 6. Create a specific Ticket instance for this user based on selected category
    let category = TicketCategory.STANDARD;
    let typeName = 'League Entry';
    
    // Check if the selected category is one of the league's dynamic ticket types
    const selectedType = Array.isArray(league.ticketTypes) 
      ? league.ticketTypes.find(t => (t.name || t.type) === categoryInput)
      : null;
      
    if (selectedType) {
        typeName = selectedType.name || selectedType.type;
        // If the type name includes "NFT" or is explicitly marked as NFT, set category to NFT
        if (typeName.toUpperCase().includes('NFT') || selectedType.category === 'NFT') {
            category = TicketCategory.NFT;
        }
    } else if (categoryInput === 'NFT') {
        category = TicketCategory.NFT;
        typeName = 'NFT League Pass';
    }

    await this.ticketsService.createTicketInstance({
        league: leagueId,
        user: userId,
        category: category,
        type: typeName,
        quantity: 1
    });

    return savedParticipant;
  }

  async getStandings(leagueId: string): Promise<LeagueParticipant[]> {
    return this.participantModel
      .find({ leagueId: new Types.ObjectId(leagueId) })
      .sort({ rankPoints: -1, wins: -1 })
      .populate('playerId', 'nickname email region avatar')
      .exec();
  }

  async processLeagueRewards(leagueId: string): Promise<void> {
    const league = await this.findOne(leagueId);
    if (league.status !== LeagueStatus.FINISHED) {
      throw new BadRequestException('League is not finished yet');
    }
    if (league.rewardsDistributed) {
      throw new BadRequestException('Rewards already distributed');
    }

    const standings = await this.getStandings(leagueId);

    for (let i = 0; i < standings.length; i++) {
      const participant = standings[i];
      const rank = i + 1;

      // Find matching reward configuration
      const rewardCfg = league.rewards.find((r) => r.rank === rank);

      if (rewardCfg && participant.playerId) {
        // Update player profile with points
        const profile = await this.playerService.findByUserId(
          participant.playerId.toString(),
        );
        const currentPoints = Number(profile.stats?.points || 0);
        await this.playerService.update(participant.playerId.toString(), {
          stats: {
            ...(profile.stats || {}),
            points: currentPoints + rewardCfg.points,
          },
        });

        // In a real app, you'd also log this prize or send a notification
        console.log(
          `User ${participant.playerId} awarded ${rewardCfg.prize} and ${rewardCfg.points} points for rank ${rank}`,
        );
      }
    }

    league.rewardsDistributed = true;
    await league.save();
  }

  /**
   * Automatically called when a match associated with this league is finished.
   */
  async processMatchResult(
    leagueId: string,
    winnerId: string,
    loserId: string,
    isDraw: boolean,
  ): Promise<void> {
    const participants = await this.participantModel
      .find({
        leagueId: new Types.ObjectId(leagueId),
        playerId: {
          $in: [new Types.ObjectId(winnerId), new Types.ObjectId(loserId)],
        },
      })
      .exec();

    for (const p of participants) {
      p.matchesPlayed += 1;
      if (isDraw) {
        p.draws += 1;
        p.rankPoints += 1; // 1 point for draw
      } else if (p.playerId.toString() === winnerId) {
        p.wins += 1;
        p.rankPoints += 3; // 3 points for win
      } else {
        p.losses += 1;
        p.rankPoints += 0; // 0 points for loss
      }
      await p.save();
    }
  }
}
