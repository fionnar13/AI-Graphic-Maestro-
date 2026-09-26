/**
 * @file trace_remove_object.ts
 * Runtime trace for "remove this object" — instruments every layer
 * of the AI Copilot → ToolRegistry → GraphicsEngine → HistoryEngine
 * pipeline to find where the chain breaks.
 *
 * Run: npx tsx scripts/trace_remove_object.ts
 */

import { MaestroDocumentEngine } from '../src/document/MaestroDocumentEngine';
import { GraphicsEngine } from '../src/graphics/GraphicsEngine';
import { HistoryEngine } from '../src/history/HistoryEngine';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { AICopilotEngine } from '../src/workspace/AICopilotEngine';

// ---------- Helpers ----------
function banner(s: string) {
  console.log('\n' + '='.repeat(72));
  console.log(s);
  console.log('='.repeat(72));
}
function step(s: string) {
  console.log('\n--- ' + s + ' ---');
}
function kv(k: string, v: unknown) {
  let val: string;
  if (v === undefined) val = 'undefined';
  else if (v === null) val = 'null';
  else if (typeof v === 'object') {
    try { val = JSON.stringify(v); } catch { val = String(v); }
    if (val.length > 300) val = val.slice(0, 300) + '…(truncated)';
  } else val = String(v);
  console.log(`  ${k}: ${val}`);
}

// ---------- Build engines ----------
banner('SETUP: Construct DocumentEngine + HistoryEngine + GraphicsEngine + ToolRegistry + AICopilotEngine');

const doc = new MaestroDocumentEngine();
const history = new HistoryEngine(doc);
const graphics = new GraphicsEngine(800, 500, doc, history);
history.setGraphicsEngine(graphics);
const registry = new ToolRegistry();
const copilot = new AICopilotEngine(registry);

kv('GraphicsEngine.historyEngine wired', (graphics as any).historyEngine !== undefined);
kv('HistoryEngine.graphicsEngine wired', (history as any).graphicsEngine !== undefined);

// ---------- Inspect default layers ----------
step('Default layers');
const layers = doc.getAllLayers();
kv('Layer count', layers.length);
for (const l of layers) {
  kv(`  Layer ${l.id.slice(0, 8)}`, { name: l.name, bounds: l.bounds, type: l.type });
}

// ---------- Pick the Perfume Bottle Hero layer as the active layer ----------
const perfume = layers.find(l => l.name === 'Perfume Bottle Hero')!;
kv('Active layer (Perfume Bottle Hero)', { id: perfume.id, bounds: perfume.bounds });
graphics.setActiveLayer(perfume.id);

// ---------- Step 1: parseIntent ----------
step('STEP 1: copilot.parseIntent("remove this object")');
const ctx = copilot.buildContextSnapshot(doc, graphics, perfume.id);
const intent = copilot.parseIntent('remove this object', ctx);
kv('intent.type', intent.type);
kv('intent.target', intent.target);
kv('intent.parameters', intent.parameters);
kv('intent.isRisky', intent.isRisky);

// ---------- Step 2: generatePlan ----------
step('STEP 2: copilot.generatePlan(intent, ctx)');
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

// ---------- Step 3: Pre-execution snapshot ----------
step('STEP 3: Pre-execution state snapshot');
const timelineBefore = history.getTimeline();
const allOpsBefore = history.getAllOperations();
const undoStackBefore = (history as any).branchUndoStacks.get('branch_main') as unknown[] | undefined;
const graphicsHistoryStackBefore = (graphics as any).historyStack as unknown[];
kv('historyEngine.timeline.length (before)', timelineBefore.length);
kv('historyEngine.allOperations.length (before)', allOpsBefore.length);
kv('historyEngine.branchUndoStack[branch_main].length (before)', undoStackBefore?.length ?? 0);
kv('graphicsEngine.historyStack.length (before)', graphicsHistoryStackBefore.length);
kv('historyEngine.canUndo() (before)', history.canUndo());

// ---------- Step 4: executePlan (instrumented) ----------
step('STEP 4: copilot.executePlan(...)');

