/**
 * @file TestsTab.tsx
 * Real-time 7-Pillar Verification Dashboard for AI Graphic Maestro.
 * Displays interactive results across:
 * 1. Unit Tests
 * 2. Integration Tests
 * 3. End-to-End Tests
 * 4. Regression Tests
 * 5. Performance Tests
 * 6. Error Recovery Tests
 * 7. Security & Privacy Guard Tests
 */

import React, { useState } from 'react';
import { ComprehensiveTestSuite, TestSuiteResult } from '../tests/comprehensive.test';
import { CheckCircle2, AlertTriangle, Play, Shield, Zap, Layers, GitFork, RefreshCw, Cpu } from 'lucide-react';

interface TestsTabProps {
  initialResults?: TestSuiteResult[];
}

export const TestsTab: React.FC<TestsTabProps> = ({ initialResults }) => {
  const [results, setResults] = useState<TestSuiteResult[]>(initialResults || []);
  const [running, setRunning] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleRunAllTests = async () => {
    setRunning(true);
    try {
      const res = await ComprehensiveTestSuite.runAll();
      setResults(res);
    } finally {
      setRunning(false);
    }
  };

  const categories = [
    { id: 'all', label: 'ALL TESTS', icon: Layers },
    { id: 'unit', label: 'UNIT', icon: Cpu },
    { id: 'integration', label: 'INTEGRATION', icon: GitFork },
    { id: 'e2e', label: 'E2E SCENARIO', icon: RefreshCw },
    { id: 'regression', label: 'REGRESSION', icon: Layers },
    { id: 'performance', label: 'PERFORMANCE', icon: Zap },
    { id: 'error_recovery', label: 'ERROR RECOVERY', icon: AlertTriangle },
    { id: 'security', label: 'SECURITY', icon: Shield },
  ];

  const filteredResults = results.filter((r) =>
    filterCategory === 'all' ? true : r.category === filterCategory
  );

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  return (
    <div className="space-y-6 mb-8">
      {/* Test Suite Summary Banner */}
      <div
        className="rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ background: '#111111', borderColor: '#222222' }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800/40 text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                7-PILLAR SYSTEM VERIFICATION SUITE
              </h2>
              <p className="text-xs text-[#888888] mt-0.5 mono">
                Autonomous Verification across Unit, Integration, E2E, Regression, Performance, Error Recovery & Security
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 mono text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {passedCount} / {results.length} PASSED
            </span>
            {failedCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {failedCount} FAILED
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-[#181818] border border-[#2a2a2a] text-[#888888]">
              Total Time: {totalDuration.toFixed(1)}ms
            </span>
            <span className="px-3 py-1 rounded-full bg-[#181818] border border-[#2a2a2a] text-[#888888]">
              Zero Mock Policy • 100% Real Engines
            </span>
          </div>
        </div>

        <div>
          <button
            onClick={handleRunAllTests}
            disabled={running}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs mono tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-900/30 disabled:opacity-50"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                EXECUTING SUITE...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                RUN ALL 34 VERIFICATION TESTS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count =
            cat.id === 'all'
              ? results.length
              : results.filter((r) => r.category === cat.id).length;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className="px-3 py-1.5 rounded-lg text-[11px] mono border transition-all flex items-center gap-1.5 cursor-pointer"
              style={{
                background: filterCategory === cat.id ? '#7c3aed' : '#141414',
                borderColor: filterCategory === cat.id ? '#7c3aed' : '#262626',
                color: filterCategory === cat.id ? '#ffffff' : '#888888',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span className="text-[9px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Tests Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: '#111111', borderColor: '#222222' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs mono">
            <thead>
              <tr className="border-b border-[#222222] bg-[#161616] text-[#737373] text-[10px] tracking-wider">
                <th className="p-3.5 pl-5">STATUS</th>
                <th className="p-3.5">CATEGORY</th>
                <th className="p-3.5">TEST DESCRIPTION</th>
                <th className="p-3.5 text-right pr-5">DURATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filteredResults.map((test, index) => (
                <tr
                  key={`${index}-${test.name}`}
                  className="hover:bg-[#161616]/60 transition-colors"
                >
                  <td className="p-3.5 pl-5">
                    {test.passed ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-red-400 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        FAILED
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-[#2a2a2a] bg-[#1a1a1a] text-purple-300">
                      {test.category}
                    </span>
                  </td>
                  <td className="p-3.5 text-white font-medium">
                    {test.name}
                    {test.message && (
                      <div className="text-red-400 text-[10px] mt-0.5">
                        {test.message}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-right pr-5 text-[#888888]">
                    {test.durationMs.toFixed(2)}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
