// src/friendship/schemas/friendship.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FriendshipDocument = Friendship & Document;

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
}

@Schema({ timestamps: true })
export class Friendship {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId; // User who sent the friend request

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId; // User who received the friend request

  @Prop({
    type: String,
    enum: Object.values(FriendshipStatus),
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  blockedAt?: Date;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);

// Create compound index to prevent duplicate friendships
FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

// Index for efficient querying
FriendshipSchema.index({ requesterId: 1, status: 1 });
FriendshipSchema.index({ recipientId: 1, status: 1 });
