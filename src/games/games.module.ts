import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Game, GameSchema } from './entities/game.entity';
import { Catalog, CatalogSchema } from '../catalog/schemas/catalog.entity';
import { Friendship, FriendshipSchema } from '../friendship/schemas/friendship.schema';
import { MissionModule } from '../mission/mission.module';

@Module({
  imports: [
    MissionModule,
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: Catalog.name, schema: CatalogSchema },
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule { }
