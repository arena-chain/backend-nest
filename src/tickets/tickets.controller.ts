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
  Req,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { TicketCategory } from './schemas/ticket.schema';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('nft')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manual creation of NFT Ticket by Admin' })
  @ApiResponse({
    status: 201,
    description: 'The NFT ticket has been successfully created.',
  })
  createNftTicket(@Body() createTicketDto: CreateTicketDto, @Req() req) {
    createTicketDto.category = TicketCategory.NFT;
    return this.ticketsService.createTicketInstance(createTicketDto, req.user);
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'Get all tickets for current user' })
  getMyTickets(@Query('userId') userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.ticketsService.findAllByUser(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets' })
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get('market-templates')
  @ApiOperation({ summary: 'Get all ticket templates (Standard tickets for leagues)' })
  getTemplates() {
    return this.ticketsService.findAllTemplates();
  }

  @Patch('market-templates/:leagueId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a ticket template (Admin only)' })
  updateTemplate(
    @Param('leagueId') leagueId: string,
    @Body() updateData: any,
  ) {
    return this.ticketsService.updateTemplate(leagueId, updateData);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket by ID' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
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
  validateTicket(@Body('ticketNumber') ticketNumber: string) {
    return this.ticketsService.validateTicket(ticketNumber);
  }
}
