/**
 * @file HistoryPanel.tsx
 * Real History Panel connected to HistoryEngine for AI Graphic Maestro.
 * Supports:
 * - Real-time command history stream (Operation, Tool, Timestamp, Status, Duration)
 * - True Undo & Redo execution
 * - DAG Branch & Milestone snapshots inspection
 * - Rollback to checkpoint
 */

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Sparkles,
  ChevronRight,
  GitBranch,
  Bookmark,
} from 'lucide-react';
import { HistoryEngine } from '../history/HistoryEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { OperationRecord } from '../history/types';
import { HistorySnapshot } from '../models/types';

interface HistoryPanelProps {
  historyEngine?: HistoryEngine;
  graphicsEngine?: GraphicsEngine;
  historySnapshots?: HistorySnapshot[];
  onRollbackToSnapshot?: (id: string) => void;
  onLayerUpdate?: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  historyEngine,
  graphicsEngine,
  historySnapshots = [],
  onRollbackToSnapshot,
  onLayerUpdate,
}) => {
  const [, setTick] = useState(0);

  // Subscribe to history changes
  useEffect(() => {
    if (!historyEngine) return;
    const unsubscribe = historyEngine.subscribe(() => {
      setTick((t) => t + 1);
      if (onLayerUpdate) onLayerUpdate();
    });
    return unsubscribe;
  }, [historyEngine, onLayerUpdate]);

  const timeline: OperationRecord[] = historyEngine ? historyEngine.getTimeline() : [];
  const allOps: OperationRecord[] = historyEngine ? historyEngine.getAllOperations() : [];
  const operationsToDisplay = timeline.length > 0 ? timeline : allOps;

  const canUndo = historyEngine ? historyEngine.canUndo() : (graphicsEngine ? graphicsEngine.canUndo() : false);
  const canRedo = historyEngine ? historyEngine.canRedo() : (graphicsEngine ? graphicsEngine.canRedo() : false);

  const handleUndo = async () => {
    if (graphicsEngine) {
      await graphicsEngine.rollback();
    } else if (historyEngine) {
      await historyEngine.undo();
    }
    if (onLayerUpdate) onLayerUpdate();
  };

  const handleRedo = async () => {
    if (graphicsEngine) {
      await graphicsEngine.redo();
    } else if (historyEngine) {
      await historyEngine.redo();
    }
    if (onLayerUpdate) onLayerUpdate();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex gap-4 h-full select-none text-xs">
      {/* 1. OPERATIONS STREAM */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222222]">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-white text-xs">Document History Stream</span>
            <span className="mono text-[9px] px-1.5 py-0.2 rounded bg-purple-950/50 text-purple-300 border border-purple-800/40">
              {operationsToDisplay.length} Operations
            </span>
          </div>

          {/* Undo / Redo Global Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#171717] hover:bg-[#222] disabled:opacity-30 disabled:cursor-not-allowed border border-[#262626] text-white mono text-[10px] cursor-pointer transition-colors"
              title="Undo last action (Ctrl+Z)"
            >
              <RotateCcw className="w-3 h-3 text-purple-400" />
              <span>Undo</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#171717] hover:bg-[#222] disabled:opacity-30 disabled:cursor-not-allowed border border-[#262626] text-white mono text-[10px] cursor-pointer transition-colors"
              title="Redo action (Ctrl+Y)"
            >
              <RotateCw className="w-3 h-3 text-purple-400" />
              <span>Redo</span>
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {operationsToDisplay.length === 0 ? (
            <div className="text-center py-8 text-[#666] mono text-[11px] border border-dashed border-[#222] rounded-xl">
              Baseline initialized. Performing operations on the canvas or layer panel records history here.
            </div>
          ) : (
            operationsToDisplay.map((op, idx) => {
              const isHead = idx === operationsToDisplay.length - 1;
              const isSuccess = op.status === 'success';

              return (
                <div
                  key={op.operationId}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    isHead
                      ? 'bg-[#1a1526] border-purple-500/70 shadow-[0_0_10px_rgba(124,58,237,0.15)] text-white'
                      : 'bg-[#141414] border-[#222222] text-[#ccc] hover:bg-[#181818]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Status Icon */}
                    {isSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}

                    {/* Tool Tag */}
                    <span className="mono text-[9px] px-1.5 py-0.5 rounded bg-[#202020] text-purple-300 border border-[#2d2d2d] shrink-0">
                      {op.tool || 'command'}
                    </span>

                    {/* Operation Description */}
                    <div className="truncate">
                      <span className="font-medium text-[11px] block truncate">
                        {op.tool ? `Execute ${op.tool}` : `Operation #${idx + 1}`}
                      </span>
                      <span className="mono text-[9px] text-[#737373]">
                        ID: {op.operationId.substring(0, 16)}...
                      </span>
                    </div>
                  </div>

                  {/* Metadata & Timestamp */}
                  <div className="flex items-center gap-3 mono text-[10px] text-[#777] shrink-0">
                    {op.duration !== undefined && (
                      <span className="text-[#888]">{op.duration}ms</span>
                    )}
                    <span>{formatTime(op.timestamp)}</span>
                    {isHead && (
                      <span className="mono text-[9px] px-1.5 py-0.2 rounded bg-purple-600 text-white font-bold">
                        HEAD
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. SNAPSHOTS & RECOVERY SIDEBAR */}
      <div className="w-56 border-l border-[#222222] pl-3 flex flex-col justify-between shrink-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="mono text-[9px] text-[#737373] uppercase">Milestone Snapshots</span>
            <span className="mono text-[9px] text-purple-400 font-bold bg-purple-950/40 px-1.5 py-0.2 rounded">
              {historySnapshots.length}
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[180px]">
            {historySnapshots.length === 0 ? (
              <div className="text-[10px] text-[#666] py-3 text-center">
                No autonomous snapshots recorded.
              </div>
            ) : (
              historySnapshots.map((snap) => (
                <div
                  key={snap.iteration}
                  className="p-2 rounded-lg bg-[#141414] border border-[#242424] flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="mono text-[9px] text-purple-300 font-bold">
                      ITER {snap.iteration}
                    </span>
                    <span className="mono text-[9px] text-emerald-400">
                      ★ {snap.score.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-white truncate">
                    {snap.status === 'rollback' ? 'Rollback Checkpoint' : `Pass #${snap.iteration}`}
                  </div>
                  <button
                    onClick={() => onRollbackToSnapshot && onRollbackToSnapshot(String(snap.iteration))}
                    className="w-full py-1 px-1.5 rounded bg-[#1f1f1f] hover:bg-purple-950/50 hover:text-purple-200 border border-[#2a2a2a] mono text-[9px] text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-purple-400" />
                    <span>RESTORE CHECKPOINT</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Keyboard shortcut legend */}
        <div className="pt-2 border-t border-[#1f1f1f] mono text-[9px] text-[#666] space-y-1">
          <div className="flex justify-between">
            <span>Undo:</span>
            <span className="text-[#aaa]">Ctrl + Z / ⌘Z</span>
          </div>
          <div className="flex justify-between">
            <span>Redo:</span>
            <span className="text-[#aaa]">Ctrl + Y / ⌘Y</span>
          </div>
        </div>
      </div>
    </div>
  );
};
