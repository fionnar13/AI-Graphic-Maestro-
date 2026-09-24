/**
 * @file MoveTool.ts
 * Real Move primitive: Translates layer position in 2D space, updating layer transform and bounds.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';

export class MoveTool implements IGraphicsTool {
  public readonly id = 'tool.move';
  public readonly name = 'Move Tool';
  public readonly description = 'Translates layer position by delta X and delta Y coordinates.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    dx: { type: 'number' as const, description: 'Horizontal offset delta', required: true },
    dy: { type: 'number' as const, description: 'Vertical offset delta', required: true },
  };

  public readonly outputSchema = {
    newPosition: { type: 'object' },
    bounds: { type: 'object' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!params.layerId) {
      errors.push('layerId is required');
    } else {
      const layer = context.documentEngine.getLayer(params.layerId);
      if (!layer) errors.push(`Layer with id ${params.layerId} not found`);
      else if (layer.locked) errors.push('Cannot move a locked layer');
    }
    if (typeof params.dx !== 'number' || typeof params.dy !== 'number') {
      errors.push('dx and dy must be valid numbers');
    }
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    const layer = context.documentEngine.getLayer(params.layerId)!;
    const prevBounds = { ...layer.bounds };

    // Phase 14.3.3 (A3) — Only write bounds.x/y, NOT transform.position.
    // The renderer sums bounds.x + transform.position.x, so writing both
    // causes a double-apply (2× the intended delta). The manual canvas-drag
    // path (Fix 2 from Phase 14.3.2) already follows this contract — it
    // writes only bounds and leaves transform.position at identity {0,0}.
    context.documentEngine.setBounds(layer.id, {
      x: layer.bounds.x + params.dx,
      y: layer.bounds.y + params.dy,
    });

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevBounds,
      },
      output: {
        newPosition: { x: layer.bounds.x, y: layer.bounds.y },
        bounds: layer.bounds,
      },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.documentEngine.setBounds(rollbackData.layerId, rollbackData.prevBounds);
    return true;
  }
}
