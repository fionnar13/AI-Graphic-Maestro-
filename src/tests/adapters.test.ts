/**
 * @file adapters.test.ts
 * Comprehensive Verification Test Suite for Model-Agnostic AI Adapter Architecture.
 */

import {
  ModelCategory,
  ModelStatus,
  ModelAdapterRegistry,
  GenericReasoningAdapter,
  GenericVisionAdapter,
  GenericImageAdapter,
  ToolDefinition,
} from '../adapters';

async function runAdapterTests() {
  console.log('===============================================================');
  console.log('       AI MODEL ADAPTER ARCHITECTURE - TEST SUITE              ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. Core Model Lifecycle & Common Capabilities
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Core Model Lifecycle & Universal Capabilities ---');

  const reasoningAdapter = new GenericReasoningAdapter({
    id: 'test-reasoning-deepseek',
    name: 'DeepSeek-R1 Reasoning Adapter',
    provider: 'deepseek',
    modelId: 'deepseek-reasoner',
    category: ModelCategory.REASONING,
    temperature: 0.1,
    maxTokens: 8192,
  });

  assert(reasoningAdapter.category === ModelCategory.REASONING, 'Model has correct category (REASONING)');
  assert(reasoningAdapter.status === ModelStatus.DISCONNECTED, 'Initial status is DISCONNECTED');

  const connected = await reasoningAdapter.connect();
  assert(connected && reasoningAdapter.status === ModelStatus.CONNECTED, 'Adapter connects successfully (connect)');

  const caps = reasoningAdapter.capabilities();
  assert(
    caps.supportsStructuredOutput && caps.supportsToolCalling && caps.maxContextTokens === 8192,
    'Adapter reports capabilities matrix (capabilities)'
  );

  const health = await reasoningAdapter.health();
  assert(health.healthy && health.status === ModelStatus.CONNECTED, 'Health check returns operational status (health)');

  const response = await reasoningAdapter.request<{ query: string }, { text: string }>({
    id: 'req_1',
    input: { query: 'optimize banner layout' },
    prompt: 'Optimize commercial banner layout',
  });
  assert(response.requestId === 'req_1' && typeof response.output === 'object', 'Adapter handles generic request (request)');

  const structured = await reasoningAdapter.structuredOutput<{ status: string }>(
    'Summarize constraints',
    { type: 'object', properties: { status: { type: 'string' } } }
  );
  assert(structured.status === 'success', 'Adapter produces schema-compliant structured output (structuredOutput)');

  const tools: ToolDefinition[] = [
    {
      name: 'curves_adjustment',
      description: 'Adjust contrast via monotonic cubic spline curve',
      parameters: { type: 'object', properties: { amount: { type: 'number' } } },
    },
  ];
  const toolCallResult = await reasoningAdapter.toolCalling('Adjust contrast for hero layer', tools);
  assert(
    toolCallResult.toolCalls.length > 0 && toolCallResult.toolCalls[0].name === 'curves_adjustment',
    'Adapter executes tool calling (toolCalling)'
  );

  await reasoningAdapter.disconnect();
  assert(reasoningAdapter.status === ModelStatus.DISCONNECTED, 'Adapter disconnects cleanly (disconnect)');

  // --------------------------------------------------------------------------
  // 2. Reasoning Model Responsibilities
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Reasoning Model Responsibilities ---');
  await reasoningAdapter.connect();

  // A. Intent
  const intent = await reasoningAdapter.analyzeIntent('Remove background and harmonize lighting on watch product');
  assert(
    intent.primaryIntent.length > 0 && intent.confidence >= 0.9,
    'Reasoning: Intent analysis extracts intent, constraints & goals'
  );

  // B. Planning
  const plan = await reasoningAdapter.generatePlan(intent);
  assert(plan.steps.length >= 3 && plan.steps[0].dependencies.length === 0, 'Reasoning: Plan generation creates ordered steps with dependencies');

  // C. Tool Selection
  const toolSelect = await reasoningAdapter.selectTools(plan.steps[0], tools);
  assert(toolSelect.selectedTool.length > 0 && toolSelect.confidence > 0.8, 'Reasoning: Tool selection chooses appropriate tool');

  // D. Reasoning
  const reasoning = await reasoningAdapter.reason('Determine layer stacking order for shadow compositing');
  assert(reasoning.thoughtChain.length >= 3 && reasoning.conclusion.length > 0, 'Reasoning: Multi-step thought chain reasoning');

  // E. High-level Critique
  const critique = await reasoningAdapter.evaluateCritique({}, [
    { dimension: 'contrast', weight: 0.4 },
    { dimension: 'color_harmony', weight: 0.6 },
  ]);
  assert(
    critique.passesQualityGate && critique.overallScore > 0.8 && critique.strengths.length > 0,
    'Reasoning: High-level multi-dimensional critique evaluation'
  );

  // --------------------------------------------------------------------------
  // 3. Vision Model Responsibilities
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Vision Model Responsibilities ---');

  const visionAdapter = new GenericVisionAdapter({
    id: 'test-vision-gpt4o',
    name: 'GPT-4o Vision Adapter',
    provider: 'gpt',
    modelId: 'gpt-4o',
    category: ModelCategory.VISION,
  });
  await visionAdapter.connect();

  const dummyImage = {
    mimeType: 'image/png',
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  };

  // A. Visual Understanding
  const understanding = await visionAdapter.understandImage(dummyImage, 'Describe product context');
  assert(
    understanding.elements.length > 0 && understanding.colorPalette.length > 0,
    'Vision: Visual understanding extracts elements, palette, and spatial layout'
  );

  // B. Detection
  const detection = await visionAdapter.detectObjects(dummyImage, ['watch', 'shadow']);
  assert(detection.objects.length >= 2 && detection.dominantObject !== undefined, 'Vision: Object detection identifies bounded objects');

  // C. Segmentation
  const segmentation = await visionAdapter.segmentObjects(dummyImage, ['watch']);
  assert(segmentation.masks.length > 0 && segmentation.masks[0].maskDataUrl !== undefined, 'Vision: Segmentation generates precise target masks');

  // D. Scene Understanding
  const scene = await visionAdapter.analyzeScene(dummyImage);
  assert(
    scene.sceneType.length > 0 && scene.lighting.temperature !== undefined,
    'Vision: Scene understanding identifies lighting vectors, focal point, and depth'
  );

  // --------------------------------------------------------------------------
  // 4. Image Generation & Edit Model Responsibilities
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Image Generation / Edit Model Responsibilities ---');

  const imageAdapter = new GenericImageAdapter({
    id: 'test-image-flux',
    name: 'Flux Image Adapter',
    provider: 'custom',
    modelId: 'flux-schnell',
    category: ModelCategory.IMAGE,
  });
  await imageAdapter.connect();

  // A. Generation
  const generated = await imageAdapter.generateImage('Minimalist luxury podium with soft volumetric light', {
    width: 1024,
    height: 1024,
  });
  assert(generated.dataUrl.length > 0 && generated.width === 1024, 'Image Model: Generation produces image result');

  // B. Inpainting
  const inpainted = await imageAdapter.inpaint(dummyImage, dummyImage, 'Fill with smooth marble texture');
  assert(inpainted.metadata?.operation === 'inpainting', 'Image Model: Inpainting reconstructs masked area');

  // C. Image Editing
  const edited = await imageAdapter.editImage(dummyImage, 'Adjust studio lighting to cool neon accent');
  assert(edited.metadata?.operation === 'image_edit', 'Image Model: Edit image applies instruction transforms');

  // D. Reconstruction
  const reconstructed = await imageAdapter.reconstruct(dummyImage, { mode: 'super_resolution', upscaleFactor: 2 });
  assert(reconstructed.metadata?.operation === 'reconstruction', 'Image Model: Reconstruction handles repair & upscaling');

  // --------------------------------------------------------------------------
  // 5. Model-Agnostic Registry & Dynamic Switching
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Model-Agnostic Registry & Provider Switching ---');

  const registry = ModelAdapterRegistry.getInstance();
  assert(registry.getAdapters().length >= 3, 'Registry initializes with default model adapters');

  // Register custom arbitrary providers without hardcoded constraints:
  // e.g. Qwen, Llama, Gemini, Local
  const customQwen = registry.createAdapter({
    id: 'qwen-coder-local',
    name: 'Qwen 2.5 72B Local',
    provider: 'qwen',
    modelId: 'qwen2.5-72b-instruct',
    category: ModelCategory.REASONING,
    endpoint: 'http://localhost:11434/api/generate',
  });
  registry.registerAdapter(customQwen);

  assert(registry.getAdapter('qwen-coder-local') !== undefined, 'Registered dynamic model adapter (Qwen)');

  const switched = await registry.setActiveModel(ModelCategory.REASONING, 'qwen-coder-local');
  assert(switched, 'Dynamically switched active Reasoning model to custom provider');
  assert(registry.getActiveReasoningModel().id === 'qwen-coder-local', 'Active reasoning model reflects dynamic switch');

  const healthMap = await registry.checkAllHealth();
  assert(Object.keys(healthMap).length >= 4, 'Registry performs multi-model health monitoring');

  console.log('===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

void runAdapterTests();
