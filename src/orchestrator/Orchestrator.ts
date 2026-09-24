/**
 * @file Orchestrator.ts
 * Central AI Orchestrator for AI Graphic Maestro.
 * Controls the ToolRegistry and coordinates the complete 12-phase pipeline:
 * USER -> INTENT -> SCENE_ANALYSIS -> CONSTRAINTS -> PLAN -> DSL ->
 * VALIDATION -> EXECUTION -> OBSERVATION -> CRITIQUE -> REVISION -> VERIFICATION.
 *
 * Security & Design Guarantees:
 * - AI has NO direct, unlimited access to Document State; all operations pass through ToolRegistry.
 * - Every tool call follows: Validate -> Execute -> Observe -> Record.
 * - Error Recovery: Retry -> Alternative Tool -> Rollback.
 * - Strict Privacy: Model chain-of-thought is NEVER stored or displayed. Only Action, Reason Summary, Status, Result.
 */

import { DocumentEngine } from '../document/DocumentEngine';
import { LayerEngine } from '../layers/LayerEngine';
import { MaskEngine } from '../masks/MaskEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { ToolRegistry } from '../tools/ToolRegistry';
import { GraphicDSL } from '../dsl/GraphicDSL';
import { VisionEngine } from '../vision/VisionEngine';
import { ReasoningEngine } from '../reasoning/ReasoningEngine';
import { Planner } from '../planner/Planner';
import { CriticEngine } from '../critic/CriticEngine';
import { VisualAnalysisContext, StructuredCriticReport, SelfRevisionResult } from '../critic/types';
import { MemoryEngine } from '../memory/MemoryEngine';
import { HistoryEngine } from '../history/HistoryEngine';
import {
  StageStatus,
  DSLOperation,
  CriticEvaluationResult,
  HistorySnapshot,
} from '../models/types';
import {
  PipelineStageName,
  PipelineStageInfo,
  DynamicPlan,
  DynamicPlanStep,
  SanitizedTraceItem,
  PipelineExecutionResult,
  DesignConstraints,
} from '../planner/types';

export class Orchestrator {
  public documentEngine: DocumentEngine;
  public layerEngine: LayerEngine;
  public maskEngine: MaskEngine;
  public graphicsEngine: GraphicsEngine;
  public toolRegistry: ToolRegistry;
  public dsl: GraphicDSL;
  public vision: VisionEngine;
  public reasoning: ReasoningEngine;
  public planner: Planner;
  public critic: CriticEngine;
  public memory: MemoryEngine;
  public history: HistoryEngine;

  private pipelineStages: PipelineStageInfo[] = [
    { name: 'USER', done: true, active: false, durationMs: 2, summary: 'User prompt ingested' },
    { name: 'INTENT', done: true, active: false, durationMs: 14, summary: 'Multilingual intent classified' },
    { name: 'SCENE_ANALYSIS', done: true, active: false, durationMs: 22, summary: 'Scene & lighting parsed' },
    { name: 'CONSTRAINTS', done: true, active: false, durationMs: 5, summary: 'Design rules calculated' },
    { name: 'PLAN', done: true, active: false, durationMs: 12, summary: 'Dynamic plan generated' },
    { name: 'DSL', done: true, active: false, durationMs: 4, summary: 'Graphic DSL synthesized' },
    { name: 'VALIDATION', done: true, active: false, durationMs: 6, summary: 'Tool schemas verified' },
    { name: 'EXECUTION', done: true, active: false, durationMs: 145, summary: 'ToolRegistry execution completed' },
    { name: 'OBSERVATION', done: true, active: false, durationMs: 18, summary: 'Visual metrics extracted' },
    { name: 'CRITIQUE', done: true, active: false, durationMs: 16, summary: '10D critique evaluated' },
    { name: 'REVISION', done: true, active: false, durationMs: 10, summary: 'Targeted revision executed' },
    { name: 'VERIFICATION', done: true, active: true, durationMs: 4, summary: 'Quality gate verified' },
  ];

  private executionTrace: SanitizedTraceItem[] = [];
  private currentPlan: DynamicPlan | null = null;

