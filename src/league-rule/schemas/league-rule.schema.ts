import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeagueRuleDocument = LeagueRule & Document;

export enum MatchFormat {
    BO1 = 'BO1',
    BO3 = 'BO3',
    BO5 = 'BO5',
}

export enum FormatType {
    LEAGUE = 'LEAGUE',
    SWISS = 'SWISS',
    KNOCKOUT = 'KNOCKOUT',
}

export enum TiebreakerRule {
    POINTS = 'POINTS',
    GAME_DIFF = 'GAME_DIFF',
    HEAD_TO_HEAD = 'HEAD_TO_HEAD',
}

export enum MapVetoFormat {
    // BO1 formats
    ADMIN_PICK = 'ADMIN_PICK',                                          // Admin selects the map
    RANDOM = 'RANDOM',                                                  // Random map from pool
    BAN_BAN_DECIDER = 'BAN_BAN_DECIDER',                               // Teams alternate bans, last map = decider

    // BO3 formats
    BAN_BAN_PICK_PICK_BAN_BAN_DECIDER = 'BAN_BAN_PICK_PICK_BAN_BAN_DECIDER', // Standard Valorant / CS2 BO3
    PICK_PICK_DECIDER = 'PICK_PICK_DECIDER',                           // Each team picks 1, remaining = decider

    // BO5 formats
    BAN_BAN_PICK_PICK_PICK_PICK_DECIDER = 'BAN_BAN_PICK_PICK_PICK_PICK_DECIDER', // Standard BO5
}

export enum VetoFirstPick {
    HIGHER_SEED = 'HIGHER_SEED',
    LOWER_SEED = 'LOWER_SEED',
    COIN_FLIP = 'COIN_FLIP',
    ADMIN = 'ADMIN',
}

export enum OvertimeFormat {
    NONE = 'NONE',             // No overtime — tie is a draw (CS2 amateur) or impossible (LoL)
    VALORANT_OT = 'VALORANT_OT', // 2-round OT, repeat until +2 ahead
    CS2_OT = 'CS2_OT',          // 6-round OT period, fixed start money, repeat until someone wins period
}

/** When this ruleset is used: Regular Season, Playoffs, Play-In, etc. */
export enum RuleUsage {
    REGULAR_SEASON = 'REGULAR_SEASON',
    PLAYOFFS = 'PLAYOFFS',
    GRAND_FINAL = 'GRAND_FINAL',
    PLAY_IN = 'PLAY_IN',
    QUALIFICATION = 'QUALIFICATION',
    GROUP_STAGE = 'GROUP_STAGE',
}

/** How sides (attack/defense, blue/red) are decided. */
export enum SideSelection {
    HIGHER_SEED_CHOOSES = 'HIGHER_SEED_CHOOSES',
    KNIFE_ROUND = 'KNIFE_ROUND',
    COIN_TOSS = 'COIN_TOSS',
    VETO_WINNER_CHOOSES = 'VETO_WINNER_CHOOSES',
    FIXED_TEAM_A_ATTACK = 'FIXED_TEAM_A_ATTACK',
}

/** How match scores are submitted and validated (dispute prevention). */
export enum ScoreSubmissionMethod {
    ADMIN_VERIFIED = 'ADMIN_VERIFIED',
    BOTH_TEAMS_CONFIRM = 'BOTH_TEAMS_CONFIRM',
    AUTO_FROM_API = 'AUTO_FROM_API',
}

@Schema({ _id: false })
export class OvertimeConfig {
    @Prop({ required: true, enum: OvertimeFormat, default: OvertimeFormat.NONE })
    format: OvertimeFormat;

    // Whether overtime is active for this rule
    @Prop({ default: false })
    enabled: boolean;

    // CS2 only — rounds per OT period (default: 6)
    @Prop({ default: 6 })
    maxRoundsPerPeriod: number;

    // CS2 only — starting money per team in each OT period (default: 10500)
    @Prop({ default: 10500 })
    startMoney: number;

