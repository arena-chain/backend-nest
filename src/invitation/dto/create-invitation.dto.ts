import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { InvitationType } from '../schemas/invitation.schema';

export class CreateInvitationDto {
  @IsString()
  @IsNotEmpty()
  teamId: string;

  @IsEnum(InvitationType)
  @IsNotEmpty()
  type: InvitationType;

  @IsString()
  @IsOptional()
  tournamentId?: string;

  @IsString()
  @IsOptional()
  seasonId?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  expiresAt?: string; // ISO 8601
}
