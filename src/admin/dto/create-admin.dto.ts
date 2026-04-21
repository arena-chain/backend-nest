import { IsNumber, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ required: false, default: 1, description: 'Admin level' })
  @IsOptional()
  @IsNumber()
  adminLevel?: number;

  @ApiProperty({
    required: false,
    description: 'Admin permissions',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}
