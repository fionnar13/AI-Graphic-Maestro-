/**
 * @file BrightnessTool.ts
 * Real Brightness primitive: Shifts pixel luminance values with clamping.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';

export class BrightnessTool implements IGraphicsTool {
  public readonly id = 'tool.brightness';
  public readonly name = 'Brightness Tool';
  public readonly description = 'Adjusts pixel brightness on a raster layer with clamping.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    brightness: {
      type: 'number' as const,
      description: 'Brightness delta (-100 to 100)',
      required: true,
      min: -100,
      max: 100,
      default: 0,
    },
  };

  public readonly outputSchema = {
    brightnessApplied: { type: 'number' },
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
    if (typeof params.brightness !== 'number') errors.push('brightness must be a number');
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const layer = context.documentEngine.getLayer(params.layerId)!;
    // Phase 14.3.3 (A7) — Track real-buffer state for proper rollback.
    const hadBufferBefore = context.hasLayerPixelBuffer(layer.id);
    let buffer = context.getLayerPixelBuffer(layer.id);
    if (!buffer) {
      buffer = context.createPixelBuffer(layer.bounds.width, layer.bounds.height, [128, 128, 128, 255]);
      context.setLayerPixelBuffer(layer.id, buffer);
    }

    const prevBuffer = buffer.clone();
    const delta = Math.round((params.brightness / 100) * 255);

    // Fast LUT for brightness
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.max(0, Math.min(255, i + delta));
    }

    buffer.applyLut(lut, lut, lut);

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevBuffer,
        hadBufferBefore,
      },
      output: { brightnessApplied: params.brightness },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    // Phase 14.3.3 (A7) — If layer had no buffer before, DELETE the auto-created buffer.
    if (rollbackData.hadBufferBefore === false) {
      context.deleteLayerPixelBuffer(rollbackData.layerId);
      return true;
    }
    context.setLayerPixelBuffer(rollbackData.layerId, rollbackData.prevBuffer);
    return true;
  }
}
