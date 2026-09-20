/**
 * @file TransformTool.ts
 * Real Transform primitive: Applies affine 2D transform (position, scale, rotation, skew, anchor origin) to layer.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';

export class TransformTool implements IGraphicsTool {
  public readonly id = 'tool.transform';
  public readonly name = 'Transform Tool';
  public readonly description = 'Applies complete 2D affine transform matrix (translate, scale, rotate, skew, anchor).';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    position: { type: 'object' as const, description: '{ x, y } position coordinates' },
    scale: { type: 'object' as const, description: '{ x, y } scale factors' },
    rotation: { type: 'number' as const, description: 'Rotation in degrees' },
    origin: { type: 'object' as const, description: '{ x, y } normalized anchor origin (0..1)' },
    skew: { type: 'object' as const, description: '{ x, y } skew angles in degrees' },
  };

  public readonly outputSchema = {
    transform: { type: 'object' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!params.layerId) errors.push('layerId is required');
    else {
      const layer = context.documentEngine.getLayer(params.layerId);
      if (!layer) errors.push(`Layer ${params.layerId} not found`);
      else if (layer.locked) errors.push('Cannot transform a locked layer');
    }
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const layer = context.documentEngine.getLayer(params.layerId)!;
    const prevTransform = JSON.parse(JSON.stringify(layer.transform));

    const patch: any = {};
    if (params.position) patch.position = { ...params.position };
    if (params.scale) patch.scale = { ...params.scale };
    if (typeof params.rotation === 'number') patch.rotation = params.rotation;
    if (params.origin) patch.origin = { ...params.origin };
    if (params.skew) patch.skew = { ...params.skew };

    context.documentEngine.setTransform(layer.id, patch);

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevTransform,
      },
      output: {
        transform: layer.transform,
      },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.documentEngine.setTransform(rollbackData.layerId, rollbackData.prevTransform);
    return true;
  }
}
