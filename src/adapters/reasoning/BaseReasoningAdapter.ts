/**
 * @file BaseReasoningAdapter.ts
 * Abstract base class for Reasoning Model Adapters
 * Responsible for: Intent, Planning, Tool Selection, Reasoning, High-level Critique.
 */

import { BaseModelAdapter } from '../BaseModelAdapter';
import {
  IReasoningModelAdapter,
  ModelCategory,
  ModelConnectionConfig,
  IntentAnalysisResult,
  ExecutionPlanResult,
  PlanStep,
  ToolDefinition,
  ToolSelectionResult,
  ReasoningResult,
  CritiqueCriteria,
  CritiqueEvaluationResult,
} from '../types';

export abstract class BaseReasoningAdapter
  extends BaseModelAdapter
  implements IReasoningModelAdapter
{
  public override readonly category: ModelCategory.REASONING = ModelCategory.REASONING;

  constructor(config: ModelConnectionConfig) {
    super({ ...config, category: ModelCategory.REASONING });
  }

  // 1. Intent Analysis
  public abstract analyzeIntent(
    prompt: string,
    context?: unknown
  ): Promise<IntentAnalysisResult>;

  // 2. Planning
  public abstract generatePlan(
    intent: IntentAnalysisResult,
    context?: unknown
  ): Promise<ExecutionPlanResult>;

  // 3. Tool Selection
  public abstract selectTools(
    planStep: PlanStep,
    availableTools: ToolDefinition[]
  ): Promise<ToolSelectionResult>;

  // 4. Reasoning
  public abstract reason(
    problem: string,
    context?: unknown
  ): Promise<ReasoningResult>;

  // 5. High-level Critique
  public abstract evaluateCritique(
    artifact: unknown,
    criteria: CritiqueCriteria[]
  ): Promise<CritiqueEvaluationResult>;
}
