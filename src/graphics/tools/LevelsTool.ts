/**
 * @file LevelsTool.ts
 * Real Levels primitive: Adjusts input shadows/highlights, midtone gamma, and output shadows/highlights.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';

export class LevelsTool implements IGraphicsTool {
  public readonly id = 'tool.levels';
  public readonly name = 'Levels Tool';
  public readonly description = 'Photographic histogram levels adjustment (inputBlack, inputWhite, gamma, outputBlack, outputWhite).';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    inputBlack: { type: 'number' as const, description: 'Input shadow cutoff (0..255)', default: 0, min: 0, max: 254 },
    inputWhite: { type: 'number' as const, description: 'Input highlight cutoff (1..255)', default: 255, min: 1, max: 255 },
    gamma: { type: 'number' as const, description: 'Midtone gamma (0.1..9.9)', default: 1.0, min: 0.1, max: 9.9 },
    outputBlack: { type: 'number' as const, description: 'Output floor (0..255)', default: 0, min: 0, max: 255 },
    outputWhite: { type: 'number' as const, description: 'Output ceiling (0..255)', default: 255, min: 0, max: 255 },
  };

  public readonly outputSchema = {
    levels: { type: 'object' },
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
    const inBlack = params.inputBlack !== undefined ? params.inputBlack : 0;
    const inWhite = params.inputWhite !== undefined ? params.inputWhite : 255;
    if (inBlack >= inWhite) {
      errors.push('inputBlack must be strictly less than inputWhite');
    }
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

    const inBlack = params.inputBlack !== undefined ? params.inputBlack : 0;
    const inWhite = params.inputWhite !== undefined ? params.inputWhite : 255;
    const gamma = params.gamma !== undefined ? params.gamma : 1.0;
    const outBlack = params.outputBlack !== undefined ? params.outputBlack : 0;
    const outWhite = params.outputWhite !== undefined ? params.outputWhite : 255;

    const lut = new Uint8Array(256);
    const inRange = inWhite - inBlack;
    const outRange = outWhite - outBlack;
    const invGamma = 1.0 / gamma;

    for (let i = 0; i < 256; i++) {
      // 1. Remap input to 0..1
      let norm = (i - inBlack) / inRange;
      norm = Math.max(0, Math.min(1, norm));

      // 2. Apply gamma curve
      const gammaAdjusted = Math.pow(norm, invGamma);

      // 3. Remap to output range
      const outVal = outBlack + gammaAdjusted * outRange;
      lut[i] = Math.max(0, Math.min(255, Math.round(outVal)));
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
      output: {
        levels: { inBlack, inWhite, gamma, outBlack, outWhite },
      },
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
