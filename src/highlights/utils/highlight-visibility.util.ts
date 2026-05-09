import { BadRequestException } from '@nestjs/common';
import { HighlightVisibility } from '../schemas/highlight.schema';

/** Accepts upload/form string values; defaults to private. */
export function parseHighlightVisibility(
  raw?: string | null,
): HighlightVisibility {
  const v = raw?.trim().toLowerCase();
  if (!v || v === 'private') return HighlightVisibility.PRIVATE;
  if (v === 'public') return HighlightVisibility.PUBLIC;
  throw new BadRequestException(
    'highlightsVisibility / visibility must be "public" or "private"',
  );
}
