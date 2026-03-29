import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreatePartnershipDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    @IsUrl()
    logo?: string;

    @IsEnum(['Event Sponsor', 'Platform Sponsor'])
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    @IsUrl()
    website?: string;
}
