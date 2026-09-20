/**
 * @file types.ts
 * Type definitions for Visual Critic and Self-Revision Engine.
 */

import { PixelBuffer } from '../graphics/engine/PixelBuffer';

export type CriticDimension =
  | 'composition'
  | 'perspective'
  | 'lighting'
  | 'shadow'
  | 'material'
  | 'texture'
  | 'color'
  | 'geometry'
  | 'semantic'
  | 'realism';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Structured Critic Issue matching required schema:
 * {
 *   "type": "shadow",
 *   "severity": "medium",
 *   "location": "...",
 *   "reason": "...",
 *   "suggestedAction": "create_shadow"
 * }
 */
export interface StructuredCriticIssue {
  type: CriticDimension;
  severity: IssueSeverity;
  location: string;
  reason: string;
  suggestedAction: string;
  metricDetails?: Record<string, number | string | boolean>;
}

export interface CriticDimensionDetail {
  dim: CriticDimension;
  name: string;
  score: number; // 0..1
  weight: number;
  status: 'pass' | 'warning' | 'fail';
  observations: string[];
}

export interface StructuredCriticReport {
  overallScore: number;
  dimensions: Record<CriticDimension, CriticDimensionDetail>;
  issues: StructuredCriticIssue[];
  passed: boolean;
  needsRevision: boolean;
  timestamp: number;
}

export interface VisualAnalysisContext {
  canvasDimensions: { width: number; height: number };
  subjectBounds: { x: number; y: number; width: number; height: number };
  lighting?: {
    direction: 'top_left' | 'top_right' | 'center' | 'bottom';
    intensity: number;
    color?: string;
  };
  shadow?: {
    exists: boolean;
    offsetX?: number;
    offsetY?: number;
    blur?: number;
    opacity?: number;
    color?: string;
  };
  transform?: {
    scale: { x: number; y: number };
    rotation: number;
    perspective?: { tiltX: number; tiltY: number; depth: number };
  };
  appliedOperations?: string[];
  pixelBuffer?: PixelBuffer | null;
  activeLayerBuffer?: PixelBuffer | null;
  stylePreset?: string;
  backgroundColor?: string;
  hasOperationFailure?: boolean;
  failureMessage?: string;
}

export interface SelfRevisionOptions {
  maxIterations?: number; // Configurable, default: 3
  targetScore?: number; // Default: 0.85
  minImprovementDelta?: number; // Default: 0.005
}

export type RevisionDecision = 'ACCEPT' | 'ROLLBACK';

export type RevisionStage =
  | 'EXECUTE'
  | 'OBSERVE'
  | 'CRITIQUE'
  | 'ISSUE'
  | 'SELECT_CORRECTION'
  | 'VERIFY';

export interface RevisionIterationRecord {
  iteration: number;
  stage: RevisionStage;
  scoreBefore: number;
  scoreAfter?: number;
  identifiedIssue?: StructuredCriticIssue;
  selectedCorrection?: {
    tool: string;
    params: Record<string, unknown>;
    reason: string;
  };
  decision?: RevisionDecision;
  decisionReason: string;
  durationMs: number;
  passedVerification: boolean;
}

export interface SelfRevisionResult {
  success: boolean;
  status:
    | 'ACCEPTED_OPTIMAL'
    | 'ACCEPTED_IMPROVED'
    | 'ROLLED_BACK_NO_IMPROVEMENT'
    | 'MAX_ITERATIONS_REACHED'
    | 'TERMINATED_LOOP_PREVENTED';
  initialScore: number;
  finalScore: number;
  iterationsRun: number;
  maxIterationsConfigured: number;
  decisions: RevisionDecision[];
  history: RevisionIterationRecord[];
  finalReport: StructuredCriticReport;
  summary: string;
}
