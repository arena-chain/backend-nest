import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true })
export class Team {
    @Prop({ required: true })
    name: string;

<<<<<<< HEAD
=======
    @Prop({ required: true, uppercase: true, trim: true, maxlength: 8 })
    tag: string;

>>>>>>> origin/live_stream
    @Prop()
    logo?: string;

    @Prop()
    description?: string;

<<<<<<< HEAD
=======
    @Prop()
    country?: string;

    @Prop({ type: Types.ObjectId, ref: 'Catalog' })
    gameId?: Types.ObjectId;

>>>>>>> origin/live_stream
    @Prop({ type: Types.ObjectId, ref: 'User' })
    captain?: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    members: Types.ObjectId[];
<<<<<<< HEAD

    // Optional: Rank/Ligue integration
    @Prop({ type: Types.ObjectId, ref: 'Ligue' })
    ligue?: Types.ObjectId;

    @Prop({ default: 0 })
    elo?: number;
=======
>>>>>>> origin/live_stream
}

export const TeamSchema = SchemaFactory.createForClass(Team);
