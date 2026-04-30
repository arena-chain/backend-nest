import { IsIn } from 'class-validator';

export class CompleteMatchDto {
  @IsIn(['BLUE', 'RED'])
  winningTeam: 'BLUE' | 'RED';
}
