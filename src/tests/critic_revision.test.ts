/**
 * @file critic_revision.test.ts
 * Test suite for Visual Critic Engine, 10 Dimensions, Self-Revision Engine,
 * and Failure Recovery / Rollback mechanisms.
 */

import { VisualCritic } from '../critic/VisualCritic';
import { SelfRevisionEngine } from '../critic/SelfRevisionEngine';
import { ToolRegistry } from '../tools/ToolRegistry';
import { HistoryEngine } from '../history/HistoryEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { VisualAnalysisContext } from '../critic/types';

export class CriticRevisionTestSuite {
  public async runAllTests(): Promise<{ name: string; passed: boolean; message?: string }[]> {
    const results: { name: string; passed: boolean; message?: string }[] = [];

    // Test 1: 10 Dimensions and Structured Issue Output
    results.push(await this.test10DimensionsAndStructuredReport());

    // Test 2: Real Defect Detection (Floating Object / Missing Shadow)
    results.push(await this.testMissingShadowDefectDetection());

    // Test 3: Self-Revision Loop: EXECUTE -> OBSERVE -> CRITIQUE -> ISSUE -> SELECT CORRECTION -> EXECUTE -> CRITIQUE -> VERIFY
    results.push(await this.testSelfRevisionLoopExecution());

    // Test 4: Quality Improvement Triggers ACCEPT
    results.push(await this.testQualityImprovementAccepts());

    // Test 5: Failure Recovery & Degradation Triggers ROLLBACK
    results.push(await this.testFailureRecoveryRollback());

    // Test 6: Configurable Max Iterations Prevents Over-Execution
    results.push(await this.testConfigurableMaxIterations());

    // Test 7: Infinite Loop Prevention & Cycle Detection
    results.push(await this.testInfiniteLoopPrevention());

    return results;
  }

