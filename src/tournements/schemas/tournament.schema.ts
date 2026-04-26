import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TournamentDocument = Tournament & Document;

// Phase sub-schema for tournament phases
@Schema({ _id: false })
export class TournamentPhase {
    @Prop({ required: true })
    name: string; // PLAY_IN, GROUP_STAGE, QUARTERFINALS, SEMIFINALS, FINALS

    @Prop({ default: 'PENDING' })
    status: string; // PENDING, ONGOING, COMPLETED

    @Prop()
    startDate?: Date;

    @Prop()
    endDate?: Date;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Game' }], default: [] })
    matches: Types.ObjectId[];
}

// Bundle Schema
@Schema({ _id: false })
export class Bundle {
    @Prop({ required: true })
    quantity: number;

    @Prop({ required: true })
    price: number;
}
export const BundleSchema = SchemaFactory.createForClass(Bundle);

// TicketType Schema
@Schema({ _id: false })
export class TicketType {
    @Prop({ required: true })
    name: string; // e.g., "Standard", "VIP"

    @Prop({ required: true })
    price: number; // Base price for 1 ticket

    @Prop({ required: true })
    capacity: number; // e.g., 100

    @Prop({ type: [BundleSchema], default: [] })
    bundles: Bundle[];
}
export const TicketTypeSchema = SchemaFactory.createForClass(TicketType);

export const TournamentPhaseSchema = SchemaFactory.createForClass(TournamentPhase);

@Schema({ timestamps: true })
export class Tournament {
    @Prop({ required: true })
    name: string;

    @Prop()
    description?: string;

    @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
    gameId: Types.ObjectId;

    @Prop({ required: true })
    organizerId: string;

    // Registration and Dates
    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop()
    registrationStart?: Date;

    @Prop()
    registrationEnd?: Date;

    @Prop()
    ticketSalesStart?: Date;

    // Teams
    @Prop({ required: true, min: 2 })
    maxTeams: number;

    @Prop({ default: 0, min: 0 })
    currentTeams: number;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Team' }], default: [] })
    teams: Types.ObjectId[];

    @Prop({ default: true })
    registrationOpen: boolean;

    // Prize Pool
    @Prop({ default: 0, min: 0 })
    prizePool: number;

    @Prop({ default: 0, min: 0 })
    firstPlace: number;

    @Prop({ default: 0, min: 0 })
    secondPlace: number;

    @Prop({ default: 0, min: 0 })
    thirdPlace: number;

    // Tournament Structure
    @Prop({ required: true })
    format: string; // SINGLE_ELIMINATION, DOUBLE_ELIMINATION, SWISS, ROUND_ROBIN

    @Prop({ type: [TournamentPhaseSchema], default: [] })
    phases: TournamentPhase[];

    // Status
    @Prop({ default: 'DRAFT' })
    status: string; // DRAFT, OPEN_REGISTRATION, ONGOING, COMPLETED, CANCELLED

    // Tournament Type and Invitations
    @Prop({ required: true, enum: ['OFFICIAL'], default: 'OFFICIAL' })
    type: string;

    @Prop({
        type: [{
            userId: { type: Types.ObjectId, ref: 'User' },
            status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' }
        }],
        default: []
    })
    invitations: { userId: Types.ObjectId, status: string }[];

    // Rules and Metadata
    @Prop({ type: Object, default: {} })
    rules: Record<string, any>;

    @Prop()
    bannerImageUrl?: string;

    @Prop()
    streamUrl?: string;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'TicketTypeDefinition' }], default: [] })
    ticketTypes: Types.ObjectId[];
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);

