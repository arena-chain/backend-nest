import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TournementsService } from './tournements.service';
import { TournementsController } from './tournements.controller';
import { Tournament, TournamentSchema } from './schemas/tournament.schema';
import { Team, TeamSchema } from '../team/schemas/team.schema';
import { FriendshipModule } from '../friendship/friendship.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: 'Team', schema: TeamSchema },
    ]),
    FriendshipModule,
    NotificationModule,
  ],
  controllers: [TournementsController],
  providers: [TournementsService],
  exports: [TournementsService],
})
export class TournementsModule { }
