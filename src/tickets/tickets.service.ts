import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket, TicketDocument, TicketStatus } from './entities/ticket.entity';
import { Tournament, TournamentDocument } from '../tournements/schemas/tournament.schema';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(Tournament.name) private tournamentModel: Model<TournamentDocument>,
  ) { }

  async create(createTicketDto: CreateTicketDto): Promise<Ticket[]> {
    const { tournament: tournamentId, type: ticketType, quantity } = createTicketDto;

    // 1. Fetch Tournament
    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // 2. Validate Ticket Type & Capacity
    const typeConfig = tournament.ticketTypes?.find(t => t.name === ticketType);
    if (!typeConfig) {
      throw new BadRequestException(`Ticket type '${ticketType}' not found for this tournament`);
    }

    // Check capacity
    const currentSold = await this.ticketModel.countDocuments({
      tournament: new Types.ObjectId(tournamentId),
      type: ticketType,
      status: { $ne: TicketStatus.CANCELLED }
    });

    if (currentSold + quantity > typeConfig.capacity) {
      throw new BadRequestException(`Not enough '${ticketType}' tickets available. Remaining: ${typeConfig.capacity - currentSold}`);
    }

    // 3. Calculate Price (Dynamic Bundles)
    let totalPrice = 0;
    const bundle = typeConfig.bundles?.find(b => b.quantity === quantity);

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
        type: ticketType
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
        price: pricePerTicket
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
      throw new NotFoundException(`Ticket with number ${ticketNumber} not found`);
    }
    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket ID');
    }

    const updateData: any = { ...updateTicketDto };
    if (updateData.tournament) updateData.tournament = new Types.ObjectId(updateData.tournament);
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
}
