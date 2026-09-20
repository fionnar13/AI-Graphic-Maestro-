/**
 * @file SelfRevisionEngine.ts
 * Autonomous Self-Revision Engine for AI Graphic Maestro.
 *
 * Implements the strict iterative revision loop:
 *   EXECUTE
 *      ↓
 *   OBSERVE
 *      ↓
 *   CRITIQUE
 *      ↓
 *   ISSUE
 *      ↓
 *   SELECT CORRECTION
 *      ↓
 *   EXECUTE
 *      ↓
 *   CRITIQUE
 *      ↓
 *   VERIFY
 *
 * Decision Rules:
 * - If result improved (higher score or resolved high/critical issues): ACCEPT
 * - If result degraded (lower score or introduced severe regressions): ROLLBACK
 *
 * Safeguards:
 * - Configurable maxIterations (default: 3).
 * - Infinite Loop Prevention: Detects cycles, action repetition, and convergence limits.
 */

import { VisualCritic } from './VisualCritic';
import {
  StructuredCriticIssue,
  StructuredCriticReport,
  SelfRevisionOptions,
  SelfRevisionResult,
  RevisionIterationRecord,
  RevisionDecision,
  VisualAnalysisContext,
} from './types';
import { ToolRegistry } from '../tools/ToolRegistry';
import { HistoryEngine } from '../history/HistoryEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { HistorySnapshot } from '../models/types';

export class SelfRevisionEngine {
  public critic: VisualCritic;
  public maxIterations: number;
  public targetScore: number;
  public minImprovementDelta: number;

  constructor(options?: SelfRevisionOptions) {
    this.critic = new VisualCritic();
    this.maxIterations = Math.max(1, Math.min(10, options?.maxIterations ?? 3));
    this.targetScore = options?.targetScore ?? 0.85;
    this.minImprovementDelta = options?.minImprovementDelta ?? 0.005;
  }

  /**
   * Sets maximum allowable revision iterations dynamically.
   */
  public setMaxIterations(count: number): void {
    this.maxIterations = Math.max(1, Math.min(10, count));
  }

