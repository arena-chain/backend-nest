import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('migrate')
  @ApiOperation({ summary: 'Migration: generate QR tickets for existing league participants' })
  migrateLeagueTickets() {
    return this.ticketsService.generateMissingLeagueTickets();
  }

  @Get('migrate')
  @ApiOperation({ summary: 'Test migration via GET' })
  testMigrate() {
    return this.ticketsService.generateMissingLeagueTickets();
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'Get all tickets for current user' })
  getMyTickets(@Query('userId') userId: string) {
    console.log(`[TicketsController] GET /my-tickets?userId=${userId}`);
    // In a real app with AuthGuard, we would extract user from Request
    // For now, we'll accept userId as query param or header, or just fail safely
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.ticketsService.findAllByUser(userId);
  }

  @Post()

  @ApiOperation({ summary: 'Create a new ticket with QR code' })
  @ApiResponse({
    status: 201,
    description: 'The ticket has been successfully created.',
  })
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }


  @Get('market-templates')
  @ApiOperation({ summary: 'Get all ticket market templates' })
  getMarketTemplates() {
    return this.ticketsService.getMarketTemplates();
  }

  @Patch('market-templates/:leagueId')
  @ApiOperation({ summary: 'Update a market template by league ID' })
  updateMarketTemplate(@Param('leagueId') leagueId: string, @Body() updateData: any) {
    return this.ticketsService.updateMarketTemplate(leagueId, updateData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets' })
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search ticket by number' })
  @ApiQuery({ name: 'number', required: true, description: 'Ticket number' })
  search(@Query('number') ticketNumber: string) {
    return this.ticketsService.findByNumber(ticketNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket by ID' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ticket' })
  update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketsService.update(id, updateTicketDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ticket' })
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate and mark ticket as used (QR code scanning)',
  })
  @ApiResponse({ status: 200, description: 'Ticket validation result' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CHECK_IN_AGENT)
  validateTicket(@Body('ticketNumber') ticketNumber: string) {
    return this.ticketsService.validateTicket(ticketNumber);
  }

  @Get('tournament/:tournamentId')
  @ApiOperation({ summary: 'Get all tickets for a tournament' })
  findByTournament(@Param('tournamentId') tournamentId: string) {
    return this.ticketsService.findByTournament(tournamentId);
  }

  @Get('tournament/:tournamentId/stats')
  @ApiOperation({ summary: 'Get ticket statistics for a tournament' })
  getTicketStats(@Param('tournamentId') tournamentId: string) {
    return this.ticketsService.getTicketStats(tournamentId);
  }
}
