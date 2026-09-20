/**
 * @file PlanTab
 * Displays intent, constraints, Graphic DSL instructions, operations log table, and timeline charts.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { DSLOperation } from '../models/types';

interface PlanTabProps {
  operations: DSLOperation[];
  iterations: { iter: string; score: number; status: string }[];
}

export const PlanTab: React.FC<PlanTabProps> = ({ operations, iterations }) => {
  return (
    <>
      <div className="grid md:grid-cols-12 gap-6 mb-6">
        {/* Constraints & Intent */}
        <div
          className="md:col-span-5 rounded-2xl border p-6"
          style={{ background: '#111111', borderColor: '#222222' }}
        >
          <div className="mono text-[11px] tracking-widest mb-4 text-[#737373]">
            CONSTRAINTS & INTENT
          </div>

          <div className="space-y-4 mono text-[12px]">
            <div
              className="p-3 rounded-xl border"
              style={{ background: '#0f0f0f', borderColor: '#222222' }}
            >
              <div className="text-[10px] tracking-widest mb-2 text-[#737373]">
                INTENT CLASSIFICATION
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#737373]">confidence</span>
                <span className="text-white font-medium">0.90</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
                >
                  high
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {[
                  'background_replacement',
                  'lighting',
                  'shadow',
                  'perspective',
                  'color',
                  'composition',
                  'ad_creation',
                ].map((item) => (
                  <span
                    key={item}
                    className="px-2 py-1 rounded-full text-[10px] border"
                    style={{
                      borderColor: 'rgba(124, 58, 237, 0.3)',
                      background: 'rgba(124, 58, 237, 0.1)',
                      color: '#a78bfa',
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="p-3 rounded-xl border"
              style={{ background: '#0f0f0f', borderColor: '#222222' }}
            >
              <div className="text-[10px] tracking-widest mb-2 text-[#737373]">
                CONSTRAINTS
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#737373]">main_subject_bbox</span>
                  <span className="text-white">[101,101,198,198]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">confidence</span>
                  <span className="text-white">0.89</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">brand_safe</span>
                  <span className="text-[#10b981]">True</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">max_changes</span>
                  <span className="text-white">0.7</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">project_style</span>
                  <span className="text-white">luxury_studio 0.8145</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DSL Program */}
        <div
          className="md:col-span-7 rounded-2xl border p-6"
          style={{ background: '#111111', borderColor: '#222222' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="mono text-[11px] tracking-widest text-[#737373]">
              DSL PROGRAM • 11 OPERATIONS • AUTO-GENERATED
            </div>
            <div
              className="mono text-[10px] px-2 py-1 rounded border text-[#737373]"
              style={{ background: '#1a1a1a', borderColor: '#222222' }}
            >
              maestro_dsl v2
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: '#1e1e1e', background: '#080808' }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2 border-b text-[10px] mono"
              style={{ borderColor: '#1e1e1e', background: '#0f0f0f', color: '#737373' }}
            >
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="ml-2">pipeline.maestro • 11 ops • vision → primitive chain</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="mono text-[11px] leading-6 space-y-0.5">
                {operations.map((op) => (
                  <div key={op.id} className="flex gap-3">
                    <span style={{ color: '#404040' }}>{String(op.id).padStart(2, '0')}</span>
                    <span style={{ color: op.category === 'vision' ? '#a78bfa' : '#e5e5e5' }}>
                      {op.tool}
                    </span>
                    <span className="text-[#737373]">{'->'}</span>
                    <span className="text-[#10b981]">{op.output}</span>
                    <span style={{ color: '#404040' }}>// {op.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="mt-4 mono text-[10px] p-3 rounded-xl border text-[#737373]"
            style={{ background: '#0f0f0f', borderColor: '#222222' }}
          >
            <span className="text-[#a78bfa]">primitive.background_replacement</span> (fg input, bg
            new_background, mask) → composited
            <br />
            <span className="text-[#a78bfa]">primitive.lighting</span> (buffer perspective_corrected,
            intensity 0.25, direction top_left) → relit
            <br />
            <span className="text-[#a78bfa]">primitive.shadow</span> (buffer color_harmonized, offset
            18,18, blur 12, opacity 0.45) → with_shadow
          </div>
        </div>
      </div>

      {/* Detailed Operations Log Table */}
      <div
        className="rounded-2xl border overflow-hidden mb-8"
        style={{ background: '#111111', borderColor: '#222222' }}
      >
        <div className="p-6 pb-0 flex items-center justify-between">
          <div className="mono text-[11px] tracking-widest text-[#737373]">
            OPERATIONS • DETAILED EXECUTION LOG
          </div>
          <div className="mono text-[10px] text-[#737373]">
            total 278.0ms • 10 success • 1 eval
          </div>
        </div>

        <div className="overflow-x-auto p-3">
          <table className="w-full mono text-[11px]">
            <thead>
              <tr className="text-left border-b text-[#737373]" style={{ borderColor: '#222222' }}>
                <th className="py-2 px-3 font-normal">#</th>
                <th className="py-2 px-3 font-normal">TOOL</th>
                <th className="py-2 px-3 font-normal">INPUTS</th>
                <th className="py-2 px-3 font-normal">OUTPUT</th>
                <th className="py-2 px-3 font-normal">TIME</th>
                <th className="py-2 px-3 font-normal">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op) => (
                <tr
                  key={op.id}
                  className="border-b hover:bg-white/[0.02]"
                  style={{ borderColor: '#171717' }}
                >
                  <td className="py-2.5 px-3 text-[#737373]">{op.id}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className="px-2 py-1 rounded-full border"
                      style={{
                        borderColor:
                          op.category === 'vision' ? 'rgba(124, 58, 237, 0.3)' : '#2a2a2a',
                        background:
                          op.category === 'vision' ? 'rgba(124, 58, 237, 0.1)' : '#1a1a1a',
                        color: op.category === 'vision' ? '#a78bfa' : '#e5e5e5',
                      }}
                    >
                      {op.tool}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#737373]">{op.inputs || '—'}</td>
                  <td className="py-2.5 px-3 text-[#10b981]">{op.output}</td>
                  <td className="py-2.5 px-3 text-[#e5e5e5]">{op.timeMs}ms</td>
                  <td className="py-2.5 px-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px]"
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      {op.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Time Breakdown & Iterations Chart */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div
          className="rounded-2xl border p-6"
          style={{ background: '#111111', borderColor: '#222222' }}
        >
          <div className="mono text-[11px] tracking-widest mb-4 text-[#737373]">
            EXECUTION TIME BREAKDOWN
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={operations}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis
                  type="number"
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#222222' }}
                />
                <YAxis
                  type="category"
                  dataKey="tool"
                  tick={{ fill: '#737373', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  width={140}
                  tickFormatter={(val: string) => val.split('.').pop()?.slice(0, 18) || val}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111111',
                    border: '1px solid #222222',
                    borderRadius: 8,
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="timeMs" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{ background: '#111111', borderColor: '#222222' }}
        >
          <div className="mono text-[11px] tracking-widest mb-4 text-[#737373]">
            ITERATIONS TIMELINE
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={iterations} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis
                  dataKey="iter"
                  tick={{ fill: '#737373', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#222222' }}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#222222' }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111111',
                    border: '1px solid #222222',
                    borderRadius: 8,
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ fill: '#7c3aed', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4">
            <div className="flex items-center gap-1.5 mono text-[10px] text-[#737373]">
              <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
              score 0.815 stable
            </div>
            <div className="flex items-center gap-1.5 mono text-[10px] text-[#f59e0b]">
              <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              1 rollback
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
