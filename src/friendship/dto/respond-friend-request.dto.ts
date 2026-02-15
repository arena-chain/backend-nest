// src/friendship/dto/respond-friend-request.dto.ts
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondFriendRequestDto {
    @ApiProperty({ description: 'User ID who is responding to the request' })
    @IsMongoId()
    @IsNotEmpty()
    userId: string;
}
