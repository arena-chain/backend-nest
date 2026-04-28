import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { RecommendationLevel } from '../schemas/player-recommendation.schema';

export class CreatePlayerRecommendationDto {
  @IsMongoId()
  @IsNotEmpty()
  scouterId: string;

  @IsMongoId()
  @IsNotEmpty()
  playerId: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsEnum(RecommendationLevel)
  recommendationLevel: RecommendationLevel;

  @IsString()
  @IsOptional()
  message?: string;
}
