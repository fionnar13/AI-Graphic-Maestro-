/**
 * @file RemoveObjectCommand.ts
 * Command for semantic object removal via dilation and Telea inpainting synthesis.
 */

import { GraphicsToolCommand } from './GraphicsToolCommand';
import { GraphicsEngine } from '../../graphics/GraphicsEngine';

export class RemoveObjectCommand extends GraphicsToolCommand {
  constructor(
    graphicsEngine: GraphicsEngine,
    parameters: {
      layerId: string;
      boundingBox: { x: number; y: number; width: number; height: number };
      dilateRadius?: number;
      coordinateSpace?: 'layer' | 'canvas';
    },
    parentId: string | null = null
  ) {
    super(graphicsEngine, 'tool.remove_object', parameters, 'Remove Object Command', parentId);
  }
}