  /**
   * Synchronous version of Self-Revision loop for deterministic unit-testing and fast in-memory execution.
   */
  public runRevisionLoopSync(params: {
    initialContext: VisualAnalysisContext;
    toolRegistry: ToolRegistry;
    historyEngine: HistoryEngine;
    graphicsEngine: GraphicsEngine;
    onExecuteStep?: (toolId: string, toolParams: Record<string, unknown>) => boolean;
  }): SelfRevisionResult {
    const { initialContext, historyEngine, graphicsEngine, onExecuteStep } = params;
    const historyRecords: RevisionIterationRecord[] = [];
    const decisions: RevisionDecision[] = [];
    const attemptedCorrections = new Set<string>();

    let currentContext: VisualAnalysisContext = { ...initialContext };

    // 1. Initial OBSERVE & CRITIQUE
    let currentReport = this.critic.evaluate(currentContext);
    const initialScore = currentReport.overallScore;
    let iteration = 0;

    historyEngine.saveSnapshot({
      iteration: 0,
      score: initialScore,
      status: 'executed',
      documentSnapshot: graphicsEngine.getDocumentEngine().getDocument() as any,
      operationsExecuted: [],
      timestamp: Date.now(),
    });

    if (currentReport.passed && currentReport.issues.length === 0) {
      return {
        success: true,
        status: 'ACCEPTED_OPTIMAL',
        initialScore,
        finalScore: initialScore,
        iterationsRun: 0,
        maxIterationsConfigured: this.maxIterations,
        decisions: ['ACCEPT'],
        history: historyRecords,
        finalReport: currentReport,
        summary: `Initial render achieved optimal score (${initialScore.toFixed(3)}) with 0 defects.`,
      };
    }

    while (iteration < this.maxIterations) {
      iteration++;
      const iterStart = performance.now();
      const scoreBefore = currentReport.overallScore;

      const topIssue = this.selectTopIssue(currentReport.issues);
      if (!topIssue) break;

      const correction = this.selectCorrection(topIssue, currentContext);
      const correctionSignature = `${correction.tool}:${JSON.stringify(correction.params)}`;

      if (attemptedCorrections.has(correctionSignature)) {
        historyRecords.push({
          iteration,
          stage: 'VERIFY',
          scoreBefore,
          scoreAfter: scoreBefore,
          identifiedIssue: topIssue,
          selectedCorrection: correction,
          decision: 'ROLLBACK',
          decisionReason: `Loop prevented: Action '${correction.tool}' was already attempted in a prior cycle.`,
          durationMs: Math.round(performance.now() - iterStart),
          passedVerification: false,
        });
        decisions.push('ROLLBACK');
        break;
      }
      attemptedCorrections.add(correctionSignature);

      historyEngine.saveSnapshot({
        iteration,
        score: scoreBefore,
        status: 'active',
        documentSnapshot: graphicsEngine.getDocumentEngine().getDocument() as any,
        operationsExecuted: [],
        timestamp: Date.now(),
      });

      let executionSuccess = false;
      try {
        if (onExecuteStep) {
          executionSuccess = onExecuteStep(correction.tool, correction.params);
        } else {
          executionSuccess = true;
        }
      } catch {
        executionSuccess = false;
      }

      currentContext = this.applyCorrectionToContext(currentContext, correction.tool, correction.params);
      const newReport = this.critic.evaluate(currentContext);
      const scoreAfter = newReport.overallScore;

      const isImproved = scoreAfter > scoreBefore + this.minImprovementDelta;
      const hasResolvedHighIssue =
        topIssue.severity === 'high' &&
        !newReport.issues.some((i) => i.type === topIssue.type && i.severity === 'high');

      const shouldAccept = executionSuccess && (isImproved || hasResolvedHighIssue) && scoreAfter >= scoreBefore;

      if (shouldAccept) {
        decisions.push('ACCEPT');
        currentReport = newReport;

        historyEngine.saveSnapshot({
          iteration,
          score: scoreAfter,
          status: 'executed',
          documentSnapshot: graphicsEngine.getDocumentEngine().getDocument() as any,
          operationsExecuted: [],
          timestamp: Date.now(),
        });

        historyRecords.push({
          iteration,
          stage: 'VERIFY',
          scoreBefore,
          scoreAfter,
          identifiedIssue: topIssue,
          selectedCorrection: correction,
          decision: 'ACCEPT',
          decisionReason: `Score improved from ${scoreBefore.toFixed(3)} to ${scoreAfter.toFixed(3)} (+${(scoreAfter - scoreBefore).toFixed(3)}). Resolved issue '${topIssue.type}'.`,
          durationMs: Math.round(performance.now() - iterStart),
          passedVerification: true,
        });

        if (scoreAfter >= this.targetScore && !newReport.issues.some((i) => i.severity === 'high' || i.severity === 'critical')) {
          break;
        }
      } else {
        decisions.push('ROLLBACK');
        historyEngine.rollbackTo(iteration - 1);
        currentContext = this.revertContext(currentContext, correction.tool);

        historyRecords.push({
          iteration,
          stage: 'VERIFY',
          scoreBefore,
          scoreAfter,
          identifiedIssue: topIssue,
          selectedCorrection: correction,
          decision: 'ROLLBACK',
          decisionReason: `Quality degraded or failed verification: score changed from ${scoreBefore.toFixed(3)} to ${scoreAfter.toFixed(3)}. Rolled back safely.`,
          durationMs: Math.round(performance.now() - iterStart),
          passedVerification: false,
        });

        historyEngine.saveSnapshot({
          iteration,
          score: scoreBefore,
          status: 'rollback',
          documentSnapshot: graphicsEngine.getDocumentEngine().getDocument() as any,
          operationsExecuted: [],
          timestamp: Date.now(),
        });
      }
    }

    const finalScore = currentReport.overallScore;
    const finalReport = currentReport;
    const isSuccess = finalScore >= initialScore;

    let status: SelfRevisionResult['status'] = 'ACCEPTED_IMPROVED';
    if (finalScore >= this.targetScore && !finalReport.issues.some((i) => i.severity === 'high')) {
      status = 'ACCEPTED_OPTIMAL';
    } else if (iteration >= this.maxIterations) {
      status = 'MAX_ITERATIONS_REACHED';
    } else if (decisions.every((d) => d === 'ROLLBACK')) {
      status = 'ROLLED_BACK_NO_IMPROVEMENT';
    }

    return {
      success: isSuccess,
      status,
      initialScore,
      finalScore,
      iterationsRun: iteration,
      maxIterationsConfigured: this.maxIterations,
      decisions,
      history: historyRecords,
      finalReport,
      summary: `Completed ${iteration}/${this.maxIterations} iterations. Initial: ${initialScore.toFixed(3)} -> Final: ${finalScore.toFixed(3)}. Status: ${status}.`,
    };
  }

