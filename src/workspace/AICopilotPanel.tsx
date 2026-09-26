/**
 * @file AICopilotPanel.tsx
 * Production-ready AI Copilot Panel for Graphic Maestro.
 * Supports:
 * - Real-time Conversation Stream & Directive Input
 * - Live Workspace Context Snapshot (Document, Layer, Selection, Tools, Canvas)
 * - Transparent Intent & Multi-Step Plan Previews
 * - Graphic DSL JSON Visualizer
 * - Human Approval Gateways for Risky Operations
 * - Direct Execution on DocumentEngine & GraphicsEngine
 * - Honest Model Status Indicator (MODEL NOT CONNECTED / BUILTIN DSL AGENT)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  Layers,
  Sliders,
  Code2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Cpu,
  Trash2,
  Zap,
} from 'lucide-react';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { HistoryEngine } from '../history/HistoryEngine';
import { AICopilotEngine } from './AICopilotEngine';
import {
  CopilotMessage,
  CopilotPlan,
  ActivityEvent,
  CopilotContextSnapshot,
} from './copilotTypes';

interface AICopilotPanelProps {
  documentEngine?: MaestroDocumentEngine;
  graphicsEngine?: GraphicsEngine;
  historyEngine?: HistoryEngine;
  selectedLayerId?: string | null;
  onLayerUpdate?: () => void;
  onActivityEvent?: (event: ActivityEvent) => void;
}

const TEST_SUGGESTIONS = [
  { label: 'TEST 1: این لایه را 100 پیکسل به چپ ببر', prompt: 'این لایه را 100 پیکسل به چپ ببر' },
  { label: 'TEST 2: این لایه را 20 درصد بزرگ کن', prompt: 'این لایه را 20 درصد بزرگ کن' },
  { label: 'TEST 3: این شیء را حذف کن (نیاز به تایید)', prompt: 'این شیء را حذف کن' },
  { label: 'TEST 4: Opacity را به 50 درصد برسان', prompt: 'Opacity را به 50 درصد برسان' },
  { label: 'TEST 5: پسزمینه را حذف کن (چندمرحله‌ای)', prompt: 'پسزمینه را حذف کن' },
  { label: 'رنگ این شیء را قرمز کن', prompt: 'رنگ این شیء را قرمز کن' },
];

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  documentEngine,
  graphicsEngine,
  historyEngine,
  selectedLayerId,
  onLayerUpdate,
  onActivityEvent,
}) => {
  const [copilotEngine] = useState(() => new AICopilotEngine());
  const [promptInput, setPromptInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>(() => [
    {
      id: 'init_welcome',
      role: 'assistant',
      timestamp: Date.now(),
      text: 'AI Graphic Copilot is active and connected to Maestro Tool Registry. All operations use strict Graphic DSL with real canvas synchronization.',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Read-only Context snapshot
  const contextSnapshot: CopilotContextSnapshot | null = documentEngine
    ? copilotEngine.buildContextSnapshot(documentEngine, graphicsEngine, selectedLayerId)
    : null;

  const handleSendPrompt = async (rawPrompt?: string) => {
    const text = (rawPrompt || promptInput).trim();
    if (!text || !documentEngine || !graphicsEngine || isProcessing) return;

    setPromptInput('');
    setIsProcessing(true);

    const userMsgId = `usr_${Date.now()}`;
    const userMsg: CopilotMessage = {
      id: userMsgId,
      role: 'user',
      timestamp: Date.now(),
      text,
    };

    setMessages((prev) => [...prev, userMsg]);

    // 1. Activity: Analyzing Phase
    onActivityEvent?.({
      id: `act_${Date.now()}_ana`,
      timestamp: Date.now(),
      phase: 'Analyzing',
      summary: `Analyzing directive: "${text.substring(0, 45)}..."`,
      status: 'running',
    });

    // 2. Parse Intent & Build Plan
    const currentContext = copilotEngine.buildContextSnapshot(
      documentEngine,
      graphicsEngine,
      selectedLayerId
    );
    const intent = copilotEngine.parseIntent(text, currentContext);

    // 3. Activity: Planning Phase
    onActivityEvent?.({
      id: `act_${Date.now()}_plan`,
      timestamp: Date.now(),
      phase: 'Planning',
      summary: `Formulated plan: ${intent.title} (${intent.isMultiStep ? 'Multi-Step' : 'Single-Step'})`,
      status: 'info',
    });

    const plan = copilotEngine.generatePlan(intent, currentContext);
    const dslCalls = plan.steps.map((s) => copilotEngine.generateDSL(s));

    const assistantMsgId = `asst_${Date.now()}`;
    const assistantMsg: CopilotMessage = {
      id: assistantMsgId,
      role: 'assistant',
      timestamp: Date.now(),
      text: intent.isRisky
        ? `Detected Intent: ${intent.title}. This operation is flagged as High-Risk and requires your approval before modifying the document.`
        : `Detected Intent: ${intent.title}. Formulated Graphic DSL plan with ${plan.steps.length} tool step(s).`,
      intent,
      plan,
      dsl: dslCalls.length === 1 ? dslCalls[0] : dslCalls,
    };

    setMessages((prev) => [...prev, assistantMsg]);

    // If NOT risky: Execute immediately
    if (!intent.isRisky) {
      await executePlanInternal(plan, assistantMsgId);
    } else {
      setIsProcessing(false);
    }
  };

  const executePlanInternal = async (plan: CopilotPlan, msgId: string) => {
    if (!documentEngine || !graphicsEngine) return;
    setIsProcessing(true);

    const startTime = performance.now();
    const result = await copilotEngine.executePlan(
      plan,
      {
        documentEngine,
        graphicsEngine,
        historyEngine,
      },
      onActivityEvent
    );

    const durationMs = Math.round(performance.now() - startTime);

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId) {
          return {
            ...msg,
            plan: { ...plan },
            executionResult: {
              success: result.success,
              toolId: plan.steps[0]?.toolId || 'tool.unknown',
              durationMs,
              affectedLayer: plan.intent.target,
              changesSummary: result.success
                ? `Successfully executed ${result.executedSteps} step(s) on Document & Canvas in ${durationMs}ms.`
                : `Execution error: ${result.error}`,
              error: result.error,
            },
          };
        }
        return msg;
      })
    );

    setIsProcessing(false);
    onLayerUpdate?.();
  };

  const handleApprovePlan = async (plan: CopilotPlan, msgId: string) => {
    await executePlanInternal(plan, msgId);
  };

  const handleCancelPlan = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.plan) {
          return {
            ...msg,
            plan: { ...msg.plan, status: 'cancelled' },
            text: `${msg.text} (Plan cancelled by user).`,
          };
        }
        return msg;
      })
    );
  };

  const handleRollbackStep = async () => {
    if (!historyEngine || !graphicsEngine) return;
    const undoSuccess = await historyEngine.undo();
    if (undoSuccess) {
      graphicsEngine.renderDocument();
      onLayerUpdate?.();

      onActivityEvent?.({
        id: `act_${Date.now()}_rb`,
        timestamp: Date.now(),
        phase: 'Rollback',
        summary: 'User executed Rollback from AI Copilot panel',
        status: 'success',
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `sys_rb_${Date.now()}`,
          role: 'system',
          timestamp: Date.now(),
          text: 'Restored previous canvas snapshot via History Engine.',
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full text-xs select-none">
      {/* 1. Status Bar: Honest Model Connection Contract */}
      <div className="px-3 py-2 border-b border-[#222] bg-[#121212] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="mono text-[10px] font-semibold text-[#e5e5e5]">
            MODEL NOT CONNECTED
          </span>
        </div>
        <span className="mono text-[9px] text-[#888] bg-[#1c1c1c] px-1.5 py-0.5 rounded border border-[#2c2c2c]">
          BUILTIN DSL AGENT
        </span>
      </div>

      {/* 2. Workspace Context Inspector (Collapsible) */}
      <div className="border-b border-[#222] bg-[#0e0e0e]">
        <button
          onClick={() => setShowContext(!showContext)}
          className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] mono text-[#888] hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-[#a78bfa]" />
            <span>WORKSPACE CONTEXT</span>
            <span className="text-[#555]">
              ({contextSnapshot?.document.width}x{contextSnapshot?.document.height}px,{' '}
              {contextSnapshot?.document.layerCount} Layers)
            </span>
          </div>
          {showContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showContext && contextSnapshot && (
          <div className="px-3 py-2 bg-[#141414] border-t border-[#1f1f1f] text-[10px] mono space-y-1.5 text-[#aaa]">
            <div className="flex justify-between">
              <span>Active Layer:</span>
              <span className="text-white font-medium">
                {contextSnapshot.currentLayer?.name || 'None selected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Layer Bounds:</span>
              <span className="text-purple-300">
                {contextSnapshot.currentLayer
                  ? `[X: ${contextSnapshot.currentLayer.bounds.x}, Y: ${contextSnapshot.currentLayer.bounds.y}, W: ${contextSnapshot.currentLayer.bounds.width}, H: ${contextSnapshot.currentLayer.bounds.height}]`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Opacity / Blend:</span>
              <span className="text-emerald-400">
                {contextSnapshot.currentLayer
                  ? `${Math.round(contextSnapshot.currentLayer.opacity * 100)}% • ${contextSnapshot.currentLayer.blendMode}`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Registered Tools:</span>
              <span className="text-white font-medium">
                {contextSnapshot.availableTools.length} Primitives
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Suggestions Chips */}
      <div className="p-2 border-b border-[#1f1f1f] bg-[#111] overflow-x-auto space-y-1">
        <span className="mono text-[9px] text-[#666] block px-1">QUICK GRAPHIC DIRECTIVES:</span>
        <div className="flex flex-wrap gap-1">
          {TEST_SUGGESTIONS.map((item, idx) => (
            <button
              key={item.label}
              onClick={() => handleSendPrompt(item.prompt)}
              disabled={isProcessing}
              className="text-left px-2 py-1 rounded-md bg-[#181818] hover:bg-[#252525] border border-[#292929] text-[10px] text-[#ccc] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2.5 rounded-xl border ${
              msg.role === 'user'
                ? 'bg-[#1e1b2e] border-purple-900/50 text-[#f3f4f6]'
                : msg.role === 'system'
                ? 'bg-[#181818] border-[#2c2c2c] text-[#9ca3af] text-[11px]'
                : 'bg-[#141414] border-[#242424] text-[#d1d5db]'
            }`}
          >
            {/* Header / Role */}
            <div className="flex items-center justify-between mb-1.5 text-[9px] mono text-[#737373]">
              <span className="font-semibold uppercase tracking-wider text-purple-400">
                {msg.role === 'user' ? 'USER DIRECTIVE' : msg.role === 'system' ? 'SYSTEM' : 'MAESTRO COPILOT'}
              </span>
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>

            {/* Message Body */}
            <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>

            {/* Plan Display */}
            {msg.plan && (
              <div className="mt-2.5 pt-2 border-t border-[#262626] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] mono">
                  <span className="font-semibold text-white">OPERATIONAL PLAN</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] uppercase ${
                      msg.plan.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                        : msg.plan.status === 'executing'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800/40'
                        : msg.plan.status === 'awaiting_approval'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/40'
                        : 'bg-[#222] text-[#888]'
                    }`}
                  >
                    {msg.plan.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1">
                  {msg.plan.steps.map((step) => (
                    <div
                      key={step.id}
                      className="p-1.5 rounded bg-[#0d0d0d] border border-[#202020] flex items-center justify-between text-[10px] mono"
                    >
                      <div className="flex items-center gap-2">
                        {step.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : step.status === 'executing' ? (
                          <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : step.status === 'failed' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-[#444] shrink-0" />
                        )}
                        <span className="text-[#ccc] truncate max-w-[190px]">{step.title}</span>
                      </div>
                      <span className="text-[#777] text-[9px]">{step.toolId}</span>
                    </div>
                  ))}
                </div>

                {/* Graphic DSL Visualizer */}
                {msg.dsl && (
                  <div className="mt-2 bg-[#090909] rounded-lg p-2 border border-[#1e1e1e]">
                    <div className="flex items-center gap-1.5 text-[9px] mono text-[#888] mb-1">
                      <Code2 className="w-3 h-3 text-purple-400" />
                      <span>GRAPHIC DSL</span>
                    </div>
                    <pre className="text-[10px] mono text-purple-300 overflow-x-auto leading-tight">
                      {JSON.stringify(msg.dsl, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Human Approval Gateway */}
                {msg.plan.status === 'awaiting_approval' && (
                  <div className="mt-2.5 p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-300 text-[10px] font-medium">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Human Approval Required for Risky Operation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprovePlan(msg.plan!, msg.id)}
                        disabled={isProcessing}
                        className="flex-1 py-1 px-2 rounded bg-amber-500 hover:bg-amber-600 text-black font-semibold text-[10px] mono flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        <span>APPROVE & RUN</span>
                      </button>
                      <button
                        onClick={() => handleCancelPlan(msg.id)}
                        disabled={isProcessing}
                        className="py-1 px-2 rounded bg-[#222] hover:bg-[#333] text-[#aaa] hover:text-white text-[10px] mono cursor-pointer transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}

                {/* Result Telemetry & Rollback */}
                {msg.executionResult && (
                  <div className="mt-2 p-1.5 rounded bg-emerald-950/20 border border-emerald-800/30 text-[10px] mono text-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {msg.executionResult.changesSummary}
                      </span>
                    </div>
                    <button
                      onClick={handleRollbackStep}
                      title="Undo this operation"
                      className="px-1.5 py-0.5 rounded bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-200 text-[9px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>UNDO</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 5. Input Bar */}
      <div className="p-3 border-t border-[#1f1f1f] bg-[#0e0e0e] space-y-2">
        <div className="relative flex items-center">
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendPrompt();
              }
            }}
            placeholder="e.g. این لایه را 100 پیکسل به چپ ببر یا Opacity را به 50 درصد برسان..."
            rows={2}
            className="w-full bg-[#161616] border border-[#292929] rounded-xl p-2.5 text-[11px] text-white placeholder-[#555] focus:outline-none focus:border-[#7c3aed] resize-none transition-colors pr-10"
          />
          <button
            onClick={() => handleSendPrompt()}
            disabled={!promptInput.trim() || isProcessing}
            className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white transition-colors cursor-pointer disabled:opacity-40"
            title="Execute Direct AI Command"
          >
            {isProcessing ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
