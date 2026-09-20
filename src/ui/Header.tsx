/**
 * @file Header
 * Top branding and status navigation header.
 */

import React from 'react';

interface HeaderProps {
  pipelineVersion?: string;
  runDate?: string;
  scenarioName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  pipelineVersion = 'v1.0.4',
  runDate = '2025-11-20',
  scenarioName = 'LUXURY_AD_V1',
}) => {
  return (
    <div
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{ background: 'rgba(10,10,10,0.85)', borderColor: '#222222' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white mono text-sm"
            style={{ background: '#7c3aed' }}
          >
            M
          </div>
          <div>
            <div className="font-bold tracking-tight text-[15px] leading-none text-white">
              MAESTRO BENCHMARK
            </div>
            <div className="text-[11px] tracking-widest mono mt-[3px] text-[#737373]">
              AUTONOMOUS GRAPHICS PIPELINE • {pipelineVersion}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] mono"
            style={{ borderColor: '#2a2a2a', color: '#737373' }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse bg-[#10b981]" />
            VERIFIED RUN • {runDate}
          </div>
          <div
            className="px-3 py-1.5 rounded-full text-[11px] mono font-medium text-white shadow-sm"
            style={{ background: '#7c3aed' }}
          >
            {scenarioName}
          </div>
        </div>
      </div>
    </div>
  );
};
