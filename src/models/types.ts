/**
 * @file Core Domain Models and Type Definitions for AI Graphic Maestro
 * Explicit typed contracts for all subsystems without simulated falsehoods.
 */

import type { MaestroDocumentModel } from './document.types';

export type DimensionUnit = 'px' | 'pt' | 'percent';

export interface RectDimensions {
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ColorSpace = 'sRGB' | 'display-p3' | 'linear-rgb';

// ==========================================
// 1. Document Engine Models
// ==========================================
export interface MaestroAsset {
  id: string;
  name: string;
  type: 'image' | 'vector' | 'mask' | 'color_palette';
  mimeType: string;
  width: number;
  height: number;
  dataUrl?: string;
  sourceUrl?: string;
  meta?: Record<string, unknown>;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  version: string;
  author: string;
  colorSpace: ColorSpace;
  dimensions: RectDimensions;
  backgroundColor: string;
}

export interface MaestroDocument {
  metadata: DocumentMetadata;
  assets: MaestroAsset[];
  rootNodeId: string;
}

// ==========================================
// 2. Layer & Mask Engine Models
// ==========================================
export type LayerType = 'image' | 'shape' | 'adjustment' | 'lighting' | 'shadow' | 'group';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'soft-light'
  | 'hard-light'
  | 'difference';

export interface LayerTransform {
  position: Point2D;
  scale: Point2D;
  rotation: number; // in degrees
  skew?: Point2D;
  perspective?: {
    tiltX: number;
    tiltY: number;
    depth: number;
  };
}

export interface LayerMask {
  id: string;
  enabled: boolean;
  inverted: boolean;
  type: 'alpha' | 'vector_path' | 'luminance';
  dataUrl?: string; // Grayscale bitmap mask or path
  bounds?: BoundingBox;
}

export interface LayerProperties {
  opacity: number; // 0..1
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  filters?: {
    contrast?: number;
    brightness?: number;
    saturation?: number;
    blur?: number;
    hueRotate?: number;
  };
}

export interface MaestroLayer {
  id: string;
  name: string;
  type: LayerType;
  parentId: string | null;
  childIds: string[];
  transform: LayerTransform;
  properties: LayerProperties;
  mask?: LayerMask;
  assetId?: string; // Reference to MaestroAsset if image
  customData?: Record<string, unknown>;
}

// ==========================================
// 3. Scene Graph Models
// ==========================================
export interface SceneGraphNode {
  id: string;
  layer: MaestroLayer;
  children: SceneGraphNode[];
  computedBounds: BoundingBox;
  isDirty: boolean;
}

// ==========================================
// 4. Tools & Graphic DSL Models
// ==========================================
export type ToolCategory = 'vision' | 'transform' | 'lighting' | 'compositing' | 'color' | 'filter' | 'selection';

export interface ToolParameterDescriptor {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'buffer' | 'bbox' | 'color' | 'object' | 'array';
  required: boolean;
  defaultValue?: unknown;
  description: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  inputs: ToolParameterDescriptor[];
  outputs: {
    name: string;
    type: string;
  }[];
  // True if implementation is currently active and executable in Canvas/Web, false if external service/TODO
  isImplemented: boolean;
  implementationNote?: string;
}

export interface DSLOperation {
  id: number;
  tool: string;
  output: string;
  desc: string;
  category: ToolCategory;
  inputs?: string;
  params: Record<string, unknown>;
  timeMs?: number;
  status: 'pending' | 'executing' | 'success' | 'failed' | 'not_implemented';
  errorMessage?: string;
}

// ==========================================
// 5. Critic & Evaluation Models
// ==========================================
export type CriticDimensionKey =
  | 'semantic'
  | 'composition'
  | 'geometry'
  | 'perspective'
  | 'lighting'
  | 'shadow'
  | 'material'
  | 'texture'
  | 'color'
  | 'realism';

export interface CriticDimensionScore {
  dim: CriticDimensionKey;
  score: number; // 0..1
  color: string;
  weight: number;
  observations: string[];
}

export interface CriticIssue {
  id: number;
  category: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  impact: number;
  what: string;
  where: string;
  why: string;
  action: string;
  color: string;
}

export interface CriticEvaluationResult {
  overallScore: number;
  severity: 'low' | 'medium' | 'high';
  needsRevision: boolean;
  confidence: number;
  scores: CriticDimensionScore[];
  issues: CriticIssue[];
  timestamp: number;
}

// ==========================================
// 6. Memory & Reasoning Models
// ==========================================
export interface VisualDecision {
  id: string;
  category: string;
  decision: string;
  rationale: string;
  timestamp: number;
}

export interface SuccessfulWorkflowEntry {
  id: string;
  pipelineName: string;
  intent: string;
  finalScore: number;
  operationCount: number;
  dslScript: string;
}

export interface MaestroMemoryState {
  projectMemoryCount: number;
  successfulWorkflows: SuccessfulWorkflowEntry[];
  visualDecisions: VisualDecision[];
  projectStyle: string;
  confidence: number;
}

// ==========================================
// 7. History & Command Models
// ==========================================
export interface HistoryCommand {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  execute: () => Promise<boolean> | boolean;
  undo: () => Promise<boolean> | boolean;
}

export interface HistorySnapshot {
  iteration: number;
  score: number;
  status: 'executed' | 'rollback' | 'active';
  /**
   * Phase 14.3.2 (Fix 6) — Widened from `MaestroDocument` (legacy, no layers)
   * to a union that also accepts the canonical `MaestroDocumentModel` (with
   * full layer tree). Orchestrator snapshot captures now use
   * `realEngine.cloneDocument()` which returns `MaestroDocumentModel`.
   */
  documentSnapshot: MaestroDocument | MaestroDocumentModel;
  operationsExecuted: DSLOperation[];
  timestamp: number;
}

// ==========================================
// 8. Orchestrator & Loop Models
// ==========================================
export type AutonomousStage =
  | 'ANALYZE'
  | 'PLAN'
  | 'EXECUTE'
  | 'OBSERVE'
  | 'CRITIQUE'
  | 'REVISE'
  | 'VERIFY';

export interface StageStatus {
  name: AutonomousStage;
  done: boolean;
  active: boolean;
  durationMs?: number;
}
