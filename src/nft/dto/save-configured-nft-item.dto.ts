import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveConfiguredNftItemDto {
  @ApiProperty({
    description:
      'NFT template id (base definition) to attach this configuration to',
  })
  @IsString()
  @IsNotEmpty()
  baseNftId: string;

  @ApiPropertyOptional({
    description: 'Editor configuration JSON (colors, parts, transforms, …)',
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Human-readable label stored on the item metadata',
  })
  @IsString()
  @IsOptional()
  displayName?: string;
}
