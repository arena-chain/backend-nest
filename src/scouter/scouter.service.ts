import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ScouterProfile,
  ScouterProfileDocument,
  ScouterLevel,
} from './schemas/scouter-profile.schema';
import { SeasonRoster } from '../season-roster/schemas/season-roster.schema';
import { PlayerService } from '../player/player.service';
import { MatchService } from '../match/match.service';

@Injectable()
export class ScouterService {
  constructor(
    @InjectModel(ScouterProfile.name)
    private scouterModel: Model<ScouterProfileDocument>,
    @InjectModel(SeasonRoster.name) private rosterModel: Model<any>,
    private readonly playerService: PlayerService,
    private readonly matchService: MatchService,
  ) {}

  async create(
    userId: Types.ObjectId,
    profileData: { level?: ScouterLevel; notes?: string },
  ): Promise<ScouterProfileDocument> {
    const profile = new this.scouterModel({
      userId,
      level: profileData.level ?? ScouterLevel.REGIONAL,
      leagues: [],
      seasons: [],
      scoutedPlayers: [],
      notes: profileData.notes,
      isActive: true,
    });
    return profile.save();
  }

  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<ScouterProfileDocument> {
    const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const profile = await this.scouterModel.findOne({ userId: id }).exec();
    if (!profile) throw new NotFoundException('Scouter profile not found');
    return profile;
  }

  async update(
    userId: string | Types.ObjectId,
    updateData: Partial<ScouterProfile>,
  ): Promise<ScouterProfileDocument> {
    const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const profile = await this.scouterModel
      .findOneAndUpdate({ userId: id }, updateData, { new: true })
      .exec();
    if (!profile) throw new NotFoundException('Scouter profile not found');
    return profile;
  }

  async findAll(): Promise<ScouterProfileDocument[]> {
    return this.scouterModel.find().populate('userId').exec();
  }

  /** Add a player to the scouter's evaluated list */
  async addScoutedPlayer(
    scouterUserId: string,
    playerProfileId: string,
  ): Promise<ScouterProfileDocument> {
    const profile = await this.findByUserId(scouterUserId);
    const pid = new Types.ObjectId(playerProfileId);
    if (!profile.scoutedPlayers.some((id) => id.equals(pid))) {
      profile.scoutedPlayers.push(pid);
      await profile.save();
    }
    return profile;
  }

  /**
   * Get list of players (for scouter dashboard).
   * Returns all player profiles with basic info.
   */
  async getPlayersList() {
    return this.playerService.findAll();
  }

  /**
   * Get a player's full profile (for scouter evaluation).
   */
  async getPlayerProfile(playerUserId: string) {
    return this.playerService.findByUserId(playerUserId);
  }

  /**
   * Get a player's match history.
   * Uses SeasonRoster to find teams the player was on, then fetches matches for those teams.
   */
  async getPlayerMatchHistory(playerUserId: string): Promise<any[]> {
    const playerId = new Types.ObjectId(playerUserId);
    const playerRosters = await this.rosterModel
      .find({ playerIds: playerId })
      .exec();
    if (playerRosters.length === 0) return [];

    const matches: any[] = [];
    for (const roster of playerRosters) {
      const seasonMatches = await this.matchService.findBySeason(
        roster.seasonId,
      );
      const relevant = seasonMatches.filter(
        (m: any) => m.team1Id === roster.teamId || m.team2Id === roster.teamId,
      );
      matches.push(...relevant);
    }
    matches.sort(
      (a, b) =>
        new Date(b.scheduledStart).getTime() -
        new Date(a.scheduledStart).getTime(),
    );
    return matches;
  }
}
