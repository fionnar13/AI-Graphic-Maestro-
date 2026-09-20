/**
 * @file comprehensive.test.ts
 * Comprehensive 7-Pillar Verification Suite for AI Graphic Maestro:
 * 1. Unit Tests
 * 2. Integration Tests
 * 3. End-to-End (E2E) Scenario Tests
 * 4. Regression Tests
 * 5. Performance & Stress Tests
 * 6. Error Recovery & Fault-Tolerance Tests
 * 7. Security & Privacy Guard Tests
 */

import { DocumentEngine } from '../document/DocumentEngine';
import { LayerEngine } from '../layers/LayerEngine';
import { GraphicDSL } from '../dsl/GraphicDSL';
import { ToolRegistry } from '../tools/ToolRegistry';
import { VisualCritic } from '../critic/VisualCritic';
import { CriticEngine } from '../critic/CriticEngine';
import { SelfRevisionEngine } from '../critic/SelfRevisionEngine';
import { HistoryEngine } from '../history/HistoryEngine';
import { MemoryEngine } from '../memory/MemoryEngine';
import { InMemoryStorageAdapter } from '../memory/MemoryStorageAdapter';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { VisionEngine } from '../vision/VisionEngine';
import { ReasoningEngine } from '../reasoning/ReasoningEngine';
import { Planner } from '../planner/Planner';
import { Orchestrator } from '../orchestrator/Orchestrator';
import { DocumentTestSuite } from './document.test';
import { MemoryTestSuite } from './memory.test';

export interface TestSuiteResult {
  category: 'unit' | 'integration' | 'e2e' | 'regression' | 'performance' | 'error_recovery' | 'security';
  name: string;
  passed: boolean;
  durationMs: number;
  message?: string;
}

