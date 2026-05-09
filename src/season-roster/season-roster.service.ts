import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SeasonRoster,
  SeasonRosterDocument,
  RosterStatus,
} from './schemas/season-roster.schema';
import { CreateSeasonRosterDto } from './dto/create-season-roster.dto';

@Injectable()
export class SeasonRosterService {
  constructor(
    @InjectModel(SeasonRoster.name)
    private readonly rosterModel: Model<SeasonRosterDocument>,
  ) {}

  async create(dto: CreateSeasonRosterDto): Promise<SeasonRoster> {
    const existing = await this.rosterModel.findOne({
      seasonId: dto.seasonId,
      teamId: dto.teamId,
    });
    if (existing)
      throw new ConflictException(
        'Roster already exists for this team in this season.',
      );
    return this.rosterModel.create(dto);
  }

  async addPlayer(
    seasonId: string,
    teamId: string,
    playerId: string,
  ): Promise<SeasonRoster> {
    const roster = await this.rosterModel.findOne({ seasonId, teamId });
    if (!roster) throw new NotFoundException('Roster not found.');
    if (roster.status === RosterStatus.LOCKED) {
      throw new BadRequestException(
        'Roster is locked. Cannot add players after the registration deadline.',
      );
    }
    if (roster.playerIds.length >= roster.maxRosterSize) {
      throw new BadRequestException(
        `Roster is full. Max roster size is ${roster.maxRosterSize}.`,
      );
    }
    const pid = new Types.ObjectId(playerId);
    if (roster.playerIds.some((id) => id.equals(pid))) {
      throw new ConflictException('Player is already on this roster.');
    }
    roster.playerIds.push(pid);
    return roster.save();
  }

  async removePlayer(
    seasonId: string,
    teamId: string,
    playerId: string,
  ): Promise<SeasonRoster> {
    const roster = await this.rosterModel.findOne({ seasonId, teamId });
    if (!roster) throw new NotFoundException('Roster not found.');
    if (roster.status === RosterStatus.LOCKED) {
      throw new BadRequestException(
        'Roster is locked. Cannot remove players after the registration deadline.',
      );
    }
    const pid = new Types.ObjectId(playerId);
    roster.playerIds = roster.playerIds.filter((id) => !id.equals(pid));
    return roster.save();
  }

  async lockRoster(seasonId: string, teamId: string): Promise<SeasonRoster> {
    const roster = await this.rosterModel.findOne({ seasonId, teamId });
    if (!roster) throw new NotFoundException('Roster not found.');
    if (roster.playerIds.length < roster.minRosterSize) {
      throw new BadRequestException(
        `Cannot lock: roster has ${roster.playerIds.length} players, minimum is ${roster.minRosterSize}.`,
      );
    }
    roster.status = RosterStatus.LOCKED;
    roster.lockedAt = new Date();
    return roster.save();
  }

  async lockAllForSeason(seasonId: string): Promise<number> {
    const rosters = await this.rosterModel.find({
      seasonId,
      status: RosterStatus.OPEN,
    });
    let locked = 0;
    for (const roster of rosters) {
      if (roster.playerIds.length >= roster.minRosterSize) {
        roster.status = RosterStatus.LOCKED;
        roster.lockedAt = new Date();
        await roster.save();
        locked++;
      }
    }
    return locked;
  }

  async findBySeason(seasonId: string): Promise<SeasonRoster[]> {
    return this.rosterModel.find({ seasonId }).populate('playerIds').exec();
  }

  async findByTeamAndSeason(
    seasonId: string,
    teamId: string,
  ): Promise<SeasonRoster | null> {
    return this.rosterModel
      .findOne({ seasonId, teamId })
      .populate('playerIds')
      .exec();
  }
}
