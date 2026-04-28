import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { TournementsModule } from '../tournements/tournements.module';
import { LeagueRegistrationModule } from '../league-registration/league-registration.module';
import { TeamManagerModule } from '../team-manager/team-manager.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
    ]),
    TournementsModule,
    LeagueRegistrationModule,
    TeamManagerModule,
  ],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
