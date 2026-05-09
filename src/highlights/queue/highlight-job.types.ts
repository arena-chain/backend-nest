import { HighlightVisibility } from '../schemas/highlight.schema';

export const HIGHLIGHT_QUEUE_NAME = 'highlightQueue';

export type HighlightJobName = 'processHighlight';

export interface HighlightJobPayload {
  videoId: string;
  uploaderId: string;
  /** Applied to every highlight document created for this run */
  visibility: HighlightVisibility;
}
