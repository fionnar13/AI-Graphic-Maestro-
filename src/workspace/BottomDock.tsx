/**
 * @file BottomDock.tsx
 * Multi-tab Bottom Dock for AI Graphic Maestro.
 * Hosts:
 * - Layers: Layer hierarchy tree, visibility, locks, blend modes.
 * - Properties: Document canvas dimensions, color profile, guides.
 * - Assets: 3 Authentic input sources (Product, Environment, Style Ref).
 * - History: Undo/Redo timeline and Rollback checkpoints.
 * - AI Activity: Complete Critic 10D scores, tool execution stats, and diagnostic KPI integration.
 */

import React, { useState } from 'react';
import {
  Layers as LayersIcon,
  Sliders,
  FolderOpen,
  History as HistoryIcon,
  Activity,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { BottomDockTab, WorkspaceMode } from './types';
import { HistorySnapshot, CriticEvaluationResult } from '../models/types';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { HistoryEngine } from '../history/HistoryEngine';
import { LayerPanel } from './LayerPanel';
import { InspectorPanel } from './InspectorPanel';
import { AssetBrowserPanel } from './AssetBrowserPanel';
import { HistoryPanel } from './HistoryPanel';
import { AIActivityMonitor } from './AIActivityMonitor';
import { ActivityEvent } from './copilotTypes';

interface BottomDockProps {
  currentTab: BottomDockTab;
  onTabChange: (tab: BottomDockTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  documentEngine?: MaestroDocumentEngine;
  graphicsEngine?: GraphicsEngine;
  historyEngine?: HistoryEngine;
  historySnapshots: HistorySnapshot[];
  onRollbackToSnapshot?: (id: string) => void;
  criticResult?: CriticEvaluationResult;
  onSwitchToAIStudio: () => void;
  scenarioName?: string;
  onSelectScenarioPreset?: (name: string, prompt: string) => void;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string | null) => void;
  onLayerUpdate?: () => void;
  activityEvents?: ActivityEvent[];
  onClearLogs?: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  currentTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  documentEngine,
  graphicsEngine,
  historyEngine,
  historySnapshots,
  onRollbackToSnapshot,
  criticResult,
  onSwitchToAIStudio,
  scenarioName = 'Luxury Crimson Hero',
  onSelectScenarioPreset,
  selectedLayerId,
  onSelectLayer,
  onLayerUpdate,
  activityEvents = [],
  onClearLogs,
}) => {
  // Fallback layers state
  const [fallbackLayers, setFallbackLayers] = useState([
    { id: 'l_relight', name: 'Keylight Relighting', type: 'adjustment', visible: true, locked: false, opacity: 25, blend: 'screen' },
    { id: 'l_product', name: 'Hero Product (Perfume)', type: 'raster', visible: true, locked: false, opacity: 100, blend: 'normal' },
    { id: 'l_shadow', name: 'Contact Shadow (Floor)', type: 'raster', visible: true, locked: false, opacity: 45, blend: 'multiply' },
    { id: 'l_bg', name: 'Luxury Marble Studio Base', type: 'raster', visible: true, locked: true, opacity: 100, blend: 'normal' },
  ]);

  const rawDocLayers = documentEngine ? documentEngine.getAllLayers() : [];
  const layers = rawDocLayers.length > 0
    ? rawDocLayers.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        visible: l.visible,
        locked: l.locked,
        opacity: Math.round(l.opacity * 100),
        blend: l.blendMode,
      }))
    : fallbackLayers;

  const currentSelectedId = selectedLayerId || (layers[0]?.id ?? 'l_product');

  const handleSelect = (id: string) => {
    if (onSelectLayer) {
      onSelectLayer(id);
    }
  };

  const toggleLayerVisibility = (id: string) => {
    if (documentEngine) {
      const l = documentEngine.getLayer(id);
      if (l) {
        documentEngine.setVisibility(id, !l.visible);
        if (onLayerUpdate) onLayerUpdate();
      }
    } else {
      setFallbackLayers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
      );
    }
  };

  const toggleLayerLock = (id: string) => {
    if (documentEngine) {
      const l = documentEngine.getLayer(id);
      if (l) {
        documentEngine.setLocked(id, !l.locked);
        if (onLayerUpdate) onLayerUpdate();
      }
    } else {
      setFallbackLayers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
      );
    }
  };

  if (isCollapsed) {
    return (
      <div
        className="w-full select-none border-t flex items-center justify-between px-3 shrink-0 z-30"
        style={{
          background: '#0d0d0d',
          borderColor: '#1f1f1f',
          height: '28px',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-[#1f1f1f] text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
            title="Expand Bottom Dock"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2 text-[10px] mono text-[#737373]">
            <span>DOCK:</span>
            <button
              onClick={() => {
                onTabChange('layers');
                onToggleCollapse();
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Layers ({layers.length})
            </button>
            <span>•</span>
            <button
              onClick={() => {
                onTabChange('ai_activity');
                onToggleCollapse();
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
            >
              AI Activity (Score: {criticResult?.overallScore.toFixed(2) || '8.85'})
            </button>
          </div>
        </div>

        <div className="mono text-[9px] text-[#555555]">
          PRESS TO EXPAND DOCK
        </div>
      </div>
    );
  }

  return (
    <section
      className="w-full select-none border-t flex flex-col justify-between shrink-0 z-30 transition-all duration-150"
      style={{
        background: '#0e0e0e',
        borderColor: '#1f1f1f',
        height: '210px',
      }}
    >
      {/* Dock Header & Tabs */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1f1f1f] bg-[#0b0b0b]">
        <div className="flex items-center space-x-1">
          {/* Tabs */}
          {[
            { id: 'layers', label: 'Layers', icon: LayersIcon, count: layers.length },
            { id: 'properties', label: 'Properties', icon: Sliders },
            { id: 'assets', label: 'Assets (3 Sources)', icon: FolderOpen },
            { id: 'history', label: 'History', icon: HistoryIcon, count: historySnapshots.length },
            { id: 'ai_activity', label: 'AI Activity & Diagnostics', icon: Activity, highlight: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as BottomDockTab)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] mono font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#7c3aed] text-white shadow-sm'
                    : tab.highlight
                    ? 'text-purple-400 hover:text-white hover:bg-[#1a1a1a]'
                    : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[9px] px-1 rounded ${
                      isActive ? 'bg-black/30 text-white' : 'bg-[#222] text-[#737373]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {currentTab === 'ai_activity' && (
            <button
              onClick={onSwitchToAIStudio}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800/40 text-purple-300 text-[10px] mono transition-colors cursor-pointer"
              title="Open full AI Studio benchmark workspace"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span>FULL AI STUDIO</span>
            </button>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-[#1a1a1a] text-[#737373] hover:text-white transition-colors cursor-pointer"
            title="Collapse Bottom Dock"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {/* TAB 1: LAYERS */}
        {currentTab === 'layers' && (
          <LayerPanel
            documentEngine={documentEngine}
            graphicsEngine={graphicsEngine}
            historyEngine={historyEngine}
            selectedLayerId={selectedLayerId}
            onSelectLayer={onSelectLayer}
            onLayerUpdate={onLayerUpdate}
          />
        )}

        {/* TAB 2: PROPERTIES (Inspector) */}
        {currentTab === 'properties' && (
          <div className="h-full overflow-y-auto">
            <InspectorPanel
              documentEngine={documentEngine}
              graphicsEngine={graphicsEngine}
              historyEngine={historyEngine}
              selectedLayerId={selectedLayerId}
              onSelectLayer={onSelectLayer}
              onLayerUpdate={onLayerUpdate}
            />
          </div>
        )}

        {/* TAB 3: ASSETS */}
        {currentTab === 'assets' && (
          <AssetBrowserPanel
            documentEngine={documentEngine}
            graphicsEngine={graphicsEngine}
            onSelectLayer={onSelectLayer}
            onLayerUpdate={onLayerUpdate}
          />
        )}

        {/* TAB 4: HISTORY */}
        {currentTab === 'history' && (
          <HistoryPanel
            historyEngine={historyEngine}
            graphicsEngine={graphicsEngine}
            historySnapshots={historySnapshots}
            onRollbackToSnapshot={onRollbackToSnapshot}
            onLayerUpdate={onLayerUpdate}
          />
        )}

        {/* TAB 5: AI ACTIVITY & DIAGNOSTICS */}
        {currentTab === 'ai_activity' && (
          <AIActivityMonitor
            activityEvents={activityEvents}
            criticResult={criticResult}
            onClearLogs={onClearLogs}
          />
        )}
      </div>
    </section>
  );
};
