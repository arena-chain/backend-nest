import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { Mission, MissionSchema } from './schemas/mission.schema';
import { UserMissionProgress, UserMissionProgressSchema } from './schemas/user-mission-progress.schema';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        MongooseModule.forFeature([
            { name: Mission.name, schema: MissionSchema },
            { name: UserMissionProgress.name, schema: UserMissionProgressSchema },
        ]),
    ],
    controllers: [MissionController],
    providers: [MissionService],
    exports: [MissionService],
})
export class MissionModule {}
