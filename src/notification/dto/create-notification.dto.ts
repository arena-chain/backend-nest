import {
    IsString, IsNotEmpty, IsOptional, IsEnum, IsMongoId, IsObject, IsBoolean, IsUrl,
} from 'class-validator';
import { NotificationCategory } from '../entities/notification.entity';

export enum NotificationType {
    TOURNAMENT_INVITE = 'TOURNAMENT_INVITE',
    MATCH_INVITE = 'MATCH_INVITE',
    MATCH_UPDATE = 'MATCH_UPDATE',
    MATCH_RESULT = 'MATCH_RESULT',
    FRIEND_REQUEST = 'FRIEND_REQUEST',
    FRIEND_ACCEPTED = 'FRIEND_ACCEPTED',
    LEAGUE_UPDATE = 'LEAGUE_UPDATE',
    LEAGUE_REGISTRATION = 'LEAGUE_REGISTRATION',
    ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
    STREAM_LIVE = 'STREAM_LIVE',
    STREAM_ENDED = 'STREAM_ENDED',
    STREAM_SCHEDULED = 'STREAM_SCHEDULED',
    STREAM_EVENT = 'STREAM_EVENT',
    SECURITY_LOGIN = 'SECURITY_LOGIN',
    SECURITY_PASSWORD_CHANGE = 'SECURITY_PASSWORD_CHANGE',
    SYSTEM = 'SYSTEM',
}

export class CreateNotificationDto {
    @IsMongoId()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    message: string;

    @IsEnum(NotificationType)
    @IsNotEmpty()
    type: NotificationType;

    @IsEnum(NotificationCategory)
    @IsOptional()
    category?: NotificationCategory;

    @IsString()
    @IsOptional()
    link?: string;

    @IsBoolean()
    @IsOptional()
    resourceDeleted?: boolean;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
