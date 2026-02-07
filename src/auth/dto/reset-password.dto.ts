import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    otp: string;

    @ApiProperty({ example: 'newpassword123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}
