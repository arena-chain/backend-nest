import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlayerDto {
  @ApiProperty({
    required: false,
    default: false,
    description: 'Is this a professional player',
  })
  @IsOptional()
  @IsBoolean()
  isPro?: boolean;

  @ApiProperty({
    required: false,
    default: false,
    description: 'Is the player verified',
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
