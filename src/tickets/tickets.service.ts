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
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket, TicketDocument, TicketStatus } from './schemas/ticket.schema';
import {
  Tournament,
  TournamentDocument,
} from '../tournements/schemas/tournament.schema';

import {
  TicketTypeDefinition,
  TicketTypeDefinitionDocument,
} from './schemas/ticket-type.schema';
import { CreateTicketTypeDefinitionDto } from './dto/create-ticket-type.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(Tournament.name)
    private tournamentModel: Model<TournamentDocument>,
    @InjectModel(TicketTypeDefinition.name)
    private ticketTypeDefinitionModel: Model<TicketTypeDefinitionDocument>,
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
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(): Promise<Ticket[]> {
    return await this.ticketModel
      .find()
      .populate('tournament', 'name startDate endDate')
      .populate('user', 'username email')
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
      .populate('user', 'username email')
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
      .populate('user', 'username email')
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
      .populate('user', 'username email')
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
      .populate('user', 'username email')
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
      .populate('user', 'username email')
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
