/**
 * @file types.ts
 * Model-Agnostic AI Adapter Type Definitions
 * Unifies Reasoning, Vision, and Image Generation/Editing models.
 */

export enum ModelCategory {
  REASONING = 'reasoning',
  VISION = 'vision',
  IMAGE = 'image',
}

export enum ModelStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  DEGRADED = 'degraded',
}

export interface ModelConnectionConfig {
  id: string;
  name: string;
  provider: string; // e.g. 'deepseek' | 'gemini' | 'gpt' | 'qwen' | 'llama' | 'local' | 'custom'
  modelId: string;
  category: ModelCategory;
  endpoint?: string;
  apiKey?: string;
  organization?: string;
  customHeaders?: Record<string, string>;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
  customOptions?: Record<string, unknown>;
}

export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsStructuredOutput: boolean;
  supportsToolCalling: boolean;
  supportsVision: boolean;
  supportsImageGeneration: boolean;
  supportsInpainting?: boolean;
  maxContextTokens: number;
  supportedMimeTypes: string[];
  customCapabilities?: Record<string, boolean | number | string>;
}

export interface ModelHealthStatus {
  status: ModelStatus;
  healthy: boolean;
  latencyMs: number;
  lastChecked: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface ModelRequest<TInput = unknown> {
  id: string;
  input: TInput;
  prompt?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelResponse<TOutput = unknown> {
  requestId: string;
  output: TOutput;
  raw?: unknown;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
  finishReason?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCallInvocation {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCalls: ToolCallInvocation[];
  rawText?: string;
}

export interface ModelPromptPayload {
  prompt: string;
  systemPrompt?: string;
  history?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  images?: Array<{ mimeType: string; data: string }>;
}

export type JSONSchema = Record<string, unknown>;

// ============================================================================
// BASE MODEL ADAPTER INTERFACE
// ============================================================================

export interface IBaseModelAdapter {
  readonly id: string;
  readonly name: string;
  readonly category: ModelCategory;
  readonly config: ModelConnectionConfig;

  connect(config?: Partial<ModelConnectionConfig>): Promise<boolean>;
  disconnect(): Promise<void>;
  capabilities(): ModelCapabilities;
  health(): Promise<ModelHealthStatus>;
  request<TInput = unknown, TOutput = unknown>(
    request: ModelRequest<TInput>
  ): Promise<ModelResponse<TOutput>>;
  structuredOutput<TSchema = unknown>(
    prompt: string | ModelPromptPayload,
    schema: JSONSchema
  ): Promise<TSchema>;
  toolCalling(
    prompt: string | ModelPromptPayload,
    tools: ToolDefinition[]
  ): Promise<ToolCallResult>;
}

// ============================================================================
// 1. REASONING MODEL DEFINITIONS
// Responsible for: Intent, Planning, Tool Selection, Reasoning, High-level Critique
// ============================================================================

export interface IntentAnalysisResult {
  primaryIntent: string;
  subIntents: string[];
  goals: string[];
  constraints: string[];
  targetOutcome: string;
  confidence: number;
}

export interface PlanStep {
  stepIndex: number;
  name: string;
  description: string;
  toolRequired?: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  dependencies: number[];
}

export interface ExecutionPlanResult {
  planId: string;
  objective: string;
  steps: PlanStep[];
  fallbackStrategy?: string;
  estimatedSteps: number;
}

export interface ToolSelectionResult {
  selectedTool: string;
  reasoning: string;
  toolParameters: Record<string, unknown>;
  alternativeTools: string[];
  confidence: number;
}

export interface ReasoningResult {
  thoughtChain: string[];
  conclusion: string;
  decisionFactors: Record<string, unknown>;
  confidence: number;
}

export interface CritiqueCriteria {
  dimension: string; // e.g. 'composition', 'lighting', 'contrast', 'color_harmony', 'fidelity'
  weight: number;
  description?: string;
}

export interface CritiqueEvaluationResult {
  overallScore: number; // 0 to 1
  dimensionScores: Record<string, number>;
  strengths: string[];
  flaws: string[];
  recommendedCorrections: string[];
  passesQualityGate: boolean;
}

export interface IReasoningModelAdapter extends IBaseModelAdapter {
  readonly category: ModelCategory.REASONING;

  analyzeIntent(prompt: string, context?: unknown): Promise<IntentAnalysisResult>;
  generatePlan(intent: IntentAnalysisResult, context?: unknown): Promise<ExecutionPlanResult>;
  selectTools(planStep: PlanStep, availableTools: ToolDefinition[]): Promise<ToolSelectionResult>;
  reason(problem: string, context?: unknown): Promise<ReasoningResult>;
  evaluateCritique(artifact: unknown, criteria: CritiqueCriteria[]): Promise<CritiqueEvaluationResult>;
}

// ============================================================================
// 2. VISION MODEL DEFINITIONS
// Responsible for: Visual Understanding, Detection, Segmentation, Scene Understanding
// ============================================================================

export interface ImageDataPayload {
  dataUrl?: string;
  base64?: string;
  mimeType: string;
  width?: number;
  height?: number;
  buffer?: Uint8ClampedArray | Uint8Array;
}

export interface BoundingBox {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  width: number;
  height: number;
  label?: string;
  confidence?: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bbox: BoundingBox;
  attributes?: Record<string, unknown>;
}

export interface VisualUnderstandingResult {
  summary: string;
  elements: string[];
  colorPalette: string[];
  spatialLayout: string;
  textExtracted?: string[];
  confidence: number;
}

export interface ObjectDetectionResult {
  objects: DetectedObject[];
  dominantObject?: DetectedObject;
  count: number;
}

export interface SegmentationMask {
  targetId: string;
  label: string;
  confidence: number;
  maskDataUrl?: string;
  maskBuffer?: Uint8Array;
  bbox: BoundingBox;
}

export interface SegmentationResult {
  masks: SegmentationMask[];
  totalSegmented: number;
}

export interface SceneAnalysisResult {
  sceneType: string; // e.g. 'indoor_studio', 'outdoor_natural', 'product_display'
  lighting: {
    direction: string;
    temperature: 'warm' | 'neutral' | 'cool';
    intensity: number; // 0 to 1
  };
  focalPoint: { x: number; y: number };
  depthLevels: string[];
  dominantAesthetics: string[];
}

export interface IVisionModelAdapter extends IBaseModelAdapter {
  readonly category: ModelCategory.VISION;

  understandImage(image: ImageDataPayload, prompt?: string): Promise<VisualUnderstandingResult>;
  detectObjects(image: ImageDataPayload, targetClasses?: string[]): Promise<ObjectDetectionResult>;
  segmentObjects(image: ImageDataPayload, targets: string[] | BoundingBox[]): Promise<SegmentationResult>;
  analyzeScene(image: ImageDataPayload): Promise<SceneAnalysisResult>;
}

// ============================================================================
// 3. IMAGE GENERATION / EDIT MODEL DEFINITIONS
// Responsible for: Generation, Inpainting, Image Editing, Reconstruction
// ============================================================================

export interface ImageGenerationOptions {
  width?: number;
  height?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  negativePrompt?: string;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  format?: 'png' | 'jpeg' | 'webp';
}

export interface InpaintOptions extends ImageGenerationOptions {
  featherRadius?: number;
  blendMode?: string;
  preserveContextEdge?: boolean;
}

export interface ImageEditOptions extends ImageGenerationOptions {
  editStrength?: number; // 0 (original) to 1 (full rewrite)
  preserveFaces?: boolean;
  styleReferenceUrl?: string;
}

export interface ReconstructionOptions {
  mode: 'denoise' | 'super_resolution' | 'artifact_removal' | 'damage_repair';
  upscaleFactor?: number;
  fidelityWeight?: number;
}

export interface ImageResult {
  id: string;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  format: string;
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface IImageModelAdapter extends IBaseModelAdapter {
  readonly category: ModelCategory.IMAGE;

  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageResult>;
  inpaint(
    baseImage: ImageDataPayload,
    mask: ImageDataPayload,
    prompt: string,
    options?: InpaintOptions
  ): Promise<ImageResult>;
  editImage(
    baseImage: ImageDataPayload,
    instructions: string,
    options?: ImageEditOptions
  ): Promise<ImageResult>;
  reconstruct(
    damagedImage: ImageDataPayload,
    options?: ReconstructionOptions
  ): Promise<ImageResult>;
}
