/**
 * @file BaseImageAdapter.ts
 * Abstract base class for Image Generation / Edit Model Adapters
 * Responsible for: Generation, Inpainting, Image Editing, Reconstruction.
 */

import { BaseModelAdapter } from '../BaseModelAdapter';
import {
  IImageModelAdapter,
  ModelCategory,
  ModelConnectionConfig,
  ImageDataPayload,
  ImageGenerationOptions,
  InpaintOptions,
  ImageEditOptions,
  ReconstructionOptions,
  ImageResult,
} from '../types';

export abstract class BaseImageAdapter
  extends BaseModelAdapter
  implements IImageModelAdapter
{
  public override readonly category: ModelCategory.IMAGE = ModelCategory.IMAGE;

  constructor(config: ModelConnectionConfig) {
    super({ ...config, category: ModelCategory.IMAGE });
  }

  // 1. Generation
  public abstract generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult>;

  // 2. Inpainting
  public abstract inpaint(
    baseImage: ImageDataPayload,
    mask: ImageDataPayload,
    prompt: string,
    options?: InpaintOptions
  ): Promise<ImageResult>;

  // 3. Image Editing
  public abstract editImage(
    baseImage: ImageDataPayload,
    instructions: string,
    options?: ImageEditOptions
  ): Promise<ImageResult>;

  // 4. Reconstruction
  public abstract reconstruct(
    damagedImage: ImageDataPayload,
    options?: ReconstructionOptions
  ): Promise<ImageResult>;
}
