/**
 * @file LeftToolbox.tsx
 * Professional Vertical Graphic Toolbox for AI Graphic Maestro.
 * Renders all 13 primary graphic tools with clean industrial ergonomics,
 * keyboard shortcut tags, tool ID annotations, and active engine states.
 */

import React, { useState } from 'react';
import { ToolId } from './types';
import { WORKSPACE_TOOLS, ToolConfigItem } from './toolsConfig';

interface LeftToolboxProps {
  activeToolId: ToolId;
  onSelectTool: (id: ToolId) => void;
}

export const LeftToolbox: React.FC<LeftToolboxProps> = ({
  activeToolId,
  onSelectTool,
}) => {
  const [hoveredTool, setHoveredTool] = useState<ToolConfigItem | null>(null);

  // Group tools by categories:
  // 1: Selection & Transform
  // 2: Retouch & Mask
  // 3: Vector & Typography
  // 4: Navigation
  const group1 = WORKSPACE_TOOLS.filter((t) => t.category === 'select' || t.category === 'transform');
  const group2 = WORKSPACE_TOOLS.filter((t) => t.category === 'retouch');
  const group3 = WORKSPACE_TOOLS.filter((t) => t.category === 'vector');
  const group4 = WORKSPACE_TOOLS.filter((t) => t.category === 'navigate');

  const renderToolButton = (tool: ToolConfigItem) => {
    const isActive = activeToolId === tool.id;
    const Icon = tool.icon;

    return (
      <div key={tool.id} className="relative group">
        <button
          onClick={() => onSelectTool(tool.id)}
          onMouseEnter={() => setHoveredTool(tool)}
          onMouseLeave={() => setHoveredTool(null)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
            isActive
              ? 'bg-[#7c3aed] text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400/50'
              : 'text-[#9e9e9e] hover:text-white hover:bg-[#1f1f1f]'
          }`}
          title={`${tool.name} (${tool.shortcut}) — ${tool.id}`}
        >
          <Icon className="w-4 h-4" />

          {/* Micro status dot */}
          <span
            className={`absolute bottom-1 right-1 w-1 h-1 rounded-full ${
              tool.status === 'engine_active' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
        </button>

        {/* Floating Tooltip with full metadata */}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col gap-1 p-2.5 rounded-xl border bg-[#141414] border-[#2c2c2c] shadow-2xl z-50 pointer-events-none w-52 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white text-[11px]">{tool.name}</span>
            <span className="mono text-[9px] px-1.5 py-0.5 rounded bg-[#222222] text-[#c4b5fd] border border-[#333333]">
              Key: {tool.shortcut}
            </span>
          </div>

          <div className="mono text-[9px] text-[#737373] flex items-center justify-between border-t border-[#222222] pt-1 mt-0.5">
            <span>{tool.id}</span>
            <span
              className={
                tool.status === 'engine_active' ? 'text-emerald-400' : 'text-amber-400'
              }
            >
              {tool.statusLabel}
            </span>
          </div>

          <p className="text-[10px] text-[#a3a3a3] leading-tight mt-0.5">
            {tool.description}
          </p>
        </div>
      </div>
    );
  };

  return (
    <aside
      className="w-12 select-none border-r flex flex-col items-center py-3 justify-between shrink-0 z-30"
      style={{
        background: '#0d0d0d',
        borderColor: '#1f1f1f',
      }}
    >
      {/* Tool Groups */}
      <div className="flex flex-col items-center space-y-1">
        {/* Selection & Transform */}
        <div className="flex flex-col items-center space-y-1">
          {group1.map(renderToolButton)}
        </div>

        <div className="w-6 h-[1px] bg-[#222222] my-1" />

        {/* Retouch & Mask */}
        <div className="flex flex-col items-center space-y-1">
          {group2.map(renderToolButton)}
        </div>

        <div className="w-6 h-[1px] bg-[#222222] my-1" />

        {/* Vector & Text */}
        <div className="flex flex-col items-center space-y-1">
          {group3.map(renderToolButton)}
        </div>

        <div className="w-6 h-[1px] bg-[#222222] my-1" />

        {/* Navigation (Hand & Zoom) */}
        <div className="flex flex-col items-center space-y-1">
          {group4.map(renderToolButton)}
        </div>
      </div>

      {/* Bottom status badge indicator */}
      <div className="flex flex-col items-center gap-1 pt-2 border-t border-[#1f1f1f] w-full">
        <span
          className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"
          title="13 Graphic Tools Registered"
        />
        <span className="mono text-[8px] text-[#555555]">13 T</span>
      </div>
    </aside>
  );
};
