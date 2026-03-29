// src/friendship/friendship.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { Friendship, FriendshipSchema } from './schemas/friendship.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
  ],
  controllers: [FriendshipController],
  providers: [FriendshipService],
  exports: [FriendshipService],
})
export class FriendshipModule { }
