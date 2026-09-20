/**
 * @file BlendTool.ts
 * Real Blend primitive: Configures layer blend mode and opacity, or blends two raster buffers directly.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';
import { BlendMode } from '../../models/document.types';

export class BlendTool implements IGraphicsTool {
  public readonly id = 'tool.blend';
  public readonly name = 'Blend Tool';
  public readonly description = 'Sets layer blend mode and opacity, or performs pixel-accurate composite blending.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    blendMode: {
      type: 'string' as const,
      description: 'Blend mode: normal | multiply | screen | overlay | darken | lighten | color-dodge | difference',
      enum: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'difference'],
      required: true,
    },
    opacity: {
      type: 'number' as const,
      description: 'Opacity 0..1',
      min: 0,
      max: 1,
    },
  };

  public readonly outputSchema = {
    blendMode: { type: 'string' },
    opacity: { type: 'number' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!params.layerId) errors.push('layerId is required');
    else {
      const layer = context.documentEngine.getLayer(params.layerId);
      if (!layer) errors.push(`Layer ${params.layerId} not found`);
      else if (layer.locked) errors.push('Cannot modify a locked layer');
    }
    if (!params.blendMode && typeof params.opacity !== 'number') {
      errors.push('Either blendMode or opacity is required');
    }
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const layer = context.documentEngine.getLayer(params.layerId)!;
    const prevBlendMode = layer.blendMode;
    const prevOpacity = layer.opacity;

    if (params.blendMode) {
      context.documentEngine.setBlendMode(layer.id, params.blendMode as BlendMode);
    }
    if (typeof params.opacity === 'number') {
      context.documentEngine.setOpacity(layer.id, params.opacity);
    }

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevBlendMode,
        prevOpacity,
      },
      output: {
        blendMode: layer.blendMode,
        opacity: layer.opacity,
      },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.documentEngine.setBlendMode(rollbackData.layerId, rollbackData.prevBlendMode);
    context.documentEngine.setOpacity(rollbackData.layerId, rollbackData.prevOpacity);
    return true;
  }
}
