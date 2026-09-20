/**
 * @file RemoveObjectTool.ts
 * Real Remove Object primitive: Isolates an object or region, generates dilated boundary mask,
 * and reconstructs the background texture using inpainting synthesis.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';
import { PixelBuffer } from '../engine/PixelBuffer';
import { InpaintAlgorithms } from '../engine/InpaintAlgorithms';

export class RemoveObjectTool implements IGraphicsTool {
  public readonly id = 'tool.remove_object';
  public readonly name = 'Remove Object Tool';
  public readonly description = 'Erases an unwanted object from a raster layer or document and fills the background seamlessly.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    boundingBox: {
      type: 'object' as const,
      description: '{ x, y, width, height } region enclosing the object to remove',
      required: true,
    },
    dilateRadius: {
      type: 'number' as const,
      description: 'Margin dilation around object (in pixels)',
      default: 2,
      min: 0,
      max: 10,
    },
  };

  public readonly outputSchema = {
    removed: { type: 'boolean' },
    reconstructedArea: { type: 'object' },
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
    if (params.boundingBox && (typeof params.boundingBox.width !== 'number' || typeof params.boundingBox.height !== 'number')) {
      errors.push('boundingBox must contain width and height');
    }
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const layer = context.documentEngine.getLayer(params.layerId)!;

    if (!params.boundingBox) {
      context.documentEngine.deleteLayer(layer.id);
      return {
        success: true,
        toolId: this.id,
        affectedLayerIds: [layer.id],
        rollbackData: { layer },
        output: { removed: true, layerId: layer.id },
      };
    }

    let buffer = context.getLayerPixelBuffer(layer.id);
    if (!buffer) {
      buffer = context.createPixelBuffer(layer.bounds.width, layer.bounds.height, [220, 220, 220, 255]);
      context.setLayerPixelBuffer(layer.id, buffer);
    }

    const prevBuffer = buffer.clone();

    // Create dilated mask for the object bounding box
    const bbox = params.boundingBox;
    const dilate = params.dilateRadius !== undefined ? params.dilateRadius : 2;
    const mask = PixelBuffer.create(buffer.width, buffer.height);

    const isCanvasSpace = params.coordinateSpace === 'canvas';
    const originX = isCanvasSpace ? layer.bounds.x : 0;
    const originY = isCanvasSpace ? layer.bounds.y : 0;

    const startX = Math.max(0, Math.floor(bbox.x - originX - dilate));
    const endX = Math.min(buffer.width - 1, Math.ceil(bbox.x - originX + bbox.width + dilate));
    const startY = Math.max(0, Math.floor(bbox.y - originY - dilate));
    const endY = Math.min(buffer.height - 1, Math.ceil(bbox.y - originY + bbox.height + dilate));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        mask.setPixel(x, y, 255, 255, 255, 255);
      }
    }

    // Inpaint the object area
    InpaintAlgorithms.inpaintTelea(buffer, mask, 5);

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevBuffer,
      },
      output: {
        removed: true,
        reconstructedArea: { x: startX, y: startY, width: endX - startX, height: endY - startY },
      },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.setLayerPixelBuffer(rollbackData.layerId, rollbackData.prevBuffer);
    return true;
  }
}
