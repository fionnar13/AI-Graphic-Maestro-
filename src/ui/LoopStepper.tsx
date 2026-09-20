/**
 * @file LoopStepper
 * Visual stepper for the 7-phase autonomous loop.
 */

import React from 'react';
import { StageStatus } from '../models/types';

interface LoopStepperProps {
  stages: StageStatus[];
}

export const LoopStepper: React.FC<LoopStepperProps> = ({ stages }) => {
  return (
    <div
      className="rounded-2xl border p-5 md:p-6 mb-8"
      style={{ background: '#111111', borderColor: '#222222' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="mono text-[11px] tracking-widest text-[#737373]">
          AUTONOMOUS EXECUTION LOOP — NO STEP-BY-STEP INSTRUCTIONS
        </div>
        <div
          className="mono text-[10px] px-2 py-1 rounded"
          style={{ background: '#1a1a1a', color: '#a78bfa', border: '1px solid #2a2a2a' }}
        >
          11 OPS • SELF-CRITIQUE • ROLLBACK CAPABLE
        </div>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {stages.map((stage, idx) => (
          <div key={stage.name} className="flex items-center shrink-0">
            <div
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full border text-[11px] mono font-medium transition-all ${
                stage.active ? 'text-white' : ''
              }`}
              style={{
                background: stage.active ? '#7c3aed' : stage.done ? '#1e1e1e' : '#111111',
                borderColor: stage.active ? '#7c3aed' : stage.done ? '#2a2a2a' : '#1a1a1a',
                color: stage.active ? 'white' : stage.done ? '#e5e5e5' : '#737373',
                boxShadow: stage.active ? '0 0 20px rgba(124, 58, 237, 0.35)' : 'none',
              }}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                style={{
                  background: stage.done ? '#10b981' : '#222222',
                  color: stage.done ? 'white' : '#737373',
                }}
              >
                {stage.done ? '✓' : idx + 1}
              </div>
              {stage.name}
            </div>

            {idx < stages.length - 1 && (
              <div
                className="w-6 md:w-10 h-[1px] mx-1"
                style={{ background: stage.done ? '#2a2a2a' : '#1a1a1a' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
