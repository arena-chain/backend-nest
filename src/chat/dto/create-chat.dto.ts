import { IsMongoId, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatDto {
  @IsMongoId()
  channelId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;
}
