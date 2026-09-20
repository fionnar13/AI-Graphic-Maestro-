/**
 * @file RightDock.tsx
 * Collapsible Right Dock Panel for AI Graphic Maestro.
 * Supports dual modes:
 * 1. AI Copilot: Natural language prompting, autonomous pipeline runner, real-time sanitized trace.
 * 2. INSPECTOR: Deep properties control for active layer, transform, blend mode, lighting, and shadow.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Send,
  Play,
  RotateCcw,
  Sun,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  Lock,
  Compass,
  Palette,
  Shield,
  Zap,
} from 'lucide-react';
import { RightDockTab } from './types';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { HistoryEngine } from '../history/HistoryEngine';
import { InspectorPanel } from './InspectorPanel';
import { AICopilotPanel } from './AICopilotPanel';
import { ActivityEvent } from './copilotTypes';

interface RightDockProps {
  currentTab: RightDockTab;
  onTabChange: (tab: RightDockTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // Document & Layer props
  documentEngine?: MaestroDocumentEngine;
  graphicsEngine?: GraphicsEngine;
  historyEngine?: HistoryEngine;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string | null) => void;
  onLayerUpdate?: () => void;
  onActivityEvent?: (event: ActivityEvent) => void;
  // AI props
  userPrompt: string;
  onPromptChange: (val: string) => void;
  onRunAutonomous: () => void;
  isExecuting?: boolean;
  scenarioName?: string;
  onSelectScenarioPreset?: (name: string, prompt: string) => void;
  // Inspector props
  subjectScale: number;
  onSubjectScaleChange: (scale: number) => void;
  shadowBlur: number;
  onShadowBlurChange: (blur: number) => void;
  shadowOpacity: number;
  onShadowOpacityChange: (opacity: number) => void;
  shadowOffset: { x: number; y: number };
  onShadowOffsetChange: (offset: { x: number; y: number }) => void;
  lightIntensity: number;
  onLightIntensityChange: (intensity: number) => void;
  lightDirection: 'top_left' | 'top_right' | 'center' | 'bottom';
  onLightDirectionChange: (dir: 'top_left' | 'top_right' | 'center' | 'bottom') => void;
  recolorBlend: number;
  onRecolorBlendChange: (blend: number) => void;
}

export const RightDock: React.FC<RightDockProps> = ({
  currentTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  documentEngine,
  graphicsEngine,
  historyEngine,
  selectedLayerId,
  onSelectLayer,
  onLayerUpdate,
  onActivityEvent,
  userPrompt,
  onPromptChange,
  onRunAutonomous,
  isExecuting = false,
  scenarioName = 'LUXURY_AD_V1',
  onSelectScenarioPreset,
  subjectScale,
  onSubjectScaleChange,
  shadowBlur,
  onShadowBlurChange,
  shadowOpacity,
  onShadowOpacityChange,
  shadowOffset,
  onShadowOffsetChange,
  lightIntensity,
  onLightIntensityChange,
  lightDirection,
  onLightDirectionChange,
  recolorBlend,
  onRecolorBlendChange,
}) => {
  const [activeBlendMode, setActiveBlendMode] = useState('normal');
  const [layerOpacity, setLayerOpacity] = useState(100);

  const presets = [
    {
      name: 'Luxury Crimson Perfume',
      prompt: 'تبلیغ لوکس ادکلن روی سنگ مرمر با نور استودیویی نرم و سایه تماسی واقعی',
    },
    {
      name: 'Obsidian Matte Watch',
      prompt: 'Minimalist luxury chronograph on textured charcoal stone with dramatic rim light',
    },
    {
      name: 'Emerald Glass Serum',
      prompt: 'Organic skincare glass dropper on wet basalt with gentle botanical rim caustic',
    },
  ];

  if (isCollapsed) {
    return (
      <aside
        className="w-10 select-none border-l flex flex-col items-center py-3 justify-between shrink-0 z-30"
        style={{ background: '#0d0d0d', borderColor: '#1f1f1f' }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
          title="Expand Right Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => {
              onTabChange('ai');
              onToggleCollapse();
            }}
            className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
              currentTab === 'ai' ? 'text-purple-400 bg-purple-950/40' : 'text-[#737373] hover:text-white'
            }`}
            title="Open AI Copilot"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onTabChange('inspector');
              onToggleCollapse();
            }}
            className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
              currentTab === 'inspector' ? 'text-purple-400 bg-purple-950/40' : 'text-[#737373] hover:text-white'
            }`}
            title="Open Inspector"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      </aside>
    );
  }

  return (
    <aside
      className="w-80 select-none border-l flex flex-col justify-between shrink-0 z-30 transition-all duration-150"
      style={{
        background: '#0e0e0e',
        borderColor: '#1f1f1f',
      }}
    >
      {/* Top Dock Header & Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f1f]">
        <div className="flex items-center p-0.5 rounded-lg bg-[#161616] border border-[#242424]">
          <button
            onClick={() => onTabChange('ai')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] mono font-medium transition-colors cursor-pointer ${
              currentTab === 'ai'
                ? 'bg-[#7c3aed] text-white shadow-sm'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>AI COPILOT</span>
          </button>
          <button
            onClick={() => onTabChange('inspector')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] mono font-medium transition-colors cursor-pointer ${
              currentTab === 'inspector'
                ? 'bg-[#7c3aed] text-white shadow-sm'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>INSPECTOR</span>
          </button>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg hover:bg-[#1a1a1a] text-[#737373] hover:text-white transition-colors cursor-pointer"
          title="Collapse Panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dock Content Body */}
      <div className={`flex-1 overflow-y-auto text-xs ${currentTab === 'ai' ? 'p-0 flex flex-col' : 'p-4 space-y-4'}`}>
        {/* TAB 1: AI COPILOT */}
        {currentTab === 'ai' && (
          <div className="flex-1 flex flex-col h-full">
            <AICopilotPanel
              documentEngine={documentEngine}
              graphicsEngine={graphicsEngine}
              historyEngine={historyEngine}
              selectedLayerId={selectedLayerId}
              onLayerUpdate={onLayerUpdate}
              onActivityEvent={onActivityEvent}
            />
          </div>
        )}

        {/* TAB 2: INSPECTOR (Properties) */}
        {currentTab === 'inspector' && (
          <div className="space-y-4">
            {/* Real Interactive Inspector Panel */}
            <div className="-mx-2 -mt-2">
              <InspectorPanel
                documentEngine={documentEngine}
                graphicsEngine={graphicsEngine}
                historyEngine={historyEngine}
                selectedLayerId={selectedLayerId}
                onSelectLayer={onSelectLayer}
                onLayerUpdate={onLayerUpdate}
                compact={true}
              />
            </div>

            {/* Studio Lighting */}
            <div className="space-y-2 pt-2 border-t border-[#1f1f1f]">
              <span className="font-semibold text-white text-[11px] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Studio Lighting</span>
              </span>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="mono text-[10px] text-[#888888]">Light Direction</span>
                  <select
                    value={lightDirection}
                    onChange={(e) => onLightDirectionChange(e.target.value as any)}
                    className="bg-[#141414] border border-[#262626] text-white rounded px-2 py-1 text-[10px] mono"
                  >
                    <option value="top_left">Top-Left (Key)</option>
                    <option value="top_right">Top-Right (Rim)</option>
                    <option value="center">Center (Ambient)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between mono text-[10px]">
                    <span className="text-[#888888]">Intensity</span>
                    <span className="text-amber-300">{lightIntensity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={lightIntensity}
                    onChange={(e) => onLightIntensityChange(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Contact Shadow Parameters */}
            <div className="space-y-2 pt-2 border-t border-[#1f1f1f]">
              <span className="font-semibold text-white text-[11px] block">Contact Shadow</span>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between mono text-[10px]">
                    <span className="text-[#888888]">Shadow Blur</span>
                    <span className="text-white">{shadowBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={shadowBlur}
                    onChange={(e) => onShadowBlurChange(parseInt(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between mono text-[10px]">
                    <span className="text-[#888888]">Shadow Opacity</span>
                    <span className="text-white">{Math.round(shadowOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={shadowOpacity}
                    onChange={(e) => onShadowOpacityChange(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dock Bottom Info Bar */}
      <div className="px-3 py-2 border-t border-[#1f1f1f] bg-[#0b0b0b] flex items-center justify-between text-[10px] mono text-[#666666]">
        <span>MAESTRO COPILOT</span>
        <span className="text-[#10b981]">ONLINE</span>
      </div>
    </aside>
  );
};
