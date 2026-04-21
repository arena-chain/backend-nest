import {
  IsString,
  IsUrl,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStreamDto {
  @ApiProperty({ description: 'Stream title' })
  @IsString()
  title: string;

  @ApiProperty({ required: false, description: 'Stream description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Streamer user ID' })
  @IsOptional()
  @IsString()
  streamerId?: string;

  @ApiProperty({ description: 'Channel ID that owns the stream' })
  @IsString()
  channelId: string;

  @ApiProperty({
    required: false,
    description: 'Source or playback URL for the live video',
  })
  @IsOptional()
  @IsUrl()
  streamUrl?: string;

  @ApiProperty({ required: false, description: 'Playback URL used by viewers' })
  @IsOptional()
  @IsUrl()
  playbackUrl?: string;

  @ApiProperty({
    required: false,
    default: false,
    description: 'Is the stream currently live',
  })
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

  @ApiProperty({ required: false, description: 'Scheduled start time' })
  @IsOptional()
  @IsDateString()
  scheduledStartTime?: string;

  @ApiProperty({ required: false, description: 'Scheduled end time' })
  @IsOptional()
  @IsDateString()
  scheduledEndTime?: string;
}
