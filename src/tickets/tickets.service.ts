import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateLeaguePassDto } from './dto/create-league-pass.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket, TicketDocument, TicketStatus, TicketCategory } from './schemas/ticket.schema';
import {
  Tournament,
  TournamentDocument,
} from '../tournements/schemas/tournament.schema';

import {
  TicketTypeDefinition,
  TicketTypeDefinitionDocument,
} from './schemas/ticket-type.schema';
import { CreateTicketTypeDefinitionDto } from './dto/create-ticket-type.dto';
import { LeagueParticipant } from '../league/schemas/league-participant.schema';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(Tournament.name)
    private tournamentModel: Model<TournamentDocument>,
    @InjectModel(TicketTypeDefinition.name)
    private ticketTypeDefinitionModel: Model<TicketTypeDefinitionDocument>,
    @InjectModel('League') private leagueModel: Model<any>,
    @InjectModel(LeagueParticipant.name) private participantModel: Model<any>,
  ) {}

  async createTicketTypeDefinition(
    createDto: CreateTicketTypeDefinitionDto,
  ): Promise<TicketTypeDefinition> {
    const newDefinition = new this.ticketTypeDefinitionModel(createDto);
    return await newDefinition.save();
  }

  async findAllTicketTypeDefinitions(): Promise<TicketTypeDefinition[]> {
    return await this.ticketTypeDefinitionModel.find().exec();
  }

  async findTicketTypeDefinition(id: string): Promise<TicketTypeDefinition> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket type definition ID');
    }
    const def = await this.ticketTypeDefinitionModel.findById(id).exec();
    if (!def) throw new NotFoundException('Ticket Type Definition not found');
    return def;
  }

  async getMarketTemplates(): Promise<Ticket[]> {
    const leagues = await this.leagueModel.find().exec();
    
    const savedTemplates = await this.ticketModel
      .find({ ticketNumber: { $regex: /^TEMPLATE-/ } })
      .populate('league', 'name startDate endDate logoUrl maxParticipants regionValue')
      .exec();
      
    const savedMap = new Map();
    for (const t of savedTemplates) {
      if (t.league) {
        const lId = typeof t.league === 'object' && (t.league as any)._id ? (t.league as any)._id.toString() : t.league.toString();
        savedMap.set(lId, t);
      }
    }

    const results: Ticket[] = [];
    for (const league of leagues) {
      const lId = league._id.toString();
      if (savedMap.has(lId)) {
        results.push(savedMap.get(lId));
      } else {
        results.push({
          _id: new Types.ObjectId(),
          ticketNumber: `TEMPLATE-${lId}`,
          league: league,
          price: 50,
          type: 'STANDARD',
          category: TicketCategory.STANDARD,
        } as unknown as Ticket);
      }
    }
    return results;
  }

  async updateMarketTemplate(leagueId: string, updateData: any): Promise<Ticket> {
    if (!Types.ObjectId.isValid(leagueId)) {
      throw new BadRequestException('Invalid league ID');
    }
    
    let template = await this.ticketModel.findOne({ 
      ticketNumber: `TEMPLATE-${leagueId}` 
    });

    if (!template) {
      template = new this.ticketModel({
        ticketNumber: `TEMPLATE-${leagueId}`,
        league: new Types.ObjectId(leagueId),
        user: new Types.ObjectId('000000000000000000000000'),
        price: updateData.price || 0,
        type: updateData.type || 'STANDARD',
        category: updateData.category || TicketCategory.STANDARD,
        qrCode: 'template-qr',
        status: TicketStatus.VALID,
      });
    } else {
      if (updateData.price !== undefined) template.price = updateData.price;
      if (updateData.category !== undefined) template.category = updateData.category;
      if (updateData.type !== undefined) template.type = updateData.type;
    }

    await template.save();
    const updated = await this.ticketModel.findById(template._id)
      .populate('league', 'name startDate endDate logoUrl maxParticipants regionValue')
      .exec();
    return updated as Ticket;
  }

  async generateMissingLeagueTickets(): Promise<{ created: number }> {
    console.log('[TicketsService] Running league tickets migration...');
    const participants = await this.participantModel.find({ playerId: { $exists: true, $ne: null } }).exec();
    let createdCount = 0;

    for (const p of participants) {
      const leagueId = p.leagueId?.toString();
      const userId = p.playerId?.toString();
      if (!leagueId || !userId) continue;

      const existing = await this.ticketModel.findOne({
        league: p.leagueId,
        user: p.playerId,
      }).exec();

      if (existing) {
        console.log(`[TicketsService] Ticket already exists for user ${userId} in league ${leagueId}`);
        continue;
      }

      try {
        const ticketNumber = `LTK-${leagueId.slice(-6).toUpperCase()}-${Date.now()}-${userId.slice(-4).toUpperCase()}`;
        const qrData = JSON.stringify({ ticketNumber, league: leagueId, user: userId, type: 'STANDARD' });
        const qrCodeUrl = await QRCode.toDataURL(qrData);
        
        await this.ticketModel.create({
          ticketNumber,
          qrCode: qrCodeUrl,
          purchaseDate: new Date(),
          league: p.leagueId,
          user: p.playerId,
          type: 'STANDARD',
          category: TicketCategory.STANDARD,
          status: TicketStatus.VALID,
          price: 0,
        });
        createdCount++;
        console.log(`[TicketsService] Created migration ticket ${ticketNumber} for user ${userId}`);
      } catch (err: any) {
        console.error(`[TicketsService] Failed to create migration ticket for participant ${p._id}:`, err.message);
      }
    }
    return { created: createdCount };
  }

  /**
   * Player-facing league pass: creates a league ticket only (no LeagueParticipant / status gates).
   * Idempotent per league + user + category + type label.
   */
  async createLeaguePass(
    userId: string,
    dto: CreateLeaguePassDto,
  ): Promise<TicketDocument> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        'Your session is invalid or has expired. Please log out and log in again.',
      );
    }
    const { leagueId, category } = dto;
    if (!Types.ObjectId.isValid(leagueId)) {
      throw new BadRequestException('Invalid league reference');
    }

    const league = await this.leagueModel.findById(leagueId).exec();
    if (!league) throw new NotFoundException('League not found');

    const userOid = new Types.ObjectId(userId);
    const leagueOid = new Types.ObjectId(leagueId);
    const typeLabel =
      (dto.type && dto.type.trim()) ||
      (category === TicketCategory.NFT ? 'NFT Pass' : 'Standard');

    const existing = await this.ticketModel
      .findOne({
        league: leagueOid,
        user: userOid,
        category,
        type: typeLabel,
        status: { $nin: [TicketStatus.CANCELLED] },
      })
      .exec();
    if (existing) return existing;

    let price = 0;
    if (category === TicketCategory.NFT) {
      const defs = (league as any).ticketTypes as
        | { name?: string; type?: string; price?: number }[]
        | undefined;
      const match = defs?.find(
        (t) =>
          (t.name && t.name === typeLabel) || (t.type && t.type === typeLabel),
      );
      price = match?.price ?? 50;
    }

    const ticketNumber = `LTK-${leagueId.slice(-6).toUpperCase()}-${Date.now()}-${userId.slice(-4).toUpperCase()}`;
    const qrData = JSON.stringify({
      ticketNumber,
      league: leagueId,
      user: userId,
      type: typeLabel,
      category,
    });
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    const created = await this.ticketModel.create({
      ticketNumber,
      qrCode: qrCodeUrl,
      purchaseDate: new Date(),
      league: leagueOid,
      user: userOid,
      type: typeLabel,
      category,
      status: TicketStatus.VALID,
      price,
    });
    return created as TicketDocument;
  }

  async create(createTicketDto: CreateTicketDto): Promise<Ticket[]> {
    const {
      tournament: tournamentId,
      type: ticketType,
      quantity,
    } = createTicketDto;

    // 1. Fetch Tournament with ticket types populated
    const tournament = await this.tournamentModel
      .findById(tournamentId)
      .populate('ticketTypes')
      .exec();
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // 2. Validate Ticket Type & Capacity
    // With populated field, ticketTypes is array of documents
    const typeConfig = (tournament.ticketTypes as any[]).find(
      (t: any) => t.name === ticketType,
    );

    if (!typeConfig) {
      throw new BadRequestException(
        `Ticket type '${ticketType}' not found for this tournament`,
      );
    }

    // Check capacity
    const currentSold = await this.ticketModel.countDocuments({
      tournament: new Types.ObjectId(tournamentId),
      type: ticketType,
      status: { $ne: TicketStatus.CANCELLED },
    });

    if (currentSold + quantity > typeConfig.capacity) {
      throw new BadRequestException(
        `Not enough '${ticketType}' tickets available. Remaining: ${typeConfig.capacity - currentSold}`,
      );
    }

    // 3. Calculate Price (Dynamic Bundles)
    let totalPrice = 0;
    const bundle = typeConfig.bundles?.find((b) => b.quantity === quantity);

    if (bundle) {
      totalPrice = bundle.price;
    } else {
      totalPrice = typeConfig.price * quantity;
    }

    // Price per ticket for record keeping
    const pricePerTicket = totalPrice / quantity;

    // 4. Generate Tickets
    const tickets: any[] = [];
    const purchaseDate = new Date();

    for (let i = 0; i < quantity; i++) {
      const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`;

      // Generate QR Code data
      const qrData = JSON.stringify({
        ticketNumber,
        tournament: tournamentId,
        user: createTicketDto.user,
        type: ticketType,
      });

      let qrCodeUrl: string;
      try {
        qrCodeUrl = await QRCode.toDataURL(qrData);
      } catch (err) {
        throw new InternalServerErrorException('Failed to generate QR code');
      }

      tickets.push({
        ticketNumber,
        qrCode: qrCodeUrl,
        purchaseDate,
        tournament: new Types.ObjectId(tournamentId),
        user: new Types.ObjectId(createTicketDto.user),
        type: ticketType,
        status: TicketStatus.VALID,
        price: pricePerTicket,
      });
    }

    // 5. Save all tickets
    const createdTickets = await this.ticketModel.insertMany(tickets);

    return createdTickets as unknown as Ticket[];
  }

  async findAllByUser(userId: string): Promise<Ticket[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return await this.ticketModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('tournament', 'name startDate endDate bannerImageUrl')
      .populate('league', 'name startDate endDate logoUrl regionValue')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(): Promise<Ticket[]> {
    return await this.ticketModel
      .find()
      .populate('tournament', 'name startDate endDate')
      .populate('league', 'name startDate endDate logoUrl')
      .populate('user', 'nickname email username')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Ticket> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket ID');
    }
    const ticket = await this.ticketModel
      .findById(id)
      .populate('tournament', 'name startDate endDate')
      .populate('league', 'name startDate endDate logoUrl')
      .exec();

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  async findByNumber(ticketNumber: string): Promise<Ticket> {
    const ticket = await this.ticketModel
      .findOne({ ticketNumber })
      .populate('tournament', 'name startDate endDate')
      .populate('league', 'name startDate endDate logoUrl')
      .exec();

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with number ${ticketNumber} not found`,
      );
    }
    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket ID');
    }

    const updateData: any = { ...updateTicketDto };
    if (updateData.tournament)
      updateData.tournament = new Types.ObjectId(updateData.tournament);
    if (updateData.user) updateData.user = new Types.ObjectId(updateData.user);

    const updatedTicket = await this.ticketModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('tournament', 'name startDate endDate')
      .populate('league', 'name startDate endDate logoUrl')
      .exec();

    if (!updatedTicket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return updatedTicket;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket ID');
    }
    const result = await this.ticketModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return { message: 'Ticket deleted successfully' };
  }

  /**
   * Validate and mark a ticket as used (for QR code scanning)
   */
  async validateTicket(ticketNumber: string): Promise<{
    success: boolean;
    message: string;
    ticket?: Ticket;
    scanStatus?: 'CONFIRMED' | 'USED';
  }> {
    const ticket = await this.ticketModel
      .findOne({ ticketNumber })
      .populate('tournament', 'name startDate endDate')
      .populate('league', 'name startDate endDate logoUrl')
      .populate('user', 'nickname email')
      .exec();

    if (!ticket) {
      return {
        success: false,
        message: 'Ticket not found',
      };
    }

    // Check if already used
    if (ticket.status === TicketStatus.USED) {
      return {
        success: false,
        message: `Ticket already used on ${ticket.usedAt?.toISOString()}`,
        ticket,
        scanStatus: 'USED',
      };
    }

    // Check if cancelled
    if (ticket.status === TicketStatus.CANCELLED) {
      return {
        success: false,
        message: 'Ticket has been cancelled',
        ticket,
        scanStatus: 'USED',
      };
    }

    // Check if expired
    if (ticket.expiresAt && ticket.expiresAt < new Date()) {
      await this.ticketModel.findByIdAndUpdate(ticket._id, {
        status: TicketStatus.EXPIRED,
      });
      return {
        success: false,
        message: 'Ticket has expired',
        ticket,
        scanStatus: 'USED',
      };
    }

    // Mark as used
    ticket.status = TicketStatus.USED;
    ticket.usedAt = new Date();
    await ticket.save();

    return {
      success: true,
      message: 'Ticket confirmed and access granted',
      ticket,
      scanStatus: 'CONFIRMED',
    };
  }

  /**
   * Get all tickets for a specific tournament
   */
  async findByTournament(tournamentId: string): Promise<Ticket[]> {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new BadRequestException('Invalid tournament ID');
    }

    return await this.ticketModel
      .find({ tournament: new Types.ObjectId(tournamentId) })
      .populate('user', 'nickname email')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get ticket statistics for a tournament
   */
  async getTicketStats(tournamentId: string): Promise<{
    totalSold: number;
    totalRevenue: number;
    byType: Array<{
      type: string;
      sold: number;
      revenue: number;
      capacity: number;
      available: number;
    }>;
    byStatus: Record<string, number>;
  }> {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new BadRequestException('Invalid tournament ID');
    }

    const tournament = await this.tournamentModel
      .findById(tournamentId)
      .populate('ticketTypes')
      .exec();
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const tickets = await this.ticketModel
      .find({ tournament: new Types.ObjectId(tournamentId) })
      .exec();

    const totalSold = tickets.length;
    const totalRevenue = tickets.reduce((sum, ticket) => sum + ticket.price, 0);

    // Statistics by type
    const byType = ((tournament.ticketTypes as any[]) || []).map(
      (typeConfig: any) => {
        const typeTickets = tickets.filter(
          (t) =>
            t.type === typeConfig.name && t.status !== TicketStatus.CANCELLED,
        );
        return {
          type: typeConfig.name,
          sold: typeTickets.length,
          revenue: typeTickets.reduce((sum, t) => sum + t.price, 0),
          capacity: typeConfig.capacity,
          available: typeConfig.capacity - typeTickets.length,
        };
      },
    );

    // Statistics by status
    const byStatus: Record<string, number> = {};
    Object.values(TicketStatus).forEach((status) => {
      byStatus[status] = tickets.filter((t) => t.status === status).length;
    });

    return {
      totalSold,
      totalRevenue,
      byType,
      byStatus,
    };
  }
}
