import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from './schemas/group.schema';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { StandingsModule } from '../standings/standings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
    StandingsModule,
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService, MongooseModule],
})
export class GroupModule {}
