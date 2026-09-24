/**
 * @file copilotTypes.ts
 * Type contracts for AI Copilot, Context snapshots, Graphic DSL calls,
 * Human Approval workflows, and Execution Activity Monitoring.
 */

import { GraphicToolCall } from '../dsl/GraphicDSL';

export type CopilotIntentType =
  | 'MOVE_LAYER'
  | 'SCALE_LAYER'
  | 'ROTATE_LAYER'
  | 'SET_OPACITY'
  | 'REMOVE_OBJECT'
  | 'CREATE_MASK'
  | 'RECOLOR'
  | 'SELECT_OBJECT'
  | 'REMOVE_BACKGROUND'
  | 'APPLY_TEXTURE'
  | 'COMPOSITE_STUDIO'
  | 'CROP_DOCUMENT'
  | 'ADJUST_BRIGHTNESS'
  | 'ADJUST_CONTRAST'
  | 'ADJUST_CURVES'
  | 'ADJUST_LEVELS'
  | 'INPAINT_REGION'
  | 'CLONE_STAMP'
  | 'HEAL_PATCH'
  | 'EVALUATE'
  | 'ROLLBACK'
  | 'UNKNOWN';

export interface CopilotIntent {
  type: CopilotIntentType;
  title: string;
  confidence: number;
  target?: string;
  parameters: Record<string, any>;
  isMultiStep: boolean;
  isRisky: boolean;
}

export interface CopilotPlanStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  toolId: string;
  parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  durationMs?: number;
  output?: Record<string, any>;
  error?: string;
}

export interface CopilotPlan {
  id: string;
  userPrompt: string;
  intent: CopilotIntent;
  title: string;
  isRisky: boolean;
  status: 'awaiting_approval' | 'executing' | 'completed' | 'failed' | 'cancelled';
  steps: CopilotPlanStep[];
  createdAt: number;
  completedAt?: number;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  text: string;
  intent?: CopilotIntent;
  plan?: CopilotPlan;
  dsl?: GraphicToolCall | GraphicToolCall[];
  executionResult?: {
    success: boolean;
    toolId: string;
    durationMs: number;
    affectedLayer?: string;
    changesSummary: string;
    error?: string;
  };
}

export interface CopilotContextSnapshot {
  document: {
    id: string;
    name: string;
    width: number;
    height: number;
    colorProfile: string;
    layerCount: number;
  };
  currentLayer: {
    id: string;
    name: string;
    type: string;
    bounds: { x: number; y: number; width: number; height: number };
    opacity: number;
    blendMode: string;
    visible: boolean;
    locked: boolean;
    hasMask: boolean;
  } | null;
  selectedObject: {
    id: string;
    name: string;
    bounds: { x: number; y: number; width: number; height: number };
  } | null;
  selection: {
    hasSelection: boolean;
    bounds?: { x: number; y: number; width: number; height: number };
  };
  availableTools: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
  }>;
  canvasState: {
    zoom: number;
    viewport: { width: number; height: number };
  };
  relevantAssets: Array<{
    id: string;
    name: string;
    mimeType: string;
  }>;
  historySnapshot?: {
    canUndo: boolean;
    canRedo: boolean;
    activeBranch: string;
  };
  criticSnapshot?: {
    lastScore?: number;
    hasIssues?: boolean;
  };
  memorySnapshot?: {
    projectMemoriesCount?: number;
  };
}

export type ActivityPhase =
  | 'Analyzing'
  | 'Planning'
  | 'Tool'
  | 'Parameters'
  | 'Executing'
  | 'Result'
  | 'Error'
  | 'Rollback';

export interface ActivityEvent {
  id: string;
  timestamp: number;
  phase: ActivityPhase;
  toolId?: string;
  parameters?: Record<string, any>;
  summary: string;
  status: 'info' | 'running' | 'success' | 'warning' | 'error';
  durationMs?: number;
}
