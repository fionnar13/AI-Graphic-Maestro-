/**
 * @file RotateTool.ts
 * Real Rotate primitive: Rotates layer orientation by angle degrees.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';

export class RotateTool implements IGraphicsTool {
  public readonly id = 'tool.rotate';
  public readonly name = 'Rotate Tool';
  public readonly description = 'Rotates a layer by an angle in degrees.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    angleDegrees: { type: 'number' as const, description: 'Rotation angle in degrees', required: true },
  };

  public readonly outputSchema = {
    rotation: { type: 'number' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!params.layerId) errors.push('layerId is required');
    else {
      const layer = context.documentEngine.getLayer(params.layerId);
      if (!layer) errors.push(`Layer with id ${params.layerId} not found`);
      else if (layer.locked) errors.push('Cannot rotate a locked layer');
    }
    if (typeof params.angleDegrees !== 'number') errors.push('angleDegrees must be a number');
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const layer = context.documentEngine.getLayer(params.layerId)!;
    const prevRotation = layer.transform.rotation;

    const newRotation = (layer.transform.rotation + params.angleDegrees) % 360;

    context.documentEngine.setTransform(layer.id, {
      rotation: newRotation,
    });

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevRotation,
      },
      output: {
        rotation: newRotation,
      },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.documentEngine.setTransform(rollbackData.layerId, {
      rotation: rollbackData.prevRotation,
    });
    return true;
  }
}
