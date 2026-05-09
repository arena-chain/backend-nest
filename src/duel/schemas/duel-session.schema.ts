import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DuelSessionDocument = DuelSession & Document;

@Schema({ timestamps: true })
export class DuelSession {
  @Prop({ required: true, unique: true })
  lobbyCode: string;

  @Prop({ default: 'waiting' })
  status: 'waiting' | 'in_progress' | 'finished';

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ required: true })
  lobbyName: string;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        username: String,
        score: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        avgResponseTime: { type: Number, default: 0 },
        ready: { type: Boolean, default: false },
        finished: { type: Boolean, default: false },
      },
    ],
  })
  players: any[];

  @Prop({
    type: {
      difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
      duration: { type: Number, enum: [60, 120, 180], default: 60 },
    },
  })
  config: { difficulty: string; duration: number };

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  winnerId: Types.ObjectId;
}

export const DuelSessionSchema = SchemaFactory.createForClass(DuelSession);

// Add TTL index for stale waiting lobbies (10 minutes = 600s)
// Note: Partial index could be used but MongoDB TTL also works on the whole collection based on createdAt.
// However, we only want to expire 'waiting' ones. 
// Standard TTL indexes expire the whole document. We'll rely on our cron/service cleanup for 'finished' ones if needed.
DuelSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600, partialFilterExpression: { status: 'waiting' } });
