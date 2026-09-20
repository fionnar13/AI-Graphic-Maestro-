/**
 * @file CritiqueTab
 * Displays Self-Critique loop, 10-dimensional progress bars, Memory stats, and Failure/Rollback cards.
 */

import React from 'react';
import { CriticDimensionScore, CriticIssue, MaestroMemoryState } from '../models/types';
import { MemoryEngine } from '../memory/MemoryEngine';
import { MemoryExplorer } from './MemoryExplorer';

interface CritiqueTabProps {
  criticScores: CriticDimensionScore[];
  issues: CriticIssue[];
  memoryState: MaestroMemoryState;
  memoryEngine?: MemoryEngine;
}

export const CritiqueTab: React.FC<CritiqueTabProps> = ({
  criticScores,
  issues,
  memoryState,
  memoryEngine,
}) => {
  return (
    <>
      <div className="grid md:grid-cols-12 gap-6 mb-6">
        {/* Iterations Loop */}
        <div
          className="md:col-span-7 rounded-2xl border p-6"
          style={{ background: '#111111', borderColor: '#222222' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="mono text-[11px] tracking-widest text-[#737373]">
              ITERATIONS • SELF-CRITIQUE LOOP
            </div>
            <div
              className="mono text-[10px] px-2 py-1 rounded-full border text-[#737373]"
              style={{ borderColor: '#222222', background: '#1a1a1a' }}
            >
              2 iters • 1 rollback • 278ms
            </div>
          </div>

          <div className="space-y-4">
            {/* Iteration 0 */}
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: '#222222', background: '#0f0f0f' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mono text-[11px] font-bold text-white bg-[#7c3aed]">
                    0
                  </div>
                  <div>
                    <div className="mono text-[12px] font-medium text-white">
                      Initial Execution • Score 0.815 • Severity HIGH
                    </div>
                    <div className="mono text-[10px] mt-1 text-[#737373]">
                      Confidence 0.67 • Improved True • RolledBack False • 11 ops all success except last eval
                    </div>
                  </div>
                </div>
                <div
                  className="mono text-[10px] px-2 py-1 rounded-full text-[#f59e0b]"
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                  }}
                >
                  3 issues
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 mono text-[10px]">
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="text-[#737373]">object_detection</div>
                  <div className="mt-1 text-white">8.4ms success</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="text-[#737373]">segmentation</div>
                  <div className="mt-1 text-white">96.4ms success</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="text-[#737373]">shadow</div>
                  <div className="mt-1 text-amber-300">20.8ms • missing</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="text-[#737373]">lighting</div>
                  <div className="mt-1 text-white">20.5ms success</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="text-[#737373]">scale</div>
                  <div className="mt-1 text-white">16.1ms success</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="text-[#737373]">saliency eval</div>
                  <div className="mt-1 text-white">44.5ms</div>
                </div>
              </div>

              <div className="mt-3 mono text-[10px] text-[#737373]">
                Reason: Initial execution • Issues: shadow missing (high 0.3), material glossy lost (med 0.15), texture flat (low 0.1)
              </div>
            </div>

            {/* Iteration 1 - Rollback */}
            <div
              className="rounded-xl border p-4 relative overflow-hidden"
              style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: '#1a0f0f' }}
            >
              <div
                className="absolute top-0 right-0 mono text-[9px] px-2 py-1 rounded-bl-lg font-bold text-white"
                style={{ background: '#ef4444' }}
              >
                ROLLBACK • FAILED
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mono text-[11px] font-bold text-white bg-[#ef4444]">
                    1
                  </div>
                  <div>
                    <div className="mono text-[12px] font-medium text-white">
                      Revision Attempt • Score 0.815 • Execution failed target+texture
                    </div>
                    <div className="mono text-[10px] mt-1 text-[#737373]">
                      Improved False • RolledBack True • Reason: Execution failed target+texture • 3 issues still
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 mono text-[10px]">
                <div
                  className="px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-[#10b981]"
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  shadow success
                </div>
                <div
                  className="px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-[#10b981]"
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  material_transfer success
                </div>
                <div
                  className="px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-[#ef4444]"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                  texture_transfer FAILED
                </div>
              </div>

              <div
                className="mt-3 p-2.5 rounded-lg mono text-[10px] text-[#737373]"
                style={{ background: '#0f0f0f', border: '1px solid #2a1a1a' }}
              >
                → Rollback triggered: texture_transfer error{' '}
                <span className="text-red-300 font-medium">target+texture</span> • Reverted to iter 0 best • Final result preserved
              </div>
            </div>
          </div>
        </div>

        {/* 10 Dimensions & Memory */}
        <div className="md:col-span-5 space-y-6">
          <div
            className="rounded-2xl border p-6"
            style={{ background: '#111111', borderColor: '#222222' }}
          >
            <div className="mono text-[11px] tracking-widest mb-4 text-[#737373]">
              CRITIC BEST • 0.815
            </div>
            <div className="space-y-2.5">
              {criticScores.map((item) => (
                <div key={item.dim} className="flex items-center gap-3">
                  <div className="mono text-[10px] w-[84px] text-right text-[#737373]">
                    {item.dim}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[#1a1a1a]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.score * 100}%`, background: item.color }}
                    />
                  </div>
                  <div className="mono text-[10px] w-8 font-medium" style={{ color: item.color }}>
                    {item.score.toFixed(1)}
                  </div>
                  {item.dim === 'shadow' && (
                    <span className="mono text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">
                      1 issue
                    </span>
                  )}
                  {['material', 'texture'].includes(item.dim) && (
                    <span className="mono text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      1 issue
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div
              className="mt-5 pt-4 border-t mono text-[11px] flex justify-between"
              style={{ borderColor: '#222222' }}
            >
              <span className="text-[#737373]">Overall</span>
              <span className="font-bold text-white">
                0.815 • Severity HIGH • Needs Revision True
              </span>
            </div>
          </div>

          {/* Memory */}
          <div
            className="rounded-2xl border p-6"
            style={{ background: '#111111', borderColor: '#222222' }}
          >
            <div className="mono text-[11px] tracking-widest mb-4 text-[#737373]">
              MEMORY • {memoryState.projectMemoryCount + memoryState.successfulWorkflows.length + memoryState.visualDecisions.length} ENTRIES
            </div>
            <div className="space-y-3 mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#737373]">project_memory</span>
                <span className="text-white">{memoryState.projectMemoryCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">successful_workflow</span>
                <span className="text-white">{memoryState.successfulWorkflows.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">visual_decision</span>
                <span className="text-white">{memoryState.visualDecisions.length}</span>
              </div>
              <div
                className="flex justify-between border-t pt-2 mt-2"
                style={{ borderColor: '#222222' }}
              >
                <span className="text-white">total</span>
                <span className="font-bold text-white">
                  {memoryState.projectMemoryCount +
                    memoryState.successfulWorkflows.length +
                    memoryState.visualDecisions.length}
                </span>
              </div>

              <div
                className="pt-3 mt-3 border-t space-y-2"
                style={{ borderColor: '#222222' }}
              >
                <div className="text-[10px] tracking-widest text-[#737373]">CONTEXT</div>
                <div className="p-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e]">
                  <div className="flex justify-between">
                    <span className="text-[#737373]">project_style</span>
                    <span className="text-[#a78bfa]">{memoryState.projectStyle}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[#737373]">confidence</span>
                    <span className="text-white">{memoryState.confidence}</span>
                  </div>
                </div>

                <div className="text-[10px] tracking-widest mt-3 text-[#737373]">
                  VISUAL DECISIONS
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {memoryState.visualDecisions.map((dec) => (
                    <span
                      key={dec.id}
                      className="px-2 py-1 rounded-full text-[10px] border text-[#a78bfa]"
                      style={{
                        borderColor: 'rgba(124, 58, 237, 0.3)',
                        background: 'rgba(124, 58, 237, 0.1)',
                      }}
                      title={dec.rationale}
                    >
                      {dec.category}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Issues Section */}
      <div
        className="rounded-2xl border p-6 mb-6"
        style={{ background: '#111111', borderColor: '#222222' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="mono text-[11px] tracking-widest text-[#737373]">
            ISSUES • {issues.length} DETECTED • CRITIQUE PHASE
          </div>
          <div className="flex gap-2">
            <span
              className="mono text-[10px] px-2 py-1 rounded-full text-[#ef4444]"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              1 high
            </span>
            <span
              className="mono text-[10px] px-2 py-1 rounded-full text-[#f59e0b]"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              1 medium
            </span>
            <span
              className="mono text-[10px] px-2 py-1 rounded-full border text-[#737373]"
              style={{ background: '#2a2a2a', borderColor: '#222222' }}
            >
              1 low
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-xl border p-4"
              style={{
                borderColor: `${issue.color}35`,
                background: '#0f0f0f',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center mono text-[10px] font-bold text-white"
                    style={{ background: issue.color }}
                  >
                    {issue.id}
                  </div>
                  <div className="mono text-[11px] font-medium" style={{ color: issue.color }}>
                    [{issue.category}] {issue.severity.toUpperCase()}
                  </div>
                </div>
                <div
                  className="mono text-[9px] px-1.5 py-0.5 rounded-full border text-[#737373]"
                  style={{ borderColor: '#222222' }}
                >
                  conf {issue.confidence} • imp {issue.impact}
                </div>
              </div>

              <div className="space-y-2.5 mono text-[11px]">
                <div>
                  <div className="text-[9px] tracking-widest text-[#737373]">WHAT</div>
                  <div className="mt-1 text-white leading-5">{issue.what}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-widest text-[#737373]">WHY</div>
                  <div className="mt-1 leading-5 text-[#a3a3a3]">{issue.why}</div>
                </div>
                <div className="pt-2 border-t" style={{ borderColor: '#1a1a1a' }}>
                  <div className="text-[9px] tracking-widest text-[#737373]">ACTION</div>
                  <div
                    className="mt-1 px-2 py-1.5 rounded bg-black border mono text-[10px] text-[#a78bfa]"
                    style={{ borderColor: '#222222' }}
                  >
                    {issue.action}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rollbacks & Failure Points */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div
          className="rounded-2xl border p-6"
          style={{ background: '#111111', borderColor: '#222222' }}
        >
          <div className="mono text-[11px] tracking-widest mb-4 text-[#737373]">
            ROLLBACKS • 1
          </div>
          <div
            className="rounded-xl border p-4 mono text-[11px]"
            style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: '#1a1500' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              <span className="font-medium text-[#f59e0b]">
                Iter 1 → Rolled back to Iter 0
              </span>
            </div>
            <div className="leading-5 text-[#a3a3a3]">
              Revision attempted shadow + material + texture. texture_transfer failed with error{' '}
              <span className="text-white font-mono">target+texture</span>. System preserved best score 0.815 and continued with final result.
            </div>
            <div
              className="mt-3 pt-3 border-t mono text-[10px] flex gap-3 text-[#737373]"
              style={{ borderColor: '#2a2a1a' }}
            >
              <span>Improved: False</span>
              <span>•</span>
              <span>Rollback: True</span>
              <span>•</span>
              <span>Strategy: preserve_best</span>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{ background: '#111111', borderColor: '#222222' }}
        >
          <div className="mono text-[11px] tracking-widest mb-4 text-[#737373]">
            FAILURE POINTS • 1
          </div>
          <div
            className="rounded-xl border p-4 mono text-[11px]"
            style={{ borderColor: 'rgba(239, 68, 68, 0.35)', background: '#1a0f0f' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="font-medium text-[#ef4444]">
                primitive.texture_transfer • error target+texture
              </span>
            </div>
            <div className="leading-5 text-[#a3a3a3]">
              Attempt to restore glossy texture via texture_transfer strength 0.3 failed. Likely cause: target buffer mismatch after shadow op or mask invalidation. System handled via rollback — no crash.
            </div>
            <div
              className="mt-3 mono text-[10px] px-2 py-1 rounded inline-block text-[#737373]"
              style={{ background: '#0f0f0f', border: '1px solid #222' }}
            >
              Failure isolated • Pipeline resilient • Final image saved
            </div>
          </div>
        </div>
      </div>

      {/* Autonomous Memory System Explorer (Persistent, Queryable, Inspectable, Editable, Deletable) */}
      {memoryEngine && (
        <div className="mb-6">
          <MemoryExplorer memoryEngine={memoryEngine} />
        </div>
      )}

      {/* Architecture Success Metric Banner */}
      <div
        className="rounded-2xl border p-6 md:p-8 text-center"
        style={{
          background: 'linear-gradient(135deg, #111111 0%, #1a1625 50%, #111111 100%)',
          borderColor: 'rgba(124, 58, 237, 0.25)',
        }}
      >
        <div className="mono text-[10px] tracking-[0.2em] mb-3 text-[#a78bfa]">
          ARCHITECTURE SUCCESS METRIC
        </div>
        <div className="text-[14px] md:text-[16px] leading-7 max-w-[800px] mx-auto text-[#e5e5e5]">
          This test is the main success metric of the architecture — AI autonomously executed{' '}
          <span className="font-bold text-white">11 operations</span>, critiqued itself, attempted
          revision, handled rollback, and produced final result{' '}
          <span className="font-bold text-[#a78bfa]">without step-by-step user instructions</span>.
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 mono text-[10px]">
          <span
            className="px-3 py-1 rounded-full border text-[#737373]"
            style={{ borderColor: '#222222', background: '#0f0f0f' }}
          >
            Analyze → Plan → Execute → Observe → Critique → Revise → Verify
          </span>
          <span className="px-3 py-1 rounded-full text-white bg-[#7c3aed]">
            AUTONOMOUS
          </span>
          <span
            className="px-3 py-1 rounded-full text-[#10b981]"
            style={{ background: '#1a1a1a', border: '1px solid #222222' }}
          >
            PROJECT_MEMORY 1 • WORKFLOW 1 • DECISIONS 2
          </span>
        </div>
      </div>
    </>
  );
};