// Hook the registry to log every call
const origRegExecute = registry.execute.bind(registry);
(registry as any).execute = async function (toolId: string, params: Record<string, unknown>, context: any) {
  console.log('\n  >>> ToolRegistry.execute CALLED');
  kv('    toolId', toolId);
  kv('    params', params);
  kv('    context.graphicsEngine?', !!context?.graphicsEngine);
  kv('    context.graphicsEngine.executeTool is function?', typeof context?.graphicsEngine?.executeTool === 'function');
  const res = await origRegExecute(toolId, params, context);
  console.log('  <<< ToolRegistry.execute RETURNED');
  kv('    result.success', res.success);
  kv('    result.toolId', res.toolId);
  kv('    result.output', res.output);
  kv('    result.error', res.error);
  kv('    result.durationMs', res.durationMs);
  return res;
};

// Hook graphics.executeTool to log
const origExecTool = graphics.executeTool.bind(graphics);
(graphics as any).executeTool = async function (toolId: string, params: Record<string, any>) {
  console.log('\n  >>> GraphicsEngine.executeTool CALLED');
  kv('    toolId', toolId);
  kv('    params.layerId', params.layerId);
  kv('    params.boundingBox', params.boundingBox);
  kv('    this.tools.has(tool.remove_object)?', (this as any).tools.has('tool.remove_object'));
  const hasBBox = !!(params.boundingBox);
  kv('    Will route to executePrimitiveToolCommand?', (this as any).tools.has(toolId) && !(toolId === 'tool.remove_object' && !hasBBox));
  try {
    const res = await origExecTool(toolId, params);
    console.log('  <<< GraphicsEngine.executeTool RETURNED');
    kv('    res.success', res.success);
    kv('    res.toolId', res.toolId);
    kv('    res.affectedLayerIds', res.affectedLayerIds);
    kv('    res.rollbackData (typeof)', typeof res.rollbackData);
    if (res.rollbackData && typeof res.rollbackData === 'object') {
      kv('    res.rollbackData.layerId', (res.rollbackData as any).layerId);
      kv('    res.rollbackData.prevBuffer (typeof)', typeof (res.rollbackData as any).prevBuffer);
    }
    kv('    res.output', res.output);
    kv('    res.durationMs', res.durationMs);
    return res;
  } catch (e: any) {
    console.log('  !!! GraphicsEngine.executeTool THREW:', e.message);
    throw e;
  }
};

// Hook executePrimitiveToolCommand
const origPrimCmd = (graphics as any).executePrimitiveToolCommand.bind(graphics);
(graphics as any).executePrimitiveToolCommand = async function (toolId: string, params: Record<string, any>) {
  console.log('\n  >>> GraphicsEngine.executePrimitiveToolCommand CALLED');
  kv('    toolId', toolId);
  kv('    params.layerId', params.layerId);
  const tool = (this as any).tools.get(toolId);
  kv('    tool found?', !!tool);
  if (tool) {
    kv('    tool.id', tool.id);
    kv('    tool.name', tool.name);
  }
  try {
    const res = await origPrimCmd(toolId, params);
    console.log('  <<< GraphicsEngine.executePrimitiveToolCommand RETURNED');
    kv('    res.success', res.success);
    kv('    res.affectedLayerIds', res.affectedLayerIds);
    kv('    res.rollbackData (typeof)', typeof res.rollbackData);
    kv('    res.output', res.output);
    return res;
  } catch (e: any) {
    console.log('  !!! GraphicsEngine.executePrimitiveToolCommand THREW:', e.message);
    throw e;
  }
};

// Hook historyEngine.executeCommand to log
const origHistExec = history.executeCommand.bind(history);
(history as any).executeCommand = async function (command: any, options?: any) {
  console.log('\n  >>> HistoryEngine.executeCommand CALLED');
  kv('    command.id', command.id);
  kv('    command.name', command.name);
  kv('    command.toolId', command.toolId);
  kv('    command.parameters', command.parameters);
  try {
    const res = await origHistExec(command, options);
    console.log('  <<< HistoryEngine.executeCommand RETURNED');
    kv('    res.success', res.success);
    kv('    res.error', res.error);
    kv('    res.durationMs', res.durationMs);
    return res;
  } catch (e: any) {
    console.log('  !!! HistoryEngine.executeCommand THREW:', e.message);
    throw e;
  }
};

// Hook historyEngine.recordOperationDirectly to log
const origRecord = history.recordOperationDirectly.bind(history);
(history as any).recordOperationDirectly = function (record: any) {
  console.log('\n  >>> HistoryEngine.recordOperationDirectly CALLED');
  kv('    record.operationId', record.operationId);
  kv('    record.tool', record.tool);
  kv('    record.status', record.status);
  kv('    record.output', record.output);
  return origRecord(record);
};

