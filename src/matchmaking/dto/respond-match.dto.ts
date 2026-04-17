import { IsBoolean } from 'class-validator';

export class RespondMatchDto {
    @IsBoolean()
    accept: boolean;
}
