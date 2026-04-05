import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RankGeneralConfigDocument = RankGeneralConfig & Document;

@Schema({ timestamps: true })
export class RankGeneralConfig {
    @Prop({ type: Types.ObjectId, ref: 'Catalog' })
    game?: Types.ObjectId; // If null, applies to all games

    @Prop({ default: 400 })
    eloWinAmount: number;

    @Prop({ default: 400 })
    eloLossAmount: number;

    @Prop({ default: 0 })
    startingElo: number;

    @Prop({ default: true })
    isActive: boolean;
}

export const RankGeneralConfigSchema = SchemaFactory.createForClass(RankGeneralConfig);
