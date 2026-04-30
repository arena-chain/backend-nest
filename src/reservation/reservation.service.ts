import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  Reservation,
  ReservationDocument,
  ReservationStatus,
} from './schemas/reservation.schema';
import {
  Ticket,
  TicketDocument,
  TicketStatus,
  TicketCategory,
} from '../tickets/schemas/ticket.schema';
import { League, LeagueDocument } from '../league/schemas/league.schema';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name)
    private reservationModel: Model<ReservationDocument>,
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(League.name)
    private leagueModel: Model<LeagueDocument>,
  ) {}

  async create(
    createReservationDto: CreateReservationDto,
  ): Promise<Reservation> {
    const {
      league: leagueId,
      user: userId,
      ticketType,
      quantity,
    } = createReservationDto;

    // 1. Fetch League
    const league = await this.leagueModel.findById(leagueId).exec();
    if (!league) {
      throw new NotFoundException('League not found');
    }

    // 2. Validate Capacity
    const currentSold = await this.ticketModel.countDocuments({
      league: new Types.ObjectId(leagueId),
      status: { $ne: TicketStatus.CANCELLED },
    });

    if (currentSold + quantity > league.maxParticipants) {
      throw new BadRequestException(
        `Not enough tickets available. Remaining: ${league.maxParticipants - currentSold}`,
      );
    }

    // 3. Price (For now default to 0 if not specified, or use a fixed logic)
    const pricePerTicket = 0; // Standard tickets are destined to all gamers
    const totalPrice = pricePerTicket * quantity;

    // 4. Create PENDING Tickets
    const tickets: any[] = [];
    const now = new Date();
    // 15 minutes expiration for reservation
    const expiresAt = new Date(now.getTime() + 15 * 60000);

    for (let i = 0; i < quantity; i++) {
      const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`;
      const qrData = JSON.stringify({
        ticketNumber,
        league: leagueId,
        user: userId,
        type: ticketType,
      });
      const qrCodeUrl = await QRCode.toDataURL(qrData);

      tickets.push({
        ticketNumber,
        qrCode: qrCodeUrl,
        purchaseDate: now,
        league: new Types.ObjectId(leagueId),
        user: new Types.ObjectId(userId),
        type: ticketType,
        category: ticketType.toUpperCase().includes('NFT') ? TicketCategory.NFT : TicketCategory.STANDARD,
        status: TicketStatus.PENDING,
        price: pricePerTicket,
        expiresAt: expiresAt,
      });
    }

    const createdTickets = await this.ticketModel.insertMany(tickets);
    const ticketIds = createdTickets.map((t) => t._id);

    // 5. Create Reservation
    const reservation = new this.reservationModel({
      user: new Types.ObjectId(userId),
      league: new Types.ObjectId(leagueId),
      tickets: ticketIds,
      status: ReservationStatus.PENDING,
      totalPrice,
      reservedAt: now,
      expiresAt,
    });

    return await reservation.save();
  }

  async confirm(id: string, paymentId: string): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(id).exec();
    if (!reservation) throw new NotFoundException('Reservation not found');

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        `Reservation is already ${reservation.status}`,
      );
    }

    if (new Date() > reservation.expiresAt) {
      reservation.status = ReservationStatus.CANCELLED;
      await reservation.save();
      // Also cancel tickets
      await this.ticketModel.updateMany(
        { _id: { $in: reservation.tickets } },
        { $set: { status: TicketStatus.CANCELLED } },
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
      { $set: { status: TicketStatus.VALID, expiresAt: null } },
    );

    return reservation;
  }

  async findAll(): Promise<Reservation[]> {
    return await this.reservationModel
      .find()
      .populate('tickets')
      .populate('league')
      .exec();
  }

  async findOne(id: string): Promise<Reservation | null> {
    return await this.reservationModel
      .findById(id)
      .populate('tickets')
      .populate('league')
      .exec();
  }

  async remove(id: string) {
    return await this.reservationModel.findByIdAndDelete(id);
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }
}
