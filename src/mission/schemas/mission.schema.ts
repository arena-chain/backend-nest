import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MissionDocument = Mission & Document;

@Schema({ _id: false })
export class MissionCriteria {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  target: number;
}

@Schema({ timestamps: true })
export class Mission {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({
    required: true,
    enum: ['daily', 'weekly', 'special'],
    default: 'daily',
  })
  type: string;

  @Prop({
    required: true,
    enum: ['individual', 'friends'],
    default: 'individual',
  })
  scope: string;

  @Prop({ required: true, enum: ['lol', 'valorant', 'all'], default: 'all' })
  game: string;

  @Prop({ type: MissionCriteria, required: true })
  criteria: MissionCriteria;

  @Prop({ required: true, enum: ['xp', 'tokens', 'nft'], default: 'xp' })
  rewardType: string;

  @Prop({ required: true })
  rewardAmount: number;

  @Prop({ default: '#00ff87' })
  iconColor: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const MissionSchema = SchemaFactory.createForClass(Mission);
