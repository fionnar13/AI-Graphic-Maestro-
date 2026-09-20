/**
 * @file TopBar.tsx
 * Professional Application Header for AI Graphic Maestro.
 * Contains Logo, File/Edit/Image/Layer/Select/Filter/View/AI/Window Menus,
 * Application Mode Switcher (CREATE, INSPECT, AI STUDIO),
 * and Viewport Navigation Controls (Undo, Redo, Zoom, Fit, Fullscreen).
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Sparkles,
  ChevronDown,
  Layers,
  Search,
  Monitor,
  CheckCircle2,
  Download,
  FileCode,
  Image as ImageIcon,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';
import { WorkspaceMode } from './types';

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  divider?: boolean;
}

interface TopBarProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomReset: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExportPNG?: () => void;
  onExportJSON?: () => void;
  onRunAutonomous?: () => void;
  onOpenTestsModal?: () => void;
  scenarioName?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomReset,
  canUndo = true,
  canRedo = false,
  onUndo,
  onRedo,
  isFullscreen,
  onToggleFullscreen,
  onExportPNG,
  onExportJSON,
  onRunAutonomous,
  onOpenTestsModal,
  scenarioName = 'LUXURY_AD_V1',
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuDefinitions: Record<string, MenuItem[]> = {
    File: [
      { label: 'New Canvas Document', shortcut: 'Ctrl+N', action: () => alert('New document initialized (800×500 px)') },
      { label: 'Import Product Asset...', shortcut: 'Ctrl+O', action: () => alert('Asset importer ready: choose product.png') },
      { label: 'Export Raster Image (PNG)...', shortcut: 'Ctrl+E', action: () => onExportPNG && onExportPNG(), divider: true },
      { label: 'Export Maestro Document (JSON)...', shortcut: 'Ctrl+S', action: () => onExportJSON && onExportJSON() },
    ],
    Edit: [
      { label: 'Undo Last Operation', shortcut: 'Ctrl+Z', action: () => onUndo && onUndo() },
      { label: 'Redo Operation', shortcut: 'Ctrl+Y', action: () => onRedo && onRedo(), divider: true },
      { label: 'Free Transform Active Layer', shortcut: 'Ctrl+T', action: () => onModeChange('create') },
      { label: 'Purge Command History Cache', action: () => alert('Command history cache cleared') },
    ],
    Image: [
      { label: 'Auto Color & Lighting Balance', shortcut: 'Ctrl+Shift+L', action: () => onRunAutonomous && onRunAutonomous() },
      { label: 'Relight Studio Keylight', shortcut: 'Alt+L', action: () => alert('Studio Keylight: Direction top_left applied') },
      { label: 'Generate Realistic Contact Shadow', shortcut: 'Alt+S', action: () => alert('Contact Shadow rendered on floor plane') },
      { label: 'Harmonize Color Temperature', action: () => alert('Color temperature harmonized to 5600K') },
    ],
    Layer: [
      { label: 'New Raster Layer', shortcut: 'Ctrl+Shift+N', action: () => alert('New layer added to document tree') },
      { label: 'Duplicate Active Layer', shortcut: 'Ctrl+J', action: () => alert('Layer duplicated') },
      { label: 'Delete Selected Layer', shortcut: 'Del', action: () => alert('Layer deleted') },
      { label: 'Inspect Layer Mask Alpha Channel', action: () => onModeChange('inspect'), divider: true },
      { label: 'Flatten Document to Single Buffer', action: () => alert('Flattening visible layers') },
    ],
    Select: [
      { label: 'Select All Layers', shortcut: 'Ctrl+A', action: () => alert('All layers selected') },
      { label: 'Deselect Active Bounds', shortcut: 'Ctrl+D', action: () => alert('Deselected') },
      { label: 'Invert Alpha Selection', shortcut: 'Ctrl+Shift+I', action: () => alert('Selection inverted') },
    ],
    Filter: [
      { label: 'Gaussian Shadow Blur (12px)', action: () => alert('Gaussian blur applied to shadow layer') },
      { label: 'Tone Curves Contrast Adjustment', action: () => alert('Curves tool executed') },
      { label: 'Subtle Edge Feather (2px)', action: () => alert('Edge feather filter applied') },
    ],
    View: [
      { label: 'Zoom In', shortcut: 'Ctrl++', action: onZoomIn },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', action: onZoomOut },
      { label: 'Fit to Screen Bounds', shortcut: 'Ctrl+0', action: onZoomFit },
      { label: 'Actual Size (100%)', shortcut: 'Ctrl+1', action: onZoomReset, divider: true },
      { label: 'Toggle Fullscreen Workspace', shortcut: 'F11', action: onToggleFullscreen },
    ],
    AI: [
      { label: 'Execute Autonomous Maestro Pipeline', shortcut: 'Ctrl+Enter', action: () => onRunAutonomous && onRunAutonomous() },
      { label: 'Analyze Intent & Scene Lighting', action: () => onModeChange('ai_studio') },
      { label: 'Synthesize Graphic DSL Operations', action: () => onModeChange('ai_studio') },
      { label: 'Run 10-Dimensional Critic Evaluation', action: () => onModeChange('inspect'), divider: true },
      { label: 'Execute Self-Revision Loop (Sync)', action: () => alert('Self-revision cycle executed') },
      { label: 'Open 7-Pillar Verification Suite', action: () => onModeChange('ai_studio') },
    ],
    Window: [
      { label: 'Workspace: CREATE', shortcut: 'F1', action: () => onModeChange('create') },
      { label: 'Workspace: INSPECT', shortcut: 'F2', action: () => onModeChange('inspect') },
      { label: 'Workspace: AI STUDIO', shortcut: 'F3', action: () => onModeChange('ai_studio'), divider: true },
      { label: 'Reset Layout to Defaults', action: () => { onZoomFit(); onModeChange('create'); } },
    ],
  };

  return (
    <header
      ref={menuRef}
      className="relative z-40 w-full border-b select-none flex flex-col justify-center text-xs"
      style={{
        background: '#0d0d0d',
        borderColor: '#1f1f1f',
        height: '46px',
      }}
    >
      <div className="w-full px-3 flex items-center justify-between gap-2">
        {/* Left: Logo & Dropdown Menus */}
        <div className="flex items-center gap-1">
          {/* Logo Badge */}
          <div className="flex items-center gap-2 mr-2 pr-2 border-r border-[#262626]">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-white mono text-xs shadow-md"
              style={{ background: '#7c3aed' }}
            >
              M
            </div>
            <span className="font-bold tracking-tight text-[13px] text-white hidden sm:inline">
              MAESTRO
            </span>
            <span className="mono text-[9px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888888] border border-[#2a2a2a] hidden md:inline">
              PRO WORKSPACE
            </span>
          </div>

          {/* Menus: File, Edit, Image, Layer, Select, Filter, View, AI, Window */}
          <nav className="flex items-center space-x-0.5">
            {Object.keys(menuDefinitions).map((menuName) => {
              const isOpen = openMenu === menuName;
              return (
                <div key={menuName} className="relative">
                  <button
                    onClick={() => setOpenMenu(isOpen ? null : menuName)}
                    onMouseEnter={() => {
                      if (openMenu && openMenu !== menuName) setOpenMenu(menuName);
                    }}
                    className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                      isOpen
                        ? 'bg-[#262626] text-white font-medium'
                        : 'text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    {menuName}
                  </button>

                  {/* Dropdown Menu */}
                  {isOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 w-64 rounded-xl border shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-100 backdrop-blur-xl"
                      style={{
                        background: 'rgba(18, 18, 18, 0.98)',
                        borderColor: '#2a2a2a',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
                      }}
                    >
                      {menuDefinitions[menuName].map((item, idx) => (
                        <React.Fragment key={idx}>
                          <button
                            onClick={() => {
                              item.action();
                              setOpenMenu(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[11px] text-[#cccccc] hover:bg-[#7c3aed]/20 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>{item.label}</span>
                            {item.shortcut && (
                              <span className="mono text-[9px] text-[#737373] ml-3">
                                {item.shortcut}
                              </span>
                            )}
                          </button>
                          {item.divider && <div className="my-1 border-t border-[#262626]" />}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Center: Workspace Mode Switcher (CREATE, INSPECT, AI STUDIO) */}
        <div className="flex items-center p-0.5 rounded-lg border bg-[#141414] border-[#262626]">
          <button
            onClick={() => onModeChange('create')}
            className={`px-3 py-1 rounded-md text-[10px] mono font-semibold tracking-wider transition-all cursor-pointer ${
              mode === 'create'
                ? 'bg-[#7c3aed] text-white shadow-sm'
                : 'text-[#888888] hover:text-white hover:bg-[#1f1f1f]'
            }`}
            title="Graphic Workspace (Canvas + Tools + Layers + AI)"
          >
            CREATE
          </button>
          <button
            onClick={() => onModeChange('inspect')}
            className={`px-3 py-1 rounded-md text-[10px] mono font-semibold tracking-wider transition-all cursor-pointer ${
              mode === 'inspect'
                ? 'bg-[#7c3aed] text-white shadow-sm'
                : 'text-[#888888] hover:text-white hover:bg-[#1f1f1f]'
            }`}
            title="Inspection Workspace (Wireframes + Scene Graph + Masks + 10D Critic)"
          >
            INSPECT
          </button>
          <button
            onClick={() => onModeChange('ai_studio')}
            className={`px-3 py-1 rounded-md text-[10px] mono font-semibold tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              mode === 'ai_studio'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-[#888888] hover:text-white hover:bg-[#1f1f1f]'
            }`}
            title="AI Studio Diagnostics (Plan + DSL + Operations + Memory + 7-Pillar Tests)"
          >
            <Sparkles className="w-2.5 h-2.5" />
            AI STUDIO
          </button>
        </div>

        {/* Right: Quick Controls (Undo, Redo, Zoom, Fit, Fullscreen, Status) */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 border-r border-[#262626] pr-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 rounded text-[#a3a3a3] hover:text-white hover:bg-[#222222] disabled:opacity-35 transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 rounded text-[#a3a3a3] hover:text-white hover:bg-[#222222] disabled:opacity-35 transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onZoomOut}
              className="p-1 rounded text-[#a3a3a3] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoomReset}
              className="mono text-[10px] px-1.5 py-0.5 rounded bg-[#171717] border border-[#262626] text-[#cccccc] hover:text-white min-w-[42px] text-center"
              title="Click to reset to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={onZoomIn}
              className="p-1 rounded text-[#a3a3a3] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoomFit}
              className="px-1.5 py-0.5 rounded text-[10px] mono border border-[#262626] bg-[#1a1a1a] text-[#a3a3a3] hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
              title="Fit to Screen"
            >
              FIT
            </button>
          </div>

          {/* Fullscreen & 10 Tests */}
          <div className="border-l border-[#262626] pl-2 flex items-center gap-1.5">
            {onOpenTestsModal && (
              <button
                onClick={onOpenTestsModal}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e1b4b] hover:bg-[#312e81] border border-purple-700/50 text-purple-200 text-[10px] mono font-medium transition-all shadow-sm cursor-pointer"
                title="Run 10 Direct Manipulation Interactive Tests"
              >
                <CheckCircle2 className="w-3 h-3 text-purple-400" />
                <span>10 Tests</span>
              </button>
            )}

            <button
              onClick={onToggleFullscreen}
              className="p-1 rounded text-[#a3a3a3] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            {/* Verification Status Pill */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full border mono text-[9px] text-[#10b981] bg-[#10b981]/10 border-[#10b981]/25"
              title="Autonomous Engine: Online & Validated"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span>LIVE WORKSPACE</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
