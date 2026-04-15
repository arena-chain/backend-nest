import { Injectable } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Game, GameDocument } from './entities/game.entity';
import { Model, Types } from 'mongoose';
import { Catalog, CatalogDocument } from '../catalog/schemas/catalog.entity';
import {
  Friendship,
  FriendshipDocument,
  FriendshipStatus,
} from '../friendship/schemas/friendship.schema';
import { MissionService } from '../mission/mission.service';

@Injectable()
export class GamesService {
  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    @InjectModel(Catalog.name) private catalogModel: Model<CatalogDocument>,
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
    private readonly missionService: MissionService,
  ) { }

  private resolveMissionGameFromCatalogTitle(title?: string): 'lol' | 'valorant' | 'all' {
    if (!title) return 'all';
    const normalized = title.toLowerCase();
    if (normalized.includes('valorant')) return 'valorant';
    if (normalized.includes('league') || normalized.includes('lol')) return 'lol';
    return 'all';
  }

  private async isUserPlayingWithFriend(
    userId: Types.ObjectId,
    teammateIds: Types.ObjectId[],
  ): Promise<boolean> {
    if (teammateIds.length === 0) return false;
    const friendship = await this.friendshipModel.findOne({
      status: FriendshipStatus.ACCEPTED,
      $or: [
        { requesterId: userId, recipientId: { $in: teammateIds } },
        { recipientId: userId, requesterId: { $in: teammateIds } },
      ],
    }).lean();
    return !!friendship;
  }

  private async emitMissionProgressForCompletedGame(game: GameDocument): Promise<void> {
    const catalog = await this.catalogModel.findById(game.game_id).lean().exec();
    const missionGame = this.resolveMissionGameFromCatalogTitle(catalog?.title);
    const participants = game.participants ?? [];

    // Friends-scope mission progress is only granted when an accepted friend
    // is on the same team in this completed Arena game.
    for (const participant of participants) {
      const teammateIds = participants
        .filter((p) => p.team === participant.team && p.userId.toString() !== participant.userId.toString())
        .map((p) => p.userId);

      const withFriends = await this.isUserPlayingWithFriend(participant.userId, teammateIds);
      const dedupeKey = `game:${game._id.toString()}`;
      await this.missionService.onMatchCompleted(participant.userId.toString(), {
        game: missionGame,
        amount: 1,
        withFriends,
        dedupeKey,
      });
    }
  }

  create(createGameDto: CreateGameDto) {
    return this.gameModel.create(createGameDto);
  }

  findAll() {
    return this.gameModel.find().exec();
  }

  findOne(id: string) {
    return this.gameModel.findById(id).exec();
  }

  update(id: string, updateGameDto: UpdateGameDto) {
    return this.updateAndTriggerMissions(id, updateGameDto);
  }

  private async updateAndTriggerMissions(id: string, updateGameDto: UpdateGameDto) {
    const existing = await this.gameModel.findById(id).exec();
    const updated = await this.gameModel.findByIdAndUpdate(id, updateGameDto, { new: true }).exec();
    if (!updated) return updated;

    const transitionedToCompleted = existing?.status !== 'COMPLETED' && updated.status === 'COMPLETED';
    if (transitionedToCompleted) {
      await this.emitMissionProgressForCompletedGame(updated);
    }

    return updated;
  }

  remove(id: string) {
    return this.gameModel.findByIdAndDelete(id).exec();
  }
}
