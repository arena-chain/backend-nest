import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateNewsDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    slug?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    summary: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    content?: string;

    @ApiPropertyOptional()
    @IsUrl()
    @IsOptional()
    coverImageUrl?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    sourceName: string;

    @ApiPropertyOptional()
    @IsUrl()
    @IsOptional()
    sourceUrl?: string;

    @ApiProperty()
    @IsDateString()
    @IsNotEmpty()
    publishedAt: string | Date;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    region?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    game: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    tags?: string[];

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;
}

export class UpdateNewsDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    content?: string;

    @ApiPropertyOptional()
    @IsUrl()
    @IsOptional()
    coverImageUrl?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    game?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    tags?: string[];

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;
}
