import { IsString, IsNotEmpty, MaxLength, MinLength, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHighlightCommentDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({
    description: 'Reply to a top-level comment on this highlight (not to another reply)',
  })
  @IsOptional()
  @IsMongoId()
  parentCommentId?: string;
}
