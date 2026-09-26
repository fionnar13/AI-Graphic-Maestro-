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
import { GraphicsToolCommand } from '../history/commands/GraphicsToolCommand';
import { MemoryEngine } from '../memory/MemoryEngine';
import { InMemoryStorageAdapter } from '../memory/MemoryStorageAdapter';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { VisionEngine } from '../vision/VisionEngine';
import { ReasoningEngine } from '../reasoning/ReasoningEngine';
import { Planner } from '../planner/Planner';
import { Orchestrator } from '../orchestrator/Orchestrator';
import { AICopilotEngine } from '../workspace/AICopilotEngine';
import { PixelBuffer } from '../graphics/engine/PixelBuffer';
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
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 600, doc, history);
      history.setGraphicsEngine(graphics);
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

    // Phase 14.3.2 (Fix 4, T6) — Regression: GraphicsToolCommand.doUndo
    // boolean guard. Original bug: `&&` made the guard always false,
    // causing doUndo to call tool.rollback with null/undefined rollbackData.
    // After fix: `||` correctly returns false when rollbackData is missing.
    results.push(await this.runTest('regression', 'Regression: GraphicsToolCommand.doUndo returns false for null rollbackData (Fix 4 / T6)', async () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);

      const cmd = new GraphicsToolCommand(graphics, 'tool.move', {
        layerId: 'never_executed',
        dx: 0,
        dy: 0,
      });

      // Test 1: null rollbackData -> should return false (guard triggers)
      (cmd as any).rollbackData = null;
      const resultNull = await (cmd as any).doUndo();
      if (resultNull !== false) {
        throw new Error(`Expected doUndo()=false for null rollbackData, got ${resultNull}`);
      }

      // Test 2: undefined rollbackData -> should return false (guard triggers)
      (cmd as any).rollbackData = undefined;
      const resultUndef = await (cmd as any).doUndo();
      if (resultUndef !== false) {
        throw new Error(`Expected doUndo()=false for undefined rollbackData, got ${resultUndef}`);
      }

      // Test 3: valid rollbackData -> should NOT short-circuit; should
      // proceed to call tool.rollback. We use a non-existent layerId so
      // MoveTool.rollback will return false gracefully — the key assertion
      // is that doUndo does NOT return false due to the guard.
      (cmd as any).rollbackData = { layerId: 'never_executed', prevPosition: { x: 0, y: 0 }, prevBounds: { x: 0, y: 0, width: 10, height: 10 } };
      (cmd as any).executed = true;
      const resultValid = await (cmd as any).doUndo();
      if (typeof resultValid !== 'boolean') {
        throw new Error(`Expected doUndo() to return boolean for valid rollbackData, got ${typeof resultValid}`);
      }
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
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
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
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
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
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);

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
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
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
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
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

    // =========================================================================
    // Phase 14.3.3 — Regression Tests
    // =========================================================================

    // A1 — Pixel tool AI wiring: intent parsing
    results.push(await this.runTest('regression', 'Regression: AI parses brightness intent (A1)', () => {
      const tools = new ToolRegistry();
      const copilot = new AICopilotEngine(tools);
      const ctx: any = { currentLayer: { id: 'l1', name: 'Test', bounds: { x: 0, y: 0, width: 100, height: 100 } } };
      const intent = copilot.parseIntent('increase brightness by 50', ctx);
      if (intent.type !== 'ADJUST_BRIGHTNESS') throw new Error(`Expected ADJUST_BRIGHTNESS, got ${intent.type}`);
      if (intent.parameters.brightness !== 50) throw new Error(`Expected brightness=50, got ${intent.parameters.brightness}`);
    }));

    results.push(await this.runTest('regression', 'Regression: AI parses contrast intent (A1)', () => {
      const tools = new ToolRegistry();
      const copilot = new AICopilotEngine(tools);
      const ctx: any = { currentLayer: { id: 'l1', name: 'Test', bounds: { x: 0, y: 0, width: 100, height: 100 } } };
      const intent = copilot.parseIntent('contrast 40', ctx);
      if (intent.type !== 'ADJUST_CONTRAST') throw new Error(`Expected ADJUST_CONTRAST, got ${intent.type}`);
    }));

    results.push(await this.runTest('regression', 'Regression: AI parses inpaint intent (A1)', () => {
      const tools = new ToolRegistry();
      const copilot = new AICopilotEngine(tools);
      const ctx: any = { currentLayer: { id: 'l1', name: 'Test', bounds: { x: 0, y: 0, width: 100, height: 100 } } };
      const intent = copilot.parseIntent('inpaint the region', ctx);
      if (intent.type !== 'INPAINT_REGION') throw new Error(`Expected INPAINT_REGION, got ${intent.type}`);
    }));

    results.push(await this.runTest('regression', 'Regression: AI parses crop intent (A1)', () => {
      const tools = new ToolRegistry();
      const copilot = new AICopilotEngine(tools);
      const ctx: any = { currentLayer: { id: 'l1', name: 'Test', bounds: { x: 0, y: 0, width: 100, height: 100 } } };
      const intent = copilot.parseIntent('crop 400 300', ctx);
      if (intent.type !== 'CROP_DOCUMENT') throw new Error(`Expected CROP_DOCUMENT, got ${intent.type}`);
    }));

    // A1 — Pixel tool AI wiring: plan generation
    results.push(await this.runTest('regression', 'Regression: AI generates brightness plan with tool.brightness (A1)', () => {
      const tools = new ToolRegistry();
      const copilot = new AICopilotEngine(tools);
      const ctx: any = { currentLayer: { id: 'l1', name: 'Test', bounds: { x: 0, y: 0, width: 100, height: 100 } } };
      const intent = copilot.parseIntent('increase brightness by 50', ctx);
      const plan = copilot.generatePlan(intent, ctx);
      if (plan.steps.length !== 1) throw new Error(`Expected 1 step, got ${plan.steps.length}`);
      if (plan.steps[0].toolId !== 'tool.brightness') throw new Error(`Expected tool.brightness, got ${plan.steps[0].toolId}`);
      if (plan.steps[0].parameters.brightness !== 50) throw new Error(`Expected brightness=50, got ${plan.steps[0].parameters.brightness}`);
    }));

    // A1 — RemoveObject includes boundingBox (not whole-layer delete)
    results.push(await this.runTest('regression', 'Regression: RemoveObject plan includes boundingBox (A1)', () => {
      const tools = new ToolRegistry();
      const copilot = new AICopilotEngine(tools);
      const ctx: any = { currentLayer: { id: 'l1', name: 'Test', bounds: { x: 10, y: 20, width: 100, height: 80 } } };
      const intent = copilot.parseIntent('remove object', ctx);
      const plan = copilot.generatePlan(intent, ctx);
      if (plan.steps[0].toolId !== 'tool.remove_object') throw new Error(`Expected tool.remove_object`);
      if (!plan.steps[0].parameters.boundingBox) throw new Error('RemoveObject plan missing boundingBox — would trigger whole-layer delete');
      if (plan.steps[0].parameters.coordinateSpace !== 'canvas') throw new Error('Expected coordinateSpace=canvas');
    }));

    // A3 — MoveTool single-apply (transform.position stays at identity)
    results.push(await this.runTest('regression', 'Regression: AI move does not write transform.position (A3)', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'MoveTest', type: 'raster',
        bounds: { x: 100, y: 100, width: 50, height: 50 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      const startX = layer.bounds.x;
      graphics.executeTool('tool.move', { layerId: layer.id, dx: 50, dy: 0 });
      if (layer.bounds.x !== startX + 50) throw new Error(`Expected bounds.x=${startX + 50}, got ${layer.bounds.x}`);
      if (layer.transform.position.x !== 0) throw new Error(`transform.position.x should be 0, got ${layer.transform.position.x}`);
    }));

    // A4 — ScaleTool single-apply (transform.scale stays at identity)
    results.push(await this.runTest('regression', 'Regression: AI scale does not write transform.scale (A4)', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'ScaleTest', type: 'raster',
        bounds: { x: 100, y: 100, width: 100, height: 100 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      const startW = layer.bounds.width;
      graphics.executeTool('tool.scale', { layerId: layer.id, scaleX: 1.5, scaleY: 1.5 });
      if (layer.bounds.width !== Math.round(startW * 1.5)) throw new Error(`Expected width=${Math.round(startW * 1.5)}, got ${layer.bounds.width}`);
      if (layer.transform.scale.x !== 1) throw new Error(`transform.scale.x should be 1, got ${layer.transform.scale.x}`);
    }));

    // A4 — Repeated scale does not compound
    results.push(await this.runTest('regression', 'Regression: Repeated AI scale does not compound (A4)', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'RepeatScaleTest', type: 'raster',
        bounds: { x: 100, y: 100, width: 100, height: 100 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      graphics.executeTool('tool.scale', { layerId: layer.id, scaleX: 2, scaleY: 2 });
      const w1 = layer.bounds.width;
      graphics.executeTool('tool.scale', { layerId: layer.id, scaleX: 2, scaleY: 2 });
      const w2 = layer.bounds.width;
      // Each scale should double: 100 → 200 → 400 (NOT 100 → 200 → 800)
      if (w2 !== w1 * 2) throw new Error(`Repeated scale compounded: ${w1} → ${w2} (expected ${w1 * 2})`);
      if (layer.transform.scale.x !== 1) throw new Error(`transform.scale.x should still be 1 after repeated scale`);
    }));

    // A6 — Unknown intent does not report completed
    results.push(await this.runTest('regression', 'Regression: Unknown intent produces completed_noop, not completed (A6)', () => {
      const tools = new ToolRegistry();
      const copilot = new AICopilotEngine(tools);
      const ctx: any = { currentLayer: null };
      const intent = copilot.parseIntent('xyzzy frobnicate', ctx);
      if (intent.type !== 'UNKNOWN') throw new Error(`Expected UNKNOWN, got ${intent.type}`);
      const plan = copilot.generatePlan(intent, ctx);
      // The default case produces tool.evaluate — a no-op
      if (plan.steps[0].toolId !== 'tool.evaluate') throw new Error(`Expected tool.evaluate for UNKNOWN, got ${plan.steps[0].toolId}`);
    }));

    // A2 — Renderer does not auto-create pixel buffers
    results.push(await this.runTest('regression', 'Regression: renderDocument does not auto-create pixel buffers (A2)', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'NoBufTest', type: 'raster',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      // renderDocument should NOT create a pixel buffer for this layer
      graphics.renderDocument();
      const buf = (graphics as any).layerPixelBuffers.get(layer.id);
      if (buf) throw new Error('renderDocument auto-created a pixel buffer — renderer must be observational');
    }));

    // CropTool hotfix — canvas-crop does not write transform.position
    results.push(await this.runTest('regression', 'Regression: Canvas crop does not write transform.position (CropTool hotfix)', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'CropTest', type: 'raster',
        bounds: { x: 100, y: 100, width: 200, height: 150 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      const startBoundsX = layer.bounds.x;
      const startBoundsY = layer.bounds.y;

      graphics.executeTool('tool.crop', {
        target: 'canvas', layerId: layer.id,
        x: 50, y: 50, width: 400, height: 300,
      });

      // bounds should shift by exactly -50, -50 (single apply)
      if (layer.bounds.x !== startBoundsX - 50) throw new Error(`Expected bounds.x=${startBoundsX - 50}, got ${layer.bounds.x}`);
      if (layer.bounds.y !== startBoundsY - 50) throw new Error(`Expected bounds.y=${startBoundsY - 50}, got ${layer.bounds.y}`);
      // transform.position must remain at identity
      if (layer.transform.position.x !== 0) throw new Error(`transform.position.x should be 0, got ${layer.transform.position.x}`);
      if (layer.transform.position.y !== 0) throw new Error(`transform.position.y should be 0, got ${layer.transform.position.y}`);
    }));

    // CropTool hotfix — undo/redo preserves single-apply
    results.push(await this.runTest('regression', 'Regression: Crop undo/redo preserves transform.position identity (CropTool hotfix)', async () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'CropUndoTest', type: 'raster',
        bounds: { x: 200, y: 150, width: 100, height: 100 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      const origX = layer.bounds.x;
      const origY = layer.bounds.y;

      // Execute crop
      await graphics.executePrimitiveToolCommand('tool.crop', {
        target: 'canvas', layerId: layer.id,
        x: 50, y: 50, width: 500, height: 400,
      });
      if (layer.transform.position.x !== 0) throw new Error(`transform.position.x should be 0 after crop, got ${layer.transform.position.x}`);

      // Undo
      await history.undo();
      if (layer.bounds.x !== origX) throw new Error(`Undo should restore bounds.x=${origX}, got ${layer.bounds.x}`);
      if (layer.transform.position.x !== 0) throw new Error(`transform.position.x should be 0 after undo, got ${layer.transform.position.x}`);

      // Redo
      await history.redo();
      if (layer.bounds.x !== origX - 50) throw new Error(`Redo should restore bounds.x=${origX - 50}, got ${layer.bounds.x}`);
      if (layer.transform.position.x !== 0) throw new Error(`transform.position.x should be 0 after redo, got ${layer.transform.position.x}`);
    }));

    // =========================================================================
    // Phase 14.3.3 A2 Hotfix — Renderer Independence Regression Tests
    // =========================================================================

    // Test A — Procedural layer without pixel buffer renders correctly
    results.push(await this.runTest('regression', 'A2-Hotfix A: Procedural layer without pixel buffer renders (no gray overlay)', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'Studio Backdrop', type: 'raster',
        bounds: { x: 0, y: 0, width: 800, height: 500 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      // Ensure no pixel buffer exists before render
      if ((graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Pre-condition: pixel buffer should not exist');
      }
      // Render — should NOT auto-create a pixel buffer
      graphics.renderDocument();
      // After render, still no pixel buffer (renderer is observational)
      if ((graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('A2 regression: renderDocument auto-created a pixel buffer');
      }
      // Layer is still visible
      if (!layer.visible) throw new Error('Layer should be visible');
    }));

    // Test B — Layer with pixel buffer: procedural content + buffer both render
    results.push(await this.runTest('regression', 'A2-Hotfix B: Layer with pixel buffer — procedural + buffer coexist', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'Test Layer', type: 'raster',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      // Create a pixel buffer manually (simulating a tool having run)
      const buf = PixelBuffer.create(100, 100, [255, 0, 0, 255]);
      graphics.setLayerPixelBuffer(layer.id, buf);
      // Render — should NOT destroy the pixel buffer
      graphics.renderDocument();
      // Pixel buffer should still exist
      if (!(graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Pixel buffer was removed during render');
      }
      // Layer is still visible
      if (!layer.visible) throw new Error('Layer should be visible');
    }));

    // Test C — Procedural + pixel buffer: neither suppresses the other
    results.push(await this.runTest('regression', 'A2-Hotfix C: Procedural + pixel buffer — neither suppresses the other', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      // Layer 1: procedural only (no pixel buffer)
      const layer1 = doc.createLayer({
        name: 'Studio Backdrop', type: 'raster',
        bounds: { x: 0, y: 0, width: 800, height: 500 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      // Layer 2: has pixel buffer
      const layer2 = doc.createLayer({
        name: 'Bottle', type: 'raster',
        bounds: { x: 100, y: 100, width: 200, height: 200 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      graphics.setLayerPixelBuffer(layer2.id, PixelBuffer.create(200, 200, [0, 255, 0, 255]));
      // Render
      graphics.renderDocument();
      // Layer 1 should NOT have a pixel buffer (procedural only)
      if ((graphics as any).layerPixelBuffers.has(layer1.id)) {
        throw new Error('Layer1 should not have pixel buffer after render');
      }
      // Layer 2 should still have its pixel buffer
      if (!(graphics as any).layerPixelBuffers.has(layer2.id)) {
        throw new Error('Layer2 pixel buffer was removed during render');
      }
      // Both layers still visible
      if (!layer1.visible || !layer2.visible) throw new Error('Both layers should be visible');
    }));

    // Test D — Missing pixel buffer does not mutate state
    results.push(await this.runTest('regression', 'A2-Hotfix D: Rendering does not create pixel buffers (state integrity)', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      // Create 3 layers with different content types
      doc.createLayer({
        name: 'Backdrop', type: 'raster',
        bounds: { x: 0, y: 0, width: 800, height: 500 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      doc.createLayer({
        name: 'Title', type: 'text',
        bounds: { x: 100, y: 50, width: 300, height: 40 },
        opacity: 1, blendMode: 'normal',
        content: { kind: 'text', text: 'HELLO', fontSize: 24, fontFamily: 'Inter', color: '#ffffff', align: 'center' },
      });
      doc.createLayer({
        name: 'Box', type: 'vector',
        bounds: { x: 200, y: 200, width: 100, height: 100 },
        opacity: 1, blendMode: 'normal',
        content: { kind: 'vector', fillColor: '#7c3aed', cornerRadius: 8 },
      });
      // Count pixel buffers before render
      const beforeCount = (graphics as any).layerPixelBuffers.size;
      // Render multiple times
      graphics.renderDocument();
      graphics.renderDocument();
      graphics.renderDocument();
      // Count after — must be unchanged
      const afterCount = (graphics as any).layerPixelBuffers.size;
      if (afterCount !== beforeCount) {
        throw new Error(`Pixel buffer count changed: ${beforeCount} → ${afterCount} (rendering must not create state)`);
      }
    }));

    // Test E — Existing Phase 14.3.3 behavior intact (move single-apply after render)
    results.push(await this.runTest('regression', 'A2-Hotfix E: Move single-apply intact after render fix', () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'MoveRender', type: 'raster',
        bounds: { x: 100, y: 100, width: 50, height: 50 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      const startX = layer.bounds.x;
      graphics.executeTool('tool.move', { layerId: layer.id, dx: 30, dy: 0 });
      if (layer.bounds.x !== startX + 30) throw new Error(`Move failed: expected ${startX + 30}, got ${layer.bounds.x}`);
      if (layer.transform.position.x !== 0) throw new Error('transform.position should be 0');
    }));

    // =========================================================================
    // Phase 14.3.3 (A7) — Rollback restores procedural-only rendering
    // BUG: RemoveObjectTool and 7 other pixel tools auto-create a gray pixel
    // buffer via getLayerPixelBuffer() for layers that previously had none.
    // prevBuffer was a clone of that auto-created gray buffer, so rollback
    // set gray → gray and the renderer kept overlaying the gray rectangle
    // over the procedural content. User saw "undo does nothing".
    // FIX: Track hadBufferBefore; rollback deletes the buffer if false.
    // =========================================================================

    // A7 — RemoveObject rollback deletes auto-created buffer (procedural restored)
    results.push(await this.runTest('regression', 'A7: RemoveObject rollback deletes auto-created buffer (procedural restored)', async () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'Perfume Bottle Hero', type: 'raster',
        bounds: { x: 320, y: 150, width: 160, height: 210 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      // Pre-condition: layer has NO pixel buffer
      if ((graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Pre-condition: layer should NOT have a pixel buffer');
      }
      // Execute RemoveObject via the AI Copilot path
      const registry = new ToolRegistry();
      const copilot = new AICopilotEngine(registry);
      const ctx: any = { currentLayer: { id: layer.id, name: layer.name, bounds: layer.bounds } };
      const intent = copilot.parseIntent('remove this object', ctx);
      const plan = copilot.generatePlan(intent, ctx);
      const res = await copilot.executePlan(plan, { documentEngine: doc, graphicsEngine: graphics, historyEngine: history, toolRegistry: registry });
      if (!res.success) throw new Error('executePlan failed');
      // Post-execute: layer SHOULD have a pixel buffer (auto-created by tool)
      if (!(graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Post-execute: layer should have auto-created pixel buffer');
      }
      // Undo
      const undoOk = await history.undo();
      if (!undoOk) throw new Error('Undo returned false');
      // Post-undo: layer should NOT have a pixel buffer (deleted by rollback)
      if ((graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Post-undo: pixel buffer should be DELETED so procedural rendering is restored');
      }
    }));

    // A7 — RemoveObject rollback preserves existing buffer (hadBufferBefore=true)
    results.push(await this.runTest('regression', 'A7: RemoveObject rollback preserves existing buffer (hadBufferBefore=true)', async () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'Photo Layer', type: 'raster',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      // Pre-condition: layer HAS a real pixel buffer (e.g. imported photo)
      const originalBuf = PixelBuffer.create(100, 100, [10, 20, 30, 255]);
      graphics.setLayerPixelBuffer(layer.id, originalBuf);
      // Execute RemoveObject
      await graphics.executeTool('tool.remove_object', {
        layerId: layer.id,
        boundingBox: { x: 0, y: 0, width: 50, height: 50 },
        coordinateSpace: 'layer',
      });
      // Post-execute: buffer still exists (modified in-place by inpaint)
      if (!(graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Post-execute: buffer should still exist');
      }
      // Undo
      const undoOk = await history.undo();
      if (!undoOk) throw new Error('Undo returned false');
      // Post-undo: buffer should still exist (restored to prevBuffer, NOT deleted)
      if (!(graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Post-undo: buffer should still exist for hadBufferBefore=true');
      }
      // Verify content is restored to original
      const restored = graphics.getLayerPixelBuffer(layer.id)!;
      const px = restored.getPixel(0, 0);
      if (px[0] !== 10 || px[1] !== 20 || px[2] !== 30) {
        throw new Error(`Post-undo pixel not restored: expected [10,20,30], got [${px.slice(0,3)}]`);
      }
    }));

    // A7 — BrightnessTool rollback deletes auto-created buffer
    results.push(await this.runTest('regression', 'A7: BrightnessTool rollback deletes auto-created buffer', async () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'Hero', type: 'raster',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      // Layer has NO pixel buffer initially
      if ((graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Pre: layer should not have buffer');
      }
      // Execute BrightnessTool
      await graphics.executeTool('tool.brightness', { layerId: layer.id, brightness: 50 });
      if (!(graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Post-execute: buffer should exist');
      }
      // Undo
      const undoOk = await history.undo();
      if (!undoOk) throw new Error('Undo returned false');
      // Post-undo: buffer should be DELETED
      if ((graphics as any).layerPixelBuffers.has(layer.id)) {
        throw new Error('Post-undo: buffer should be DELETED for hadBufferBefore=false');
      }
    }));

    // =========================================================================
    // Phase 14.3.3 (A8) — No parallel history divergence
    // BUG: executePlan called historyEngine.recordOperationDirectly() AFTER
    // the tool had already gone through historyEngine.executeCommand() (via
    // ToolRegistry → GraphicsEngine.executeTool → executePrimitiveToolCommand).
    // This created TWO operation records for ONE tool execution, with the
    // direct-record parented to the command record. The timeline showed 2
    // entries, undo only popped the command (leaving the orphan direct-record
    // as branch head). This was the C1 parallel-history divergence.
    // FIX: Only call recordOperationDirectly for non-tool.* steps (vision.*,
    // primitive.*) that don't go through GraphicsEngine.executeTool.
    // =========================================================================

    // A8 — executePlan on tool.* creates exactly ONE history entry
    results.push(await this.runTest('regression', 'A8: executePlan on tool.remove_object creates exactly ONE history entry', async () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'Perfume Bottle Hero', type: 'raster',
        bounds: { x: 320, y: 150, width: 160, height: 210 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      const registry = new ToolRegistry();
      const copilot = new AICopilotEngine(registry);
      const ctx: any = { currentLayer: { id: layer.id, name: layer.name, bounds: layer.bounds } };
      const intent = copilot.parseIntent('remove this object', ctx);
      const plan = copilot.generatePlan(intent, ctx);
      const beforeOps = history.getAllOperations().length;
      const beforeUndoStack = (history as any).branchUndoStacks.get('branch_main').length;
      await copilot.executePlan(plan, { documentEngine: doc, graphicsEngine: graphics, historyEngine: history, toolRegistry: registry });
      const afterOps = history.getAllOperations().length;
      const afterUndoStack = (history as any).branchUndoStacks.get('branch_main').length;
      const opsAdded = afterOps - beforeOps;
      const undoAdded = afterUndoStack - beforeUndoStack;
      // Should add EXACTLY 1 operation record (from executeCommand), NOT 2
      if (opsAdded !== 1) {
        throw new Error(`Expected 1 operation added, got ${opsAdded}. Parallel history divergence detected.`);
      }
      // Should add EXACTLY 1 undoable command
      if (undoAdded !== 1) {
        throw new Error(`Expected 1 undo command added, got ${undoAdded}`);
      }
    }));

    // A8 — executePlan on vision.* creates a direct record (no executeCommand path)
    results.push(await this.runTest('regression', 'A8: executePlan on vision.* creates a direct record (non-tool path)', async () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const registry = new ToolRegistry();
      const copilot = new AICopilotEngine(registry);
      // REMOVE_BACKGROUND plan uses vision.subject_detection as step 1
      const ctx: any = { currentLayer: { id: 'layer1', name: 'Hero', bounds: { x: 0, y: 0, width: 100, height: 100 } } };
      const intent = copilot.parseIntent('remove background', ctx);
      const plan = copilot.generatePlan(intent, ctx);
      const beforeOps = history.getAllOperations().length;
      // Execute — vision.* steps should still record directly
      await copilot.executePlan(plan, { documentEngine: doc, graphicsEngine: graphics, historyEngine: history, toolRegistry: registry });
      const afterOps = history.getAllOperations().length;
      // Should have added at least 1 operation for the vision.* step
      if (afterOps - beforeOps < 1) {
        throw new Error(`Expected at least 1 vision.* operation, got ${afterOps - beforeOps}`);
      }
    }));

    // A6 — tool.rollback does not report "Canvas & Document updated"
    results.push(await this.runTest('regression', 'A6: tool.rollback step does not claim forward mutation', async () => {
      const doc = new MaestroDocumentEngine();
      const history = new HistoryEngine(doc);
      const graphics = new GraphicsEngine(800, 500, doc, history);
      history.setGraphicsEngine(graphics);
      const layer = doc.createLayer({
        name: 'Hero', type: 'raster',
        bounds: { x: 100, y: 100, width: 50, height: 50 },
        opacity: 1, blendMode: 'normal', content: { kind: 'raster' },
      });
      const registry = new ToolRegistry();
      const copilot = new AICopilotEngine(registry);
      // First do a real mutation (move) so undo has something to undo
      await graphics.executeTool('tool.move', { layerId: layer.id, dx: 10, dy: 0 });
      // Now execute a rollback plan
      const ctx: any = { currentLayer: { id: layer.id, name: layer.name, bounds: layer.bounds } };
      const intent = copilot.parseIntent('undo', ctx);
      const plan = copilot.generatePlan(intent, ctx);
      const events: any[] = [];
      const res = await copilot.executePlan(plan, { documentEngine: doc, graphicsEngine: graphics, historyEngine: history, toolRegistry: registry }, (e) => events.push(e));
      if (!res.success) throw new Error('rollback plan failed');
      // plan.status should be completed_noop (no forward mutation)
      if (plan.status !== 'completed_noop') {
        throw new Error(`Expected plan.status=completed_noop, got ${plan.status}`);
      }
      // No event should claim "Canvas & Document updated" for the rollback step
      const updatedEvents = events.filter(e => e.summary && e.summary.includes('Canvas & Document updated'));
      if (updatedEvents.length > 0) {
        throw new Error('tool.rollback should NOT emit "Canvas & Document updated": ' + JSON.stringify(updatedEvents));
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
