import { PartialType } from '@nestjs/swagger';
import { CreateTournementDto, TournamentStatus } from './create-tournement.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTournementDto extends PartialType(CreateTournementDto) {
  @ApiPropertyOptional({
    description: 'Tournament status',
    enum: TournamentStatus,
  })
  @IsEnum(TournamentStatus)
  @IsOptional()
  status?: TournamentStatus;
}
