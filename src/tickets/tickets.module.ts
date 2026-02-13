import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket, TicketSchema } from './entities/ticket.entity';
import { Tournament, TournamentSchema } from '../tournements/schemas/tournament.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: Tournament.name, schema: TournamentSchema },
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule { }
