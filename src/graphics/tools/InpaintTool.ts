/**
 * @file InpaintTool.ts
 * Real Inpaint primitive: Fast Marching PDE inpainting (Telea algorithm) to reconstruct hole regions indicated by a mask.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';
import { PixelBuffer } from '../engine/PixelBuffer';
import { InpaintAlgorithms } from '../engine/InpaintAlgorithms';

export class InpaintTool implements IGraphicsTool {
  public readonly id = 'tool.inpaint';
  public readonly name = 'Inpaint Tool';
  public readonly description = 'Fast Marching PDE inpainting: reconstructs missing or masked image regions from surrounding boundary gradients.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    maskRegion: {
      type: 'object' as const,
      description: '{ x, y, width, height } subregion to inpaint, or uses activeSelectionMask',
    },
    radius: {
      type: 'number' as const,
      description: 'Inpaint boundary sampling radius in pixels',
      default: 4,
      min: 1,
      max: 16,
    },
  };

  public readonly outputSchema = {
    inpainted: { type: 'boolean' },
    filledHolePixels: { type: 'number' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!params.layerId) errors.push('layerId is required');
    else {
      const layer = context.documentEngine.getLayer(params.layerId);
      if (!layer) errors.push(`Layer ${params.layerId} not found`);
      else if (layer.locked) errors.push('Cannot inpaint on a locked layer');
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
      buffer = context.createPixelBuffer(layer.bounds.width, layer.bounds.height, [220, 220, 220, 255]);
      context.setLayerPixelBuffer(layer.id, buffer);
    }

    const prevBuffer = buffer.clone();

    // Determine hole mask
    let holeMask: PixelBuffer;
    if (params.maskRegion) {
      holeMask = PixelBuffer.create(buffer.width, buffer.height);
      const mx = Math.max(0, Math.round(params.maskRegion.x));
      const my = Math.max(0, Math.round(params.maskRegion.y));
      const mw = Math.round(params.maskRegion.width);
      const mh = Math.round(params.maskRegion.height);

      for (let y = my; y < my + mh && y < buffer.height; y++) {
        for (let x = mx; x < mx + mw && x < buffer.width; x++) {
          holeMask.setPixel(x, y, 255, 255, 255, 255);
        }
      }
    } else if (context.activeSelectionMask) {
      holeMask = context.activeSelectionMask.crop(
        layer.bounds.x,
        layer.bounds.y,
        buffer.width,
        buffer.height
      );
    } else {
      // Default: small center patch
      holeMask = PixelBuffer.create(buffer.width, buffer.height);
      const cx = Math.floor(buffer.width / 2);
      const cy = Math.floor(buffer.height / 2);
      for (let y = cy - 8; y <= cy + 8; y++) {
        for (let x = cx - 8; x <= cx + 8; x++) {
          holeMask.setPixel(x, y, 255, 255, 255, 255);
        }
      }
    }

    const radius = params.radius || 4;
    InpaintAlgorithms.inpaintTelea(buffer, holeMask, radius);

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
        inpainted: true,
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
