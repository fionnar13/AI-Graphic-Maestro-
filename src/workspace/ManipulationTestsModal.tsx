/**
 * @file ManipulationTestsModal.tsx
 * Interactive Test Suite Modal for Prompt 13.2.
 * Executes all 10 real manipulation operations on the Document and Canvas:
 * 1. Import Image
 * 2. Display on Canvas
 * 3. Select Object/Layer
 * 4. Move
 * 5. Scale
 * 6. Rotate
 * 7. Zoom
 * 8. Pan
 * 9. Crop
 * 10. Undo
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  X,
  Sparkles,
  Layers,
  Move,
  Maximize2,
  RefreshCw,
  Crop,
  ZoomIn,
} from 'lucide-react';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { ManipulationTestSuite } from '../tests/manipulation.test';
import { InteractiveTestItem } from './types';

interface ManipulationTestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphicsEngine: GraphicsEngine;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onSelectLayer: (layerId: string | null) => void;
  onLayerUpdate?: () => void;
}

export const ManipulationTestsModal: React.FC<ManipulationTestsModalProps> = ({
  isOpen,
  onClose,
  graphicsEngine,
  onZoomChange,
  onPanChange,
  onSelectLayer,
  onLayerUpdate,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<InteractiveTestItem[]>([
    { id: 't1', name: '1. Import Image', description: 'Import PNG/JPG/WebP as document layer', status: 'pending' },
    { id: 't2', name: '2. Display on Canvas', description: 'Real 2D composite rasterization', status: 'pending' },
    { id: 't3', name: '3. Select Object/Layer', description: 'Hit-test pinpointing & bounding box', status: 'pending' },
    { id: 't4', name: '4. Move', description: 'Translation on canvas coordinate matrix', status: 'pending' },
    { id: 't5', name: '5. Scale', description: 'Interactive resize handle scaling', status: 'pending' },
    { id: 't6', name: '6. Rotate', description: 'Angular transformation around anchor', status: 'pending' },
    { id: 't7', name: '7. Zoom', description: 'Cursor-anchored viewport scaling', status: 'pending' },
    { id: 't8', name: '8. Pan', description: 'Space+Drag & Hand tool navigation', status: 'pending' },
    { id: 't9', name: '9. Crop', description: 'Real document & canvas bounds crop', status: 'pending' },
    { id: 't10', name: '10. Undo', description: 'Historical rollback of document state', status: 'pending' },
  ]);

  if (!isOpen) return null;

  const handleRunAll = async () => {
    setIsRunning(true);
    try {
      const results = await ManipulationTestSuite.runAll(
        graphicsEngine,
        onZoomChange,
        onPanChange,
        onSelectLayer
      );
      setTestResults(results);
      if (onLayerUpdate) onLayerUpdate();
    } finally {
      setIsRunning(false);
    }
  };

  const passedCount = testResults.filter((t) => t.status === 'passed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: '#121212',
          borderColor: '#292929',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#a78bfa]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                CANVAS MANIPULATION VERIFICATION SUITE
              </h2>
              <p className="mono text-[11px] text-[#888888]">
                Prompt 13.2 • 10 Direct Graphics Operations & Document State Verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[#888888] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Scorecard Bar */}
        <div className="px-5 py-3 bg-[#181818] border-b border-[#222222] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="mono text-xs text-[#a3a3a3]">Passed:</span>
              <span className="mono text-xs font-bold text-emerald-400">
                {passedCount} / 10
              </span>
            </div>
            <div className="h-3 w-[1px] bg-[#333333]" />
            <div className="flex items-center gap-2">
              <span className="mono text-xs text-[#a3a3a3]">Status:</span>
              <span
                className={`mono text-xs font-semibold ${
                  passedCount === 10
                    ? 'text-emerald-400'
                    : passedCount > 0
                    ? 'text-purple-400'
                    : 'text-amber-400'
                }`}
              >
                {passedCount === 10 ? 'ALL VERIFIED OPTIMAL' : 'READY TO RUN'}
              </span>
            </div>
          </div>

          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white mono text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isRunning ? 'RUNNING 10 TESTS...' : 'RUN ALL 10 TESTS'}</span>
          </button>
        </div>

        {/* Test Items List */}
        <div className="p-5 max-h-[420px] overflow-y-auto space-y-2.5">
          {testResults.map((item, idx) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                item.status === 'passed'
                  ? 'bg-[#15231c] border-[#10b981]/30'
                  : item.status === 'running'
                  ? 'bg-[#211a2f] border-[#7c3aed]/40'
                  : 'bg-[#161616] border-[#242424]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {item.status === 'passed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : item.status === 'running' ? (
                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#555555] flex items-center justify-center mono text-[9px] text-[#888888]">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-white">{item.name}</h3>
                    <span
                      className={`mono text-[9px] px-1.5 py-0.2 rounded uppercase ${
                        item.status === 'passed'
                          ? 'bg-emerald-900/50 text-emerald-300'
                          : item.status === 'running'
                          ? 'bg-purple-900/50 text-purple-300'
                          : 'bg-[#262626] text-[#888888]'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a3a3a3] mt-0.5">
                    {item.description}
                  </p>
                  {item.details && (
                    <div className="mono text-[10px] text-emerald-300/90 mt-1 bg-black/40 px-2 py-0.5 rounded border border-white/5 inline-block">
                      {item.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#222222] bg-[#141414] flex items-center justify-between text-xs text-[#888888]">
          <span className="mono text-[10px]">
            Engine: Real HTML5 Canvas 2D • Pipeline: MaestroDocumentEngine State
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg hover:bg-white/10 text-white mono text-[11px] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
