import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChannelDto {
  @ApiProperty({ description: 'Channel name' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, description: 'Channel description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Owner user ID' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ required: false, description: 'Banner URL' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiProperty({ required: false, description: 'Avatar URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiProperty({
    required: false,
    description: 'Channel categories',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  categories?: string[];
}
