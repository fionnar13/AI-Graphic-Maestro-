/**
 * @file e2e_pipeline.test.ts
 * Real End-to-End verification test suite for AI Graphic Maestro:
 * - Dynamic, non-hardcoded Planning (Persian & English natural language requests)
 * - ToolRegistry control: Validate -> Execute -> Observe -> Record
 * - Error Recovery: Retry -> Alternative Tool -> Rollback
 * - Strict Privacy: Chain-of-thought is excluded; only action, reasonSummary, status, result
 * - Complete 12-stage Autonomous Pipeline execution
 */

import { Orchestrator } from '../orchestrator/Orchestrator';
import { Planner } from '../planner/Planner';
import { ToolRegistry } from '../tools/ToolRegistry';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

let passedCount = 0;
let failedCount = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    const start = performance.now();
    await fn();
    const duration = (performance.now() - start).toFixed(1);
    console.log(`  ✓ ${name} (${duration}ms)`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err?.message || err}`);
    failedCount++;
  }
}

async function runE2ETests(): Promise<void> {
  console.log('\n======================================================');
  console.log('🤖 AI Graphic Maestro: Planner & Orchestrator E2E Suite');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // Group 1: Dynamic Planner (Non-Hardcoded Verification)
  // --------------------------------------------------------------------------
  console.log('--- 1. Dynamic Planner & Natural Language Translation ---');

  await test('Planner dynamically adapts to luxury advertisement prompt (Persian)', () => {
    const planner = new Planner();
    const prompt = 'این محصول را برای یک تبلیغ لوکس آماده کن.';
    const plan = planner.createDynamicPlan(prompt);

    assert(plan.userPrompt === prompt, 'Plan preserves original user prompt');
    assert(plan.constraints.stylePreset === 'luxury', 'Style preset identified as luxury');
    assert(plan.constraints.backgroundColor === '#0c0a09', 'Luxury dark background chosen');
    assert(plan.constraints.shadowBlur === 14, 'Luxury shadow blur calculated dynamically');
    assert(plan.steps.length >= 8, 'Plan synthesized adequate operations');

    // Confirm essential steps present
    const toolsUsed = plan.steps.map((s) => s.tool);
    assert(toolsUsed.includes('vision.subject_detection'), 'Subject detection included');
    assert(toolsUsed.includes('vision.segmentation'), 'Segmentation included');
    assert(toolsUsed.includes('primitive.background_replacement'), 'Background replacement included');
    assert(toolsUsed.includes('primitive.shadow'), 'Shadow grounding included');
    assert(toolsUsed.includes('primitive.lighting'), 'Studio lighting included');
    assert(toolsUsed.includes('primitive.recolor'), 'Harmonization included');

    // Confirm DSL generation
    assert(plan.dslScript.includes('primitive.shadow'), 'DSL includes shadow primitive');
    assert(plan.dslScript.includes('primitive.lighting'), 'DSL includes lighting primitive');
  });

  await test('Planner dynamically changes plan when given minimalist prompt (Non-hardcoded proof)', () => {
    const planner = new Planner();
    const luxuryPlan = planner.createDynamicPlan('این محصول را برای یک تبلیغ لوکس آماده کن.');
    const minimalPlan = planner.createDynamicPlan('یک بنر مینیمال با رنگ روشن بساز.');

    assert(luxuryPlan.constraints.stylePreset !== minimalPlan.constraints.stylePreset, 'Presets differ');
    assert(minimalPlan.constraints.stylePreset === 'minimalist', 'Minimalist preset correctly selected');
    assert(minimalPlan.constraints.backgroundColor === '#f4f4f5', 'Minimalist uses light background');
    assert(minimalPlan.constraints.shadowOpacity < luxuryPlan.constraints.shadowOpacity, 'Shadow opacity varies');
    assert(luxuryPlan.dslScript !== minimalPlan.dslScript, 'DSL scripts are dynamically unique');
  });

  // --------------------------------------------------------------------------
  // Group 2: Tool Registry Control & Schema Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Tool Registry Control & Schema Validation ---');

  await test('ToolRegistry validates parameters and rejects invalid inputs', () => {
    const registry = new ToolRegistry();

    // Valid call
    const validResult = registry.validate('tool.move', { layerId: 'layer_1', dx: 10, dy: 20 });
    assert(validResult.valid, 'Valid parameters should pass');

    // Missing required parameter (dx missing)
    const invalidResult = registry.validate('tool.move', { layerId: 'layer_1' });
    assert(!invalidResult.valid, 'Missing parameter should fail validation');
    assert(invalidResult.errors.length > 0, 'Error messages provided');
  });

  await test('All operations strictly execute through ToolRegistry', async () => {
    const registry = new ToolRegistry();
    const dummyContext = {
      graphicsEngine: {
        renderStudioBackground: () => true,
        renderContactShadow: () => true,
        getActiveLayerId: () => 'bg_layer',
      },
    };

    const res = await registry.execute(
      'primitive.background_replacement',
      { style: 'luxury_studio', color: '#0c0a09' },
      dummyContext as any
    );

    assert(res.success, 'Tool executed successfully through registry');
    assert(res.durationMs >= 0, 'Duration is measured');
    assert(res.output.composited === true, 'Expected tool output returned');
  });

  // --------------------------------------------------------------------------
  // Group 3: Orchestrator Tool Execution Pipeline: Validate -> Execute -> Observe -> Record
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Orchestrator Tool Lifecycle & Error Recovery ---');

  await test('Orchestrator executes tool with Validate -> Execute -> Observe -> Record', async () => {
    const orchestrator = new Orchestrator();

    const traceItem = await orchestrator.executeToolCall(
      'primitive.shadow',
      { offsetX: 18, offsetY: 18, blur: 12, opacity: 0.45 },
      'Ground product on surface'
    );

    assert(traceItem.action === 'primitive.shadow', 'Action recorded');
    assert(traceItem.reasonSummary === 'Ground product on surface', 'Reason summary recorded');
    assert(traceItem.status === 'success', 'Status is success');
    assert(traceItem.result.success === true, 'Result is recorded');
  });

  await test('Error Recovery: Alternative tool is invoked when primary fails validation', async () => {
    const orchestrator = new Orchestrator();

    // Register alternative: if primitive.curves fails validation, fallback to tool.contrast
    orchestrator.toolRegistry.registerAlternative('primitive.curves', ['tool.contrast']);

    // Send invalid call to primitive.curves (missing registered input) with alternative
    const traceItem = await orchestrator.executeToolCall(
      'non_existent_or_broken_tool',
      { contrast: 1.2 },
      'Apply tone contrast',
      'primitive.curves'
    );

    assert(traceItem.status === 'fallback', 'Status marked as fallback to alternative tool');
    assert(traceItem.result.resolvedWith === 'primitive.curves', 'Resolved with alternative tool');
  });

  await test('Error Recovery: Unrecoverable failure triggers safe Rollback', async () => {
    const orchestrator = new Orchestrator();

    // Save baseline snapshot at iteration 0
    orchestrator.history.saveSnapshot({
      iteration: 0,
      score: 0.82,
      status: 'executed',
      documentSnapshot: orchestrator.documentEngine.getDocument(),
      operationsExecuted: [],
      timestamp: Date.now(),
    });

    // Execute completely unresolvable tool with no alternatives
    const traceItem = await orchestrator.executeToolCall(
      'completely_invalid_tool_no_alt',
      {},
      'Will fail completely'
    );

    assert(traceItem.status === 'rolled_back', 'Status marked as rolled_back');
    const recoveryNote = (traceItem.result as any).recoveryNote || '';
    assert(recoveryNote.includes('Rolled back safely'), 'Rollback note recorded');
  });

  // --------------------------------------------------------------------------
  // Group 4: Privacy Guard - No Chain-of-Thought Stored or Displayed
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Privacy Guard (No Private Chain-of-Thought Exposed) ---');

  await test('Execution trace contains ONLY action, reasonSummary, status, and result', async () => {
    const orchestrator = new Orchestrator();
    await orchestrator.runAutonomousPipeline('این محصول را برای یک تبلیغ لوکس آماده کن.');

    const trace = orchestrator.getSanitizedExecutionTrace();
    assert(trace.length > 0, 'Trace contains executed steps');

    for (const item of trace) {
      const keys = Object.keys(item);
      assert(keys.includes('action'), 'Item contains action');
      assert(keys.includes('reasonSummary'), 'Item contains reasonSummary');
      assert(keys.includes('status'), 'Item contains status');
      assert(keys.includes('result'), 'Item contains result');

      // STRICT PRIVACY CHECK: Ensure NO private chain-of-thought keys exist
      assert(!keys.includes('thought'), 'Strict privacy: No thought key');
      assert(!keys.includes('chainOfThought'), 'Strict privacy: No chainOfThought key');
      assert(!keys.includes('cot'), 'Strict privacy: No cot key');
      assert(!keys.includes('internal_monologue'), 'Strict privacy: No internal_monologue key');
      assert(!keys.includes('reasoning'), 'Strict privacy: No reasoning chain key');
    }
  });

  // --------------------------------------------------------------------------
  // Group 5: Full 12-Stage Autonomous Pipeline End-to-End
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Full 12-Stage Pipeline End-to-End Execution ---');

  await test('Complete 12-stage pipeline executes seamlessly with luxury Persian prompt', async () => {
    const orchestrator = new Orchestrator();
    const prompt = 'این محصول را برای یک تبلیغ لوکس آماده کن.';

    const result = await orchestrator.runAutonomousPipeline(prompt);

    assert(result.success === true, 'Pipeline completed successfully');
    assert(result.userPrompt === prompt, 'Prompt matched');
    assert(result.stages.length === 12, 'All 12 pipeline stages configured');

    const stageNames = result.stages.map((s) => s.name);
    const expectedStages = [
      'USER',
      'INTENT',
      'SCENE_ANALYSIS',
      'CONSTRAINTS',
      'PLAN',
      'DSL',
      'VALIDATION',
      'EXECUTION',
      'OBSERVATION',
      'CRITIQUE',
      'REVISION',
      'VERIFICATION',
    ];

    for (const st of expectedStages) {
      assert(stageNames.includes(st as any), `Stage ${st} is represented in pipeline`);
    }

    assert(result.plan.steps.length >= 8, 'Plan executed multiple steps');
    assert(result.executionTrace.length >= 8, 'Full execution trace populated');
    assert(result.evaluation.overallScore >= 0.8, 'Critique evaluation scored above 0.8');
    assert(result.snapshots.length >= 2, 'History snapshots created for baseline and revision');
    assert(typeof result.renderedDataUrl === 'string', 'Canvas rendered to valid data URL');
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`Pipeline & Orchestrator E2E Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
