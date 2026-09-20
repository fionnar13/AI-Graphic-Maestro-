/**
 * @file RecolorTool.ts
 * Real Recolor primitive: Shifts hue/saturation or targets specific colors with delta-E tolerance.
 */

import { IGraphicsTool, ToolExecutionContext, ToolExecutionResult, ValidationResult } from '../engine/IGraphicsTool';
import { ColorMath } from '../engine/ColorMath';

export class RecolorTool implements IGraphicsTool {
  public readonly id = 'tool.recolor';
  public readonly name = 'Recolor Tool';
  public readonly description = 'Real pixel hue-shift, saturation grading, or target color replacement.';

  public readonly inputSchema = {
    layerId: { type: 'string' as const, description: 'Target layer id', required: true },
    mode: {
      type: 'string' as const,
      description: 'hue_shift | replace_color | tint',
      enum: ['hue_shift', 'replace_color', 'tint'],
      default: 'hue_shift',
    },
    hueShift: { type: 'number' as const, description: 'Degrees to rotate hue (-180 to 180)', default: 0 },
    saturationScale: { type: 'number' as const, description: 'Saturation multiplier (0 to 3)', default: 1 },
    targetColor: { type: 'array' as const, description: '[R, G, B] color to replace' },
    replacementColor: { type: 'array' as const, description: '[R, G, B] replacement color' },
    tolerance: { type: 'number' as const, description: 'Color matching tolerance 0..1', default: 0.2 },
  };

  public readonly outputSchema = {
    modifiedPixels: { type: 'number' },
  };

  public readonly parameters = {};

  public validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!params.layerId) errors.push('layerId is required');
    else {
      const layer = context.documentEngine.getLayer(params.layerId);
      if (!layer) errors.push(`Layer ${params.layerId} not found`);
      else if (layer.locked) errors.push('Cannot recolor a locked layer');
    }
    return { valid: errors.length === 0, errors };
  }

  public execute(context: ToolExecutionContext, params: Record<string, any>): ToolExecutionResult {
    const validation = this.validate(context, params);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);

    const layer = context.documentEngine.getLayer(params.layerId)!;
    let buffer = context.getLayerPixelBuffer(layer.id);
    if (!buffer) {
      // Initialize a default buffer if not present
      buffer = context.createPixelBuffer(layer.bounds.width, layer.bounds.height, [124, 58, 237, 255]);
      context.setLayerPixelBuffer(layer.id, buffer);
    }

    const prevBuffer = buffer.clone();
    const mode = params.mode || 'hue_shift';
    let modifiedPixels = 0;

    const data = buffer.data;
    const hueShift = params.hueShift || 0;
    const satScale = params.saturationScale !== undefined ? params.saturationScale : 1;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (mode === 'hue_shift') {
        const [h, s, l] = ColorMath.rgbToHsl(r, g, b);
        const newH = (h + hueShift + 360) % 360;
        const newS = Math.max(0, Math.min(1, s * satScale));
        const [nR, nG, nB] = ColorMath.hslToRgb(newH, newS, l);
        data[i] = nR;
        data[i + 1] = nG;
        data[i + 2] = nB;
        modifiedPixels++;
      } else if (mode === 'replace_color' && params.targetColor && params.replacementColor) {
        const dist = ColorMath.colorDistance([r, g, b], params.targetColor);
        if (dist <= (params.tolerance || 0.2)) {
          // Replace with target hue/chroma but preserve luminance
          const [, , l] = ColorMath.rgbToHsl(r, g, b);
          const [tH, tS] = ColorMath.rgbToHsl(
            params.replacementColor[0],
            params.replacementColor[1],
            params.replacementColor[2]
          );
          const [nR, nG, nB] = ColorMath.hslToRgb(tH, tS, l);
          data[i] = nR;
          data[i + 1] = nG;
          data[i + 2] = nB;
          modifiedPixels++;
        }
      }
    }

    return {
      success: true,
      toolId: this.id,
      affectedLayerIds: [layer.id],
      rollbackData: {
        layerId: layer.id,
        prevBuffer,
      },
      output: { modifiedPixels },
    };
  }

  public rollback(context: ToolExecutionContext, rollbackData: any): boolean {
    context.setLayerPixelBuffer(rollbackData.layerId, rollbackData.prevBuffer);
    return true;
  }
}
