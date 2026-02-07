import { IsString, IsUrl, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStreamDto {
    @ApiProperty({ description: 'Stream title' })
    @IsString()
    title: string;

    @ApiProperty({ required: false, description: 'Stream description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Streamer user ID' })
    @IsString()
    streamerId: string;

    @ApiProperty({ description: 'Stream URL' })
    @IsUrl()
    streamUrl: string;

    @ApiProperty({ required: false, default: false, description: 'Is the stream currently live' })
    @IsOptional()
    @IsBoolean()
    isLive?: boolean;

    @ApiProperty({ required: false, description: 'Stream tags', type: [String] })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiProperty({ required: false, description: 'Thumbnail URL' })
    @IsOptional()
    @IsUrl()
    thumbnailUrl?: string;
}