const activities: any[] = [];
const onActivity = (e: any) => { activities.push(e); };

const execResult = await copilot.executePlan(
  plan,
  { documentEngine: doc, graphicsEngine: graphics, historyEngine: history, toolRegistry: registry },
  onActivity
);

console.log('\n--- executePlan FINAL RESULT ---');
kv('execResult.success', execResult.success);
kv('execResult.executedSteps', execResult.executedSteps);
kv('execResult.error', execResult.error);
kv('plan.status (final)', plan.status);
kv('plan.completedAt', plan.completedAt);

// ---------- Step 5: Post-execution snapshot ----------
step('STEP 5: Post-execution state snapshot');
const timelineAfter = history.getTimeline();
const allOpsAfter = history.getAllOperations();
const undoStackAfter = (history as any).branchUndoStacks.get('branch_main') as unknown[] | undefined;
const graphicsHistoryStackAfter = (graphics as any).historyStack as unknown[];
kv('historyEngine.timeline.length (after)', timelineAfter.length);
kv('historyEngine.allOperations.length (after)', allOpsAfter.length);
kv('historyEngine.branchUndoStack[branch_main].length (after)', undoStackAfter?.length ?? 0);
kv('graphicsEngine.historyStack.length (after)', graphicsHistoryStackAfter.length);
kv('historyEngine.canUndo() (after)', history.canUndo());

console.log('\n--- Timeline contents (after) ---');
for (const op of timelineAfter) {
  kv(`  op ${op.operationId.slice(0, 16)}`, {
    tool: op.tool, status: op.status, parent: op.parent, duration: op.duration
  });
}

// ---------- Step 6: Did the buffer actually mutate? ----------
step('STEP 6: Pixel buffer inspection');
const layerId = perfume.id;
const buf = (graphics as any).layerPixelBuffers.get(layerId);
kv('layerPixelBuffers.has(perfume.id)', (graphics as any).layerPixelBuffers.has(layerId));
if (buf) {
  kv('  buf.width', buf.width);
  kv('  buf.height', buf.height);
  // Sample center pixel
  const cx = Math.floor(buf.width / 2);
  const cy = Math.floor(buf.height / 2);
  const px = buf.getPixel(cx, cy);
  kv(`  center pixel (${cx},${cy})`, Array.from(px));
}

// ---------- Step 7: Try undo ----------
step('STEP 7: historyEngine.undo()');
const undoBefore = history.canUndo();
const undoResult = await history.undo();
kv('canUndo (before undo call)', undoBefore);
kv('undo result', undoResult);
const timelineAfterUndo = history.getTimeline();
const undoStackAfterUndo = (history as any).branchUndoStacks.get('branch_main') as unknown[] | undefined;
kv('timeline.length (after undo)', timelineAfterUndo.length);
kv('branchUndoStack.length (after undo)', undoStackAfterUndo?.length ?? 0);

// ---------- Step 8: Activities ----------
step('STEP 8: All activity events emitted during executePlan');
kv('activities.length', activities.length);
for (const a of activities) {
  kv(`  act ${a.id.slice(-12)}`, { phase: a.phase, toolId: a.toolId, status: a.status, summary: a.summary });
}

// ---------- Step 9: Diagnosis summary ----------
banner('DIAGNOSIS');
if (execResult.success && undoStackAfter && undoStackAfter.length > 0) {
  console.log('  ✓ executePlan returned success AND branchUndoStack grew — undo should work');
} else if (execResult.success && (!undoStackAfter || undoStackAfter.length === 0)) {
  console.log('  ✗ BUG: executePlan returned success BUT branchUndoStack is empty');
  console.log('    → This is the parallel-history divergence: ToolRegistry.execute() → GraphicsEngine.executeTool()');
  console.log('      routes through executePrimitiveToolCommand() which calls historyEngine.executeCommand(),');
  console.log('      BUT if anything throws before that, the AI still sees success via ToolRegistry.execute()');
  console.log('    → Or: the AI calls historyEngine.recordOperationDirectly() AFTER, which only adds to operations');
  console.log('      Map, NOT to the undo stack');
} else {
  console.log('  ✗ executePlan returned failure');
}
