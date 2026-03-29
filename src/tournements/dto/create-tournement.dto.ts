import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDate, IsEnum, IsBoolean, Min, IsArray, IsObject, ValidateNested, IsMongoId } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TournamentFormat {
    SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
    DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
    SWISS = 'SWISS',
    ROUND_ROBIN = 'ROUND_ROBIN',
}

export enum TournamentStatus {
    DRAFT = 'DRAFT',
    OPEN_REGISTRATION = 'OPEN_REGISTRATION',
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum PhaseName {
    PLAY_IN = 'PLAY_IN',
    GROUP_STAGE = 'GROUP_STAGE',
    QUARTERFINALS = 'QUARTERFINALS',
    SEMIFINALS = 'SEMIFINALS',
    FINALS = 'FINALS',
}

export enum TournamentType {
    OFFICIAL = 'OFFICIAL',
}

export class BundleDto {
    @IsNumber()
    @Min(1)
    @Transform(({ value }) => {
        const num = typeof value === 'string' ? parseInt(value, 10) : value;
        return isNaN(num) ? value : num;
    })
    quantity: number;

    @IsNumber()
    @Min(0)
    @Transform(({ value }) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? value : num;
    })
    price: number;
}

export class TicketTypeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @Min(0)
    @Transform(({ value }) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? value : num;
    })
    price: number;

    @IsNumber()
    @Min(1)
    @Transform(({ value }) => {
        const num = typeof value === 'string' ? parseInt(value, 10) : value;
        return isNaN(num) ? value : num;
    })
    capacity: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BundleDto)
    @IsOptional()
    bundles?: BundleDto[];
}

export class CreateTournementDto {
    @ApiProperty({ description: 'Tournament name', example: 'Winter Championship 2026' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ description: 'Tournament description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Game/Catalog ID', example: '65bf...' })
    @IsMongoId({ message: 'gameId must be a valid MongoDB ObjectId' })
    @IsNotEmpty()
    gameId: string;

    @ApiPropertyOptional({ description: 'Tournament Type', enum: TournamentType, example: TournamentType.OFFICIAL })
    @IsEnum(TournamentType)
    @IsOptional()
    type?: TournamentType;

    @ApiProperty({ description: 'Organizer User ID', example: 'user123' })
    @IsString()
    @IsNotEmpty()
    organizerId: string;

    @ApiProperty({ description: 'Tournament start date', example: '2026-12-01T10:00:00.000Z' })
    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    startDate: Date;

    @ApiProperty({ description: 'Tournament end date', example: '2026-12-05T20:00:00.000Z' })
    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    endDate: Date;

    @ApiPropertyOptional({ description: 'Registration start date' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    registrationStart?: Date;

    @ApiPropertyOptional({ description: 'Registration end date' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    registrationEnd?: Date;

    @ApiProperty({ description: 'Maximum number of teams', example: 16, minimum: 2 })
    @Type(() => Number)
    @IsNumber()
    @Min(2)
    @IsNotEmpty()
    maxTeams: number;

    @ApiPropertyOptional({ description: 'Total prize pool', example: 5000, default: 0 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    prizePool?: number;

    @ApiPropertyOptional({ description: 'First place prize', example: 2500, default: 0 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    firstPlace?: number;

    @ApiPropertyOptional({ description: 'Second place prize', example: 1500, default: 0 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    secondPlace?: number;

    @ApiPropertyOptional({ description: 'Third place prize', example: 1000, default: 0 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    thirdPlace?: number;

    @ApiProperty({ description: 'Tournament format', enum: TournamentFormat, example: TournamentFormat.SINGLE_ELIMINATION })
    @IsEnum(TournamentFormat)
    @IsNotEmpty()
    format: TournamentFormat;

    @ApiPropertyOptional({ description: 'Tournament rules', example: { bestOf: 3, mapPool: ['Dust2', 'Inferno'] } })
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try { return JSON.parse(value); } catch { return value; }
        }
        return value;
    })
    @IsObject()
    @IsOptional()
    rules?: Record<string, any>;

    @ApiPropertyOptional({ description: 'Banner image URL' })
    @IsString()
    @IsOptional()
    bannerImageUrl?: string;

    @ApiPropertyOptional({ description: 'Stream URL' })
    @IsString()
    @IsOptional()
    streamUrl?: string;

    @ApiPropertyOptional({ description: 'Registration open status', default: true })
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    @IsOptional()
    registrationOpen?: boolean;
}
