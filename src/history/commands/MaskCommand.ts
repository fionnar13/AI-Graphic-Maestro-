/**
 * @file MaskCommand.ts
 * Command for layer masking (from selection, invert, enable/disable, remove).
 */

import { GraphicsToolCommand } from './GraphicsToolCommand';
import { GraphicsEngine } from '../../graphics/GraphicsEngine';

export class MaskCommand extends GraphicsToolCommand {
  constructor(
    graphicsEngine: GraphicsEngine,
    parameters: {
      layerId: string;
      action?: 'from_selection' | 'invert' | 'set_enabled' | 'remove';
      feather?: number;
      enabled?: boolean;
    },
    parentId: string | null = null
  ) {
    super(graphicsEngine, 'tool.mask', parameters, 'Mask Command', parentId);
  }
}
