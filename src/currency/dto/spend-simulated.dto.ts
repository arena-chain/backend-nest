import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Dev only — records an “out” ledger row without an on-chain transfer (GTK_ALLOW_ECONOMY_SIMULATION). */
export class SpendSimulatedDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  wholeAmount!: number;

  @ApiPropertyOptional({ example: 'Shop item' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