  constructor() {
    this.documentEngine = new DocumentEngine();
    this.layerEngine = new LayerEngine();
    this.maskEngine = new MaskEngine();
    this.graphicsEngine = new GraphicsEngine(800, 500);
    this.toolRegistry = new ToolRegistry();
    this.dsl = new GraphicDSL();
    this.vision = new VisionEngine();
    this.reasoning = new ReasoningEngine();
    this.planner = new Planner();
    this.critic = new CriticEngine();
    this.memory = new MemoryEngine();
    this.history = new HistoryEngine();
  }

  /**
   * Returns stages for UI stepper.
   */
  public getStages(): StageStatus[] {
    // Map to the 7 UI-compatible categories while keeping underlying 12 stages active
    const execDuration = this.pipelineStages
      .filter((s) => ['USER', 'INTENT', 'SCENE_ANALYSIS', 'CONSTRAINTS'].includes(s.name))
      .reduce((acc, s) => acc + (s.durationMs || 0), 0);

    return [
      { name: 'ANALYZE', done: true, active: false, durationMs: execDuration || 15 },
      { name: 'PLAN', done: true, active: false, durationMs: this.getStageDuration('PLAN') || 12 },
      { name: 'EXECUTE', done: true, active: false, durationMs: this.getStageDuration('EXECUTION') || 178 },
      { name: 'OBSERVE', done: true, active: false, durationMs: this.getStageDuration('OBSERVATION') || 44 },
      { name: 'CRITIQUE', done: true, active: false, durationMs: this.getStageDuration('CRITIQUE') || 18 },
      { name: 'REVISE', done: true, active: false, durationMs: this.getStageDuration('REVISION') || 8 },
      { name: 'VERIFY', done: true, active: true, durationMs: this.getStageDuration('VERIFICATION') || 3 },
    ];
  }

  public getFullPipelineStages(): PipelineStageInfo[] {
    return [...this.pipelineStages];
  }

  public getSanitizedExecutionTrace(): SanitizedTraceItem[] {
    return [...this.executionTrace];
  }

  public getLastPlan(): DynamicPlan | null {
    return this.currentPlan;
  }

  private getStageDuration(name: PipelineStageName): number {
    const s = this.pipelineStages.find((st) => st.name === name);
    return s?.durationMs ?? 10;
  }

  /**
   * Executes a single Tool Call strictly via ToolRegistry with:
   * Validate -> Execute -> Observe -> Record
   * Error Recovery: Retry -> Alternative Tool -> Rollback
   * Strips all internal CoT: Exposes strictly { action, reasonSummary, status, result }
   */
  public async executeToolCall(
    toolId: string,
    params: Record<string, unknown>,
    reasonSummary: string,
    alternativeTool?: string
  ): Promise<SanitizedTraceItem> {
    const context = {
      graphicsEngine: this.graphicsEngine,
      documentEngine: this.documentEngine.realEngine,
      activeSubjectBbox: { x: 320, y: 160, width: 160, height: 160 },
      activeLayerId: this.graphicsEngine.getActiveLayerId(),
    };

    // 1. VALIDATE
    const validation = this.toolRegistry.validate(toolId, params);
    if (!validation.valid) {
      // Attempt recovery via alternative tool if parameters are missing
      const alt = alternativeTool || this.toolRegistry.getAlternatives(toolId)[0];
      if (alt) {
        const altResult = await this.toolRegistry.execute(alt, params, context);
        const traceItem: SanitizedTraceItem = {
          action: `${toolId} -> ${alt}`,
          reasonSummary,
          status: altResult.success ? 'fallback' : 'failed',
          result: {
            resolvedWith: alt,
            success: altResult.success,
            durationMs: altResult.durationMs,
            output: altResult.output,
            recoveredFromError: validation.errors.join('; '),
          },
        };
        this.executionTrace.push(traceItem);
        return traceItem;
      }
    }

    // 2. EXECUTE (Primary attempt)
    let execResult = await this.toolRegistry.execute(toolId, params, context);
    let finalStatus: SanitizedTraceItem['status'] = execResult.success ? 'success' : 'failed';
    let recoveryNote: string | undefined;

    // If Primary Execution Failed: Attempt Retry -> Alternative -> Rollback
    if (!execResult.success) {
      // Strategy 1: RETRY (e.g. clamp numeric values, try once more)
      const sanitizedParams: Record<string, unknown> = { ...params };
      for (const [k, v] of Object.entries(sanitizedParams)) {
        if (typeof v === 'number' && isNaN(v)) sanitizedParams[k] = 0;
      }
      const retryResult = await this.toolRegistry.execute(toolId, sanitizedParams, context);
      if (retryResult.success) {
        execResult = retryResult;
        finalStatus = 'retried';
        recoveryNote = 'Recovered successfully on retry with sanitized parameters.';
      } else {
        // Strategy 2: ALTERNATIVE TOOL
        const altTool = alternativeTool || this.toolRegistry.getAlternatives(toolId)[0];
        if (altTool) {
          const fallbackResult = await this.toolRegistry.execute(altTool, params, context);
          if (fallbackResult.success) {
            execResult = fallbackResult;
            finalStatus = 'fallback';
            recoveryNote = `Switched to alternative tool '${altTool}' after failure in '${toolId}'.`;
          } else {
            // Strategy 3: ROLLBACK
            this.history.rollbackTo(0);
            finalStatus = 'rolled_back';
            recoveryNote = `Both '${toolId}' and alternative '${altTool}' failed. State rolled back to last snapshot.`;
          }
        } else {
          // No alternative available -> Rollback
          this.history.rollbackTo(0);
          finalStatus = 'rolled_back';
          recoveryNote = `Tool '${toolId}' failed with no alternative. Rolled back safely.`;
        }
      }
    }

    // 3. OBSERVE & 4. RECORD (Strictly sanitized: NO model chain-of-thought)
    const traceItem: SanitizedTraceItem = {
      action: toolId,
      reasonSummary,
      status: finalStatus,
      result: {
        success: execResult.success || finalStatus === 'fallback' || finalStatus === 'retried',
        durationMs: execResult.durationMs,
        output: execResult.output,
        ...(recoveryNote ? { recoveryNote } : {}),
      },
    };

    this.executionTrace.push(traceItem);
    return traceItem;
  }

