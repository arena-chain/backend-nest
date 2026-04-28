import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class GiftSimulatedDto {
  @ApiProperty({
    description: 'Recipient user id',
    example: '665f1a7a30ad5d41e32e11b1',
  })
  @IsMongoId()
  recipientUserId: string;

  @ApiProperty({
    description: 'Whole GTK/VEX amount to gift',
    example: 25,
    minimum: 0.000001,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  wholeAmount: number;

  @ApiProperty({
    description: 'Optional gift note/title suffix',
    required: false,
    example: 'GG for yesterday match',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  note?: string;
}
