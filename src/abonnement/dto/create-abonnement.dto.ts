import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AbonnementType {
  FREE = 'Free',
  PRO = 'Pro',
  PREMIUM = 'Premium',
}

export class CreateAbonnementDto {
  @ApiProperty({
    enum: AbonnementType,
    description: 'Type of the subscription plan',
  })
  @IsEnum(AbonnementType)
  @IsNotEmpty()
  name: AbonnementType;

  @ApiProperty({ description: 'Price of the subscription', example: 9.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Duration in months', example: 1 })
  @IsNumber()
  @Min(1)
  durationInMonths: number;

  @ApiProperty({ description: 'List of features included', type: [String] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'Description of the plan', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