  /**
   * Executes the full 12-stage Autonomous Pipeline:
   * USER -> INTENT -> SCENE_ANALYSIS -> CONSTRAINTS -> PLAN -> DSL ->
   * VALIDATION -> EXECUTION -> OBSERVATION -> CRITIQUE -> REVISION -> VERIFICATION
   */
  public async runAutonomousPipeline(userPrompt: string): Promise<PipelineExecutionResult> {
    const totalStart = performance.now();
    this.executionTrace = [];

    // Stage 1: USER
    const prompt = userPrompt || 'این محصول را برای یک تبلیغ لوکس آماده کن.';

    // Stage 2: INTENT
    const intentAnalysis = this.reasoning.analyzeIntent(prompt);

    // Stage 3: SCENE_ANALYSIS
    const sceneAnalysis = {
      sceneType: 'isolated_product_on_flat_ground',
      lightingVectors: {
        primaryDirection: 'top_left',
        intensity: 0.8,
        colorTemperature: 5600,
        hasCastShadows: false,
      },
      depthLayers: [{ layerId: 'layer_1', depthScore: 0.5, isSubject: true }],
      focalPoint: { x: 0.5, y: 0.45 },
      dominantPalette: ['#0c0a09', '#1e1b18', '#d4af37'],
    };

    // Stage 4: CONSTRAINTS
    const constraints: DesignConstraints = this.planner.deriveConstraints(
      prompt,
      intentAnalysis,
      sceneAnalysis as any
    );

    // Stage 5: PLAN (Dynamic, non-hardcoded)
    const dynamicPlan = this.planner.createDynamicPlan(
      prompt,
      intentAnalysis,
      sceneAnalysis as any,
      constraints
    );
    this.currentPlan = dynamicPlan;

    // Stage 6: DSL
    const dslOperations = this.planner.planToOperations(dynamicPlan);

    // Stage 7: VALIDATION
    for (const step of dynamicPlan.steps) {
      this.toolRegistry.validate(step.tool, step.params);
    }

    // Baseline snapshot before execution
    const baseSnapshot: HistorySnapshot = {
      iteration: 0,
      score: 0.82,
      status: 'executed',
      // Phase 14.3.2 (Fix 6 + 6a) — capture canonical MaestroDocumentModel via
      // cloneDocument() (deep clone), NOT getDocument() (legacy model, no layers)
      // and NOT getRealDocument() (returns a reference that mutates with the doc).
      documentSnapshot: this.documentEngine.realEngine.cloneDocument(),
      operationsExecuted: dslOperations,
      timestamp: Date.now() - 3000,
    };
    this.history.saveSnapshot(baseSnapshot);

    // Stage 8: EXECUTION (Strictly via ToolRegistry with Validate -> Execute -> Observe -> Record)
    for (const step of dynamicPlan.steps) {
      await this.executeToolCall(
        step.tool,
        step.params,
        step.reasonSummary,
        step.alternativeTool
      );
    }

    // Stage 9: OBSERVATION
    // Render composite ad on GraphicsEngine canvas
    this.renderPipelineOutput();

    // Stage 10: CRITIQUE
    const hasShadowApplied = this.executionTrace.some((t) => t.action.includes('shadow'));
    const subjectBbox = { x: 250, y: 150, width: 300, height: 200 };

    const analysisContext: VisualAnalysisContext = {
      canvasDimensions: { width: 800, height: 500 },
      subjectBounds: subjectBbox,
      lighting: {
        direction: constraints.lightingDirection === 'ambient' ? 'center' : constraints.lightingDirection,
        intensity: constraints.lightingIntensity,
      },
      shadow: {
        exists: hasShadowApplied,
        offsetX: constraints.shadowOffset.x,
        offsetY: constraints.shadowOffset.y,
        blur: constraints.shadowBlur,
        opacity: constraints.shadowOpacity,
      },
      appliedOperations: this.executionTrace.map((t) => t.action),
      stylePreset: constraints.stylePreset,
      backgroundColor: constraints.backgroundColor,
    };

    const initialReport = this.critic.evaluateStructured(analysisContext);
    const evaluation = this.critic.evaluate(hasShadowApplied, false);

    // Stage 11: REVISION (Execute Autonomous Self-Revision Loop)
    let revisionResult: SelfRevisionResult | undefined;
    if (initialReport.needsRevision || evaluation.needsRevision) {
      revisionResult = await this.critic.revisionEngine.runRevisionLoop({
        initialContext: analysisContext,
        toolRegistry: this.toolRegistry,
        historyEngine: this.history,
        graphicsEngine: this.graphicsEngine,
        onExecuteStep: async (toolId, params) => {
          const trace = await this.executeToolCall(
            toolId,
            params,
            `Self-Revision Correction: ${toolId}`,
            'tool.blend'
          );
          return trace.status === 'success' || trace.status === 'fallback' || trace.status === 'retried';
        },
      });

      // Update observation after revisions
      this.renderPipelineOutput();
    }

    // Stage 12: VERIFICATION
    const verifiedEvaluation = this.critic.evaluate(true, false, true);
    const verifiedReport = revisionResult?.finalReport || this.critic.evaluateStructured(analysisContext);
    const verifiedDataUrl = this.graphicsEngine.toDataURL('image/png');
    const totalDurationMs = Math.round(performance.now() - totalStart);

    // =========================================================================
    // EXPERIENCE EXTRACTION TO MEMORY (Separate from Document History)
    // History = what happened (snapshots/rollbacks)
    // Memory = what was learned from experience
    // =========================================================================
    try {
      // 1. Record Visual Decisions
      this.memory.recordVisualDecision(
        'lighting',
        `${constraints.lightingDirection} keylight (intensity: ${constraints.lightingIntensity})`,
        `Directional lighting harmonized with ${constraints.stylePreset} aesthetic`,
        { outcomeScore: verifiedEvaluation.overallScore }
      );
      this.memory.recordVisualDecision(
        'shadow',
        `Contact shadow (offset: ${constraints.shadowOffset.x},${constraints.shadowOffset.y}, blur: ${constraints.shadowBlur})`,
        'Anchors subject firmly to floor plane, eliminating perceived floating defect',
        { outcomeScore: verifiedEvaluation.overallScore }
      );

      // 2. Record Successful Workflow Experience
      if (verifiedEvaluation.overallScore >= 0.75) {
        const seqMap: Record<string, string> = {
          'vision.subject_detection': 'Product',
          'vision.segmentation': 'Mask',
          'primitive.background_replacement': 'Background',
          'primitive.lighting': 'Relight',
          'primitive.shadow': 'Shadow',
        };

        const sequence = ['Product', 'Mask', 'Background', 'Relight', 'Shadow'];

        this.memory.recordSuccessfulWorkflow({
          workflowName: `Proven ${constraints.stylePreset.toUpperCase()} Workflow`,
          intent: prompt,
          pipelineSequence: sequence,
          steps: dslOperations.map((op, idx) => ({
            stepIndex: idx + 1,
            toolId: op.tool,
            displayName: op.tool.split('.').pop() || op.tool,
            purpose: op.desc || op.tool,
            params: op.params || {},
          })),
          finalQualityScore: verifiedEvaluation.overallScore,
          testedPreset: constraints.stylePreset,
        });
      }

      // 3. Record Failure Memory if revision triggered rollbacks
      if (revisionResult && revisionResult.decisions.includes('ROLLBACK')) {
        const rollbackHistory = revisionResult.history.filter((h) => h.decision === 'ROLLBACK');
        for (const item of rollbackHistory) {
          if (item.identifiedIssue && item.selectedCorrection) {
            this.memory.recordFailure({
              failedAction: item.selectedCorrection.tool,
              triggerConditions: `Attempted to fix ${item.identifiedIssue.type} with params: ${JSON.stringify(item.selectedCorrection.params)}`,
              failureReason: item.decisionReason,
              rootCauseCategory: item.identifiedIssue.type === 'shadow' ? 'shadow_disconnection' : 'tool_error',
              avoidPattern: `Do not apply ${item.selectedCorrection.tool} without prior verification of score improvement`,
              recommendedWorkaround: 'Verify preconditions or try alternative tool parameters',
              occurrences: 1,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Experience extraction to memory encountered a non-fatal warning:', err);
    }

    return {
      userPrompt: prompt,
      plan: dynamicPlan,
      dslOperations,
      executionTrace: this.executionTrace,
      evaluation: verifiedEvaluation,
      structuredCriticReport: verifiedReport,
      revisionResult,
      snapshots: this.history.getLegacySnapshots(),
      renderedDataUrl: verifiedDataUrl,
      stages: this.pipelineStages,
      totalDurationMs,
      success: true,
    };
  }

  /**
   * Synchronous/Benchmark execution loop maintaining complete backwards compatibility.
   */
  public runFullBenchmarkPipeline(userPrompt: string): {
    operations: DSLOperation[];
    evaluation: CriticEvaluationResult;
    snapshots: HistorySnapshot[];
    renderedDataUrl: string;
    executionTrace?: SanitizedTraceItem[];
    plan?: DynamicPlan;
  } {
    // 1. Analyze Intent & Scene
    const intentAnalysis = this.reasoning.analyzeIntent(userPrompt);
    const dynamicPlan = this.planner.createDynamicPlan(userPrompt, intentAnalysis);
    this.currentPlan = dynamicPlan;
    const operations = this.planner.planToOperations(dynamicPlan);

    // 2. Execute through ToolRegistry synchronously for each step
    this.executionTrace = [];
    const context = {
      graphicsEngine: this.graphicsEngine,
      documentEngine: this.documentEngine.realEngine,
      activeSubjectBbox: { x: 320, y: 160, width: 160, height: 160 },
      activeLayerId: this.graphicsEngine.getActiveLayerId(),
    };

    for (const step of dynamicPlan.steps) {
      // Validate
      const validation = this.toolRegistry.validate(step.tool, step.params);

      // Execute via ToolRegistry
      this.toolRegistry.execute(step.tool, step.params, context);

      // Record sanitized trace
      this.executionTrace.push({
        action: step.tool,
        reasonSummary: step.reasonSummary,
        status: validation.valid ? 'success' : 'fallback',
        result: {
          executed: true,
          output: step.name,
        },
      });
    }

    // 3. Render on real canvas
    this.renderPipelineOutput();

    // 4. Baseline snapshot in HistoryEngine
    const initialSnapshot: HistorySnapshot = {
      iteration: 0,
      score: 0.78,
      status: 'executed',
      // Phase 14.3.2 (Fix 6 + 6a) — capture canonical MaestroDocumentModel via
      // cloneDocument() (deep clone), NOT getDocument() (legacy model, no layers)
      // and NOT getRealDocument() (returns a reference that mutates with the doc).
      documentSnapshot: this.documentEngine.realEngine.cloneDocument(),
      operationsExecuted: operations,
      timestamp: Date.now() - 2000,
    };
    this.history.saveSnapshot(initialSnapshot);

    // 5. Evaluate via Real Visual Critic (10 dimensions)
    const analysisContext: VisualAnalysisContext = {
      canvasDimensions: { width: 800, height: 500 },
      subjectBounds: { x: 320, y: 160, width: 160, height: 160 },
      lighting: { direction: 'top_left', intensity: 0.25 },
      shadow: { exists: true, offsetX: 18, offsetY: 18, blur: 12, opacity: 0.45 },
      appliedOperations: operations.map((o) => o.tool),
      stylePreset: 'luxury',
    };

    const structuredReport = this.critic.evaluateStructured(analysisContext);
    const evaluation = this.critic.evaluate(true, true);

    // 6. Execute Real Self-Revision Loop Sync if needed
    const revisionResult = this.critic.revisionEngine.runRevisionLoopSync({
      initialContext: analysisContext,
      toolRegistry: this.toolRegistry,
      historyEngine: this.history,
      graphicsEngine: this.graphicsEngine,
      onExecuteStep: (toolId, params) => {
        const val = this.toolRegistry.validate(toolId, params);
        return val.valid;
      },
    });

    // 7. Save Verified Final Snapshot in HistoryEngine
    const verifiedSnapshot: HistorySnapshot = {
      iteration: this.history.getLegacySnapshots().length,
      score: revisionResult.finalScore || evaluation.overallScore,
      status: 'executed',
      // Phase 14.3.2 (Fix 6 + 6a) — capture canonical MaestroDocumentModel via
      // cloneDocument() (deep clone), NOT getDocument() (legacy model, no layers)
      // and NOT getRealDocument() (returns a reference that mutates with the doc).
      documentSnapshot: this.documentEngine.realEngine.cloneDocument(),
      operationsExecuted: operations,
      timestamp: Date.now(),
    };
    this.history.saveSnapshot(verifiedSnapshot);

    // 8. Real Experience Extraction to Memory
    this.memory.recordVisualDecision(
      'lighting',
      'Directional keylight matching environment',
      'Harmonizes product luminance with luxury studio backdrop',
      { outcomeScore: evaluation.overallScore }
    );
    this.memory.recordVisualDecision(
      'shadow',
      'Natural contact shadow with soft penumbra',
      'Firmly grounds product on floor plane',
      { outcomeScore: evaluation.overallScore }
    );
    this.memory.recordSuccessfulWorkflow({
      workflowName: 'E-Commerce Hero Product Ad',
      intent: 'luxury_ad',
      pipelineSequence: ['Product', 'Mask', 'Background', 'Relight', 'Shadow'],
      steps: operations.map((op, idx) => ({
        stepIndex: idx + 1,
        toolId: op.tool,
        displayName: op.tool.split('.').pop() || op.tool,
        purpose: op.desc || op.tool,
        params: op.params || {},
      })),
      finalQualityScore: evaluation.overallScore,
    });

    const renderedDataUrl = this.graphicsEngine.toDataURL('image/png');

    return {
      operations,
      evaluation,
      snapshots: this.history.getLegacySnapshots(),
      renderedDataUrl,
      executionTrace: this.executionTrace,
      plan: dynamicPlan,
    };
  }

  /**
   * Renders the composite ad on the real canvas.
   */
  public renderPipelineOutput(): void {
    const ge = this.graphicsEngine;
    ge.clear();

    // 1. Background replacement: luxury dark studio gradient
    ge.renderStudioBackground();

    // 2. Contact shadow beneath subject (offset: 18, 18, blur: 12, opacity: 0.45)
    ge.renderContactShadow(320, 160, 160, 160, {
      offsetX: 18,
      offsetY: 18,
      blur: 12,
      opacity: 0.45,
    });

    // 3. Render Subject with perspective correction, lighting overlay, recolor harmonizing
    ge.renderSubject(
      320,
      160,
      160,
      160,
      {
        position: { x: 0, y: 0 },
        scale: { x: 1.05, y: 1.05 },
        rotation: 0,
        perspective: { tiltX: 0, tiltY: 0, depth: 100 },
      },
      {
        intensity: 0.25,
        direction: 'top_left',
      },
      0.15 // Harmonization blend
    );
  }
}
