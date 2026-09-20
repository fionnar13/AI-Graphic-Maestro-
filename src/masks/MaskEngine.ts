/**
 * @file MaskEngine
 * Manages alpha masks, luminance masking, clipping masks and pixel-level mask synthesis.
 */

import { LayerMask, BoundingBox } from '../models/types';

export class MaskEngine {
  /**
   * Generates a precise alpha mask from a bounding box or threshold.
   */
  public createBoxAlphaMask(
    canvasWidth: number,
    canvasHeight: number,
    bbox: BoundingBox,
    feather: number = 0
  ): LayerMask {
    const offscreen = document.createElement('canvas');
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const ctx = offscreen.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      if (feather > 0) {
        ctx.filter = `blur(${feather}px)`;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
    }

    return {
      id: `mask_${Date.now()}`,
      enabled: true,
      inverted: false,
      type: 'alpha',
      dataUrl: offscreen.toDataURL('image/png'),
      bounds: bbox,
    };
  }

  /**
   * Applies an alpha mask to an existing ImageData buffer in-place.
   */
  public applyAlphaMaskToImageData(
    targetData: ImageData,
    maskData: ImageData,
    invert: boolean = false
  ): void {
    const len = targetData.data.length;
    for (let i = 0; i < len; i += 4) {
      // Mask luminance / alpha
      const maskAlpha = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3 / 255;
      const factor = invert ? 1 - maskAlpha : maskAlpha;
      targetData.data[i + 3] = Math.round(targetData.data[i + 3] * factor);
    }
  }

  /**
   * TODO: Neural / Segment Anything (SAM) integration hook.
   * Marked as explicit TODO per system audit rules.
   */
  public generateNeuralSegmentationMask(
    _imageSource: HTMLImageElement | HTMLCanvasElement,
    _pointPrompt?: { x: number; y: number }
  ): Promise<LayerMask> {
    // Note: Neural model inference requires dedicated backend WebGPU / cloud model.
    return Promise.reject(
      new Error(
        'TODO: Neural segmentation model is not yet connected to local runtime. Use createBoxAlphaMask fallback.'
      )
    );
  }
}
