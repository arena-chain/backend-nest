import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

/** Dev / staging only — mints whole GTK/VEX tokens to the caller’s linked wallet (see GTK_ALLOW_TEST_CREDIT). */
export class CreditTestGameTokenDto {
  @ApiProperty({
    example: 100,
    description: 'Whole tokens to mint (e.g. 100 = 100 * 10^decimals wei)',
  })
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  wholeAmount!: number;
}
