// src/team-manager/team-manager.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamManagerService } from './team-manager.service';
import { TeamManagerController } from './team-manager.controller';
import { TeamManagerProfile, TeamManagerProfileSchema } from './schemas/team-manager-profile.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TeamManagerProfile.name, schema: TeamManagerProfileSchema },
        ]),
    ],
    controllers: [TeamManagerController],
    providers: [TeamManagerService],
    exports: [TeamManagerService],
})
export class TeamManagerModule { }
