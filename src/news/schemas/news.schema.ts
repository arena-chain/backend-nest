import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsDocument = News & Document;

@Schema({ timestamps: true })
export class News {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  summary: string;

  @Prop()
  content?: string;

  @Prop()
  coverImageUrl?: string;

  @Prop({ required: true })
  sourceName: string;

  @Prop({ required: true, unique: true })
  sourceUrl: string;

  @Prop({ required: true })
  publishedAt: Date;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ default: 'global' })
  region: string;

  @Prop({ required: true })
  category: string; // patch_notes|esports|community|tech|release|general

  @Prop({ required: true })
  game: string; // valorant|lol|cs2|fortnite|other

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 'published' })
  status: string;

  @Prop({ default: false })
  isFeatured: boolean;
}

export const NewsSchema = SchemaFactory.createForClass(News);
NewsSchema.index({ game: 1, category: 1 });
