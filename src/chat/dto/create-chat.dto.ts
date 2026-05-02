import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatDto {
  @IsString()
  channelId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;
}