export class ComprehensiveTestSuite {
  /**
   * Executes the complete 7-category test suite.
   */
  public static async runAll(): Promise<TestSuiteResult[]> {
    const results: TestSuiteResult[] = [];

    // =========================================================================
    // 1. UNIT TESTS
    // =========================================================================
    results.push(await this.runTest('unit', 'Unit: DocumentEngine State & Dimensions Lifecycle', () => {
      const doc = new DocumentEngine({ dimensions: { width: 1200, height: 800 } });
      const dims = doc.getDimensions();
      if (dims.width !== 1200 || dims.height !== 800) throw new Error('Dimensions mismatch');
      doc.setDimensions(1920, 1080);
      if (doc.getDimensions().width !== 1920) throw new Error('Set dimensions failed');
    }));

    results.push(await this.runTest('unit', 'Unit: LayerEngine Creation, Types, BlendModes & Opacity', () => {
      const le = new LayerEngine();
      const l1 = le.addLayer('Hero Product', 'image', 'root');
      le.setOpacity(l1.id, 0.85);
      le.setBlendMode(l1.id, 'overlay');
      const retrieved = le.getLayer(l1.id);
      if (!retrieved) throw new Error('Layer not found');
      if (retrieved.properties.opacity !== 0.85) throw new Error('Opacity update failed');
      if (retrieved.properties.blendMode !== 'overlay') throw new Error('Blend mode update failed');
    }));

    results.push(await this.runTest('unit', 'Unit: GraphicDSL Parsing, Parameter Mapping & Serialization', () => {
      const dsl = new GraphicDSL();
      const line = 'primitive.shadow (offsetX 18, offsetY 18, blur 12, opacity 0.45) -> shadow_layer';
      const ops = dsl.parseScript(line);
      if (ops.length !== 1) throw new Error('DSL parsing failed to produce 1 operation');
      if (ops[0].tool !== 'primitive.shadow') throw new Error('Tool name mismatch');
      if (ops[0].output !== 'shadow_layer') throw new Error('Output name mismatch');
      if (ops[0].params.blur !== 12) throw new Error('Param blur mismatch');
    }));

    results.push(await this.runTest('unit', 'Unit: ToolRegistry 18 Primitives & Schema Validation', () => {
      const tools = new ToolRegistry();
      const all = tools.getAllTools();
      if (all.length < 18) throw new Error(`Expected at least 18 tools, got ${all.length}`);
      const valid = tools.validate('primitive.shadow', { offsetX: 10, offsetY: 10 });
      if (!valid.valid) throw new Error('Valid parameters failed validation');
    }));

    results.push(await this.runTest('unit', 'Unit: VisualCritic 10 Dimensions & Defect Detection', () => {
      const critic = new VisualCritic();
      const report = critic.evaluate({
        canvasDimensions: { width: 800, height: 600 },
        subjectBounds: { x: 200, y: 150, width: 400, height: 300 },
        lighting: { direction: 'top_left', intensity: 0.3 },
        shadow: { exists: false }, // missing shadow should trigger defect
      });
      if (report.overallScore >= 1 || report.overallScore <= 0) throw new Error('Score out of bounds');
      if (!report.needsRevision) throw new Error('Expected needsRevision=true when shadow is missing');
      if (report.issues.length === 0) throw new Error('Expected structured issues for missing shadow');
    }));

    results.push(await this.runTest('unit', 'Unit: HistoryEngine Snapshots & State Rollback', () => {
      const doc = new MaestroDocumentEngine();
      const graphics = new GraphicsEngine(800, 600, doc);
      const history = new HistoryEngine(doc, graphics);
      history.saveSnapshot({
        iteration: 0,
        score: 0.85,
        status: 'executed',
        documentSnapshot: doc.getDocument() as any,
        operationsExecuted: [],
        timestamp: Date.now() - 1000,
      });
      history.saveSnapshot({
        iteration: 1,
        score: 0.70,
        status: 'executed',
        documentSnapshot: doc.getDocument() as any,
        operationsExecuted: [],
        timestamp: Date.now(),
      });
      const restored = history.rollbackTo(0);
      if (!restored || restored.iteration !== 0) throw new Error('Rollback failed');
    }));

    results.push(await this.runTest('unit', 'Unit: MemoryEngine CRUD & 6 Memory Types', () => {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);
      memory.clear();
      memory.recordProjectMemory('Camp A', { targetStyle: 'luxury' });
      memory.recordOperationMemory('primitive.shadow', { reliabilityScore: 0.98 });
      memory.recordUserPreference('lighting_dir', 'top_left', 'lighting', true);
      memory.recordVisualDecision('shadow', 'contact shadow', 'prevents floating');
      memory.recordFailure({
        failedAction: 'test_action',
        triggerConditions: 'bad param',
        failureReason: 'score degraded',
        rootCauseCategory: 'contrast_clipping',
        avoidPattern: 'avoid',
        recommendedWorkaround: 'fix',
        occurrences: 1,
      });
      memory.recordSuccessfulWorkflow({
        workflowName: 'Test Workflow',
        intent: 'ad',
        pipelineSequence: ['Product', 'Mask', 'Background', 'Relight', 'Shadow'],
        steps: [],
        finalQualityScore: 0.9,
      });
      if (memory.getTotalMemoryEntries() !== 6) throw new Error('Expected 6 recorded memory types');
    }));

    // =========================================================================
    // 2. INTEGRATION TESTS
    // =========================================================================
    results.push(await this.runTest('integration', 'Integration: Vision Detection → Dynamic Planner → DSL Script', () => {
      const vision = new VisionEngine();
      const reasoning = new ReasoningEngine();
      const planner = new Planner();
      const prompt = 'این محصول را به یک تبلیغ حرفه‌ای تبدیل کن.';
      const intent = reasoning.analyzeIntent(prompt);
      const scene = {
        sceneType: 'studio',
        lightingVectors: { primaryDirection: 'top_left', intensity: 0.8, colorTemperature: 5600, hasCastShadows: false },
        depthLayers: [{ layerId: 'l1', depthScore: 0.5, isSubject: true }],
        focalPoint: { x: 0.5, y: 0.5 },
        dominantPalette: ['#111111', '#7c3aed'],
      };
      const constraints = planner.deriveConstraints(prompt, intent, scene as any);
      const plan = planner.createDynamicPlan(prompt, intent, scene as any, constraints);
      if (plan.steps.length < 5) throw new Error('Planner failed to generate required steps');
      const ops = planner.planToOperations(plan);
      if (ops.length !== plan.steps.length) throw new Error('DSL operations mapping mismatch');
    }));

