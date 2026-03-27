import { IsString, IsUrl, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStreamDto {
    @ApiProperty({ required: false, description: 'Stream title' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ required: false, description: 'Stream description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false, description: 'Stream URL' })
    @IsOptional()
    @IsUrl()
    streamUrl?: string;

    @ApiProperty({ required: false, description: 'Is the stream currently live' })
    @IsOptional()
    @IsBoolean()
    isLive?: boolean;

    @ApiProperty({ required: false, description: 'Viewer count' })
    @IsOptional()
    @IsNumber()
    viewerCount?: number;

    @ApiProperty({ required: false, description: 'Stream tags', type: [String] })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiProperty({ required: false, description: 'Thumbnail URL' })
    @IsOptional()
    @IsUrl()
    thumbnailUrl?: string;
}
