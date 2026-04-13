import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssetPresetDto {
    @ApiProperty({ example: 'My CS2 loadout v1' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ description: 'Base NFT template id (from GET /api/nft)' })
    @IsString()
    @IsOptional()
    baseNftId?: string;

    @ApiPropertyOptional({ description: 'Relative path from GET /api/game-assets' })
    @IsString()
    @IsOptional()
    assetPath?: string;

    @ApiPropertyOptional({ description: 'Editor state: colors, attachments, transforms, etc.' })
    @IsObject()
    @IsOptional()
    config?: Record<string, any>;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    previewImageUrl?: string;
}
