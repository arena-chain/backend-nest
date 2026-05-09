import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class CreatePlayerRankDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsNotEmpty()
  @IsMongoId()
  gameId: string;
}
