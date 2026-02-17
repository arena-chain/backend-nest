import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { Tournament, TournamentSchema } from '../tournements/schemas/tournament.schema';
import { TicketTypeDefinition, TicketTypeDefinitionSchema } from './schemas/ticket-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: TicketTypeDefinition.name, schema: TicketTypeDefinitionSchema },
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule { }
