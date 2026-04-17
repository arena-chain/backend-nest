import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GroupDocument = Group & Document;

@Schema({ timestamps: true })
export class Group {
    @Prop({ required: true })
    seasonId: string;

    @Prop({ required: true })
    stageId: string;

    /** Human-readable label: "Group A", "Group B", etc. */
    @Prop({ required: true })
    name: string;

    /** 0-based index for ordering groups within the stage */
    @Prop({ required: true, default: 0 })
    groupIndex: number;

    /** Team IDs assigned to this group */
    @Prop({ type: [String], default: [] })
    teamIds: string[];

    /** How many top teams advance from this group to the next stage */
    @Prop({ default: 1 })
    advancementCount: number;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

GroupSchema.index({ stageId: 1, groupIndex: 1 }, { unique: true });
GroupSchema.index({ seasonId: 1 });
GroupSchema.index({ stageId: 1 });
