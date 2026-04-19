import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HighlightDocument = Highlight & Document;

<<<<<<< HEAD
export enum HighlightVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Schema({ timestamps: true })
export class Highlight {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true })
  video: Types.ObjectId;

  @Prop({ required: true })
  startTime: number; // in seconds

  @Prop({ required: true })
  endTime: number; // in seconds

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creator: Types.ObjectId;

  @Prop({ required: true })
  clipUrl: string; // path or URL to generated highlight clip

  @Prop({
    enum: HighlightVisibility,
    default: HighlightVisibility.PRIVATE,
  })
  visibility: HighlightVisibility;

  /** Users who saved this highlight (bookmarks). */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  savedBy: Types.ObjectId[];
}

export const HighlightSchema = SchemaFactory.createForClass(Highlight);

HighlightSchema.index({ savedBy: 1 });
=======
@Schema({ timestamps: true })
export class Highlight {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ type: Types.ObjectId, ref: 'Video', required: true })
    video: Types.ObjectId;

    @Prop({ required: true })
    startTime: number; // in seconds

    @Prop({ required: true })
    endTime: number; // in seconds

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    creator: Types.ObjectId;
}

export const HighlightSchema = SchemaFactory.createForClass(Highlight);
>>>>>>> origin/marketPlace
