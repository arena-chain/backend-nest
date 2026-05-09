import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroupChatDocument = GroupChat & Document;

@Schema({ timestamps: true })
export class GroupChat {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: ['room', 'group'], default: 'group' })
  type: 'room' | 'group';

  @Prop()
  description?: string;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];
}

export const GroupChatSchema = SchemaFactory.createForClass(GroupChat);
