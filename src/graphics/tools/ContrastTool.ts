/**
 * @file ContrastTool.ts
 * Real Contrast primitive: Adjusts image contrast using real photographic transfer formula.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';

export class ContrastTool implements IGraphicsTool {
  public readonly id = 'tool.contrast';
  public readonly name = 'Contrast Tool';
  public readonly description = 'Adjusts image contrast with midtone preservation using a photographic LUT.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    contrast: {
      type: 'number' as const,
      description: 'Contrast delta (-100 to 100)',
      required: true,
      min: -100,
      max: 100,
      default: 0,
    },
  };

  public readonly outputSchema = {
    contrastApplied: { type: 'number' },
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
    if (typeof params.contrast !== 'number') errors.push('contrast must be a number');
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const layer = context.documentEngine.getLayer(params.layerId)!;
    let buffer = context.getLayerPixelBuffer(layer.id);
    if (!buffer) {
      buffer = context.createPixelBuffer(layer.bounds.width, layer.bounds.height, [128, 128, 128, 255]);
      context.setLayerPixelBuffer(layer.id, buffer);
    }

    const prevBuffer = buffer.clone();

    // Standard contrast factor
    // factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
    const c = Math.max(-100, Math.min(100, params.contrast)) * 2.55;
    const factor = (259 * (c + 255)) / (255 * (259 - c));

    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      const v = factor * (i - 128) + 128;
      lut[i] = Math.max(0, Math.min(255, Math.round(v)));
    }

    buffer.applyLut(lut, lut, lut);

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevBuffer,
      },
      output: { contrastApplied: params.contrast },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.setLayerPixelBuffer(rollbackData.layerId, rollbackData.prevBuffer);
    return true;
  }
}
