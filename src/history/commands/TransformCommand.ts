/**
 * @file TransformCommand.ts
 * Command for affine transformations (translate, rotate, scale, skew) on layers.
 */

import { GraphicsToolCommand } from './GraphicsToolCommand';
import { GraphicsEngine } from '../../graphics/GraphicsEngine';

export class TransformCommand extends GraphicsToolCommand {
  constructor(
    graphicsEngine: GraphicsEngine,
    parameters: {
      layerId: string;
      matrix?: number[];
      translation?: { x: number; y: number };
      scale?: { x: number; y: number };
      rotation?: number;
      origin?: { x: number; y: number };
    },
    parentId: string | null = null
  ) {
    super(graphicsEngine, 'tool.transform', parameters, 'Transform Command', parentId);
  }
}
