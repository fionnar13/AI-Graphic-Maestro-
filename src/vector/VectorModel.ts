/**
 * @file VectorModel.ts
 * Vector Model Utilities and Abstraction Helpers.
 * Maintains 100% backward compatibility with existing VectorContent (svgPathData).
 */

import { VectorObject } from './types';
import { VectorContent } from '../models/document.types';

export class VectorModel {
  /**
   * Converts a legacy VectorContent or SVG path string into a structured VectorObject.
   */
  public static fromVectorContent(content: VectorContent, name = 'Vector Shape'): VectorObject {
    const svgPathData = content.pathData || '';
    return {
      id: `vec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      paths: [],
      fillColor: content.fillColor || '#7c3aed',
      strokeColor: content.strokeColor || '#000000',
      strokeWidth: content.strokeWidth || 0,
      strokeDashArray: content.strokeDashArray,
      svgPathData,
    };
  }

  /**
   * Converts a VectorObject back to legacy VectorContent format.
   */
  public static toVectorContent(vectorObj: VectorObject): VectorContent {
    return {
      kind: 'vector',
      pathData: vectorObj.svgPathData || '',
      shapeType: 'path',
      fillColor: vectorObj.fillColor,
      strokeColor: vectorObj.strokeColor,
      strokeWidth: vectorObj.strokeWidth,
      strokeDashArray: vectorObj.strokeDashArray,
    };
  }
}
