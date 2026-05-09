import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  channelId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;
}
