/**
 * @file ToolBar.tsx
 * Contextual Secondary Options Toolbar.
 * Displays dynamic parameters and adjustments tailored to the currently active tool from the Left Toolbox.
 */

import React from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Maximize2,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  Scissors,
  Sun,
  Shield,
  Palette,
  Check,
} from 'lucide-react';
import { ToolId } from './types';
import { WORKSPACE_TOOLS } from './toolsConfig';

interface ToolBarProps {
  activeToolId: ToolId;
  subjectScale: number;
  onSubjectScaleChange: (scale: number) => void;
  shadowBlur: number;
  onShadowBlurChange: (blur: number) => void;
  shadowOpacity: number;
  onShadowOpacityChange: (opacity: number) => void;
  lightIntensity: number;
  onLightIntensityChange: (intensity: number) => void;
  lightDirection: 'top_left' | 'top_right' | 'center' | 'bottom';
  onLightDirectionChange: (dir: 'top_left' | 'top_right' | 'center' | 'bottom') => void;
  onAutoHarmonize?: () => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  activeToolId,
  subjectScale,
  onSubjectScaleChange,
  shadowBlur,
  onShadowBlurChange,
  shadowOpacity,
  onShadowOpacityChange,
  lightIntensity,
  onLightIntensityChange,
  lightDirection,
  onLightDirectionChange,
  onAutoHarmonize,
}) => {
  const currentTool = WORKSPACE_TOOLS.find((t) => t.id === activeToolId) || WORKSPACE_TOOLS[0];
  const Icon = currentTool.icon;

  return (
    <div
      className="w-full border-b select-none flex items-center justify-between px-3 text-xs overflow-x-auto"
      style={{
        background: '#111111',
        borderColor: '#222222',
        height: '38px',
        minHeight: '38px',
      }}
    >
      {/* Active Tool Identity & Engine Status */}
      <div className="flex items-center gap-2 pr-3 border-r border-[#262626] shrink-0">
        <div className="p-1 rounded bg-[#1f1f1f] text-[#a78bfa] flex items-center justify-center">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white tracking-wide text-[11px]">
            {currentTool.name}
          </span>
          <span className="mono text-[9px] text-[#737373] bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#2a2a2a]">
            {currentTool.id}
          </span>
          <span
            className={`mono text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
              currentTool.status === 'engine_active'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
            }`}
          >
            {currentTool.statusLabel}
          </span>
        </div>
      </div>

      {/* Contextual Options based on selected tool */}
      <div className="flex items-center gap-3 px-3 overflow-x-auto shrink-0">
        {/* Tool: Select or Move */}
        {(activeToolId === 'tool.select' || activeToolId === 'tool.move') && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="mono text-[10px] text-[#888888]">Mode:</span>
              <select className="bg-[#1a1a1a] border border-[#2e2e2e] text-white rounded px-2 py-0.5 text-[11px] mono focus:outline-none focus:border-purple-500">
                <option>Layer Bounding Box</option>
                <option>Auto Select Group</option>
                <option>Pixel Alpha Channel</option>
              </select>
            </div>
            <div className="w-[1px] h-3.5 bg-[#262626]" />
            <div className="flex items-center gap-1">
              <button
                className="p-1 rounded hover:bg-[#222222] text-[#888888] hover:text-white"
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1 rounded hover:bg-[#222222] text-[#888888] hover:text-white"
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1 rounded hover:bg-[#222222] text-[#888888] hover:text-white"
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tool: Transform */}
        {activeToolId === 'tool.transform' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="mono text-[10px] text-[#888888]">Scale:</span>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={subjectScale}
                onChange={(e) => onSubjectScaleChange(parseFloat(e.target.value))}
                className="w-20 accent-purple-500 cursor-pointer"
              />
              <span className="mono text-[10px] text-white min-w-[36px]">
                {Math.round(subjectScale * 100)}%
              </span>
            </div>
            <div className="w-[1px] h-3.5 bg-[#262626]" />
            <div className="flex items-center gap-1.5">
              <span className="mono text-[10px] text-[#888888]">Perspective Tilt:</span>
              <span className="mono text-[10px] text-purple-400 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-900/40">
                Floor Plane (3D Matched)
              </span>
            </div>
          </div>
        )}

        {/* Tool: Mask */}
        {activeToolId === 'tool.mask' && (
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] text-[#888888]">Mask Pipeline:</span>
            <span className="mono text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
              Alpha Cutout Active (Bbox: 320, 160, 160, 160)
            </span>
            <button className="mono text-[10px] px-2 py-0.5 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#cccccc] border border-[#333333]">
              Refine Edges (Feather 2px)
            </button>
          </div>
        )}

        {/* Tool: Crop */}
        {activeToolId === 'tool.crop' && (
          <div className="flex items-center gap-3">
            <span className="mono text-[10px] text-[#888888]">Ratio:</span>
            <select className="bg-[#1a1a1a] border border-[#2e2e2e] text-white rounded px-2 py-0.5 text-[11px] mono">
              <option>16:10 (800×500) • Default</option>
              <option>1:1 (Square Ad)</option>
              <option>16:9 (Hero Banner)</option>
              <option>9:16 (Story / Reel)</option>
            </select>
          </div>
        )}

        {/* Lighting & Shadow Contextual Tweakers */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#262626]">
          {/* Light Intensity */}
          <div className="flex items-center gap-1.5">
            <Sun className="w-3 h-3 text-amber-400" />
            <span className="mono text-[10px] text-[#888888]">Light:</span>
            <input
              type="range"
              min={0.0}
              max={1.0}
              step={0.05}
              value={lightIntensity}
              onChange={(e) => onLightIntensityChange(parseFloat(e.target.value))}
              className="w-16 accent-amber-500 cursor-pointer"
            />
            <span className="mono text-[10px] text-amber-300 min-w-[28px]">
              {lightIntensity.toFixed(2)}
            </span>
          </div>

          {/* Light Direction */}
          <div className="flex items-center gap-1.5">
            <select
              value={lightDirection}
              onChange={(e) => onLightDirectionChange(e.target.value as any)}
              className="bg-[#1a1a1a] border border-[#2e2e2e] text-white rounded px-1.5 py-0.5 text-[10px] mono"
            >
              <option value="top_left">Top-Left (Key)</option>
              <option value="top_right">Top-Right (Rim)</option>
              <option value="center">Center (Ambient)</option>
            </select>
          </div>

          {/* Shadow Blur */}
          <div className="flex items-center gap-1.5">
            <span className="mono text-[10px] text-[#888888]">Shadow Blur:</span>
            <input
              type="range"
              min={0}
              max={30}
              value={shadowBlur}
              onChange={(e) => onShadowBlurChange(parseInt(e.target.value))}
              className="w-14 accent-purple-500 cursor-pointer"
            />
            <span className="mono text-[10px] text-[#cccccc] min-w-[24px]">{shadowBlur}px</span>
          </div>
        </div>
      </div>

      {/* Right Quick Action: Auto Harmonize */}
      <div className="shrink-0 pl-3">
        <button
          onClick={onAutoHarmonize}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#7c3aed]/20 hover:bg-[#7c3aed]/40 border border-[#7c3aed]/40 text-[#c4b5fd] text-[10px] mono font-medium transition-colors cursor-pointer"
          title="Auto Harmonize Lighting, Shadows, and Color"
        >
          <Sparkles className="w-3 h-3 text-[#a78bfa]" />
          <span>AUTO HARMONIZE</span>
        </button>
      </div>
    </div>
  );
};
