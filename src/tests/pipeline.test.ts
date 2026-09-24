/**
 * @file pipeline.test.ts
 * Verification suite for AI Graphic Maestro modules.
 */

import { DocumentEngine } from '../document/DocumentEngine';
import { LayerEngine } from '../layers/LayerEngine';
import { GraphicDSL } from '../dsl/GraphicDSL';
import { CriticEngine } from '../critic/CriticEngine';
import { VisualCritic } from '../critic/VisualCritic';
import { SelfRevisionEngine } from '../critic/SelfRevisionEngine';
import { HistoryEngine } from '../history/HistoryEngine';
import { ToolRegistry } from '../tools/ToolRegistry';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { MemoryEngine } from '../memory/MemoryEngine';
import { InMemoryStorageAdapter } from '../memory/MemoryStorageAdapter';
import { DocumentTestSuite } from './document.test';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

export class MaestroTestSuite {
  public static runAll(): TestResult[] {
    const results: TestResult[] = [];

    // Include all Document Model & Layer Engine tests
    const docResults = DocumentTestSuite.runAll();
    results.push(...docResults);

    // Test 1: DocumentEngine
    results.push(this.runTest('DocumentEngine: Dimension & State Lifecycle', () => {
      const doc = new DocumentEngine({ dimensions: { width: 1920, height: 1080 } });
      const dims = doc.getDimensions();
      if (dims.width !== 1920 || dims.height !== 1080) throw new Error('Dimensions mismatch');

      doc.setDimensions(800, 600);
      if (doc.getDimensions().width !== 800) throw new Error('Update dimensions failed');

      const json = doc.exportJSON();
      const doc2 = new DocumentEngine();
      if (!doc2.loadFromJSON(json)) throw new Error('Load from JSON failed');
    }));

    // Test 2: LayerEngine
    results.push(this.runTest('LayerEngine: Layer Creation & Hierarchy', () => {
      const le = new LayerEngine();
      const layer1 = le.addLayer('Hero Product', 'image', 'root_layer');
      if (!le.getLayer(layer1.id)) throw new Error('Layer not found');

      le.setOpacity(layer1.id, 0.75);
      if (le.getLayer(layer1.id)?.properties.opacity !== 0.75) throw new Error('Opacity update failed');

      le.setBlendMode(layer1.id, 'overlay');
      if (le.getLayer(layer1.id)?.properties.blendMode !== 'overlay') throw new Error('Blend mode failed');
    }));

    // Test 3: GraphicDSL
    results.push(this.runTest('GraphicDSL: Parse & Serialize Instructions', () => {
      const dsl = new GraphicDSL();
      const script =
        'primitive.lighting (buffer perspective_corrected, intensity 0.25, direction top_left) -> relit // Relight product';
      const ops = dsl.parseScript(script);
      if (ops.length !== 1) throw new Error('Failed to parse single DSL line');
      if (ops[0].tool !== 'primitive.lighting') throw new Error('Tool name mismatch');
      if (ops[0].output !== 'relit') throw new Error('Output name mismatch');
      if (ops[0].params.intensity !== 0.25) throw new Error('Param intensity mismatch');
    }));

    // Test 4: CriticEngine
    results.push(this.runTest('CriticEngine: 10 Dimensions & Score Evaluation', () => {
      const critic = new CriticEngine();
      const evalResult = critic.evaluate(true, false);
      if (evalResult.scores.length !== 10) throw new Error('Expected 10 evaluation dimensions');
      if (evalResult.overallScore <= 0 || evalResult.overallScore > 1) {
        throw new Error('Score out of bounds');
      }
      if (evalResult.issues.length === 0) throw new Error('Expected critic issues');
    }));

    // Test 5: HistoryEngine
    results.push(this.runTest('HistoryEngine: Snapshot & Rollback State', () => {
      const history = new HistoryEngine();
      const doc = new DocumentEngine();

      history.saveSnapshot({
        iteration: 0,
        score: 0.815,
        status: 'executed',
        documentSnapshot: doc.getDocument(),
        operationsExecuted: [],
        timestamp: Date.now(),
      });

      history.saveSnapshot({
        iteration: 1,
        score: 0.815,
        status: 'rollback',
        documentSnapshot: doc.getDocument(),
        operationsExecuted: [],
        timestamp: Date.now(),
      });

      const rolledBack = history.rollbackTo(0);
      if (!rolledBack || rolledBack.iteration !== 0) throw new Error('Rollback failed');
    }));

    // Test 6: ToolRegistry
    results.push(this.runTest('ToolRegistry: Primitives & Vision Contracts', () => {
      const reg = new ToolRegistry();
      const all = reg.getAllTools();
      if (all.length < 10) throw new Error('Expected at least 10 registered tools');
      const shadowTool = reg.getTool('primitive.shadow');
      if (!shadowTool) throw new Error('primitive.shadow not registered');
      if (!shadowTool.isImplemented) throw new Error('primitive.shadow should be marked implemented');
    }));

    // Test 7: Dynamic Planner (Non-hardcoded)
    results.push(this.runTest('Planner: Dynamic Non-Hardcoded Planning', () => {
      const { Planner } = require('../planner/Planner');
      const planner = new Planner();
      const planLuxury = planner.createDynamicPlan('این محصول را برای یک تبلیغ لوکس آماده کن.');
      const planMinimal = planner.createDynamicPlan('یک بنر مینیمال با رنگ روشن بساز.');
      if (planLuxury.constraints.stylePreset !== 'luxury') throw new Error('Luxury style preset not detected');
      if (planMinimal.constraints.stylePreset !== 'minimalist') throw new Error('Minimalist style preset not detected');
      if (planLuxury.dslScript === planMinimal.dslScript) throw new Error('DSL scripts must be dynamic, not hardcoded');
      if (planLuxury.steps.length < 8) throw new Error('Plan should contain dynamic steps');
    }));

    // Test 8: ToolRegistry Execution & Schema Validation
    results.push(this.runTest('ToolRegistry: Controlled Access & Validation', () => {
      const reg = new ToolRegistry();
      const valid = reg.validate('tool.move', { layerId: 'l1', dx: 5, dy: 10 });
      if (!valid.valid) throw new Error('Valid params should pass');
      const invalid = reg.validate('tool.move', { layerId: 'l1' });
      if (invalid.valid) throw new Error('Missing params should fail validation');
    }));

    // Test 9: Orchestrator Privacy & CoT Stripping
    results.push(this.runTest('Orchestrator: Privacy Guard (No CoT Exposed)', () => {
      const { Orchestrator } = require('../orchestrator/Orchestrator');
      const orch = new Orchestrator();
      orch.runFullBenchmarkPipeline('این محصول را برای یک تبلیغ لوکس آماده کن.');
      const trace = orch.getSanitizedExecutionTrace();
      if (trace.length === 0) throw new Error('Execution trace should not be empty');
      for (const item of trace) {
        if (!('action' in item && 'reasonSummary' in item && 'status' in item && 'result' in item)) {
          throw new Error('Trace items must only contain action, reasonSummary, status, result');
        }
        if ('thought' in item || 'chainOfThought' in item || 'cot' in item) {
          throw new Error('Private chain-of-thought leaked into trace!');
        }
      }
    }));

    // Test 10: Orchestrator Full 12-Stage Pipeline
    results.push(this.runTest('Orchestrator: 12-Stage Autonomous Pipeline', () => {
      const { Orchestrator } = require('../orchestrator/Orchestrator');
      const orch = new Orchestrator();
      const fullStages = orch.getFullPipelineStages();
      if (fullStages.length !== 12) throw new Error(`Expected 12 pipeline stages, got ${fullStages.length}`);
      const stages = orch.getStages();
      if (stages.length < 7) throw new Error('UI stepper stages missing');
    }));

    // Test 11: VisualCritic: 10 Dimensions & Structured Issues
    results.push(this.runTest('VisualCritic: 10 Dimensions & Structured Output Schema', () => {
      const critic = new VisualCritic();
      const report = critic.evaluate({
        canvasDimensions: { width: 800, height: 500 },
        subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
        lighting: { direction: 'top_left', intensity: 0.25 },
        shadow: { exists: false },
      });

      const dims = ['composition', 'perspective', 'lighting', 'shadow', 'material', 'texture', 'color', 'geometry', 'semantic', 'realism'];
      for (const d of dims) {
        if (!report.dimensions[d as keyof typeof report.dimensions]) {
          throw new Error(`Missing dimension ${d}`);
        }
      }

      if (report.issues.length === 0) throw new Error('Expected structured issues for missing shadow');
      const shadowIssue = report.issues.find((i) => i.type === 'shadow');
      if (!shadowIssue || shadowIssue.severity !== 'high' || shadowIssue.suggestedAction !== 'primitive.shadow') {
        throw new Error('Expected shadow defect with suggestedAction primitive.shadow');
      }
    }));

    // Test 12: SelfRevisionEngine: Quality Improvement Triggers ACCEPT
    results.push(this.runTest('SelfRevisionEngine: Improvement Triggers ACCEPT', () => {
      const engine = new SelfRevisionEngine({ maxIterations: 2 });
      const docEngine = new MaestroDocumentEngine();
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(docEngine);
      const graphics = new GraphicsEngine(800, 500, docEngine, history);
      history.setGraphicsEngine(graphics);
      const tools = new ToolRegistry();

      const res = engine.runRevisionLoopSync({
        initialContext: {
          canvasDimensions: { width: 800, height: 500 },
          subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
          lighting: { direction: 'top_left', intensity: 0.25 },
          shadow: { exists: false },
        },
        toolRegistry: tools,
        historyEngine: history,
        graphicsEngine: graphics,
        onExecuteStep: () => true,
      });

      if (!res.decisions.includes('ACCEPT')) {
        throw new Error(`Expected ACCEPT, got ${res.decisions.join(', ')}`);
      }
      if (res.finalScore <= res.initialScore) {
        throw new Error('Expected finalScore > initialScore');
      }
    }));

    // Test 13: SelfRevisionEngine: Failure Recovery Triggers ROLLBACK
    results.push(this.runTest('SelfRevisionEngine: Failure Recovery Triggers ROLLBACK', () => {
      const engine = new SelfRevisionEngine({ maxIterations: 2, minImprovementDelta: 0.05 });
      const docEngine = new MaestroDocumentEngine();
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(docEngine);
      const graphics = new GraphicsEngine(800, 500, docEngine, history);
      history.setGraphicsEngine(graphics);
      const tools = new ToolRegistry();

      const res = engine.runRevisionLoopSync({
        initialContext: {
          canvasDimensions: { width: 800, height: 500 },
          subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
          lighting: { direction: 'top_left', intensity: 0.25 },
          shadow: { exists: false },
        },
        toolRegistry: tools,
        historyEngine: history,
        graphicsEngine: graphics,
        onExecuteStep: () => {
          // Tool fails or corrupts
          return false;
        },
      });

      if (!res.decisions.includes('ROLLBACK')) {
        throw new Error(`Expected ROLLBACK upon degradation, got: ${res.decisions.join(', ')}`);
      }
      const hasRollback = history.getLegacySnapshots().some((s) => s.status === 'rollback');
      if (!hasRollback) {
        throw new Error('Expected rollback snapshot recorded in HistoryEngine');
      }
    }));

    // Test 14: MemoryEngine: 6 Distinct Memory Categories & Workflow Experience Extraction
    results.push(this.runTest('MemoryEngine: 6 Memory Categories & Workflow Experience Extraction', () => {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);
      memory.clear();

      memory.recordProjectMemory('Brand Campaign 2026', { domain: 'branding', targetStyle: 'luxury' });
      memory.recordOperationMemory('primitive.shadow', { reliabilityScore: 0.95 });
      memory.recordUserPreference('lighting_direction', 'top_left', 'lighting', true);
      memory.recordVisualDecision('shadow', 'contact shadow', 'prevents floating');
      memory.recordFailure({
        failedAction: 'relight without mask',
        triggerConditions: 'Global relight',
        failureReason: 'Blown highlights',
        rootCauseCategory: 'missing_mask',
        avoidPattern: 'Do not relight whole composite without mask',
        recommendedWorkaround: 'Mask subject first',
        occurrences: 1,
      });
      const wf = memory.recordSuccessfulWorkflow({
        workflowName: 'Luxury Studio Product Composite',
        intent: 'e_commerce_ad',
        pipelineSequence: ['Product', 'Mask', 'Background', 'Relight', 'Shadow'],
        steps: [],
        finalQualityScore: 0.895,
      });

      const stats = memory.getStats();
      if (stats.totalEntries !== 6) throw new Error(`Expected 6 total entries, got ${stats.totalEntries}`);
      if (wf.data.pipelineSequence.join(' → ') !== 'Product → Mask → Background → Relight → Shadow') {
        throw new Error('Workflow sequence mismatch');
      }
    }));

