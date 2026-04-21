import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SeasonTeam,
  SeasonTeamDocument,
  SeasonTeamStatus,
} from './schemas/season-team.schema';
import {
  SeasonRule,
  LeagueRuleDocument,
} from '../season-rule/schemas/season-rule.schema';
import { SeasonService } from '../season/season.service';
import { StandingsService } from '../standings/standings.service';
import { SeasonStatus } from '../season/schemas/season.schema';
import { CreateLeagueRegistrationDto } from './dto/create-league-registration.dto';
import { UpdateLeagueRegistrationDto } from './dto/update-league-registration.dto';
import { Team, TeamDocument } from '../team/schemas/team.schema';
import { SeasonRosterService } from '../season-roster/season-roster.service';

@Injectable()
export class LeagueRegistrationService {
  constructor(
    @InjectModel(SeasonTeam.name)
    private readonly seasonTeamModel: Model<SeasonTeamDocument>,
    @InjectModel(SeasonRule.name)
    private readonly leagueRuleModel: Model<LeagueRuleDocument>,
    @InjectModel(Team.name)
    private readonly teamModel: Model<TeamDocument>,
    private readonly seasonService: SeasonService,
    private readonly standingsService: StandingsService,
    private readonly rosterService: SeasonRosterService,
  ) {}

  async register(dto: CreateLeagueRegistrationDto): Promise<SeasonTeam> {
    const season = await this.seasonService.findOne(dto.seasonId);

    if (season.status === SeasonStatus.FINISHED) {
      throw new BadRequestException(
        'Cannot register: this season is already finished',
      );
    }
    if (season.status === SeasonStatus.ONGOING) {
      throw new BadRequestException(
        'Cannot register: the season has already started',
      );
    }
    if (new Date() > new Date(season.registrationDeadline)) {
      throw new BadRequestException(
        'Cannot register: registration deadline has passed',
      );
    }

    const rule = await this.leagueRuleModel.findById(season.rulesId).exec();
    if (!rule) {
      throw new BadRequestException(
        `No rule set found for this season (rulesId: ${season.rulesId})`,
      );
    }

    const activeCount = await this.countActive(dto.seasonId);
    if (activeCount >= rule.maxTeams) {
      throw new BadRequestException(
        `Season is full: maximum of ${rule.maxTeams} teams allowed`,
      );
    }

    const existing = await this.seasonTeamModel.findOne({
      seasonId: dto.seasonId,
      teamId: dto.teamId,
    });
    if (existing) {
      throw new ConflictException('Team is already registered for this season');
    }

    const entry = await new this.seasonTeamModel({
      ...dto,
      status: dto.status ?? SeasonTeamStatus.ACTIVE,
    }).save();

    await this.standingsService.initTeamStandings(dto.seasonId, dto.teamId);

    // Auto-create an empty roster for this team in the season
    await this.rosterService
      .create({
        seasonId: dto.seasonId,
        teamId: dto.teamId,
        minRosterSize: 5,
        maxRosterSize: 7,
      })
      .catch(() => {
        /* roster may already exist */
      });

    return entry;
  }

  async findAll(): Promise<SeasonTeam[]> {
    return this.seasonTeamModel.find().sort({ seasonId: 1, seed: 1 }).exec();
  }

  async findBySeason(seasonId: string): Promise<SeasonTeam[]> {
    return this.seasonTeamModel.find({ seasonId }).sort({ seed: 1 }).exec();
  }

  async findOne(id: string): Promise<SeasonTeam> {
    const entry = await this.seasonTeamModel.findById(id);
    if (!entry)
      throw new NotFoundException('Season team registration not found');
    return entry;
  }

  async updateStatus(
    id: string,
    dto: UpdateLeagueRegistrationDto,
  ): Promise<SeasonTeam> {
    const entry = await this.seasonTeamModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!entry)
      throw new NotFoundException('Season team registration not found');
    return entry;
  }

  async withdraw(id: string): Promise<SeasonTeam> {
    const entry = await this.seasonTeamModel.findByIdAndUpdate(
      id,
      { status: SeasonTeamStatus.WITHDRAWN },
      { new: true },
    );
    if (!entry)
      throw new NotFoundException('Season team registration not found');
    return entry;
  }

  async disqualify(id: string): Promise<SeasonTeam> {
    const entry = await this.seasonTeamModel.findByIdAndUpdate(
      id,
      { status: SeasonTeamStatus.DISQUALIFIED },
      { new: true },
    );
    if (!entry)
      throw new NotFoundException('Season team registration not found');
    return entry;
  }

  async disqualifyBySeasonAndTeam(
    seasonId: string,
    teamId: string,
  ): Promise<SeasonTeam | null> {
    return this.seasonTeamModel.findOneAndUpdate(
      { seasonId, teamId },
      { status: SeasonTeamStatus.DISQUALIFIED },
      { new: true },
    );
  }

  async countActive(seasonId: string): Promise<number> {
    return this.seasonTeamModel.countDocuments({
      seasonId,
      status: SeasonTeamStatus.ACTIVE,
    });
  }

  async getSeasonTeamsWithPlayers(seasonId: string): Promise<any[]> {
    const registrations = await this.seasonTeamModel
      .find({ seasonId, status: SeasonTeamStatus.ACTIVE })
      .sort({ seed: 1 })
      .exec();

    if (registrations.length === 0) return [];

    const teamIds = registrations
      .map((r) => r.teamId)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const teams = await this.teamModel
      .find({ _id: { $in: teamIds } })
      .populate({
        path: 'members',
        model: 'User',
        select: 'nickname avatar email country',
      })
      .exec();

    return registrations.map((reg) => ({
      registration: {
        _id: reg._id,
        seed: reg.seed,
        status: reg.status,
        qualifiedFromSeasonId: reg.qualifiedFromSeasonId,
        qualifiedViaRank: reg.qualifiedViaRank,
      },
      team: teams.find((t) => t._id.toString() === reg.teamId) ?? null,
    }));
  }
}
