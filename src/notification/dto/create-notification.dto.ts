import { IsString, IsNotEmpty, IsOptional, IsEnum, IsMongoId, IsObject } from 'class-validator';

export enum NotificationType {
    TOURNAMENT_INVITE = 'TOURNAMENT_INVITE',
    FRIEND_REQUEST = 'FRIEND_REQUEST',
    MATCH_UPDATE = 'MATCH_UPDATE',
    SYSTEM = 'SYSTEM',
}

export class CreateNotificationDto {
    @IsMongoId()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    message: string;

    @IsEnum(NotificationType)
    @IsNotEmpty()
    type: NotificationType;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
