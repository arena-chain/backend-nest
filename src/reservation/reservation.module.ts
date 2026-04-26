import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { Reservation, ReservationSchema } from './schemas/reservation.schema';
import { Ticket, TicketSchema } from '../tickets/schemas/ticket.schema';
import { Tournament, TournamentSchema } from '../tournements/schemas/tournament.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Tournament.name, schema: TournamentSchema },
    ]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
})
export class ReservationModule { }
