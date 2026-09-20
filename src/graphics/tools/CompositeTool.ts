/**
 * @file CompositeTool.ts
 * Real Composite primitive: Merges or composites layers together or onto the base canvas buffer with Porter-Duff source-over and blend modes.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';
import { PixelBuffer } from '../engine/PixelBuffer';

export class CompositeTool implements IGraphicsTool {
  public readonly id = 'tool.composite';
  public readonly name = 'Composite Tool';
  public readonly description = 'Composites multiple layers or merges source layer into destination layer with alpha blending.';

  public readonly inputSchema = {
    sourceLayerId: { type: 'string' as const, description: 'Source foreground layer id', required: true },
    destLayerId: { type: 'string' as const, description: 'Destination background layer id (or root canvas)', required: true },
    blendMode: {
      type: 'string' as const,
      description: 'Blend mode: normal | multiply | screen | overlay | darken | lighten',
      default: 'normal',
    },
    opacity: { type: 'number' as const, description: 'Compositing opacity 0..1', default: 1.0, min: 0, max: 1 },
  };

  public readonly outputSchema = {
    compositeCompleted: { type: 'boolean' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!params.sourceLayerId) errors.push('sourceLayerId is required');
    else if (!context.documentEngine.getLayer(params.sourceLayerId)) {
      errors.push(`sourceLayer ${params.sourceLayerId} not found`);
    }

    if (!params.destLayerId) errors.push('destLayerId is required');
    else if (!context.documentEngine.getLayer(params.destLayerId)) {
      errors.push(`destLayer ${params.destLayerId} not found`);
    }
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const srcLayer = context.documentEngine.getLayer(params.sourceLayerId)!;
    const dstLayer = context.documentEngine.getLayer(params.destLayerId)!;

    let srcBuf = context.getLayerPixelBuffer(srcLayer.id);
    if (!srcBuf) {
      srcBuf = context.createPixelBuffer(srcLayer.bounds.width, srcLayer.bounds.height, [255, 100, 50, 200]);
      context.setLayerPixelBuffer(srcLayer.id, srcBuf);
    }

    let dstBuf = context.getLayerPixelBuffer(dstLayer.id);
    if (!dstBuf) {
      dstBuf = context.createPixelBuffer(dstLayer.bounds.width, dstLayer.bounds.height, [20, 20, 20, 255]);
      context.setLayerPixelBuffer(dstLayer.id, dstBuf);
    }

    const prevDstBuffer = dstBuf.clone();

    // Calculate relative coordinates
    const relX = srcLayer.bounds.x - dstLayer.bounds.x;
    const relY = srcLayer.bounds.y - dstLayer.bounds.y;

    dstBuf.blit(srcBuf, relX, relY, {
      opacity: params.opacity !== undefined ? params.opacity : srcLayer.opacity,
      blendMode: params.blendMode || srcLayer.blendMode,
    });

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [dstLayer.id, srcLayer.id],
      rollbackData: {
        destLayerId: dstLayer.id,
        prevDstBuffer,
      },
      output: { compositeCompleted: true },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.setLayerPixelBuffer(rollbackData.destLayerId, rollbackData.prevDstBuffer);
    return true;
  }
}
