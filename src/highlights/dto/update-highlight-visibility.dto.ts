import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HighlightVisibility } from '../schemas/highlight.schema';

export class UpdateHighlightVisibilityDto {
  @ApiProperty({ enum: HighlightVisibility })
  @IsEnum(HighlightVisibility)
  visibility: HighlightVisibility;
}
