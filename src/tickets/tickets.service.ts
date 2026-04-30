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
import { Ticket, TicketStatus, TicketCategory } from './schemas/ticket.schema';
import { League, LeagueDocument } from '../league/schemas/league.schema';

import { TicketsNftService } from '../tickets-nft/tickets-nft.service';
import { Tournament, TournamentDocument } from '../tournements/schemas/tournament.schema';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<Ticket>,
    @InjectModel(League.name) private leagueModel: Model<LeagueDocument>,
    @InjectModel(Tournament.name) private tournamentModel: Model<TournamentDocument>,
    private ticketsNftService: TicketsNftService,
  ) {}

  /**
   * Automatically create a Standard Ticket for a newly created League.
   */
  async createStandardTicket(leagueId: string): Promise<Ticket> {
    const league = await this.leagueModel.findById(leagueId).exec();
    if (!league) {
      throw new NotFoundException('League not found');
    }

    // Check if a standard ticket template already exists for this league (user must be null)
    const existing = await this.ticketModel.findOne({
      league: new Types.ObjectId(leagueId),
      category: TicketCategory.STANDARD,
      user: null,
    }).exec();

    if (existing) {
      return existing;
    }

    const ticketNumber = `STD-${leagueId.substring(0, 5)}-${Date.now()}`;
    const qrData = JSON.stringify({
      ticketNumber,
      league: leagueId,
      category: TicketCategory.STANDARD,
    });

    let qrCodeUrl: string;
    try {
      qrCodeUrl = await QRCode.toDataURL(qrData);
    } catch (err) {
      throw new InternalServerErrorException('Failed to generate QR code');
    }

    const standardTicket = new this.ticketModel({
      ticketNumber,
      league: new Types.ObjectId(leagueId),
      category: TicketCategory.STANDARD,
      status: TicketStatus.VALID,
      price: 0,
      qrCode: qrCodeUrl,
      type: 'Standard Entry',
      user: null, // Explicitly null for template
    });

    return await standardTicket.save();
  }

  /**
   * Create a specific Ticket instance for a User (Standard or NFT).
   */
  async createTicketInstance(createTicketDto: CreateTicketDto, adminUser?: any): Promise<Ticket> {
    const { league: leagueId, tournament: tournamentId, user: userId, category } = createTicketDto;


    const prefix = category === TicketCategory.NFT ? 'NFT' : 'STD';
    const ticketNumber = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const qrData = JSON.stringify({
      ticketNumber,
      league: leagueId,
      tournament: tournamentId,
      user: userId,
      category: category,
    });

    let qrCodeUrl: string;
    try {
      qrCodeUrl = await QRCode.toDataURL(qrData);
    } catch (err) {
      throw new InternalServerErrorException('Failed to generate QR code');
    }

    const ticket = new this.ticketModel({
      ...createTicketDto,
      ticketNumber,
      league: leagueId ? new Types.ObjectId(leagueId) : undefined,
      tournament: tournamentId ? new Types.ObjectId(tournamentId) : undefined,
      user: userId ? new Types.ObjectId(userId) : undefined,
      category: category,
      qrCode: qrCodeUrl,
      purchaseDate: new Date(),
    });

    const savedTicket = await ticket.save();

    // If it's an NFT and we have an event (league or tournament) and an admin, try to mint on blockchain
    if (category === TicketCategory.NFT && (leagueId || tournamentId) && adminUser) {
      try {
        let eventName = 'Elite Competition';
        let eventDate = new Date().toISOString();
        let eventId = leagueId || tournamentId;

        if (leagueId) {
            const league = await this.leagueModel.findById(leagueId).exec();
            if (league) {
                eventName = league.name;
                eventDate = league.startDate.toISOString();
            }
        } else if (tournamentId) {
            const tournament = await this.tournamentModel.findById(tournamentId).exec();
            if (tournament) {
                eventName = tournament.name;
                eventDate = tournament.startDate.toISOString();
            }
        }

        const mintResult = await this.ticketsNftService.mintBatch(
            { id: adminUser.userId, role: 'ADMIN' },
            { id: eventId as string, name: eventName, startsAt: eventDate },
            1,
            'VIP NFT',
            [(adminUser as any).walletAddress || '0x0000000000000000000000000000000000000000']
        );
        
        if (mintResult && mintResult.length > 0) {
            // Casting to any to avoid TS errors if Document type is stubborn, 
            // though we added these fields to the schema class.
            const ticketDoc = savedTicket as any;
            ticketDoc.nftTokenId = mintResult[0].tokenId;
            ticketDoc.transactionHash = mintResult[0].txHash;
            await ticketDoc.save();
        }
      } catch (err) {
        console.error('Blockchain minting failed, but DB record created:', err);
      }
    }

    return savedTicket;
  }

  async findAll(): Promise<Ticket[]> {
    return await this.ticketModel
      .find()
      .populate('league')
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllByUser(userId: string): Promise<Ticket[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return await this.ticketModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('league')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Ticket> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ticket ID');
    }
    const ticket = await this.ticketModel
      .findById(id)
      .populate('league')
      .populate('user', 'username email')
      .exec();

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  async validateTicket(ticketNumber: string): Promise<{
    success: boolean;
    message: string;
    ticket?: Ticket;
  }> {
    const ticket = await this.ticketModel
      .findOne({ ticketNumber })
      .populate('league', 'name startDate endDate')
      .populate('user', 'username email')
      .exec();

    if (!ticket) {
      return { success: false, message: 'Ticket not found' };
    }

    if (ticket.status === TicketStatus.USED) {
      return {
        success: false,
        message: `Ticket already used on ${ticket.usedAt?.toISOString()}`,
        ticket,
      };
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      return { success: false, message: 'Ticket has been cancelled', ticket };
    }

    // Standard tickets are shared, but users use them once.
    // If it's a standard ticket, we might need a different validation logic
    // but the request says "Chaque gamer peut utiliser ce ticket une seule fois".
    // For now, let's mark it as used if it's an instance.
    // If it's the global template, we should probably not mark the template as USED.

    // All tickets (Standard or NFT) should be marked as USED upon validation
    // except if we are validating the global league template (which has no user)
    if (ticket.user) {
        ticket.status = TicketStatus.USED;
        ticket.usedAt = new Date();
        await ticket.save();
    }

    return {
      success: true,
      message: 'Ticket validated successfully',
      ticket,
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.ticketModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return { message: 'Ticket deleted successfully' };
  }

  async findAllTemplates(): Promise<Ticket[]> {
    // 1. Get all leagues
    const leagues = await this.leagueModel.find().exec();
    console.log(`[TicketsService] Found ${leagues.length} leagues`);
    
    // 2. Ensure each league has a standard ticket template
    for (const league of leagues) {
      try {
        console.log(`[TicketsService] Checking template for league: ${league.name} (${league._id})`);
        await this.createStandardTicket(league._id.toString());
      } catch (err) {
        console.error(`[TicketsService] Failed to create template for league ${league.name}:`, err.message);
      }
    }

    // 3. Return all templates (tickets with user: null or no user field)
    const templates = await this.ticketModel
      .find({ 
        $or: [
          { user: null },
          { user: { $exists: false } }
        ]
      })
      .populate('league')
      .exec();
    
    console.log(`[TicketsService] Returning ${templates.length} templates`);
    return templates;
  }

  async updateTemplate(leagueId: string, updateData: Partial<Ticket>): Promise<Ticket> {
    const template = await this.ticketModel.findOneAndUpdate(
      { league: new Types.ObjectId(leagueId), user: null },
      updateData,
      { new: true }
    ).exec();
    if (!template) {
      throw new NotFoundException('Standard Ticket template not found for this league');
    }
    return template;
  }
}
