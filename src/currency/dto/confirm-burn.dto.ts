import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ConfirmBurnDto {
  @ApiProperty({
    example: '0xabc...',
    description:
      'Transaction hash of a GameToken burn() from your linked wallet',
  })
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'txHash must be a 32-byte hex string',
  })
  txHash!: string;
}
