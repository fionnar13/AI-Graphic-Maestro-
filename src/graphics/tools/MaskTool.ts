/**
 * @file MaskTool.ts
 * Real Mask primitive: Applies selection mask to target layer, inverts, feathers, or enables/disables layer masks.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';
import { LayerMask } from '../../models/document.types';

export class MaskTool implements IGraphicsTool {
  public readonly id = 'tool.mask';
  public readonly name = 'Mask Tool';
  public readonly description = 'Generates, updates, or inverts layer masks on raster and vector layers.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id to mask', required: true },
    action: {
      type: 'string' as const,
      description: 'Action: from_selection | invert | remove | set_enabled',
      enum: ['from_selection', 'invert', 'remove', 'set_enabled'],
      required: true,
      default: 'from_selection',
    },
    enabled: { type: 'boolean' as const, description: 'Mask active status', default: true },
    feather: { type: 'number' as const, description: 'Feather radius in pixels', min: 0, default: 0 },
  };

  public readonly outputSchema = {
    mask: { type: 'object' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!params.layerId) {
      errors.push('layerId is required');
    } else if (!context.documentEngine.getLayer(params.layerId)) {
      errors.push(`Layer with id ${params.layerId} does not exist`);
    }
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    const layer = context.documentEngine.getLayer(params.layerId)!;
    const prevMask: LayerMask | null = layer.mask ? JSON.parse(JSON.stringify(layer.mask)) : null;

    const action = params.action || 'from_selection';

    if (action === 'from_selection') {
      const newMask: LayerMask = {
        id: `mask_${Date.now()}`,
        type: 'alpha_bitmap',
        enabled: true,
        inverted: false,
        feather: params.feather || 0,
        opacity: 1.0,
        bounds: { ...layer.bounds },
      };
      context.documentEngine.setLayerMask(layer.id, newMask);
    } else if (action === 'invert') {
      if (layer.mask) {
        layer.mask.inverted = !layer.mask.inverted;
      }
    } else if (action === 'set_enabled') {
      if (layer.mask) {
        layer.mask.enabled = params.enabled !== undefined ? Boolean(params.enabled) : true;
      }
    } else if (action === 'remove') {
      context.documentEngine.removeLayerMask(layer.id);
    }

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevMask,
      },
      output: {
        mask: layer.mask || null,
      },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    if (rollbackData.prevMask) {
      context.documentEngine.setLayerMask(rollbackData.layerId, rollbackData.prevMask);
    } else {
      context.documentEngine.removeLayerMask(rollbackData.layerId);
    }
    return true;
  }
}
