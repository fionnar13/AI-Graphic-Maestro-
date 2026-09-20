/**
 * @file CurvesTool.ts
 * Real Curves primitive: Applies parametric cubic spline tonal curve to RGB or individual channels.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';
import { ColorMath } from '../engine/ColorMath';

export class CurvesTool implements IGraphicsTool {
  public readonly id = 'tool.curves';
  public readonly name = 'Curves Tool';
  public readonly description = 'Parametric tone curve adjustment via cubic spline control points.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    channel: {
      type: 'string' as const,
      description: 'rgb | red | green | blue',
      enum: ['rgb', 'red', 'green', 'blue'],
      default: 'rgb',
    },
    controlPoints: {
      type: 'array' as const,
      description: 'List of [input, output] control knots (e.g. [[0,0],[64,50],[192,210],[255,255]])',
      required: true,
    },
  };

  public readonly outputSchema = {
    controlPointsUsed: { type: 'array' },
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
    if (!Array.isArray(params.controlPoints) || params.controlPoints.length < 2) {
      errors.push('controlPoints must be an array of at least 2 [x, y] coordinates');
    }
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const layer = context.documentEngine.getLayer(params.layerId)!;
    let buffer = context.getLayerPixelBuffer(layer.id);
    if (!buffer) {
      buffer = context.createPixelBuffer(layer.bounds.width, layer.bounds.height, [128, 128, 128, 255]);
      context.setLayerPixelBuffer(layer.id, buffer);
    }

    const prevBuffer = buffer.clone();
    const lut = ColorMath.buildSplineLut(params.controlPoints);
    const identityLut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) identityLut[i] = i;

    const channel = params.channel || 'rgb';
    if (channel === 'rgb') {
      buffer.applyLut(lut, lut, lut);
    } else if (channel === 'red') {
      buffer.applyLut(lut, identityLut, identityLut);
    } else if (channel === 'green') {
      buffer.applyLut(identityLut, lut, identityLut);
    } else if (channel === 'blue') {
      buffer.applyLut(identityLut, identityLut, lut);
    }

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevBuffer,
      },
      output: { controlPointsUsed: params.controlPoints },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.setLayerPixelBuffer(rollbackData.layerId, rollbackData.prevBuffer);
    return true;
  }
}
