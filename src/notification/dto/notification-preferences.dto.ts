import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class NotificationPreferencesDto {
  @IsBoolean() @IsOptional() matches?: boolean;
  @IsBoolean() @IsOptional() leagues?: boolean;
  @IsBoolean() @IsOptional() social?: boolean;
  @IsBoolean() @IsOptional() achievements?: boolean;
  @IsBoolean() @IsOptional() streams?: boolean;
  // security is ALWAYS true — cannot be disabled via this DTO

  @IsBoolean() @IsOptional() emailEnabled?: boolean;
  @IsBoolean() @IsOptional() emailMatches?: boolean;
  @IsBoolean() @IsOptional() emailLeagues?: boolean;
  @IsBoolean() @IsOptional() emailSocial?: boolean;
  @IsBoolean() @IsOptional() emailAchievements?: boolean;
  @IsBoolean() @IsOptional() emailStreams?: boolean;

  @IsBoolean() @IsOptional() pushEnabled?: boolean;
}

export class RegisterDeviceTokenDto {
  @IsString() token: string;
  @IsEnum(['fcm', 'apns']) platform: 'fcm' | 'apns';
}
