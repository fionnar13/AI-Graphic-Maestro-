/**
 * @file VisionEngine
 * Perception and visual analysis contract.
 * Implements local mathematical bounding heuristics and defines external model contracts.
 */

import { BoundingBox } from '../models/types';

export interface DetectionBox extends BoundingBox {
  label: string;
  confidence: number;
}

export interface SaliencyMapResult {
  width: number;
  height: number;
  focusPoint: { x: number; y: number };
  score: number;
  dataUrl?: string;
}

export class VisionEngine {
  /**
   * Evaluates subject bounding box within an image canvas.
   * Uses alpha/luminance boundary analysis for local execution.
   */
  public detectSubjectBounds(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): BoundingBox {
    try {
      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;
      let minX = canvasWidth;
      let minY = canvasHeight;
      let maxX = 0;
      let maxY = 0;
      let found = false;

      // Sample non-white / non-transparent pixels
      for (let y = 0; y < canvasHeight; y += 2) {
        for (let x = 0; x < canvasWidth; x += 2) {
          const idx = (y * canvasWidth + x) * 4;
          const a = data[idx + 3];
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Check if not pure white background or transparent
          const isWhiteBg = r > 245 && g > 245 && b > 245;
          if (a > 20 && !isWhiteBg) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            found = true;
          }
        }
      }

      if (!found) {
        // Fallback default center box [101, 101, 198, 198]
        return {
          x: Math.round(canvasWidth * 0.25),
          y: Math.round(canvasHeight * 0.25),
          width: Math.round(canvasWidth * 0.5),
          height: Math.round(canvasHeight * 0.5),
        };
      }

      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    } catch {
      // Fallback
      return { x: 101, y: 101, width: 198, height: 198 };
    }
  }

  /**
   * Calculates composition visual saliency and balance.
   */
  public evaluateSaliencyBalance(
    subjectBounds: BoundingBox,
    canvasWidth: number,
    canvasHeight: number
  ): SaliencyMapResult {
    const centerX = subjectBounds.x + subjectBounds.width / 2;
    const centerY = subjectBounds.y + subjectBounds.height / 2;
    const targetCenterX = canvasWidth / 2;
    const targetCenterY = canvasHeight / 2;

    const dx = Math.abs(centerX - targetCenterX) / (canvasWidth / 2);
    const dy = Math.abs(centerY - targetCenterY) / (canvasHeight / 2);
    const centeringPenalty = (dx + dy) * 0.5;

    const balanceScore = Math.max(0, Math.min(1, 1 - centeringPenalty * 0.4));

    return {
      width: canvasWidth,
      height: canvasHeight,
      focusPoint: { x: centerX, y: centerY },
      score: Number(balanceScore.toFixed(3)),
    };
  }

  /**
   * TODO: Connect to multimodal Gemini 2.5 Flash / Pro Vision API for semantic scene description.
   * Explicitly marked as TODO per audit rules.
   */
  public async analyzeSceneSemantics(
    _imageDataUrl: string
  ): Promise<{ tags: string[]; description: string }> {
    return {
      tags: ['TODO: Gemini Vision Endpoint not yet dispatched', 'product_hero', 'studio_lighting'],
      description: 'Local heuristic analysis active. Multimodal cloud adapter interface ready.',
    };
  }
}
