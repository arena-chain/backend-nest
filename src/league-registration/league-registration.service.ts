import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SeasonTeam, SeasonTeamDocument, SeasonTeamStatus } from './schemas/season-team.schema';
import { SeasonRule, LeagueRuleDocument } from '../season-rule/schemas/season-rule.schema';
import { SeasonService } from '../season/season.service';
import { StandingsService } from '../standings/standings.service';
import { SeasonStatus } from '../season/schemas/season.schema';
import { CreateLeagueRegistrationDto } from './dto/create-league-registration.dto';
import { UpdateLeagueRegistrationDto } from './dto/update-league-registration.dto';

@Injectable()
export class LeagueRegistrationService {
    constructor(
        @InjectModel(SeasonTeam.name)
        private readonly seasonTeamModel: Model<SeasonTeamDocument>,
        @InjectModel(SeasonRule.name)
        private readonly leagueRuleModel: Model<LeagueRuleDocument>,
        private readonly seasonService: SeasonService,
        private readonly standingsService: StandingsService,
    ) {}

    async register(dto: CreateLeagueRegistrationDto): Promise<SeasonTeam> {
        const season = await this.seasonService.findOne(dto.seasonId);

        if (season.status === SeasonStatus.FINISHED) {
            throw new BadRequestException('Cannot register: this season is already finished');
        }
        if (season.status === SeasonStatus.ONGOING) {
            throw new BadRequestException('Cannot register: the season has already started');
        }
        if (new Date() > new Date(season.registrationDeadline)) {
            throw new BadRequestException('Cannot register: registration deadline has passed');
        }

        const rule = await this.leagueRuleModel.findById(season.rulesId).exec();
        if (!rule) {
            throw new BadRequestException(`No rule set found for this season (rulesId: ${season.rulesId})`);
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

        // Auto-init standings row for this team in the season
        await this.standingsService.initTeamStandings(dto.seasonId, dto.teamId);

        return entry;
    }

    async findBySeason(seasonId: string): Promise<SeasonTeam[]> {
        return this.seasonTeamModel.find({ seasonId }).sort({ seed: 1 }).exec();
    }

    async findOne(id: string): Promise<SeasonTeam> {
        const entry = await this.seasonTeamModel.findById(id);
        if (!entry) throw new NotFoundException('Season team registration not found');
        return entry;
    }

    async updateStatus(id: string, dto: UpdateLeagueRegistrationDto): Promise<SeasonTeam> {
        const entry = await this.seasonTeamModel.findByIdAndUpdate(id, dto, { new: true });
        if (!entry) throw new NotFoundException('Season team registration not found');
        return entry;
    }

    async withdraw(id: string): Promise<SeasonTeam> {
        const entry = await this.seasonTeamModel.findByIdAndUpdate(
            id,
            { status: SeasonTeamStatus.WITHDRAWN },
            { new: true },
        );
        if (!entry) throw new NotFoundException('Season team registration not found');
        return entry;
    }

    async disqualify(id: string): Promise<SeasonTeam> {
        const entry = await this.seasonTeamModel.findByIdAndUpdate(
            id,
            { status: SeasonTeamStatus.DISQUALIFIED },
            { new: true },
        );
        if (!entry) throw new NotFoundException('Season team registration not found');
        return entry;
    }

    async disqualifyBySeasonAndTeam(seasonId: string, teamId: string): Promise<SeasonTeam | null> {
        return this.seasonTeamModel.findOneAndUpdate(
            { seasonId, teamId },
            { status: SeasonTeamStatus.DISQUALIFIED },
            { new: true },
        );
    }

    async countActive(seasonId: string): Promise<number> {
        return this.seasonTeamModel.countDocuments({ seasonId, status: SeasonTeamStatus.ACTIVE });
    }
}
