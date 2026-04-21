// src/friendship/dto/send-friend-request.dto.ts
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendFriendRequestDto {
  @ApiProperty({ description: 'User ID who is sending the request' })
  @IsMongoId()
  @IsNotEmpty()
  requesterId: string;

  @ApiProperty({ description: 'User ID who will receive the request' })
  @IsMongoId()
  @IsNotEmpty()
  recipientId: string;
}