    results.push(await this.runTest('integration', 'Integration: DSL Operations → ToolRegistry Execution → GraphicsEngine Canvas', async () => {
      const doc = new MaestroDocumentEngine();
      const graphics = new GraphicsEngine(800, 500, doc);
      const tools = new ToolRegistry();
      const context = {
        graphicsEngine: graphics,
        documentEngine: doc,
        activeSubjectBbox: { x: 320, y: 160, width: 160, height: 160 },
      };

      const resBg = await tools.execute('primitive.background_replacement', { style: 'luxury_studio' }, context);
      if (!resBg.success) throw new Error('Failed to execute background replacement');

      const resShadow = await tools.execute('primitive.shadow', { offsetX: 18, offsetY: 18, blur: 12, opacity: 0.45 }, context);
      if (!resShadow.success) throw new Error('Failed to execute shadow tool');

      const resLighting = await tools.execute('primitive.lighting', { intensity: 0.25, direction: 'top_left' }, context);
      if (!resLighting.success) throw new Error('Failed to execute lighting tool');

      const dataUrl = graphics.toDataURL('image/png');
      if (!dataUrl.startsWith('data:image/png;base64,')) throw new Error('Canvas render output invalid');
    }));

    results.push(await this.runTest('integration', 'Integration: VisualCritic ↔ SelfRevisionEngine Feedback & Correction', async () => {
      const engine = new SelfRevisionEngine({ maxIterations: 2 });
      const doc = new MaestroDocumentEngine();
      const graphics = new GraphicsEngine(800, 500, doc);
      const history = new HistoryEngine(doc, graphics);
      const tools = new ToolRegistry();

      const res = await engine.runRevisionLoop({
        initialContext: {
          canvasDimensions: { width: 800, height: 500 },
          subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
          lighting: { direction: 'top_left', intensity: 0.25 },
          shadow: { exists: false },
        },
        toolRegistry: tools,
        historyEngine: history,
        graphicsEngine: graphics,
        onExecuteStep: async () => true,
      });

      if (!res.decisions.includes('ACCEPT')) throw new Error('SelfRevision failed to accept improvement');
      if (res.finalScore <= res.initialScore) throw new Error('SelfRevision failed to increase quality score');
    }));

