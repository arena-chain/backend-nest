import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Reservation, ReservationDocument, ReservationStatus } from './schemas/reservation.schema';
import { Ticket, TicketDocument, TicketStatus } from '../tickets/schemas/ticket.schema';
import { Tournament, TournamentDocument } from '../tournements/schemas/tournament.schema';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(Tournament.name) private tournamentModel: Model<TournamentDocument>,
  ) { }

  async create(createReservationDto: CreateReservationDto): Promise<Reservation> {
    const { tournament: tournamentId, user: userId, ticketType, quantity } = createReservationDto;

    // 1. Fetch Tournament with ticket types populated
    const tournament = await this.tournamentModel.findById(tournamentId).populate('ticketTypes').exec();
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // 2. Check Sales Start
    if (tournament.ticketSalesStart && new Date() < new Date(tournament.ticketSalesStart)) {
      throw new BadRequestException(`Ticket sales start on ${new Date(tournament.ticketSalesStart).toLocaleString()}`);
    }

    // 3. Validate Ticket Type & Capacity
    const typeConfig = (tournament.ticketTypes as any[]).find((t: any) => t.name === ticketType);
    if (!typeConfig) {
      throw new BadRequestException(`Ticket type '${ticketType}' not found`);
    }

    const currentSold = await this.ticketModel.countDocuments({
      tournament: new Types.ObjectId(tournamentId),
      type: ticketType,
      status: { $ne: TicketStatus.CANCELLED }
    });

    if (currentSold + quantity > typeConfig.capacity) {
      throw new BadRequestException(`Not enough tickets available. Remaining: ${typeConfig.capacity - currentSold}`);
    }

    // 4. Calculate Price
    let totalPrice = 0;
    const bundle = typeConfig.bundles?.find(b => b.quantity === quantity);
    if (bundle) {
      totalPrice = bundle.price;
    } else {
      totalPrice = typeConfig.price * quantity;
    }
    const pricePerTicket = totalPrice / quantity;

    // 5. Create PENDING Tickets
    const tickets: any[] = [];
    const now = new Date();
    // 15 minutes expiration for reservation
    const expiresAt = new Date(now.getTime() + 15 * 60000);

    for (let i = 0; i < quantity; i++) {
      const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`;
      const qrData = JSON.stringify({ ticketNumber, tournament: tournamentId, user: userId, type: ticketType });
      const qrCodeUrl = await QRCode.toDataURL(qrData);

      tickets.push({
        ticketNumber,
        qrCode: qrCodeUrl,
        purchaseDate: now,
        tournament: new Types.ObjectId(tournamentId),
        user: new Types.ObjectId(userId),
        type: ticketType,
        status: TicketStatus.PENDING, // Initially PENDING until confirmed
        price: pricePerTicket,
        expiresAt: expiresAt // Ticket reservation expires if not confirmed
      });
    }

    const createdTickets = await this.ticketModel.insertMany(tickets);
    const ticketIds = createdTickets.map(t => t._id);

    // 6. Create Reservation
    const reservation = new this.reservationModel({
      user: new Types.ObjectId(userId),
      tournament: new Types.ObjectId(tournamentId),
      tickets: ticketIds,
      status: ReservationStatus.PENDING,
      totalPrice,
      reservedAt: now,
      expiresAt
    });

    return await reservation.save();
  }

  async confirm(id: string, paymentId: string): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(id).exec();
    if (!reservation) throw new NotFoundException('Reservation not found');

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(`Reservation is already ${reservation.status}`);
    }

    if (new Date() > reservation.expiresAt) {
      reservation.status = ReservationStatus.CANCELLED;
      await reservation.save();
      // Also cancel tickets
      await this.ticketModel.updateMany(
        { _id: { $in: reservation.tickets } },
        { $set: { status: TicketStatus.CANCELLED } }
      );
      throw new BadRequestException('Reservation expired');
    }

    // Confirm Reservation
    reservation.status = ReservationStatus.CONFIRMED;
    reservation.paymentId = paymentId;
    await reservation.save();

    // Activate Tickets
    await this.ticketModel.updateMany(
      { _id: { $in: reservation.tickets } },
      { $set: { status: TicketStatus.VALID, expiresAt: null } } // Clear expiry as they are now owned
    );

    return reservation;
  }

  async findAll(): Promise<Reservation[]> {
    return await this.reservationModel.find().populate('tickets').populate('tournament').exec();
  }

  async findOne(id: string): Promise<Reservation | null> {
    return await this.reservationModel.findById(id).populate('tickets').populate('tournament').exec();
  }

  // cancel, remove, etc...
  async remove(id: string) {
    return await this.reservationModel.findByIdAndDelete(id);
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`; // Placeholder
  }
}
