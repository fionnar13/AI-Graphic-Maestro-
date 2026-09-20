/**
 * @file RecolorCommand.ts
 * Command for recoloring (hue shift, targeted color replacement) on layers.
 */

import { GraphicsToolCommand } from './GraphicsToolCommand';
import { GraphicsEngine } from '../../graphics/GraphicsEngine';

export class RecolorCommand extends GraphicsToolCommand {
  constructor(
    graphicsEngine: GraphicsEngine,
    parameters: {
      layerId: string;
      mode?: 'hue_shift' | 'replace_color';
      hueShift?: number;
      targetColor?: [number, number, number];
      replacementColor?: [number, number, number];
      tolerance?: number;
    },
    parentId: string | null = null
  ) {
    super(graphicsEngine, 'tool.recolor', parameters, 'Recolor Command', parentId);
  }
}
