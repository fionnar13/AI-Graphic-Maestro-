/**
 * @file types.ts
 * Selection Architecture Foundation for AI Graphic Maestro.
 * Defines extensible selection states, modes, bounding boxes, and event contracts.
 */

import { RectBounds } from '../models/document.types';

export type SelectionMode =
  | 'single'
  | 'multi'
  | 'group'
  | 'semantic'
  | 'geometric'
  | 'area';

export type SelectionSource =
  | 'user_click'
  | 'box_select'
  | 'layer_panel'
  | 'ai_segmentation'
  | 'programmatic';

export interface SelectionState {
  selectedObjectIds: string[];
  activeObjectId: string | null;
  selectionMode: SelectionMode;
  selectionBounds: RectBounds | null;
  source: SelectionSource;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
