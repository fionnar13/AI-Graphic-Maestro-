/**
 * @file CompositeCommand.ts
 * Command for compositing source layer into destination layer with Porter-Duff alpha.
 */

import { GraphicsToolCommand } from './GraphicsToolCommand';
import { GraphicsEngine } from '../../graphics/GraphicsEngine';

export class CompositeCommand extends GraphicsToolCommand {
  constructor(
    graphicsEngine: GraphicsEngine,
    parameters: {
      sourceLayerId: string;
      destLayerId: string;
      blendMode?: string;
      opacity?: number;
      offsetX?: number;
      offsetY?: number;
    },
    parentId: string | null = null
  ) {
    super(graphicsEngine, 'tool.composite', parameters, 'Composite Command', parentId);
  }
}
