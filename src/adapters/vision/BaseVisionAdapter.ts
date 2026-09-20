/**
 * @file BaseVisionAdapter.ts
 * Abstract base class for Vision Model Adapters
 * Responsible for: Visual Understanding, Detection, Segmentation, Scene Understanding.
 */

import { BaseModelAdapter } from '../BaseModelAdapter';
import {
  IVisionModelAdapter,
  ModelCategory,
  ModelConnectionConfig,
  ImageDataPayload,
  VisualUnderstandingResult,
  ObjectDetectionResult,
  SegmentationResult,
  SceneAnalysisResult,
  BoundingBox,
} from '../types';

export abstract class BaseVisionAdapter
  extends BaseModelAdapter
  implements IVisionModelAdapter
{
  public override readonly category: ModelCategory.VISION = ModelCategory.VISION;

  constructor(config: ModelConnectionConfig) {
    super({ ...config, category: ModelCategory.VISION });
  }

  // 1. Visual Understanding
  public abstract understandImage(
    image: ImageDataPayload,
    prompt?: string
  ): Promise<VisualUnderstandingResult>;

  // 2. Detection
  public abstract detectObjects(
    image: ImageDataPayload,
    targetClasses?: string[]
  ): Promise<ObjectDetectionResult>;

  // 3. Segmentation
  public abstract segmentObjects(
    image: ImageDataPayload,
    targets: string[] | BoundingBox[]
  ): Promise<SegmentationResult>;

  // 4. Scene Understanding
  public abstract analyzeScene(
    image: ImageDataPayload
  ): Promise<SceneAnalysisResult>;
}
