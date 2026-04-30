import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { League, LeagueSchema } from '../league/schemas/league.schema';
import { LeagueParticipant, LeagueParticipantSchema } from '../league/schemas/league-participant.schema';
import { TicketsNftService } from '../tickets-nft/tickets-nft.service';
import { Tournament, TournamentSchema } from '../tournements/schemas/tournament.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: League.name, schema: LeagueSchema },
      { name: LeagueParticipant.name, schema: LeagueParticipantSchema },
      { name: Tournament.name, schema: TournamentSchema },
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsNftService],
  exports: [TicketsService],
})
export class TicketsModule {}