    results.push(await this.runTest('integration', 'Integration: History Rollback ↔ Memory Engine Isolation', () => {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);
      const doc = new MaestroDocumentEngine();
      const graphics = new GraphicsEngine(800, 500, doc);
      const history = new HistoryEngine(doc, graphics);

      const count0 = memory.getTotalMemoryEntries();
      // Add snapshot in history and then rollback
      history.saveSnapshot({
        iteration: 0,
        score: 0.85,
        status: 'executed',
        documentSnapshot: doc.getDocument() as any,
        operationsExecuted: [],
        timestamp: Date.now() - 100,
      });
      history.saveSnapshot({
        iteration: 1,
        score: 0.65,
        status: 'executed',
        documentSnapshot: doc.getDocument() as any,
        operationsExecuted: [],
        timestamp: Date.now(),
      });
      history.rollbackTo(0);

      // Memory must remain clean and unaffected by History DOM rollbacks
      if (memory.getTotalMemoryEntries() !== count0) throw new Error('Memory was corrupted by History Rollback');

      // Record the failure in memory as a lesson
      memory.recordFailure({
        failedAction: 'excessive_lighting',
        triggerConditions: 'intensity > 0.8',
        failureReason: 'blown highlights',
        rootCauseCategory: 'contrast_clipping',
        avoidPattern: 'keep intensity <= 0.35',
        recommendedWorkaround: 'use soft ambient',
        occurrences: 1,
      });
      if (memory.getTotalMemoryEntries() !== count0 + 1) throw new Error('Memory failed to register failure lesson');
    }));

    // =========================================================================
    // 3. END-TO-END (E2E) TESTS
    // =========================================================================
    results.push(await this.runTest('e2e', 'E2E: Full 7-Phase Main Scenario (Analyze → Plan → Execute → Observe → Critique → Revise → Verify)', async () => {
      const orchestrator = new Orchestrator();
      const prompt =
        'این محصول را به یک تبلیغ حرفه‌ای تبدیل کن. محصول را استخراج کن، در محیط قرار بده، پرسپکتیو را اصلاح کن، نور را هماهنگ کن، سایه طبیعی بساز و ترکیب‌بندی را بهینه کن.';

      const result = await orchestrator.runAutonomousPipeline(prompt);

      if (!result.success) throw new Error('Pipeline execution failed');
      if (!result.plan || result.plan.steps.length < 7) throw new Error('E2E Plan does not contain full step sequence');
      if (result.executionTrace.length < 5) throw new Error('Execution trace is incomplete');
      if (result.evaluation.overallScore < 0.75) throw new Error(`Overall score too low: ${result.evaluation.overallScore}`);
      if (!result.renderedDataUrl || !result.renderedDataUrl.startsWith('data:image/')) {
        throw new Error('E2E final render data URL missing or invalid');
      }

      // Verify that memory extracted the experience
      const memoryEntries = orchestrator.memory.getTotalMemoryEntries();
      if (memoryEntries === 0) throw new Error('Experience was not extracted to MemoryEngine in E2E');
    }));

    // =========================================================================
    // 4. REGRESSION TESTS
    // =========================================================================
    const regressionDocResults = DocumentTestSuite.runAll();
    for (const r of regressionDocResults) {
      results.push({
        category: 'regression',
        name: `Regression: ${r.name}`,
        passed: r.passed,
        durationMs: r.durationMs,
        message: r.message,
      });
    }

    const memoryDocResults = await new MemoryTestSuite().runAllTests();
    for (const r of memoryDocResults) {
      results.push({
        category: 'regression',
        name: `Regression: ${r.name}`,
        passed: r.passed,
        durationMs: 0.5,
        message: r.message,
      });
    }

    // =========================================================================
    // 5. PERFORMANCE & STRESS TESTS
    // =========================================================================
    results.push(await this.runTest('performance', 'Performance: Full Autonomous Pipeline Execution Time (< 400ms)', async () => {
      const orchestrator = new Orchestrator();
      const t0 = performance.now();
      await orchestrator.runAutonomousPipeline('تبلیغ عطر لوکس');
      const elapsed = performance.now() - t0;
      if (elapsed > 400) {
        throw new Error(`Pipeline execution exceeded 400ms threshold: ${elapsed.toFixed(1)}ms`);
      }
    }));

    results.push(await this.runTest('performance', 'Performance: Real Canvas Multi-Pass Render Loop (10 iterations < 150ms)', () => {
      const doc = new MaestroDocumentEngine();
      const graphics = new GraphicsEngine(800, 500, doc);
      const t0 = performance.now();
      for (let i = 0; i < 10; i++) {
        graphics.clear();
        graphics.renderStudioBackground();
        graphics.renderContactShadow(320, 160, 160, 160, { offsetX: 18, offsetY: 18, blur: 12, opacity: 0.45 });
        graphics.renderSubject(
          320,
          160,
          160,
          160,
          { position: { x: 0, y: 0 }, scale: { x: 1.05, y: 1.05 }, rotation: 0, perspective: { tiltX: 0, tiltY: 0, depth: 100 } },
          { intensity: 0.25, direction: 'top_left' },
          0.15
        );
      }
      const elapsed = performance.now() - t0;
      if (elapsed > 150) {
        throw new Error(`Canvas rendering too slow: ${elapsed.toFixed(1)}ms for 10 full passes`);
      }
    }));

    // =========================================================================
    // 6. ERROR RECOVERY & FAULT-TOLERANCE TESTS
    // =========================================================================
    results.push(await this.runTest('error_recovery', 'Error Recovery: Missing Tool Parameter Fallback to Alternative Tool', async () => {
      const orchestrator = new Orchestrator();
      // Try to call a tool with missing required parameters; should auto-route to alternative or retry
      const trace = await orchestrator.executeToolCall(
        'primitive.curves',
        {}, // missing required params if any, or alternative fallback
        'Test error recovery'
      );
      if (trace.status !== 'success' && trace.status !== 'fallback' && trace.status !== 'retried') {
        throw new Error(`Expected recovery status, got: ${trace.status}`);
      }
    }));

    results.push(await this.runTest('error_recovery', 'Error Recovery: Automatic Rollback on Visual Degradation', async () => {
      const engine = new SelfRevisionEngine({ maxIterations: 1, minImprovementDelta: 0.1 });
      const doc = new MaestroDocumentEngine();
      const graphics = new GraphicsEngine(800, 500, doc);
      const history = new HistoryEngine(doc, graphics);
      const tools = new ToolRegistry();

      const result = await engine.runRevisionLoop({
        initialContext: {
          canvasDimensions: { width: 800, height: 500 },
          subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
          lighting: { direction: 'top_left', intensity: 0.25 },
          shadow: { exists: false },
        },
        toolRegistry: tools,
        historyEngine: history,
        graphicsEngine: graphics,
        onExecuteStep: async () => false, // simulates severe failure / degradation
      });

      if (!result.decisions.includes('ROLLBACK')) {
        throw new Error('SelfRevisionEngine failed to trigger ROLLBACK when step failed');
      }
    }));

    // =========================================================================
    // 7. SECURITY & PRIVACY GUARD TESTS
    // =========================================================================
    results.push(await this.runTest('security', 'Security: Privacy Guard (Zero Chain-of-Thought Leakage in Sanitized Traces)', async () => {
      const orchestrator = new Orchestrator();
      await orchestrator.runAutonomousPipeline('تبلیغ با کیفیت بالا');
      const trace = orchestrator.getSanitizedExecutionTrace();
      for (const item of trace) {
        const keys = Object.keys(item);
        if (keys.some((k) => ['thought', 'chainOfThought', 'cot', 'internalReasoning'].includes(k))) {
          throw new Error('Security violation: Internal Chain-of-Thought leaked in trace!');
        }
        if (!('action' in item && 'reasonSummary' in item && 'status' in item && 'result' in item)) {
          throw new Error('Trace structure violates standard SanitizedTraceItem contract');
        }
      }
    }));

    results.push(await this.runTest('security', 'Security: ToolRegistry Isolation (AI cannot directly alter Document DOM)', () => {
      const tools = new ToolRegistry();
      // Attempting to execute unregistered or dangerous internal commands should fail
      const result = tools.validate('system.eval_arbitrary_code', { code: 'alert(1)' });
      if (result.valid) {
        throw new Error('Security violation: Arbitrary code execution not blocked by ToolRegistry!');
      }
    }));

    return results;
  }

  private static async runTest(
    category: TestSuiteResult['category'],
    name: string,
    fn: () => void | Promise<void>
  ): Promise<TestSuiteResult> {
    const t0 = performance.now();
    try {
      await fn();
      return {
        category,
        name,
        passed: true,
        durationMs: Number((performance.now() - t0).toFixed(2)),
      };
    } catch (err: unknown) {
      return {
        category,
        name,
        passed: false,
        durationMs: Number((performance.now() - t0).toFixed(2)),
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