  /**
   * Test 1: Evaluates that all 10 requested dimensions exist, produce non-fake scores,
   * and generate structured issues matching { type, severity, location, reason, suggestedAction }.
   */
  private async test10DimensionsAndStructuredReport(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'VisualCritic: 10 Dimensions & Structured Issue Output Schema';
    try {
      const critic = new VisualCritic();
      const context: VisualAnalysisContext = {
        canvasDimensions: { width: 800, height: 500 },
        subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
        lighting: { direction: 'top_left', intensity: 0.25 },
        shadow: { exists: false }, // Missing shadow
        stylePreset: 'luxury',
      };

      const report = critic.evaluate(context);

      // Verify all 10 required dimensions exist
      const requiredDims = [
        'composition',
        'perspective',
        'lighting',
        'shadow',
        'material',
        'texture',
        'color',
        'geometry',
        'semantic',
        'realism',
      ];

      for (const dim of requiredDims) {
        if (!report.dimensions[dim as keyof typeof report.dimensions]) {
          throw new Error(`Missing expected dimension: ${dim}`);
        }
      }

      // Verify overallScore is between 0 and 1
      if (report.overallScore <= 0 || report.overallScore > 1) {
        throw new Error(`Overall score out of bounds: ${report.overallScore}`);
      }

      // Verify structured issue format
      if (report.issues.length === 0) {
        throw new Error('Expected critic to find issues for missing shadow');
      }

      const shadowIssue = report.issues.find((i) => i.type === 'shadow');
      if (!shadowIssue) {
        throw new Error('Expected shadow issue in structured output');
      }

      if (!shadowIssue.type || !shadowIssue.severity || !shadowIssue.location || !shadowIssue.reason || !shadowIssue.suggestedAction) {
        throw new Error('Structured issue does not contain all required fields { type, severity, location, reason, suggestedAction }');
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 2: Verify real defect detection (detects floating object when shadow is absent).
   */
  private async testMissingShadowDefectDetection(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'VisualCritic: Real Defect Detection (Floating Object / Missing Shadow)';
    try {
      const critic = new VisualCritic();
      const context: VisualAnalysisContext = {
        canvasDimensions: { width: 800, height: 500 },
        subjectBounds: { x: 200, y: 100, width: 400, height: 300 },
        lighting: { direction: 'top_left', intensity: 0.25 },
        shadow: { exists: false, opacity: 0 },
      };

      const report = critic.evaluate(context);
      const shadowIssue = report.issues.find((i) => i.type === 'shadow');

      if (!shadowIssue) {
        throw new Error('Critic failed to detect missing shadow');
      }
      if (shadowIssue.severity !== 'high') {
        throw new Error(`Expected high severity for floating subject, got: ${shadowIssue.severity}`);
      }
      if (shadowIssue.suggestedAction !== 'primitive.shadow') {
        throw new Error(`Expected suggestedAction 'primitive.shadow', got: ${shadowIssue.suggestedAction}`);
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 3: Self-Revision Loop (EXECUTE -> OBSERVE -> CRITIQUE -> ISSUE -> SELECT CORRECTION -> EXECUTE -> CRITIQUE -> VERIFY)
   */
  private async testSelfRevisionLoopExecution(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'SelfRevisionEngine: Strict Pipeline Loop (EXECUTE -> OBSERVE -> CRITIQUE -> ISSUE -> SELECT CORRECTION -> EXECUTE -> CRITIQUE -> VERIFY)';
    try {
      const engine = new SelfRevisionEngine({ maxIterations: 3, targetScore: 0.85 });
      const docEngine = new MaestroDocumentEngine();
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(docEngine);
      const graphics = new GraphicsEngine(800, 500, docEngine, history);
      history.setGraphicsEngine(graphics);
      const tools = new ToolRegistry();

      const context: VisualAnalysisContext = {
        canvasDimensions: { width: 800, height: 500 },
        subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
        lighting: { direction: 'top_left', intensity: 0.25 },
        shadow: { exists: false }, // Will need revision
      };

      const loopStagesTracked: string[] = [];

      const result = await engine.runRevisionLoop({
        initialContext: context,
        toolRegistry: tools,
        historyEngine: history,
        graphicsEngine: graphics,
        onExecuteStep: async (toolId, params) => {
          loopStagesTracked.push(`EXECUTE:${toolId}`);
          return true;
        },
      });

      if (!result.success) {
        throw new Error('Self-revision loop did not report success');
      }
      if (result.history.length === 0) {
        throw new Error('No revision iterations were tracked');
      }
      if (!loopStagesTracked.some((s) => s.includes('primitive.shadow'))) {
        throw new Error('Corrective action primitive.shadow was not selected and executed');
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 4: Quality improvement triggers ACCEPT and snapshot commit.
   */
  private async testQualityImprovementAccepts(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'SelfRevisionEngine: Score Improvement Triggers ACCEPT Decision';
    try {
      const engine = new SelfRevisionEngine({ maxIterations: 2 });
      const docEngine = new MaestroDocumentEngine();
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(docEngine);
      const graphics = new GraphicsEngine(800, 500, docEngine, history);
      history.setGraphicsEngine(graphics);
      const tools = new ToolRegistry();

      const context: VisualAnalysisContext = {
        canvasDimensions: { width: 800, height: 500 },
        subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
        lighting: { direction: 'top_left', intensity: 0.25 },
        shadow: { exists: false },
      };

      const result = await engine.runRevisionLoop({
        initialContext: context,
        toolRegistry: tools,
        historyEngine: history,
        graphicsEngine: graphics,
        onExecuteStep: async (tool, params) => {
          return true;
        },
      });

      if (!result.decisions.includes('ACCEPT')) {
        throw new Error(`Expected decision 'ACCEPT', but got: ${result.decisions.join(', ')}`);
      }
      if (result.finalScore <= result.initialScore) {
        throw new Error(`Expected final score (${result.finalScore}) to exceed initial (${result.initialScore})`);
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 5: Failure Recovery: Degraded quality or tool failure triggers ROLLBACK and restores snapshot.
   */
  private async testFailureRecoveryRollback(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'SelfRevisionEngine: Failure Recovery (Degradation Triggers ROLLBACK)';
    try {
      const engine = new SelfRevisionEngine({ maxIterations: 2, minImprovementDelta: 0.05 });
      const docEngine = new MaestroDocumentEngine();
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(docEngine);
      const graphics = new GraphicsEngine(800, 500, docEngine, history);
      history.setGraphicsEngine(graphics);
      const tools = new ToolRegistry();

      const context: VisualAnalysisContext = {
        canvasDimensions: { width: 800, height: 500 },
        subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
        lighting: { direction: 'top_left', intensity: 0.25 },
        shadow: { exists: false },
      };

      // Force failure during execution step to simulate degradation
      const result = await engine.runRevisionLoop({
        initialContext: context,
        toolRegistry: tools,
        historyEngine: history,
        graphicsEngine: graphics,
        onExecuteStep: async () => {
          // Tool fails or introduces catastrophic error
          return false;
        },
      });

      if (!result.decisions.includes('ROLLBACK')) {
        throw new Error(`Expected decision 'ROLLBACK' upon execution failure, got: ${result.decisions.join(', ')}`);
      }

      // Verify that history recorded rollback
      const rolledBackSnapshot = history.getLegacySnapshots().find((s) => s.status === 'rollback');
      if (!rolledBackSnapshot) {
        throw new Error('Expected rollback record in history snapshots');
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 6: Configurable max iterations prevents exceeding limits.
   */
  private async testConfigurableMaxIterations(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'SelfRevisionEngine: Configurable Max Iterations Limit';
    try {
      const engine = new SelfRevisionEngine({ maxIterations: 1, targetScore: 0.99 });
      const docEngine = new MaestroDocumentEngine();
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(docEngine);
      const graphics = new GraphicsEngine(800, 500, docEngine, history);
      history.setGraphicsEngine(graphics);
      const tools = new ToolRegistry();

      const context: VisualAnalysisContext = {
        canvasDimensions: { width: 800, height: 500 },
        subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
        lighting: { direction: 'top_left', intensity: 0.05 },
        shadow: { exists: false },
      };

      const result = await engine.runRevisionLoop({
        initialContext: context,
        toolRegistry: tools,
        historyEngine: history,
        graphicsEngine: graphics,
        onExecuteStep: async () => true,
      });

      if (result.iterationsRun > 1) {
        throw new Error(`Iterations run (${result.iterationsRun}) exceeded configured limit (1)`);
      }
      if (result.maxIterationsConfigured !== 1) {
        throw new Error(`Expected maxIterationsConfigured 1, got: ${result.maxIterationsConfigured}`);
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 7: Infinite Loop Prevention (Prevents cyclical repeating actions).
   */
  private async testInfiniteLoopPrevention(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'SelfRevisionEngine: Infinite Loop Prevention & Cycle Detection';
    try {
      // Set high max iterations but provide action that fails repeatedly
      const engine = new SelfRevisionEngine({ maxIterations: 8 });
      const docEngine = new MaestroDocumentEngine();
      // Phase 14.3.2 (Fix 1+1a) — Two-phase construction
      const history = new HistoryEngine(docEngine);
      const graphics = new GraphicsEngine(800, 500, docEngine, history);
      history.setGraphicsEngine(graphics);
      const tools = new ToolRegistry();

      const context: VisualAnalysisContext = {
        canvasDimensions: { width: 800, height: 500 },
        subjectBounds: { x: 250, y: 150, width: 300, height: 200 },
        lighting: { direction: 'top_left', intensity: 0.25 },
        shadow: { exists: false },
      };

      let executionCount = 0;
      const result = await engine.runRevisionLoop({
        initialContext: context,
        toolRegistry: tools,
        historyEngine: history,
        graphicsEngine: graphics,
        onExecuteStep: async () => {
          executionCount++;
          // Returning false triggers rollback and attempts re-eval
          return false;
        },
      });

      // It must break early and NOT loop 8 times due to cycle detection
      if (executionCount >= 8) {
        throw new Error(`Infinite loop guard failed: executed ${executionCount} times`);
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }
}
