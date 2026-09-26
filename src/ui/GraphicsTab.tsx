/**
 * @file GraphicsTab.tsx
 * Real Interactive Control Panel for AI Graphic Maestro Graphics Engine & 18 Primitives.
 * Enforces Architectural Rule: UI never directly manipulates pixels or layers;
 * every operation is routed through GraphicsEngine.executeTool() with validation, timing, and rollback.
 */

import React, { useState, useEffect } from 'react';
import { GraphicsEngine, CommandHistoryRecord } from '../graphics/GraphicsEngine';
import { IGraphicsTool } from '../graphics/engine/IGraphicsTool';
import { HardwareCapabilities } from '../graphics/engine/WorkerDispatcher';
import {
  Wrench,
  RotateCcw,
  RotateCw,
  Cpu,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Scissors,
  Layers,
  Palette,
  Sun,
  Eye,
  Activity,
  History,
  Sparkles,
} from 'lucide-react';

interface GraphicsTabProps {
  graphicsEngine: GraphicsEngine;
}

export const GraphicsTab: React.FC<GraphicsTabProps> = ({ graphicsEngine }) => {
  const [tools, setTools] = useState<IGraphicsTool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('tool.move');
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [history, setHistory] = useState<CommandHistoryRecord[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [capabilities, setCapabilities] = useState<HardwareCapabilities | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string>('');

  const doc = graphicsEngine.getDocument();

  // Initialize tools and capabilities
  useEffect(() => {
    const allTools = graphicsEngine.getAllTools();
    setTools(allTools);
    setCapabilities(graphicsEngine.getHardwareCapabilities());

    const layers = doc.layers;
    if (layers.length > 0 && !activeLayerId) {
      const firstId = layers[0].id;
      setActiveLayerId(firstId);
      graphicsEngine.setActiveLayer(firstId);
    }

    const unsubscribe = graphicsEngine.subscribe(() => {
      setHistory(graphicsEngine.getHistory());
      setCanUndo(graphicsEngine.canUndo());
      setCanRedo(graphicsEngine.canRedo());
    });

    return () => unsubscribe();
  }, [graphicsEngine, doc.layers]);

  // Set default parameters when selected tool changes
  useEffect(() => {
    const tool = graphicsEngine.getTool(selectedToolId);
    if (!tool) return;

    const defaults: Record<string, any> = {};
    Object.entries(tool.inputSchema).forEach(([key, schema]) => {
      if (schema.default !== undefined) {
        defaults[key] = schema.default;
      } else if (key === 'layerId') {
        defaults[key] = activeLayerId || (doc.layers[0]?.id || '');
      } else if (schema.type === 'number') {
        defaults[key] = 10;
      } else if (schema.type === 'string') {
        defaults[key] = schema.enum ? schema.enum[0] : '';
      } else if (schema.type === 'object') {
        if (key === 'boundingBox') defaults[key] = { x: 50, y: 50, width: 40, height: 40 };
        else if (key === 'position') defaults[key] = { x: 20, y: 20 };
        else defaults[key] = {};
      } else if (schema.type === 'array') {
        if (key === 'controlPoints') defaults[key] = [[0, 0], [128, 170], [255, 255]];
        else if (key === 'targetColor') defaults[key] = [255, 0, 0];
        else if (key === 'replacementColor') defaults[key] = [0, 200, 100];
        else defaults[key] = [];
      }
    });

    if (tool.id === 'tool.composite') {
      defaults.sourceLayerId = doc.layers[0]?.id || '';
      defaults.destLayerId = doc.layers[1]?.id || doc.layers[0]?.id || '';
    }

    setToolParams(defaults);
  }, [selectedToolId, activeLayerId, doc.layers]);

  const handleExecuteTool = async () => {
    try {
      const tool = graphicsEngine.getTool(selectedToolId);
      if (!tool) return;

      const paramsToPass = { ...toolParams };
      if (paramsToPass.layerId === undefined && tool.inputSchema.layerId) {
        paramsToPass.layerId = activeLayerId;
      }

      const result = await graphicsEngine.executeTool(selectedToolId, paramsToPass);
      setLastResult(result);
      setCanUndo(graphicsEngine.canUndo());
      setCanRedo(graphicsEngine.canRedo());
      setHistory(graphicsEngine.getHistory());

      const logMsg = `[${new Date().toLocaleTimeString()}] Executed '${tool.name}' in ${result.durationMs}ms: Success`;
      setExecutionLog((prev) => [logMsg, ...prev.slice(0, 30)]);
    } catch (err: any) {
      const errMsg = `[ERROR] ${err.message}`;
      setExecutionLog((prev) => [errMsg, ...prev.slice(0, 30)]);
      setLastResult({ success: false, message: err.message });
    }
  };

  const handleUndo = async () => {
    const success = await graphicsEngine.rollback();
    setCanUndo(graphicsEngine.canUndo());
    setCanRedo(graphicsEngine.canRedo());
    setHistory(graphicsEngine.getHistory());
    if (success) {
      setExecutionLog((prev) => [`[${new Date().toLocaleTimeString()}] Rollback (Undo) successful`, ...prev.slice(0, 30)]);
    }
  };

  const handleRedo = async () => {
    const success = await graphicsEngine.redo();
    setCanUndo(graphicsEngine.canUndo());
    setCanRedo(graphicsEngine.canRedo());
    setHistory(graphicsEngine.getHistory());
    if (success) {
      setExecutionLog((prev) => [`[${new Date().toLocaleTimeString()}] Redo successful`, ...prev.slice(0, 30)]);
    }
  };

  const selectedTool = graphicsEngine.getTool(selectedToolId);

  return (
    <div className="space-y-6 mb-8">
      {/* Top Banner: Architecture Guarantee */}
      <div className="rounded-2xl border p-5 bg-[#111111] border-[#222222] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/40 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#a78bfa]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              REAL GRAPHICS ENGINE • 18 INDEPENDENT PRIMITIVES
              <span className="text-[10px] mono px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                STRICT DISPATCH ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#888] mt-0.5">
              UI never mutates pixels directly. All operations pass through validate(), execute(), and rollback().
            </p>
          </div>
        </div>

        {/* Undo / Redo Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs mono font-medium border transition-all ${
              canUndo
                ? 'bg-[#1e1b4b] border-[#4338ca] text-white hover:bg-[#312e81] cursor-pointer'
                : 'bg-[#161616] border-[#262626] text-[#555] cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            UNDO
          </button>

          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs mono font-medium border transition-all ${
              canRedo
                ? 'bg-[#1e1b4b] border-[#4338ca] text-white hover:bg-[#312e81] cursor-pointer'
                : 'bg-[#161616] border-[#262626] text-[#555] cursor-not-allowed'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            REDO
          </button>
        </div>
      </div>

      {/* Hardware Acceleration & Environment Inspection */}
      {capabilities && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border p-3.5 bg-[#141414] border-[#222]">
            <div className="text-[10px] mono text-[#737373]">WEB WORKERS</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${capabilities.webWorkers ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} />
              <span className="text-xs font-semibold text-white">
                {capabilities.webWorkers ? 'Active (Multi-Threaded)' : 'Headless Fallback'}
              </span>
            </div>
            <div className="text-[10px] text-[#888] mt-1">{capabilities.hardwareConcurrency} Cores Concurrency</div>
          </div>

          <div className="rounded-xl border p-3.5 bg-[#141414] border-[#222]">
            <div className="text-[10px] mono text-[#737373]">OFFSCREEN CANVAS</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${capabilities.offscreenCanvas ? 'bg-[#10b981]' : 'bg-[#a78bfa]'}`} />
              <span className="text-xs font-semibold text-white">
                {capabilities.offscreenCanvas ? 'Hardware Accelerated' : 'PixelBuffer Memory'}
              </span>
            </div>
            <div className="text-[10px] text-[#888] mt-1">Non-blocking background rendering</div>
          </div>

          <div className="rounded-xl border p-3.5 bg-[#141414] border-[#222]">
            <div className="text-[10px] mono text-[#737373]">GPU ACCELERATION</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${capabilities.webGPU ? 'bg-[#10b981]' : 'bg-[#737373]'}`} />
              <span className="text-xs font-semibold text-white">
                {capabilities.webGPU ? 'WebGPU Pipeline Ready' : 'Canvas 2D / CPU SIMD'}
              </span>
            </div>
            <div className="text-[10px] text-[#888] mt-1">Direct pixel typed array arithmetic</div>
          </div>

          <div className="rounded-xl border p-3.5 bg-[#141414] border-[#222]">
            <div className="text-[10px] mono text-[#737373]">TARGET ACTIVE LAYER</div>
            <div className="mt-1">
              <select
                value={activeLayerId}
                onChange={(e) => {
                  setActiveLayerId(e.target.value);
                  graphicsEngine.setActiveLayer(e.target.value);
                }}
                className="w-full bg-[#1c1c1c] border border-[#333] rounded px-2 py-1 text-xs text-white mono"
              >
                {doc.layers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Tool Palette & Execution Inspector */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Left Column: 18 Tools Selector (4 cols) */}
        <div className="md:col-span-4 rounded-2xl border p-5 bg-[#111111] border-[#222222] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222]">
            <div className="text-xs font-semibold text-white mono flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#a78bfa]" />
              PRIMITIVE TOOLS ({tools.length})
            </div>
            <span className="text-[10px] mono text-[#737373]">100% REAL</span>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {tools.map((t) => {
              const isSelected = selectedToolId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedToolId(t.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#7c3aed]/20 border-[#7c3aed] text-white shadow-sm'
                      : 'bg-[#161616] border-[#242424] text-[#aaa] hover:bg-[#1f1f1f] hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-medium">{t.name}</div>
                    <div className="text-[10px] mono text-[#737373] truncate max-w-[200px]">{t.id}</div>
                  </div>
                  <span className="text-[10px] mono px-2 py-0.5 rounded bg-[#222] text-[#999]">
                    {t.id.replace('tool.', '')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Tool Parameter Inspector & Execution (8 cols) */}
        <div className="md:col-span-8 space-y-6">
          {selectedTool && (
            <div className="rounded-2xl border p-6 bg-[#111111] border-[#222222] space-y-5">
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#222] gap-2">
                <div>
                  <div className="text-base font-semibold text-white flex items-center gap-2">
                    {selectedTool.name}
                    <span className="text-[11px] mono text-[#a78bfa] font-normal">({selectedTool.id})</span>
                  </div>
                  <div className="text-xs text-[#888] mt-0.5">{selectedTool.description}</div>
                </div>

                <button
                  onClick={handleExecuteTool}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs mono font-semibold transition-all cursor-pointer shadow-lg shadow-[#7c3aed]/30"
                >
                  <Play className="w-4 h-4 fill-white" />
                  EXECUTE TOOL
                </button>
              </div>

              {/* Input Schema Form */}
              <div className="space-y-4">
                <div className="text-xs font-semibold text-[#888] mono uppercase tracking-wider">
                  Parameters (inputSchema validation)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(selectedTool.inputSchema).map(([paramKey, schema]) => {
                    const val = toolParams[paramKey];

                    return (
                      <div key={paramKey} className="rounded-xl border p-3 bg-[#161616] border-[#262626]">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-white mono">{paramKey}</label>
                          <span className="text-[10px] mono text-[#737373]">
                            {schema.type} {schema.required ? '• req' : ''}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#777] mb-2">{schema.description}</p>

                        {schema.enum ? (
                          <select
                            value={val || schema.enum[0]}
                            onChange={(e) => setToolParams({ ...toolParams, [paramKey]: e.target.value })}
                            className="w-full bg-[#1f1f1f] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white mono"
                          >
                            {schema.enum.map((opt: any) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : schema.type === 'number' ? (
                          <input
                            type="number"
                            value={val !== undefined ? val : 0}
                            min={schema.min}
                            max={schema.max}
                            onChange={(e) =>
                              setToolParams({ ...toolParams, [paramKey]: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full bg-[#1f1f1f] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white mono"
                          />
                        ) : schema.type === 'boolean' ? (
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => setToolParams({ ...toolParams, [paramKey]: e.target.checked })}
                            className="h-4 w-4 rounded border-[#333] bg-[#1f1f1f] text-[#7c3aed] cursor-pointer"
                          />
                        ) : (
                          <input
                            type="text"
                            value={typeof val === 'object' ? JSON.stringify(val) : val || ''}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setToolParams({ ...toolParams, [paramKey]: parsed });
                              } catch {
                                setToolParams({ ...toolParams, [paramKey]: e.target.value });
                              }
                            }}
                            className="w-full bg-[#1f1f1f] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white mono"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Execution Feedback & Timing */}
              {lastResult && (
                <div
                  className={`rounded-xl border p-4 ${
                    lastResult.success ? 'bg-[#10b981]/10 border-[#10b981]/30' : 'bg-[#ef4444]/10 border-[#ef4444]/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {lastResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#ef4444]" />
                    )}
                    <span className="text-xs font-semibold text-white mono">
                      {lastResult.success ? 'TOOL EXECUTION COMPLETED' : 'VALIDATION / EXECUTION ERROR'}
                    </span>
                    {lastResult.durationMs !== undefined && (
                      <span className="text-xs mono text-[#a78bfa] ml-auto font-medium">
                        ⏱ {lastResult.durationMs}ms
                      </span>
                    )}
                  </div>
                  {lastResult.output && (
                    <pre className="mt-2 text-[11px] mono text-[#bbb] bg-[#000]/40 p-2.5 rounded-lg overflow-x-auto">
                      {JSON.stringify(lastResult.output, null, 2)}
                    </pre>
                  )}
                  {lastResult.message && <p className="text-xs text-[#f87171] mt-1">{lastResult.message}</p>}
                </div>
              )}
            </div>
          )}

          {/* Operation History & Real-Time Engine Log */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Command History Stack */}
            <div className="rounded-2xl border p-4 bg-[#111111] border-[#222222]">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#222]">
                <div className="text-xs font-semibold text-white mono flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-[#a78bfa]" />
                  COMMAND STACK ({history.length})
                </div>
                <span className="text-[10px] mono text-[#737373]">ROLLBACK READY</span>
              </div>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-xs text-[#666] py-3 text-center mono">No operations executed yet.</div>
                ) : (
                  history.slice().reverse().map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2 rounded-lg bg-[#161616] border border-[#242424] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-white">{rec.toolName}</div>
                        <div className="text-[10px] mono text-[#737373]">{rec.id}</div>
                      </div>
                      <span className="text-[10px] mono text-[#a78bfa]">{rec.durationMs}ms</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Real-time Diagnostics Log */}
            <div className="rounded-2xl border p-4 bg-[#111111] border-[#222222]">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#222]">
                <div className="text-xs font-semibold text-white mono flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#10b981]" />
                  ENGINE LOGS
                </div>
                <span className="text-[10px] mono text-[#737373]">TELEMETRY</span>
              </div>
              <div className="space-y-1 max-h-[160px] overflow-y-auto font-mono text-[10px] text-[#aaa]">
                {executionLog.length === 0 ? (
                  <div className="text-xs text-[#666] py-3 text-center">Awaiting tool execution...</div>
                ) : (
                  executionLog.map((line, idx) => (
                    <div key={`${idx}-${line.substring(0, 20)}`} className="p-1 rounded bg-[#161616] truncate">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
