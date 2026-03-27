import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTournementDto, TournamentStatus, TournamentType } from './dto/create-tournement.dto';
import { AddTicketTypesDto } from './dto/add-ticket-types.dto';
import { UpdateTournementDto } from './dto/update-tournement.dto';
import { Tournament, TournamentDocument } from './schemas/tournament.schema';
import { FriendshipService } from '../friendship/friendship.service';
import { NotificationService } from '../notification/notification.service';

import { TicketTypeDefinition, TicketTypeDefinitionDocument } from '../tickets/schemas/ticket-type.schema';

@Injectable()
export class TournementsService {
  constructor(
    @InjectModel(Tournament.name) private tournamentModel: Model<TournamentDocument>,
    @InjectModel(TicketTypeDefinition.name) private ticketTypeDefinitionModel: Model<TicketTypeDefinitionDocument>,
    private friendshipService: FriendshipService,
    private notificationService: NotificationService,
  ) { }

  async create(createTournementDto: CreateTournementDto): Promise<Tournament> {
    try {
      // Validate Game ID
      if (!Types.ObjectId.isValid(createTournementDto.gameId)) {
        throw new BadRequestException('Invalid game ID');
      }

      const tournamentData: any = {
        ...createTournementDto,
        gameId: new Types.ObjectId(createTournementDto.gameId),
        currentTeams: 0,
        teams: [],
        phases: [],
        status: TournamentStatus.DRAFT,
        invitations: [],
      };



      const createdTournament = new this.tournamentModel(tournamentData);
      const savedTournament = await createdTournament.save();

      // Send notifications with correct tournament ID


      return savedTournament;
    } catch (error) {
      throw new BadRequestException(`Failed to create tournament: ${error.message}`);
    }
  }

  async findAll(): Promise<Tournament[]> {
    return await this.tournamentModel
      .find()
      .populate('gameId', 'title genre coverImageUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Tournament> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tournament ID');
    }

    const tournament = await this.tournamentModel
      .findById(id)
      .populate('gameId', 'title genre coverImageUrl publisher')
      .populate('teams')
      .exec();

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    return tournament;
  }

  async update(id: string, updateTournementDto: UpdateTournementDto): Promise<Tournament> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tournament ID');
    }

    // Convert string IDs to ObjectIds if present
    const updateData: any = { ...updateTournementDto };
    if (updateData.gameId) {
      updateData.gameId = new Types.ObjectId(updateData.gameId);
    }
    // organizerId is string, no conversion needed

    const updatedTournament = await this.tournamentModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('gameId', 'title genre coverImageUrl')
      .exec();

    if (!updatedTournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    return updatedTournament;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tournament ID');
    }

    const result = await this.tournamentModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    return { message: 'Tournament deleted successfully' };
  }

  // Team Management Methods
  async registerTeam(tournamentId: string, teamId: string): Promise<Tournament> {
    if (!Types.ObjectId.isValid(tournamentId) || !Types.ObjectId.isValid(teamId)) {
      throw new BadRequestException('Invalid tournament or team ID');
    }

    const tournament = await this.tournamentModel.findById(tournamentId);

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    if (!tournament.registrationOpen) {
      throw new BadRequestException('Tournament registration is closed');
    }

    if (tournament.currentTeams >= tournament.maxTeams) {
      throw new BadRequestException('Tournament is full');
    }

    const teamObjectId = new Types.ObjectId(teamId);

    // Check if team is already registered
    if (tournament.teams.some(t => t.toString() === teamId)) {
      throw new BadRequestException('Team is already registered for this tournament');
    }

    tournament.teams.push(teamObjectId);
    tournament.currentTeams = tournament.teams.length;

    await tournament.save();

    return await this.findOne(tournamentId);
  }

  async unregisterTeam(tournamentId: string, teamId: string): Promise<Tournament> {
    if (!Types.ObjectId.isValid(tournamentId) || !Types.ObjectId.isValid(teamId)) {
      throw new BadRequestException('Invalid tournament or team ID');
    }

    const tournament = await this.tournamentModel.findById(tournamentId);

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    const teamIndex = tournament.teams.findIndex(t => t.toString() === teamId);

    if (teamIndex === -1) {
      throw new NotFoundException('Team is not registered for this tournament');
    }

    tournament.teams.splice(teamIndex, 1);
    tournament.currentTeams = tournament.teams.length;

    await tournament.save();

    return await this.findOne(tournamentId);
  }

  // Phase Management Methods
  async updatePhaseStatus(tournamentId: string, phaseName: string, status: string): Promise<Tournament> {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new BadRequestException('Invalid tournament ID');
    }

    const tournament = await this.tournamentModel.findById(tournamentId);

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    const phase = tournament.phases.find(p => p.name === phaseName);

    if (!phase) {
      throw new NotFoundException(`Phase ${phaseName} not found in tournament`);
    }

    phase.status = status;
    await tournament.save();

    return await this.findOne(tournamentId);
  }

  async addPhase(tournamentId: string, phaseData: { name: string; startDate?: Date; endDate?: Date }): Promise<Tournament> {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new BadRequestException('Invalid tournament ID');
    }

    const tournament = await this.tournamentModel.findById(tournamentId);

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    // Check if phase already exists
    if (tournament.phases.some(p => p.name === phaseData.name)) {
      throw new BadRequestException(`Phase ${phaseData.name} already exists`);
    }

    tournament.phases.push({
      name: phaseData.name,
      status: 'PENDING',
      startDate: phaseData.startDate,
      endDate: phaseData.endDate,
      matches: [],
    });

    await tournament.save();

    return await this.findOne(tournamentId);
  }

  async addTicketTypes(tournamentId: string, { ticketTypes }: AddTicketTypesDto): Promise<Tournament> {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new BadRequestException('Invalid tournament ID');
    }

    const tournament = await this.tournamentModel.findById(tournamentId);

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    // 1. Create separate TicketTypeDefinition documents
    const createdDefinitions = await Promise.all(
      ticketTypes.map(async (ticketDto) => {
        const definition = new this.ticketTypeDefinitionModel({
          ...ticketDto,
          tournament: new Types.ObjectId(tournamentId) // Link it to tournament
        });
        return await definition.save();
      })
    );

    // 2. Clear existing (if any) and assign new IDs
    // Note: We might want to keep existing ones via different endpoint,
    // but for "set ticket types" behavior, replacing is standard.
    // Ideally we should delete old orphaned definitions if they are exclusive to this tournament.
    // For now, simpler approach: just overwrite the reference list.

    tournament.ticketTypes = createdDefinitions.map(def => def._id as any);

    await tournament.save();

    return await this.findOne(tournamentId);
  }

  async getAvailableTickets(tournamentId: string) {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new BadRequestException('Invalid tournament ID');
    }

    const tournament = await this.tournamentModel.findById(tournamentId).populate('ticketTypes').exec();

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    if (!tournament.ticketTypes || tournament.ticketTypes.length === 0) {
      return {
        tournament: {
          id: tournament._id,
          name: tournament.name,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          bannerImageUrl: tournament.bannerImageUrl
        },
        availableTickets: []
      };
    }

    // Map populated documents
    const availableTickets = (tournament.ticketTypes as any[]).map(ticketType => ({
      id: ticketType._id, // Include ID for client-side reference
      name: ticketType.name,
      price: ticketType.price,
      capacity: ticketType.capacity,
      bundles: ticketType.bundles || []
    }));

    return {
      tournament: {
        id: tournament._id,
        name: tournament.name,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        bannerImageUrl: tournament.bannerImageUrl
      },
      availableTickets
    };
  }
}
