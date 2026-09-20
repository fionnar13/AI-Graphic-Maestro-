/**
 * @file ModelRegistry.ts
 * Model-Agnostic Adapter Registry and Lifecycle Manager
 * Enables dynamic registration, switching, health checking, and configuration
 * for Reasoning, Vision, and Image models without hardcoded dependencies.
 */

import {
  IBaseModelAdapter,
  IReasoningModelAdapter,
  IVisionModelAdapter,
  IImageModelAdapter,
  ModelCategory,
  ModelConnectionConfig,
  ModelHealthStatus,
} from './types';
import { GenericReasoningAdapter } from './reasoning/GenericReasoningAdapter';
import { GenericVisionAdapter } from './vision/GenericVisionAdapter';
import { GenericImageAdapter } from './image/GenericImageAdapter';

export class ModelAdapterRegistry {
  private static instance: ModelAdapterRegistry;
  private adapters: Map<string, IBaseModelAdapter> = new Map();
  private activeModels: Map<ModelCategory, string> = new Map();

  private constructor() {
    this.initializeDefaultAdapters();
  }

  public static getInstance(): ModelAdapterRegistry {
    if (!ModelAdapterRegistry.instance) {
      ModelAdapterRegistry.instance = new ModelAdapterRegistry();
    }
    return ModelAdapterRegistry.instance;
  }

  /**
   * Initializes clean, model-agnostic default adapters for each category
   * with zero hardcoded API keys or external services.
   */
  private initializeDefaultAdapters(): void {
    // 1. Default Reasoning Model
    const defaultReasoning = new GenericReasoningAdapter({
      id: 'default-reasoning',
      name: 'Default Reasoning Engine',
      provider: 'custom',
      modelId: 'reasoning-v1',
      category: ModelCategory.REASONING,
      temperature: 0.2,
      maxTokens: 4096,
    });
    this.registerAdapter(defaultReasoning);
    this.activeModels.set(ModelCategory.REASONING, defaultReasoning.id);

    // 2. Default Vision Model
    const defaultVision = new GenericVisionAdapter({
      id: 'default-vision',
      name: 'Default Vision Engine',
      provider: 'custom',
      modelId: 'vision-v1',
      category: ModelCategory.VISION,
      maxTokens: 2048,
    });
    this.registerAdapter(defaultVision);
    this.activeModels.set(ModelCategory.VISION, defaultVision.id);

    // 3. Default Image Model
    const defaultImage = new GenericImageAdapter({
      id: 'default-image',
      name: 'Default Image Engine',
      provider: 'custom',
      modelId: 'image-v1',
      category: ModelCategory.IMAGE,
    });
    this.registerAdapter(defaultImage);
    this.activeModels.set(ModelCategory.IMAGE, defaultImage.id);
  }

  /**
   * Creates an adapter instance from connection configuration without hardcoding.
   */
  public createAdapter(config: ModelConnectionConfig): IBaseModelAdapter {
    switch (config.category) {
      case ModelCategory.REASONING:
        return new GenericReasoningAdapter(config);
      case ModelCategory.VISION:
        return new GenericVisionAdapter(config);
      case ModelCategory.IMAGE:
        return new GenericImageAdapter(config);
      default:
        throw new Error(`Unsupported model category: '${config.category}'`);
    }
  }

  /**
   * Registers a model adapter in the registry.
   */
  public registerAdapter(adapter: IBaseModelAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Unregisters an adapter by ID.
   */
  public unregisterAdapter(id: string): void {
    const adapter = this.adapters.get(id);
    if (adapter) {
      void adapter.disconnect();
      this.adapters.delete(id);
      for (const [cat, activeId] of this.activeModels.entries()) {
        if (activeId === id) {
          this.activeModels.delete(cat);
        }
      }
    }
  }

  /**
   * Retrieves an adapter by ID.
   */
  public getAdapter<T extends IBaseModelAdapter = IBaseModelAdapter>(id: string): T | undefined {
    return this.adapters.get(id) as T | undefined;
  }

  /**
   * Lists all registered adapters, optionally filtered by category.
   */
  public getAdapters(category?: ModelCategory): IBaseModelAdapter[] {
    const list = Array.from(this.adapters.values());
    return category ? list.filter((a) => a.category === category) : list;
  }

  /**
   * Sets the active model for a specific category.
   */
  public async setActiveModel(category: ModelCategory, adapterId: string): Promise<boolean> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter with id '${adapterId}' is not registered.`);
    }
    if (adapter.category !== category) {
      throw new Error(
        `Adapter '${adapterId}' category (${adapter.category}) does not match requested category (${category}).`
      );
    }

    const connected = await adapter.connect();
    if (connected) {
      this.activeModels.set(category, adapterId);
    }
    return connected;
  }

  /**
   * Returns the active adapter for a category.
   */
  public getActiveModel<T extends IBaseModelAdapter>(category: ModelCategory): T {
    const activeId = this.activeModels.get(category);
    if (!activeId) {
      throw new Error(`No active model configured for category: ${category}`);
    }
    const adapter = this.adapters.get(activeId);
    if (!adapter) {
      throw new Error(`Active model '${activeId}' for category '${category}' is missing.`);
    }
    return adapter as T;
  }

  public getActiveReasoningModel(): IReasoningModelAdapter {
    return this.getActiveModel<IReasoningModelAdapter>(ModelCategory.REASONING);
  }

  public getActiveVisionModel(): IVisionModelAdapter {
    return this.getActiveModel<IVisionModelAdapter>(ModelCategory.VISION);
  }

  public getActiveImageModel(): IImageModelAdapter {
    return this.getActiveModel<IImageModelAdapter>(ModelCategory.IMAGE);
  }

  /**
   * Connects all registered adapters.
   */
  public async connectAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [id, adapter] of this.adapters.entries()) {
      results[id] = await adapter.connect();
    }
    return results;
  }

  /**
   * Disconnects all registered adapters.
   */
  public async disconnectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.disconnect();
    }
  }

  /**
   * Runs health checks on all registered adapters.
   */
  public async checkAllHealth(): Promise<Record<string, ModelHealthStatus>> {
    const results: Record<string, ModelHealthStatus> = {};
    for (const [id, adapter] of this.adapters.entries()) {
      results[id] = await adapter.health();
    }
    return results;
  }
}
