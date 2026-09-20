/**
 * @file types.ts
 * Type definitions for Dynamic Planner and Autonomous Pipeline.
 */

import { DSLOperation, CriticEvaluationResult, HistorySnapshot } from '../models/types';
import { SceneAnalysisResult, IntentAnalysisResult } from '../adapters/types';
import { StructuredCriticReport, SelfRevisionResult } from '../critic/types';

export type PipelineStageName =
  | 'USER'
  | 'INTENT'
  | 'SCENE_ANALYSIS'
  | 'CONSTRAINTS'
  | 'PLAN'
  | 'DSL'
  | 'VALIDATION'
  | 'EXECUTION'
  | 'OBSERVATION'
  | 'CRITIQUE'
  | 'REVISION'
  | 'VERIFICATION';

export interface PipelineStageInfo {
  name: PipelineStageName;
  done: boolean;
  active: boolean;
  durationMs?: number;
  summary?: string;
}

export interface DesignConstraints {
  stylePreset: 'luxury' | 'editorial' | 'vibrant' | 'minimalist' | 'natural';
  backgroundColor: string;
  lightingDirection: 'top_left' | 'top_right' | 'center' | 'ambient';
  lightingIntensity: number; // 0..1
  shadowOffset: { x: number; y: number };
  shadowBlur: number;
  shadowOpacity: number;
  colorHarmonizationBlend: number;
  scaleFactor: number;
  preserveBrandPixels: boolean;
  maxAllowedColorShiftDeltaE: number;
  qualityThreshold: number;
}

export interface DynamicPlanStep {
  stepId: string;
  order: number;
  name: string;
  tool: string;
  alternativeTool?: string;
  reasonSummary: string; // Sanitized public reason (NO private chain-of-thought)
  params: Record<string, unknown>;
  dependencies: string[];
  critical: boolean;
}

export interface DynamicPlan {
  planId: string;
  userPrompt: string;
  detectedIntent: string;
  objective: string;
  constraints: DesignConstraints;
  steps: DynamicPlanStep[];
  dslScript: string;
  createdAt: number;
}

export interface SanitizedTraceItem {
  action: string;
  reasonSummary: string;
  status: 'success' | 'failed' | 'retried' | 'fallback' | 'rolled_back';
  result: Record<string, unknown>;
}

export interface PipelineExecutionResult {
  userPrompt: string;
  plan: DynamicPlan;
  dslOperations: DSLOperation[];
  executionTrace: SanitizedTraceItem[]; // STRICTLY sanitized: action, reasonSummary, status, result (NO CoT)
  evaluation: CriticEvaluationResult;
  structuredCriticReport?: StructuredCriticReport;
  revisionResult?: SelfRevisionResult;
  snapshots: HistorySnapshot[];
  renderedDataUrl: string;
  stages: PipelineStageInfo[];
  totalDurationMs: number;
  success: boolean;
}