  /**
   * Executes the full Self-Revision loop:
   * EXECUTE -> OBSERVE -> CRITIQUE -> ISSUE -> SELECT CORRECTION -> EXECUTE -> CRITIQUE -> VERIFY
   */
  public async runRevisionLoop(params: {
    initialContext: VisualAnalysisContext;
    toolRegistry: ToolRegistry;
    historyEngine: HistoryEngine;
    graphicsEngine: GraphicsEngine;
    onExecuteStep?: (toolId: string, toolParams: Record<string, unknown>) => Promise<boolean>;
  }): Promise<SelfRevisionResult> {
    const { initialContext, toolRegistry, historyEngine, graphicsEngine, onExecuteStep } = params;
    const historyRecords: RevisionIterationRecord[] = [];
    const decisions: RevisionDecision[] = [];
    const attemptedCorrections = new Set<string>();

    let currentContext: VisualAnalysisContext = { ...initialContext };

    // 1. Initial OBSERVE & CRITIQUE
    const startInitial = performance.now();
    let currentReport = this.critic.evaluate(currentContext);

    const initialScore = currentReport.overallScore;
    let iteration = 0;

    // Save baseline snapshot at iteration 0
    historyEngine.saveSnapshot({
      iteration: 0,
      score: initialScore,
      status: 'executed',
      documentSnapshot: graphicsEngine.getDocumentEngine().getDocument() as any,
      operationsExecuted: [],
      timestamp: Date.now(),
    });

    // Check if initial already meets criteria
    if (currentReport.passed && currentReport.issues.length === 0) {
      return {
        success: true,
        status: 'ACCEPTED_OPTIMAL',
        initialScore,
        finalScore: initialScore,
        iterationsRun: 0,
        maxIterationsConfigured: this.maxIterations,
        decisions: ['ACCEPT'],
        history: historyRecords,
        finalReport: currentReport,
        summary: `Initial render achieved optimal score (${initialScore.toFixed(3)}) with 0 defects.`,
      };
    }

    // --- REVISION LOOP (Bounded by maxIterations to prevent infinite loops) ---
    while (iteration < this.maxIterations) {
      iteration++;
      const iterStart = performance.now();
      const scoreBefore = currentReport.overallScore;

      // STEP: ISSUE (Find highest-priority issue)
      const topIssue = this.selectTopIssue(currentReport.issues);
      if (!topIssue) {
        // No actionable issues remaining
        break;
      }

      // STEP: SELECT CORRECTION
      const correction = this.selectCorrection(topIssue, currentContext);
      const correctionSignature = `${correction.tool}:${JSON.stringify(correction.params)}`;

      // Infinite loop prevention: Avoid repeating identical action if already attempted
      if (attemptedCorrections.has(correctionSignature)) {
        historyRecords.push({
          iteration,
          stage: 'VERIFY',
          scoreBefore,
          scoreAfter: scoreBefore,
          identifiedIssue: topIssue,
          selectedCorrection: correction,
          decision: 'ROLLBACK',
          decisionReason: `Loop prevented: Action '${correction.tool}' was already attempted in a prior cycle.`,
          durationMs: Math.round(performance.now() - iterStart),
          passedVerification: false,
        });
        decisions.push('ROLLBACK');
        break;
      }
      attemptedCorrections.add(correctionSignature);

      // Create pre-correction snapshot checkpoint for safe rollback
      const checkpointSnapshot: HistorySnapshot = {
        iteration,
        score: scoreBefore,
        status: 'active',
        documentSnapshot: graphicsEngine.getDocumentEngine().getDocument() as any,
        operationsExecuted: [],
        timestamp: Date.now(),
      };
      historyEngine.saveSnapshot(checkpointSnapshot);

      // STEP: EXECUTE (Execute corrective tool via ToolRegistry or provided callback)
      let executionSuccess = false;
      try {
        if (onExecuteStep) {
          executionSuccess = await onExecuteStep(correction.tool, correction.params);
        } else {
          const execRes = await toolRegistry.execute(
            correction.tool,
            correction.params,
            {
              graphicsEngine,
              documentEngine: graphicsEngine.getDocumentEngine(),
              activeSubjectBbox: currentContext.subjectBounds,
              activeLayerId: graphicsEngine.getActiveLayerId(),
            }
          );
          executionSuccess = execRes.success;
        }
      } catch (err) {
        executionSuccess = false;
      }

      // Update simulation context with new parameters
      currentContext = this.applyCorrectionToContext(currentContext, correction.tool, correction.params);

      // STEP: OBSERVE & CRITIQUE
      const newReport = this.critic.evaluate(currentContext);
      const scoreAfter = newReport.overallScore;

      // STEP: VERIFY (Compare new result vs prior score)
      const isImproved = scoreAfter > scoreBefore + this.minImprovementDelta;
      const hasResolvedHighIssue =
        topIssue.severity === 'high' &&
        !newReport.issues.some((i) => i.type === topIssue.type && i.severity === 'high');

      const shouldAccept = executionSuccess && (isImproved || hasResolvedHighIssue) && scoreAfter >= scoreBefore;

      if (shouldAccept) {
        // --- DECISION: ACCEPT ---
        decisions.push('ACCEPT');
        currentReport = newReport;

        // Commit snapshot for accepted iteration
        historyEngine.saveSnapshot({
          iteration,
          score: scoreAfter,
          status: 'executed',
          documentSnapshot: graphicsEngine.getDocumentEngine().getDocument() as any,
          operationsExecuted: [],
          timestamp: Date.now(),
        });

        historyRecords.push({
          iteration,
          stage: 'VERIFY',
          scoreBefore,
          scoreAfter,
          identifiedIssue: topIssue,
          selectedCorrection: correction,
          decision: 'ACCEPT',
          decisionReason: `Score improved from ${scoreBefore.toFixed(3)} to ${scoreAfter.toFixed(3)} (+${(scoreAfter - scoreBefore).toFixed(3)}). Resolved issue '${topIssue.type}'.`,
          durationMs: Math.round(performance.now() - iterStart),
          passedVerification: true,
        });

        // If target score achieved and no high/critical issues, finish successfully
        if (scoreAfter >= this.targetScore && !newReport.issues.some((i) => i.severity === 'high' || i.severity === 'critical')) {
          break;
        }
      } else {
        // --- DECISION: ROLLBACK ---
        decisions.push('ROLLBACK');

        // Rollback state in history engine to the previous snapshot
        historyEngine.rollbackTo(iteration - 1);

        // Revert simulated context to previous state
        currentContext = this.revertContext(currentContext, correction.tool);

        historyRecords.push({
          iteration,
          stage: 'VERIFY',
          scoreBefore,
          scoreAfter,
          identifiedIssue: topIssue,
          selectedCorrection: correction,
          decision: 'ROLLBACK',
          decisionReason: `Quality degraded or failed verification: score changed from ${scoreBefore.toFixed(3)} to ${scoreAfter.toFixed(3)}. Rolled back safely.`,
          durationMs: Math.round(performance.now() - iterStart),
          passedVerification: false,
        });

        // Record rollback snapshot in legacy history
        historyEngine.saveSnapshot({
          iteration,
          score: scoreBefore,
          status: 'rollback',
          documentSnapshot: graphicsEngine.getDocumentEngine().getDocument() as any,
          operationsExecuted: [],
          timestamp: Date.now(),
        });
      }
    }

    const finalScore = currentReport.overallScore;
    const finalReport = currentReport;
    const isSuccess = finalScore >= initialScore;

    let status: SelfRevisionResult['status'] = 'ACCEPTED_IMPROVED';
    if (finalScore >= this.targetScore && !finalReport.issues.some((i) => i.severity === 'high')) {
      status = 'ACCEPTED_OPTIMAL';
    } else if (iteration >= this.maxIterations) {
      status = 'MAX_ITERATIONS_REACHED';
    } else if (decisions.every((d) => d === 'ROLLBACK')) {
      status = 'ROLLED_BACK_NO_IMPROVEMENT';
    }

    return {
      success: isSuccess,
      status,
      initialScore,
      finalScore,
      iterationsRun: iteration,
      maxIterationsConfigured: this.maxIterations,
      decisions,
      history: historyRecords,
      finalReport,
      summary: `Completed ${iteration}/${this.maxIterations} iterations. Initial: ${initialScore.toFixed(3)} -> Final: ${finalScore.toFixed(3)}. Status: ${status}.`,
    };
  }

