import { HighlightVisibility } from '../schemas/highlight.schema';
import {
  HighlightGenerationOptions,
  HighlightSelectionMode,
} from '../highlights.service';

export const HIGHLIGHT_QUEUE_NAME = 'highlightQueue';

export type HighlightJobName = 'processHighlight';

export interface HighlightJobPayload {
  videoId: string;
  uploaderId: string;
  /** Applied to every highlight document created for this run */
  visibility: HighlightVisibility;
  selectionMode?: HighlightSelectionMode;
  topK?: number;
  minScore?: number;
  minGapSec?: number;
  clipDurationSec?: number;
  maxTotalSec?: number;
  fullScan?: boolean;
}

export function toHighlightGenerationOptions(
  payload: HighlightJobPayload,
): HighlightGenerationOptions {
  return {
    visibility: payload.visibility,
    selectionMode: payload.selectionMode,
    topK: payload.topK,
    minScore: payload.minScore,
    minGapSec: payload.minGapSec,
    clipDurationSec: payload.clipDurationSec,
    maxTotalSec: payload.maxTotalSec,
    fullScan: payload.fullScan,
  };
}
