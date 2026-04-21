import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class UpdateRefereeDto {
  @ApiProperty({ required: false, description: 'Referee level' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({ required: false, description: 'Referee rating' })
  @IsOptional()
  @IsNumber()
  rating?: number;

  @ApiProperty({
    required: false,
    description: 'Assigned match IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  assignedMatches?: Types.ObjectId[];
}
