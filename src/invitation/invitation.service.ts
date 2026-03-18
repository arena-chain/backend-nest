import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invitation, InvitationDocument, InvitationStatus, InvitationType } from './schemas/invitation.schema';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { TournementsService } from '../tournements/tournements.service';
import { LeagueRegistrationService } from '../league-registration/league-registration.service';
import { TeamManagerService } from '../team-manager/team-manager.service';

@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(Invitation.name) private invitationModel: Model<InvitationDocument>,
    private readonly tournamentService: TournementsService,
    private readonly registrationService: LeagueRegistrationService,
    private readonly teamManagerService: TeamManagerService,
  ) {}

  async create(dto: CreateInvitationDto, senderId: string): Promise<Invitation> {
    if (dto.type === InvitationType.TOURNAMENT && !dto.tournamentId) {
      throw new BadRequestException('tournamentId is required when type is TOURNAMENT');
    }
    if (dto.type === InvitationType.LEAGUE_SEASON && !dto.seasonId) {
      throw new BadRequestException('seasonId is required when type is LEAGUE_SEASON');
    }

    const invitation = new this.invitationModel({
      teamId: new Types.ObjectId(dto.teamId),
      type: dto.type,
      tournamentId: dto.tournamentId ? new Types.ObjectId(dto.tournamentId) : undefined,
      seasonId: dto.seasonId ? new Types.ObjectId(dto.seasonId) : undefined,
      senderId: new Types.ObjectId(senderId),
      status: InvitationStatus.PENDING,
      message: dto.message,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    return invitation.save();
  }

  async findOne(id: string): Promise<Invitation> {
    const inv = await this.invitationModel
      .findById(id)
      .populate('teamId', 'name tag logo')
      .populate('tournamentId', 'name startDate endDate')
      .populate('seasonId', 'name startDate endDate leagueId')
      .populate('senderId', 'nickname email')
      .exec();
    if (!inv) throw new NotFoundException(`Invitation ${id} not found`);
    return inv;
  }

  async findByTeam(teamId: string, status?: InvitationStatus): Promise<Invitation[]> {
    const filter: any = { teamId: new Types.ObjectId(teamId) };
    if (status) filter.status = status;
    return this.invitationModel
      .find(filter)
      .populate('tournamentId', 'name startDate endDate')
      .populate('seasonId', 'name startDate endDate leagueId')
      .populate('senderId', 'nickname email')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Invitations for teams managed by this team manager.
   * Used by team manager to consult their invitations.
   */
  async findByTeamManager(teamManagerUserId: string, status?: InvitationStatus): Promise<Invitation[]> {
    const profile = await this.teamManagerService.findByUserId(teamManagerUserId);
    const teamIds = profile.managedTeams?.map((t) => t.toString()) ?? [];
    if (teamIds.length === 0) return [];

    const filter: any = { teamId: { $in: teamIds.map((id) => new Types.ObjectId(id)) } };
    if (status) filter.status = status;

    return this.invitationModel
      .find(filter)
      .populate('teamId', 'name tag logo')
      .populate('tournamentId', 'name startDate endDate')
      .populate('seasonId', 'name startDate endDate leagueId')
      .populate('senderId', 'nickname email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async accept(id: string, teamManagerUserId: string): Promise<Invitation> {
    const inv = await this.invitationModel.findById(id).exec();
    if (!inv) throw new NotFoundException(`Invitation ${id} not found`);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is already ${inv.status}`);
    }
    if (inv.expiresAt && new Date() > inv.expiresAt) {
      inv.status = InvitationStatus.EXPIRED;
      await inv.save();
      throw new BadRequestException('Invitation has expired');
    }

    const profile = await this.teamManagerService.findByUserId(teamManagerUserId);
    const managesTeam = profile.managedTeams?.some((t) => t.toString() === inv.teamId.toString());
    if (!managesTeam) {
      throw new ForbiddenException('You do not manage this team');
    }

    if (inv.type === InvitationType.TOURNAMENT && inv.tournamentId) {
      await this.tournamentService.registerTeam(inv.tournamentId.toString(), inv.teamId.toString());
    } else if (inv.type === InvitationType.LEAGUE_SEASON && inv.seasonId) {
      await this.registrationService.register({
        seasonId: inv.seasonId.toString(),
        teamId: inv.teamId.toString(),
      });
    } else {
      throw new BadRequestException('Invalid invitation target');
    }

    inv.status = InvitationStatus.ACCEPTED;
    inv.respondedAt = new Date();
    inv.respondedBy = new Types.ObjectId(teamManagerUserId);
    await inv.save();

    return this.findOne(id);
  }

  async decline(id: string, teamManagerUserId: string): Promise<Invitation> {
    const inv = await this.invitationModel.findById(id).exec();
    if (!inv) throw new NotFoundException(`Invitation ${id} not found`);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is already ${inv.status}`);
    }

    const profile = await this.teamManagerService.findByUserId(teamManagerUserId);
    const managesTeam = profile.managedTeams?.some((t) => t.toString() === inv.teamId.toString());
    if (!managesTeam) {
      throw new ForbiddenException('You do not manage this team');
    }

    inv.status = InvitationStatus.DECLINED;
    inv.respondedAt = new Date();
    inv.respondedBy = new Types.ObjectId(teamManagerUserId);
    await inv.save();

    return this.findOne(id);
  }

  async findAll(status?: InvitationStatus): Promise<Invitation[]> {
    const filter: any = {};
    if (status) filter.status = status;
    return this.invitationModel
      .find(filter)
      .populate('teamId', 'name tag logo')
      .populate('tournamentId', 'name startDate endDate')
      .populate('seasonId', 'name startDate endDate leagueId')
      .populate('senderId', 'nickname email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.invitationModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Invitation ${id} not found`);
  }
}
