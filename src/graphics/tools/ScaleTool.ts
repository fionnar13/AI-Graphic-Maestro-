/**
 * @file ScaleTool.ts
 * Real Scale primitive: Rescales layer dimensions and transform scaling factor.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';

export class ScaleTool implements IGraphicsTool {
  public readonly id = 'tool.scale';
  public readonly name = 'Scale Tool';
  public readonly description = 'Scales a layer uniformly or non-uniformly relative to its anchor origin.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    scaleX: { type: 'number' as const, description: 'Horizontal scale factor (> 0)', required: true, min: 0.01 },
    scaleY: { type: 'number' as const, description: 'Vertical scale factor (> 0)', required: true, min: 0.01 },
  };

  public readonly outputSchema = {
    scale: { type: 'object' },
    bounds: { type: 'object' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!params.layerId) errors.push('layerId is required');
    else {
      const layer = context.documentEngine.getLayer(params.layerId);
      if (!layer) errors.push(`Layer with id ${params.layerId} not found`);
      else if (layer.locked) errors.push('Cannot scale a locked layer');
    }
    if (typeof params.scaleX !== 'number' || params.scaleX <= 0) errors.push('scaleX must be > 0');
    if (typeof params.scaleY !== 'number' || params.scaleY <= 0) errors.push('scaleY must be > 0');
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const layer = context.documentEngine.getLayer(params.layerId)!;
    const prevScale = { ...layer.transform.scale };
    const prevBounds = { ...layer.bounds };

    const newScaleX = layer.transform.scale.x * params.scaleX;
    const newScaleY = layer.transform.scale.y * params.scaleY;

    context.documentEngine.setTransform(layer.id, {
      scale: { x: newScaleX, y: newScaleY },
    });

    // Update bounds
    const newW = Math.round(prevBounds.width * params.scaleX);
    const newH = Math.round(prevBounds.height * params.scaleY);
    context.documentEngine.setBounds(layer.id, {
      ...layer.bounds,
      width: Math.max(1, newW),
      height: Math.max(1, newH),
    });

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevScale,
        prevBounds,
      },
      output: {
        scale: { x: newScaleX, y: newScaleY },
        bounds: layer.bounds,
      },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.documentEngine.setTransform(rollbackData.layerId, {
      scale: rollbackData.prevScale,
    });
    context.documentEngine.setBounds(rollbackData.layerId, rollbackData.prevBounds);
    return true;
  }
}
