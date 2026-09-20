/**
 * @file BaseModelAdapter.ts
 * Abstract Base Class for AI Model Adapters
 * Implements common lifecycle management, telemetry, capability reporting,
 * and error handling in a completely provider-agnostic manner.
 */

import {
  IBaseModelAdapter,
  ModelCategory,
  ModelStatus,
  ModelConnectionConfig,
  ModelCapabilities,
  ModelHealthStatus,
  ModelRequest,
  ModelResponse,
  ModelPromptPayload,
  ToolDefinition,
  ToolCallResult,
  JSONSchema,
} from './types';

export abstract class BaseModelAdapter implements IBaseModelAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly category: ModelCategory;
  protected _config: ModelConnectionConfig;
  protected _status: ModelStatus = ModelStatus.DISCONNECTED;
  protected _lastHealthCheck?: ModelHealthStatus;
  protected _requestCount = 0;
  protected _lastError?: Error;

  constructor(config: ModelConnectionConfig) {
    this.id = config.id;
    this.name = config.name;
    this.category = config.category;
    this._config = { ...config };
  }

  public get config(): ModelConnectionConfig {
    return { ...this._config };
  }

  public get status(): ModelStatus {
    return this._status;
  }

  /**
   * Connects to the model endpoint.
   * Allows updating connection parameters dynamically.
   */
  public async connect(configUpdates?: Partial<ModelConnectionConfig>): Promise<boolean> {
    if (configUpdates) {
      this._config = { ...this._config, ...configUpdates };
    }

    this._status = ModelStatus.CONNECTING;
    try {
      const success = await this.onConnect();
      if (success) {
        this._status = ModelStatus.CONNECTED;
        this._lastError = undefined;
      } else {
        this._status = ModelStatus.ERROR;
      }
      return success;
    } catch (err) {
      this._status = ModelStatus.ERROR;
      this._lastError = err instanceof Error ? err : new Error(String(err));
      return false;
    }
  }

  /**
   * Disconnects and releases any open network or local resources.
   */
  public async disconnect(): Promise<void> {
    try {
      await this.onDisconnect();
    } finally {
      this._status = ModelStatus.DISCONNECTED;
    }
  }

  /**
   * Returns the capabilities matrix supported by this model adapter.
   */
  public capabilities(): ModelCapabilities {
    return this.getCapabilities();
  }

  /**
   * Checks the health and responsiveness of the model connection.
   */
  public async health(): Promise<ModelHealthStatus> {
    const startTime = Date.now();
    try {
      if (this._status === ModelStatus.DISCONNECTED) {
        return {
          status: ModelStatus.DISCONNECTED,
          healthy: false,
          latencyMs: 0,
          lastChecked: startTime,
          message: 'Adapter is currently disconnected.',
        };
      }

      const checkResult = await this.doHealthCheck();
      const latencyMs = Date.now() - startTime;

      this._lastHealthCheck = {
        status: checkResult.healthy ? ModelStatus.CONNECTED : ModelStatus.DEGRADED,
        healthy: checkResult.healthy,
        latencyMs,
        lastChecked: Date.now(),
        message: checkResult.message,
        details: checkResult.details,
      };

      if (!checkResult.healthy) {
        this._status = ModelStatus.DEGRADED;
      }

      return this._lastHealthCheck;
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      this._lastHealthCheck = {
        status: ModelStatus.ERROR,
        healthy: false,
        latencyMs,
        lastChecked: Date.now(),
        message,
      };
      this._status = ModelStatus.ERROR;
      return this._lastHealthCheck;
    }
  }

  /**
   * Executes a generic model request.
   */
  public async request<TInput = unknown, TOutput = unknown>(
    req: ModelRequest<TInput>
  ): Promise<ModelResponse<TOutput>> {
    this.assertConnected();
    this._requestCount++;
    const startTime = Date.now();

    try {
      const output = await this.executeRequest<TInput, TOutput>(req);
      const durationMs = Date.now() - startTime;
      return {
        requestId: req.id,
        output,
        durationMs,
      };
    } catch (err) {
      this._lastError = err instanceof Error ? err : new Error(String(err));
      throw err;
    }
  }

  /**
   * Requests a schema-compliant JSON structured output.
   */
  public async structuredOutput<TSchema = unknown>(
    prompt: string | ModelPromptPayload,
    schema: JSONSchema
  ): Promise<TSchema> {
    this.assertConnected();
    if (!this.capabilities().supportsStructuredOutput) {
      throw new Error(`Model adapter '${this.name}' does not support structuredOutput.`);
    }

    return this.executeStructuredOutput<TSchema>(prompt, schema);
  }

  /**
   * Requests model tool invocation based on provided tool specifications.
   */
  public async toolCalling(
    prompt: string | ModelPromptPayload,
    tools: ToolDefinition[]
  ): Promise<ToolCallResult> {
    this.assertConnected();
    if (!this.capabilities().supportsToolCalling) {
      throw new Error(`Model adapter '${this.name}' does not support toolCalling.`);
    }

    return this.executeToolCalling(prompt, tools);
  }

  protected assertConnected(): void {
    if (this._status !== ModelStatus.CONNECTED) {
      throw new Error(
        `Model adapter '${this.name}' [${this.id}] is not connected. Current status: ${this._status}`
      );
    }
  }

  // ==========================================================================
  // ABSTRACT HOOKS TO BE IMPLEMENTED BY SUBCLASSES
  // ==========================================================================

  protected abstract onConnect(): Promise<boolean>;
  protected abstract onDisconnect(): Promise<void>;
  protected abstract getCapabilities(): ModelCapabilities;
  protected abstract doHealthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    details?: Record<string, unknown>;
  }>;
  protected abstract executeRequest<TInput, TOutput>(
    req: ModelRequest<TInput>
  ): Promise<TOutput>;
  protected abstract executeStructuredOutput<TSchema>(
    prompt: string | ModelPromptPayload,
    schema: JSONSchema
  ): Promise<TSchema>;
  protected abstract executeToolCalling(
    prompt: string | ModelPromptPayload,
    tools: ToolDefinition[]
  ): Promise<ToolCallResult>;
}
