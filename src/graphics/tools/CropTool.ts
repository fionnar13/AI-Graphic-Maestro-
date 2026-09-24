/**
 * @file CropTool.ts
 * Real Crop primitive: Crops document canvas or a specific raster layer to a target bounding box.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';
import { PixelBuffer } from '../engine/PixelBuffer';

export class CropTool implements IGraphicsTool {
  public readonly id = 'tool.crop';
  public readonly name = 'Crop Tool';
  public readonly description = 'Crops the canvas or target layer to a specified bounding box, updating dimensions and pixel buffers.';

  public readonly inputSchema = {
    target: {
      type: 'string' as const,
      description: 'Crop target: canvas | layer',
      enum: ['canvas', 'layer'],
      required: true,
      default: 'canvas',
    },
    layerId: { type: 'string' as const, description: 'Target layer ID (if target is layer)' },
    x: { type: 'number' as const, description: 'Crop region X', required: true, min: 0 },
    y: { type: 'number' as const, description: 'Crop region Y', required: true, min: 0 },
    width: { type: 'number' as const, description: 'Crop region width', required: true, min: 1 },
    height: { type: 'number' as const, description: 'Crop region height', required: true, min: 1 },
  };

  public readonly outputSchema = {
    croppedDimensions: { type: 'object' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (typeof params.x !== 'number' || typeof params.y !== 'number') {
      errors.push('x and y coordinates are required numbers');
    }
    if (typeof params.width !== 'number' || params.width <= 0) {
      errors.push('width must be a positive number');
    }
    if (typeof params.height !== 'number' || params.height <= 0) {
      errors.push('height must be a positive number');
    }
    if (params.target === 'layer' && !params.layerId) {
      errors.push('layerId is required when target is layer');
    }
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const cropX = Math.round(params.x);
    const cropY = Math.round(params.y);
    const cropW = Math.round(params.width);
    const cropH = Math.round(params.height);

    if (params.target === 'layer') {
      const layer = context.documentEngine.getLayer(params.layerId)!;
      const prevBounds = { ...layer.bounds };
      const prevBuffer = context.getLayerPixelBuffer(layer.id)?.clone() || null;

      if (prevBuffer) {
        // Crop pixel buffer relative to layer coordinates
        const relX = cropX - layer.bounds.x;
        const relY = cropY - layer.bounds.y;
        const croppedBuffer = prevBuffer.crop(relX, relY, cropW, cropH);
        context.setLayerPixelBuffer(layer.id, croppedBuffer);
      }

      context.documentEngine.setBounds(layer.id, {
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
      });

      return {
        success: true,
        toolId: this.id,
        affectedLayerIds: [layer.id],
        rollbackData: {
          target: 'layer',
          layerId: layer.id,
          prevBounds,
          prevBuffer,
        },
        output: { croppedDimensions: { width: cropW, height: cropH } },
      };
    } else {
      // Crop entire document canvas
      const prevCanvasDims = { ...context.document.canvas.dimensions };
      const prevLayerPositions = context.document.layers.map((l) => ({
        id: l.id,
        bounds: { ...l.bounds },
      }));

      // Phase 14.3.3 — Adjust all layers relative to new origin.
      // Only write bounds.x/y, NOT transform.position.
      // The renderer sums bounds.x + transform.position.x, so writing both
      // causes a double-offset. Same fix as MoveTool (A3) and ScaleTool (A4).
      for (const l of context.document.layers) {
        context.documentEngine.setBounds(l.id, {
          ...l.bounds,
          x: l.bounds.x - cropX,
          y: l.bounds.y - cropY,
        });
      }

      context.documentEngine.setCanvasDimensions(cropW, cropH);

      return {
        success: true,
        toolId: this.id,
        affectedLayerIds: context.document.layers.map((l) => l.id),
        rollbackData: {
          target: 'canvas',
          prevCanvasDims,
          prevLayerPositions,
        },
        output: { croppedDimensions: { width: cropW, height: cropH } },
      };
    }
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    if (rollbackData.target === 'layer') {
      context.documentEngine.setBounds(rollbackData.layerId, rollbackData.prevBounds);
      if (rollbackData.prevBuffer) {
        context.setLayerPixelBuffer(rollbackData.layerId, rollbackData.prevBuffer);
      }
    } else {
      context.documentEngine.setCanvasDimensions(
        rollbackData.prevCanvasDims.width,
        rollbackData.prevCanvasDims.height
      );
      for (const lp of rollbackData.prevLayerPositions) {
        context.documentEngine.setBounds(lp.id, lp.bounds);
      }
    }
    return true;
  }
}
