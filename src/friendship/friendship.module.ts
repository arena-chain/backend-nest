// src/friendship/friendship.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { Friendship, FriendshipSchema } from './schemas/friendship.schema';
import { MissionModule } from '../mission/mission.module';

@Module({
  imports: [
    MissionModule,
    MongooseModule.forFeature([
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
  ],
  controllers: [FriendshipController],
  providers: [FriendshipService],
  exports: [FriendshipService],
})
export class FriendshipModule {}
