/**
 * @file trace_a6_futuristic.ts
 * Runtime trace for "make design futuristic" — confirms A6 behavior.
 */
import { MaestroDocumentEngine } from '../src/document/MaestroDocumentEngine';
import { GraphicsEngine } from '../src/graphics/GraphicsEngine';
import { HistoryEngine } from '../src/history/HistoryEngine';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { AICopilotEngine } from '../src/workspace/AICopilotEngine';

function kv(k: string, v: unknown) {
  let val: string;
  if (v === undefined) val = 'undefined';
  else if (v === null) val = 'null';
  else if (typeof v === 'object') {
    try { val = JSON.stringify(v); } catch { val = String(v); }
    if (val.length > 400) val = val.slice(0, 400) + '…';
  } else val = String(v);
  console.log(`  ${k}: ${val}`);
}

const doc = new MaestroDocumentEngine();
const history = new HistoryEngine(doc);
const graphics = new GraphicsEngine(800, 500, doc, history);
history.setGraphicsEngine(graphics);
const registry = new ToolRegistry();
const copilot = new AICopilotEngine(registry);

// Pick a layer for context
const perfume = doc.getAllLayers().find(l => l.name === 'Perfume Bottle Hero')!;
graphics.setActiveLayer(perfume.id);

const ctx = copilot.buildContextSnapshot(doc, graphics, perfume.id);

console.log('=== STEP 1: parseIntent("make design futuristic") ===');
const intent = copilot.parseIntent('make design futuristic', ctx);
kv('intent.type', intent.type);
kv('intent.target', intent.target);
kv('intent.parameters', intent.parameters);
kv('intent.isRisky', intent.isRisky);
kv('intent.title', intent.title);

console.log('\n=== STEP 2: generatePlan ===');
const plan = copilot.generatePlan(intent, ctx);
kv('plan.id', plan.id);
kv('plan.status (initial)', plan.status);
kv('plan.isRisky', plan.isRisky);
kv('plan.steps.length', plan.steps.length);
for (const s of plan.steps) {
  kv(`  step ${s.order}: ${s.title}`, {
    id: s.id,
    toolId: s.toolId,
    parameters: s.parameters,
    status: s.status,
  });
}

console.log('\n=== STEP 3: executePlan ===');
const activities: any[] = [];
const res = await copilot.executePlan(
  plan,
  { documentEngine: doc, graphicsEngine: graphics, historyEngine: history, toolRegistry: registry },
  (e) => activities.push(e)
);
kv('execResult.success', res.success);
kv('execResult.executedSteps', res.executedSteps);
kv('execResult.error', res.error);
kv('plan.status (FINAL)', plan.status);
kv('plan.completedAt', plan.completedAt);

console.log('\n=== STEP 4: Activities emitted ===');
kv('activities.length', activities.length);
for (const a of activities) {
  kv(`  ${a.id.slice(-12)}`, { phase: a.phase, toolId: a.toolId, status: a.status, summary: a.summary });
}

console.log('\n=== STEP 5: A6 contract check ===');
const planStatusIsNoop = plan.status === 'completed_noop';
const hasFalseSuccessMessage = activities.some(a => a.summary && a.summary.includes('Canvas & Document updated'));
kv('plan.status === "completed_noop"', planStatusIsNoop);
kv('Has false "Canvas & Document updated" message', hasFalseSuccessMessage);
if (planStatusIsNoop && !hasFalseSuccessMessage) {
  console.log('\n✓ A6 CONTRACT SATISFIED');
} else {
  console.log('\n✗ A6 CONTRACT VIOLATED');
}
