/**
 * @file types.ts
 * Type definitions for the Autonomous Maestro Memory System.
 * 
 * Supports:
 * - Project Memory
 * - Operation Memory
 * - User Preference Memory
 * - Visual Decision Memory
 * - Failure Memory
 * - Successful Workflow Memory
 */

export type MemoryType =
  | 'project'
  | 'operation'
  | 'user_preference'
  | 'visual_decision'
  | 'failure'
  | 'successful_workflow';

export type MemorySource =
  | 'auto_extracted'
  | 'user_defined'
  | 'critic_feedback'
  | 'self_revision'
  | 'pipeline_execution';

export interface BaseMemoryEntry<T = any> {
  id: string;
  type: MemoryType;
  title: string;
  summary: string;
  tags: string[];
  confidence: number; // 0..1
  utilityScore: number; // 0..1 how valuable or frequently validated this lesson is
  data: T;
  createdAt: number;
  updatedAt: number;
  source: MemorySource;
}

// 1. Project Memory: Persistent context and domain knowledge of current or archived projects
export interface ProjectMemoryData {
  projectName: string;
  domain: 'e_commerce' | 'editorial' | 'social_media' | 'branding' | 'general';
  targetStyle: string;
  aspectRatio: string;
  dimensions: { width: number; height: number };
  brandPalette?: string[];
  keySubjects?: string[];
  notes?: string[];
}

// 2. Operation Memory: Tool-level insights, optimal parameter ranges, reliability metrics
export interface OperationMemoryData {
  toolId: string;
  toolCategory: string;
  recommendedParams: Record<string, unknown>;
  reliabilityScore: number; // 0..1
  successCount: number;
  failureCount: number;
  averageDurationMs: number;
  bestPractices: string[];
}

// 3. User Preference Memory: User aesthetic tastes, default parameters, preferred constraints
export interface UserPreferenceMemoryData {
  preferenceKey: string;
  value: unknown;
  category: 'lighting' | 'shadow' | 'palette' | 'layout' | 'typography' | 'automation';
  userExplicit: boolean; // set directly by user or inferred
  weight: number; // 0..1
}

// 4. Visual Decision Memory: Aesthetic reasoning, design tradeoffs, compositional choices
export interface VisualDecisionMemoryData {
  category: 'lighting' | 'shadow' | 'composition' | 'palette' | 'material' | 'hierarchy';
  decision: string;
  rationale: string;
  alternativesConsidered?: string[];
  outcomeScore?: number;
}

// 5. Failure Memory: Knowledge of failed combinations, degradation patterns, anti-patterns
export interface FailureMemoryData {
  failedAction: string;
  triggerConditions: string;
  failureReason: string;
  rootCauseCategory: 'missing_mask' | 'contrast_clipping' | 'scale_distortion' | 'shadow_disconnection' | 'tool_error' | 'other';
  avoidPattern: string;
  recommendedWorkaround: string;
  occurrences: number;
}

// 6. Successful Workflow Memory: Proven recipes and operation sequences that yielded high visual quality
export interface WorkflowStepRecord {
  stepIndex: number;
  toolId: string;
  displayName: string;
  purpose: string;
  params: Record<string, unknown>;
}

export interface SuccessfulWorkflowMemoryData {
  workflowName: string;
  intent: string;
  pipelineSequence: string[]; // e.g. ['Product', 'Mask', 'Background', 'Relight', 'Shadow']
  steps: WorkflowStepRecord[];
  finalQualityScore: number;
  inputRequirements?: string[];
  durationMs?: number;
  testedPreset?: string;
}

// Memory Query Filter
export interface MemoryQuery {
  type?: MemoryType | MemoryType[];
  tags?: string[];
  keyword?: string;
  minConfidence?: number;
  source?: MemorySource;
  startDate?: number;
  endDate?: number;
  limit?: number;
  sortBy?: 'updatedAt' | 'createdAt' | 'confidence' | 'utilityScore';
  sortOrder?: 'asc' | 'desc';
}

// Memory System Stats
export interface MemorySystemStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  averageConfidence: number;
  lastPersisted: number | null;
  storageSizeBytes: number;
}
