import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PartyService } from './party.service';
import { PartyController } from './party.controller';
import { GameParty, GamePartySchema } from './schemas/game-party.schema';
import {
  PlayerGameProfile,
  PlayerGameProfileSchema,
} from '../player/schemas/player-game-profile.schema';
import { PlayerProfile, PlayerProfileSchema } from '../player/schemas/player-profile.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Catalog, CatalogSchema } from '../catalog/schemas/catalog.entity';
import { FriendshipModule } from '../friendship/friendship.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameParty.name, schema: GamePartySchema },
      { name: PlayerGameProfile.name, schema: PlayerGameProfileSchema },
      { name: PlayerProfile.name, schema: PlayerProfileSchema },
      { name: User.name, schema: UserSchema },
      { name: Catalog.name, schema: CatalogSchema },
    ]),
    forwardRef(() => FriendshipModule),
    forwardRef(() => MatchmakingModule),
  ],
  providers: [PartyService],
  controllers: [PartyController],
  exports: [PartyService],
})
export class PartyModule {}
