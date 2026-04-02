import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';
import { TrainingResult, TrainingResultDocument } from './schemas/training-result.schema';
import { MissionService } from '../mission/mission.service';

@Injectable()
export class TrainingService {
  constructor(
    @InjectModel(TrainingResult.name)
    private trainingResultModel: Model<TrainingResultDocument>,
    private readonly missionService: MissionService,
  ) {}

  async saveResult(userId: string, data: Partial<TrainingResult>) {
    const result = new this.trainingResultModel({
      user: new Types.ObjectId(userId),
      difficulty: data.difficulty,
      duration: data.duration,
      score: data.score || 0,
      maxCombo: data.maxCombo || 0,
      accuracy: data.accuracy || 0,
      totalShots: data.totalShots || 0,
      hits: data.hits || 0,
      misses: data.misses || 0,
      perfectHits: data.perfectHits || 0,
      goodHits: data.goodHits || 0,
      badHits: data.badHits || 0,
    });
    const savedResult = await result.save();
    await this.missionService.onTrainingCompleted(userId, { game: 'all', amount: 1 });
    return savedResult;
  }

  async getLeaderboard(difficulty?: string, limit = 10) {
    const matchStage: any = {};
    if (difficulty) {
      matchStage.difficulty = difficulty;
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$user',
          score: { $max: '$score' },
          accuracy: { $max: '$accuracy' },
          difficulty: { $first: '$difficulty' },
        },
      },
      { $sort: { score: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: { $ifNull: ['$userInfo.nickname', 'Unknown Agent'] },
          avatar: '$userInfo.avatar',
          score: 1,
          accuracy: 1,
          difficulty: 1,
        },
      },
    ];

    return this.trainingResultModel.aggregate(pipeline).exec();
  }
}
