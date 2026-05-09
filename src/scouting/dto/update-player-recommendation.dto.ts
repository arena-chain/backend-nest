import { IsEnum, IsOptional } from 'class-validator';
import { RecommendationStatus } from '../schemas/player-recommendation.schema';

export class UpdatePlayerRecommendationDto {
  @IsEnum(RecommendationStatus)
  @IsOptional()
  status?: RecommendationStatus;
}
