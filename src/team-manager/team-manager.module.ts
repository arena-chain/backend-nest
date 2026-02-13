// src/team-manager/team-manager.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamManagerService } from './team-manager.service';
import { TeamManagerController } from './team-manager.controller';
import { TeamManagerProfile, TeamManagerProfileSchema } from './schemas/team-manager-profile.schema';
import { Team, TeamSchema } from './schemas/team.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TeamManagerProfile.name, schema: TeamManagerProfileSchema },
            { name: 'Team', schema: TeamSchema },
        ]),
    ],
    controllers: [TeamManagerController],
    providers: [TeamManagerService],
    exports: [TeamManagerService],
})
export class TeamManagerModule { }