    // CS2 only — if OT is disabled, does a tied map count as a draw?
    @Prop({ default: false })
    allowDrawIfDisabled: boolean;

    // Maximum OT periods allowed (0 = unlimited, plays until winner)
    @Prop({ default: 0 })
    maxOvertimePeriods: number;
}

@Schema({ timestamps: true })
export class LeagueRule {
    @Prop({ required: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: 'Catalog', required: true })
    gameId: Types.ObjectId;

    @Prop({ required: true, enum: FormatType, default: FormatType.LEAGUE })
    formatType: FormatType;

    @Prop({ required: true, enum: MatchFormat, default: MatchFormat.BO3 })
    matchType: MatchFormat;

    // Points awarded per match result
    @Prop({ required: true, default: 3 })
    pointsWin: number;


    @Prop({ required: true, default: 0 })
    pointsLoss: number;

    @Prop({ required: true, default: 16 })
    maxTeams: number;

    // Forfeit policy
    @Prop({ required: true, default: 3 })
    maxForfeitsBeforeDisqualification: number;

    @Prop({ default: true })
    forfeitCountsAsLoss: boolean;

    // Tiebreaker order
    @Prop({ required: true, enum: TiebreakerRule, default: TiebreakerRule.GAME_DIFF })
    tiebreaker: TiebreakerRule;

    // Map system
    @Prop({ type: [String], default: [] })
    mapPool: string[];

    @Prop({ default: true })
    mapVetoEnabled: boolean;

    @Prop({ enum: MapVetoFormat, default: MapVetoFormat.BAN_BAN_PICK_PICK_BAN_BAN_DECIDER })
    mapVetoFormat?: MapVetoFormat;

    @Prop({ enum: VetoFirstPick, default: VetoFirstPick.HIGHER_SEED })
    vetoFirstPick?: VetoFirstPick;

    // Rule usage — which phase(s) this ruleset applies to (e.g. Playoffs, Play-In)
    @Prop({ type: [String], enum: Object.values(RuleUsage), default: [RuleUsage.REGULAR_SEASON] })
    ruleUsage: RuleUsage[];

    // Side selection (attack/defense, blue/red)
    @Prop({ enum: SideSelection, default: SideSelection.HIGHER_SEED_CHOOSES })
    sideSelection: SideSelection;

    // Match reporting / score validation (dispute prevention)
    @Prop({ enum: ScoreSubmissionMethod, default: ScoreSubmissionMethod.ADMIN_VERIFIED })
    scoreSubmissionMethod: ScoreSubmissionMethod;

    @Prop({ default: false })
    substitutionsAllowed: boolean;

    @Prop({ default: 0 })
    maxSubstitutions: number;

    @Prop({ default: false })
    emergencySubsOnly: boolean;

    @Prop({ default: true })
    pauseAllowedForDisconnect: boolean;

    @Prop()
    replayConditions?: string;

    @Prop()
    remakeConditions?: string;

    @Prop({ default: false })
    adminDecisionRequired: boolean;

    // Overtime config — structure differs per game
    @Prop({
        type: {
            format: { type: String, enum: Object.values(OvertimeFormat), default: OvertimeFormat.NONE },
            enabled: { type: Boolean, default: false },
            maxRoundsPerPeriod: { type: Number, default: 6 },
            startMoney: { type: Number, default: 10500 },
            allowDrawIfDisabled: { type: Boolean, default: false },
            maxOvertimePeriods: { type: Number, default: 0 },
        },
        default: () => ({
            format: OvertimeFormat.NONE,
            enabled: false,
            maxRoundsPerPeriod: 6,
            startMoney: 10500,
            allowDrawIfDisabled: false,
            maxOvertimePeriods: 0,
        }),
        _id: false,
    })
    overtimeConfig: OvertimeConfig;

    @Prop({ type: Object })
    extraRules?: Record<string, any>;
}

export const LeagueRuleSchema = SchemaFactory.createForClass(LeagueRule);
LeagueRuleSchema.index({ gameId: 1 });