  /**
   * Prioritizes issues by severity: critical > high > medium > low.
   */
  private selectTopIssue(issues: StructuredCriticIssue[]): StructuredCriticIssue | null {
    if (issues.length === 0) return null;

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...issues].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return sorted[0];
  }

  /**
   * SELECT CORRECTION: Generates appropriate tool call parameters for the issue.
   */
  private selectCorrection(
    issue: StructuredCriticIssue,
    ctx: VisualAnalysisContext
  ): { tool: string; params: Record<string, unknown>; reason: string } {
    switch (issue.type) {
      case 'shadow': {
        const lightDir = ctx.lighting?.direction || 'top_left';
        const offsetX = lightDir === 'top_right' ? -16 : 16;
        return {
          tool: 'primitive.shadow',
          params: {
            offsetX,
            offsetY: 18,
            blur: 14,
            opacity: 0.45,
            color: '#000000',
          },
          reason: 'Apply grounded contact shadow beneath subject aligned with key lighting vector.',
        };
      }

      case 'lighting': {
        const dir = ctx.lighting?.direction || 'top_left';
        return {
          tool: 'primitive.lighting',
          params: {
            intensity: 0.25,
            direction: dir,
            color: '#ffffff',
          },
          reason: 'Apply directional specular overlay highlight to match scene key illumination.',
        };
      }

      case 'composition': {
        return {
          tool: 'tool.move',
          params: {
            layerId: 'layer_subject',
            dx: 0,
            dy: 0,
          },
          reason: 'Reposition subject toward optical focal center.',
        };
      }

      case 'color': {
        return {
          tool: 'primitive.recolor',
          params: {
            blend: 0.18,
            color: ctx.backgroundColor || '#0c0a09',
            mode: 'harmonize',
          },
          reason: 'Harmonize subject edge ambient color spill with studio backdrop palette.',
        };
      }

      case 'material': {
        return {
          tool: 'primitive.curves',
          params: {
            curvePoints: [
              { x: 0, y: 0 },
              { x: 128, y: 128 },
              { x: 220, y: 240 },
              { x: 255, y: 255 },
            ],
          },
          reason: 'Enhance specular highlights and gloss definition via tonal curve.',
        };
      }

      case 'texture': {
        return {
          tool: 'tool.contrast',
          params: {
            contrast: 1.12,
          },
          reason: 'Boost micro-surface contrast to restore edge definition.',
        };
      }

      case 'geometry': {
        return {
          tool: 'tool.scale',
          params: {
            scaleX: 1.0,
            scaleY: 1.0,
          },
          reason: 'Normalize non-uniform aspect distortion.',
        };
      }

      default: {
        return {
          tool: issue.suggestedAction || 'tool.blend',
          params: { opacity: 1.0 },
          reason: issue.reason,
        };
      }
    }
  }

  /**
   * Updates internal analysis context to simulate the applied correction.
   */
  private applyCorrectionToContext(
    ctx: VisualAnalysisContext,
    tool: string,
    params: Record<string, unknown>
  ): VisualAnalysisContext {
    const updated = { ...ctx };
    const ops = [...(ctx.appliedOperations || [])];
    ops.push(tool);
    updated.appliedOperations = ops;

    if (tool === 'primitive.shadow') {
      updated.shadow = {
        exists: true,
        offsetX: (params.offsetX as number) ?? 16,
        offsetY: (params.offsetY as number) ?? 18,
        blur: (params.blur as number) ?? 14,
        opacity: (params.opacity as number) ?? 0.45,
      };
    } else if (tool === 'primitive.lighting') {
      updated.lighting = {
        direction: (params.direction as any) ?? 'top_left',
        intensity: (params.intensity as number) ?? 0.25,
      };
    } else if (tool === 'tool.scale') {
      updated.transform = {
        ...updated.transform,
        scale: {
          x: (params.scaleX as number) ?? 1.0,
          y: (params.scaleY as number) ?? 1.0,
        },
        rotation: updated.transform?.rotation ?? 0,
      };
    }

    return updated;
  }

  /**
   * Reverts context changes upon ROLLBACK.
   */
  private revertContext(ctx: VisualAnalysisContext, tool: string): VisualAnalysisContext {
    const reverted = { ...ctx };
    if (tool === 'primitive.shadow') {
      reverted.shadow = { exists: false, opacity: 0 };
    }
    reverted.appliedOperations = (ctx.appliedOperations || []).filter((op) => op !== tool);
    return reverted;
  }
}
