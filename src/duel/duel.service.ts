import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DuelSession, DuelSessionDocument } from './schemas/duel-session.schema';

@Injectable()
export class DuelService {
  constructor(
    @InjectModel(DuelSession.name)
    private duelSessionModel: Model<DuelSessionDocument>,
  ) {}

  /**
   * Creates a new duel lobby.
   */
  async createLobby(userId: string, username: string, config: any, isPublic: boolean) {
    const lobbyCode = await this.generateUniqueCode();
    const session = new this.duelSessionModel({
      lobbyCode,
      lobbyName: `${username}'s Arena`,
      isPublic,
      status: 'waiting',
      players: [{ userId: new Types.ObjectId(userId), username, ready: false }],
      config,
    });
    return session.save();
  }

  /**
   * Joins an existing lobby by code.
   */
  async joinLobby(lobbyCode: string, userId: string, username: string) {
    const session = await this.duelSessionModel.findOne({ lobbyCode });
    if (!session) {
      throw new NotFoundException('Lobby not found');
    }

    // ALLOW RE-JOIN: If player is already in this session, return it immediately.
    // This allows the Game screen to re-join the socket room after a page reload.
    if (session.players.some((p) => p.userId.toString() === userId)) {
      return session;
    }

    // New players can only join if it's still 'waiting'
    if (session.status !== 'waiting') {
      throw new BadRequestException('Lobby already started');
    }

    if (session.players.length >= 2) {
      throw new BadRequestException('Lobby is full');
    }

    session.players.push({ userId: new Types.ObjectId(userId), username, ready: false });
    return session.save();
  }

  /**
   * Marks a player as ready.
   */
  async playerReady(lobbyCode: string, userId: string) {
    const session = await this.duelSessionModel.findOne({ lobbyCode });
    if (!session) throw new NotFoundException('Lobby not found');

    const player = session.players.find((p) => p.userId.toString() === userId);
    if (!player) throw new BadRequestException('Player not in lobby');

    player.ready = true;

    // Check if both are ready
    if (session.players.length === 2 && session.players.every((p) => p.ready)) {
      session.status = 'in_progress';
    }

    return session.save();
  }

  /**
   * Updates live score during the match.
   */
  async updateScore(lobbyCode: string, userId: string, score: number, accuracy: number) {
    return this.duelSessionModel.findOneAndUpdate(
      { lobbyCode, 'players.userId': new Types.ObjectId(userId) },
      { $set: { 'players.$.score': score, 'players.$.accuracy': accuracy } },
      { new: true },
    );
  }

  /**
   * Finalizes a player's stats and calculates winner if both done.
   */
  async finishSession(lobbyCode: string, userId: string, finalStats: any) {
    // 1. Atomic update of the finishing player's data
    const session = await this.duelSessionModel.findOneAndUpdate(
      { lobbyCode, 'players.userId': new Types.ObjectId(userId) },
      { 
        $set: { 
          'players.$.score': finalStats.score,
          'players.$.accuracy': finalStats.accuracy,
          'players.$.avgResponseTime': finalStats.avgResponseTime,
          'players.$.finished': true
        } 
      },
      { new: true }
    );

    if (!session) throw new NotFoundException('Session not found');

    // 2. Determine if the match is now complete
    if (session.players.every((p) => p.finished)) {
      const p1 = session.players[0];
      const p2 = session.players[1];
      let winnerId: any = null;

      if (p1.score > p2.score) {
        winnerId = p1.userId;
      } else if (p2.score > p1.score) {
        winnerId = p2.userId;
      } else {
        if (p1.accuracy > p2.accuracy) winnerId = p1.userId;
        else if (p2.accuracy > p1.accuracy) winnerId = p2.userId;
      }

      // 3. Final atomic status transition
      const finalSession = await this.duelSessionModel.findOneAndUpdate(
        { lobbyCode },
        { $set: { status: 'finished', winnerId: winnerId ? winnerId.toString() : null } },
        { new: true }
      ).lean();

      return finalSession;
    }

    return session;
  }

  /**
   * Fetches the current session state.
   */
  async getSession(lobbyCode: string) {
    return this.duelSessionModel.findOne({ lobbyCode }).populate('players.userId');
  }

  /**
   * Finds all public lobbies waiting for players.
   */
  async findPublicLobbies() {
    return this.duelSessionModel.find({ isPublic: true, status: 'waiting', 'players.1': { $exists: false } }).limit(10);
  }

  /**
   * Removes a player from a lobby.
   */
  async leaveLobby(lobbyCode: string, userId: string) {
    const session = await this.duelSessionModel.findOne({ lobbyCode });
    if (!session) return null;

    session.players = session.players.filter(p => p.userId.toString() !== userId);
    
    if (session.players.length === 0) {
      await this.duelSessionModel.deleteOne({ lobbyCode });
      return null;
    }

    return session.save();
  }

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars 0,O,1,I
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await this.duelSessionModel.findOne({ lobbyCode: code });
    if (existing) return this.generateUniqueCode();
    return code;
  }
}
