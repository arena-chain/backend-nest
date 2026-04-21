import { IsString, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateChannelDto {
    @ApiProperty({ required: false, description: 'Channel name' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false, description: 'Channel description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false, description: 'Is channel active' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ required: false, description: 'Subscriber count' })
    @IsOptional()
    @IsNumber()
    subscriberCount?: number;

    @ApiProperty({ required: false, description: 'Banner URL' })
    @IsOptional()
    @IsString()
    bannerUrl?: string;

    @ApiProperty({ required: false, description: 'Avatar URL' })
    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @ApiProperty({ required: false, description: 'Channel categories', type: [String] })
    @IsOptional()
    @IsArray()
    categories?: string[];
}
