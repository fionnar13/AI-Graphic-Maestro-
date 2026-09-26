/**
 * @file CloneTool.ts
 * Real Clone Stamp primitive: Samples pixels from source (sx, sy) and copies to target (tx, ty) with radius and feather falloff.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';
import { InpaintAlgorithms } from '../engine/InpaintAlgorithms';

export class CloneTool implements IGraphicsTool {
  public readonly id = 'tool.clone';
  public readonly name = 'Clone Stamp Tool';
  public readonly description = 'Samples pixels from source coordinate and paints them onto target coordinate with falloff.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    sourceX: { type: 'number' as const, description: 'Source sample X', required: true },
    sourceY: { type: 'number' as const, description: 'Source sample Y', required: true },
    targetX: { type: 'number' as const, description: 'Target stamp X', required: true },
    targetY: { type: 'number' as const, description: 'Target stamp Y', required: true },
    radius: { type: 'number' as const, description: 'Brush radius in pixels', required: true, min: 1, max: 200, default: 20 },
    hardness: { type: 'number' as const, description: 'Brush hardness 0..1', default: 0.8, min: 0, max: 1 },
    opacity: { type: 'number' as const, description: 'Brush opacity 0..1', default: 1.0, min: 0, max: 1 },
  };

  public readonly outputSchema = {
    cloned: { type: 'boolean' },
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
    if (typeof params.sourceX !== 'number' || typeof params.sourceY !== 'number') {
      errors.push('sourceX and sourceY are required numbers');
    }
    if (typeof params.targetX !== 'number' || typeof params.targetY !== 'number') {
      errors.push('targetX and targetY are required numbers');
    }
    if (typeof params.radius !== 'number' || params.radius <= 0) {
      errors.push('radius must be > 0');
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
      buffer = context.createPixelBuffer(layer.bounds.width, layer.bounds.height, [200, 200, 200, 255]);
      context.setLayerPixelBuffer(layer.id, buffer);
    }

    const prevBuffer = buffer.clone();

    InpaintAlgorithms.cloneStamp(
      buffer,
      Math.round(params.sourceX),
      Math.round(params.sourceY),
      Math.round(params.targetX),
      Math.round(params.targetY),
      Math.round(params.radius),
      params.hardness !== undefined ? params.hardness : 0.8,
      params.opacity !== undefined ? params.opacity : 1.0
    );

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevBuffer,
        hadBufferBefore,
      },
      output: { cloned: true },
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
