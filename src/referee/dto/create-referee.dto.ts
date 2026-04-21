import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRefereeDto {
  @ApiProperty({
    required: false,
    default: 'Junior',
    description: 'Referee level',
  })
  @IsOptional()
  @IsString()
  level?: string;
}