    // Test 15: MemoryEngine: Strict Separation of History vs Memory
    results.push(this.runTest('MemoryEngine: Strict Separation (History = what happened vs Memory = lessons learned)', () => {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);
      const docEngine = new MaestroDocumentEngine();
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(docEngine);
      const graphics = new GraphicsEngine(800, 500, docEngine, history);
      history.setGraphicsEngine(graphics);

      const countBefore = memory.getTotalMemoryEntries();

      // History executes and then rolls back
      history.saveSnapshot({
        iteration: 1,
        score: 0.7,
        status: 'executed',
        documentSnapshot: docEngine.getDocument() as any,
        operationsExecuted: [],
        timestamp: Date.now(),
      });
      history.rollbackTo(0);

      // Memory retains all prior knowledge and records the failure lesson
      memory.recordFailure({
        failedAction: 'faulty_op',
        triggerConditions: 'bad param',
        failureReason: 'score degraded',
        rootCauseCategory: 'contrast_clipping',
        avoidPattern: 'avoid bad param',
        recommendedWorkaround: 'use safe param',
        occurrences: 1,
      });

      if (memory.getTotalMemoryEntries() !== countBefore + 1) {
        throw new Error('Memory was corrupted by History rollback');
      }
    }));

    // Test 16: MemoryEngine: Persistence, Querying, Editability & Deletability
    results.push(this.runTest('MemoryEngine: Persistence, Querying, Edit & Delete Lifecycle', () => {
      const adapter = new InMemoryStorageAdapter();
      const session1 = new MemoryEngine(adapter);
      session1.clear();

      const item = session1.recordUserPreference('shadow_blur', 12, 'shadow', true);
      session1.recordProjectMemory('Proj A', { targetStyle: 'minimal' });

      // Persistence reload check
      const session2 = new MemoryEngine(adapter);
      const reloaded = session2.get(item.id);
      if (!reloaded || reloaded.data.value !== 12) throw new Error('Persistence reload failed');

      // Query check
      const queried = session2.query({ type: 'user_preference' });
      if (queried.length !== 1) throw new Error('Query by type failed');

      // Edit check
      const updated = session2.update(item.id, {
        title: 'Updated Blur',
        data: { ...item.data, value: 18 },
      });
      if (!updated || updated.data.value !== 18) throw new Error('Update in-place failed');

      // Delete check
      const deleted = session2.delete(item.id);
      if (!deleted || session2.get(item.id) !== undefined) throw new Error('Delete failed');
    }));

    return results;
  }

  private static runTest(name: string, fn: () => void): TestResult {
    const t0 = performance.now();
    try {
      fn();
      return {
        name,
        passed: true,
        durationMs: Number((performance.now() - t0).toFixed(2)),
      };
    } catch (err: unknown) {
      return {
        name,
        passed: false,
        message: err instanceof Error ? err.message : String(err),
        durationMs: Number((performance.now() - t0).toFixed(2)),
      };
    }
  }
}
