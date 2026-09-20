/**
 * @file InspectorPanel.tsx
 * Real Interactive Property Inspector for AI Graphic Maestro.
 * Supports:
 * - Real inspection of active layer / object
 * - Type, Position (X, Y), Size (Width, Height), Rotation, Opacity, Blend Mode, Mask, Bounds
 * - Live editable controls with direct updates to DocumentEngine & GraphicsEngine
 * - Command-driven state mutation
 */

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  RotateCw,
  Eye,
  Lock,
  Layers,
  Sparkles,
  Square,
  Type,
  Image as ImageIcon,
  SlidersHorizontal,
  Folder,
  Shield,
  Trash2,
  RefreshCw,
  Maximize2,
} from 'lucide-react';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { HistoryEngine } from '../history/HistoryEngine';
import { DocumentMutationCommand } from '../history/commands/DocumentMutationCommand';
import { DocumentLayer, BlendMode, MaskType } from '../models/document.types';

interface InspectorPanelProps {
  documentEngine?: MaestroDocumentEngine;
  graphicsEngine?: GraphicsEngine;
  historyEngine?: HistoryEngine;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string | null) => void;
  onLayerUpdate?: () => void;
  compact?: boolean;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  documentEngine,
  graphicsEngine,
  historyEngine,
  selectedLayerId,
  onSelectLayer,
  onLayerUpdate,
  compact = false,
}) => {
  const layer = (documentEngine && selectedLayerId) ? documentEngine.getLayer(selectedLayerId) : null;

  // Local state synced with active layer
  const [posX, setPosX] = useState(layer?.bounds.x ?? 0);
  const [posY, setPosY] = useState(layer?.bounds.y ?? 0);
  const [width, setWidth] = useState(layer?.bounds.width ?? 100);
  const [height, setHeight] = useState(layer?.bounds.height ?? 100);
  const [rotation, setRotation] = useState(layer?.transform.rotation ?? 0);
  const [opacity, setOpacity] = useState(layer ? Math.round(layer.opacity * 100) : 100);
  const [blendMode, setBlendMode] = useState<BlendMode>(layer?.blendMode ?? 'normal');
  const [layerName, setLayerName] = useState(layer?.name ?? '');

  // Keep local state in sync when selectedLayerId or layer changes externally
  useEffect(() => {
    if (layer) {
      setPosX(Math.round(layer.bounds.x));
      setPosY(Math.round(layer.bounds.y));
      setWidth(Math.round(layer.bounds.width));
      setHeight(Math.round(layer.bounds.height));
      setRotation(Math.round(layer.transform.rotation || 0));
      setOpacity(Math.round(layer.opacity * 100));
      setBlendMode(layer.blendMode);
      setLayerName(layer.name);
    }
  }, [layer?.id, layer?.bounds.x, layer?.bounds.y, layer?.bounds.width, layer?.bounds.height, layer?.transform.rotation, layer?.opacity, layer?.blendMode, layer?.name]);

  const triggerUpdate = () => {
    if (graphicsEngine) {
      graphicsEngine.renderDocument();
    }
    if (onLayerUpdate) {
      onLayerUpdate();
    }
  };

  if (!layer) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-full text-[#777]">
        <Layers className="w-8 h-8 text-[#444] mb-2" />
        <span className="text-xs font-semibold text-[#aaa]">No Layer Selected</span>
        <p className="text-[10px] text-[#666] max-w-[200px] mt-1">
          Select an object on the canvas or click a layer in the Layers list to inspect its properties.
        </p>
      </div>
    );
  }

  // Handle Position Change
  const updatePosition = (newX: number, newY: number) => {
    setPosX(newX);
    setPosY(newY);
    if (documentEngine && layer) {
      if (historyEngine) {
        const cmd = new DocumentMutationCommand(
          'Move Position',
          'transform.position',
          { layerId: layer.id, x: newX, y: newY },
          documentEngine,
          (doc) => doc.setBounds(layer.id, { x: newX, y: newY }),
          graphicsEngine
        );
        void historyEngine.executeCommand(cmd);
      } else {
        documentEngine.setBounds(layer.id, { x: newX, y: newY });
      }
      triggerUpdate();
    }
  };

  // Handle Size Change
  const updateSize = (newW: number, newH: number) => {
    const clampedW = Math.max(10, newW);
    const clampedH = Math.max(10, newH);
    setWidth(clampedW);
    setHeight(clampedH);
    if (documentEngine && layer) {
      if (historyEngine) {
        const cmd = new DocumentMutationCommand(
          'Resize Layer',
          'transform.resize',
          { layerId: layer.id, width: clampedW, height: clampedH },
          documentEngine,
          (doc) => doc.setBounds(layer.id, { width: clampedW, height: clampedH }),
          graphicsEngine
        );
        void historyEngine.executeCommand(cmd);
      } else {
        documentEngine.setBounds(layer.id, { width: clampedW, height: clampedH });
      }
      triggerUpdate();
    }
  };

  // Handle Rotation Change
  const updateRotation = (rot: number) => {
    setRotation(rot);
    if (documentEngine && layer) {
      if (historyEngine) {
        const cmd = new DocumentMutationCommand(
          'Rotate Layer',
          'transform.rotate',
          { layerId: layer.id, rotation: rot },
          documentEngine,
          (doc) => doc.setTransform(layer.id, { rotation: rot }),
          graphicsEngine
        );
        void historyEngine.executeCommand(cmd);
      } else {
        documentEngine.setTransform(layer.id, { rotation: rot });
      }
      triggerUpdate();
    }
  };

  // Handle Opacity Change
  const updateOpacity = (opPercent: number) => {
    const clamped = Math.max(0, Math.min(100, opPercent));
    setOpacity(clamped);
    if (documentEngine && layer) {
      if (historyEngine) {
        const cmd = new DocumentMutationCommand(
          'Change Opacity',
          'layer.opacity',
          { layerId: layer.id, opacity: clamped / 100 },
          documentEngine,
          (doc) => doc.setOpacity(layer.id, clamped / 100),
          graphicsEngine
        );
        void historyEngine.executeCommand(cmd);
      } else {
        documentEngine.setOpacity(layer.id, clamped / 100);
      }
      triggerUpdate();
    }
  };

  // Handle Blend Mode Change
  const updateBlendMode = (mode: BlendMode) => {
    setBlendMode(mode);
    if (documentEngine && layer) {
      if (historyEngine) {
        const cmd = new DocumentMutationCommand(
          'Change Blend Mode',
          'layer.blend_mode',
          { layerId: layer.id, blendMode: mode },
          documentEngine,
          (doc) => doc.setBlendMode(layer.id, mode),
          graphicsEngine
        );
        void historyEngine.executeCommand(cmd);
      } else {
        documentEngine.setBlendMode(layer.id, mode);
      }
      triggerUpdate();
    }
  };

  // Handle Name Commit
  const commitName = () => {
    if (documentEngine && layer && layerName.trim()) {
      const newName = layerName.trim();
      if (historyEngine) {
        const cmd = new DocumentMutationCommand(
          'Rename Layer',
          'layer.rename',
          { layerId: layer.id, newName },
          documentEngine,
          (doc) => doc.renameLayer(layer.id, newName),
          graphicsEngine
        );
        void historyEngine.executeCommand(cmd);
      } else {
        documentEngine.renameLayer(layer.id, newName);
      }
      triggerUpdate();
    }
  };

  // Mask Operations
  const handleCreateMask = () => {
    if (documentEngine && layer) {
      documentEngine.createDefaultMask(layer.id);
      triggerUpdate();
    }
  };

  const handleToggleMask = () => {
    if (documentEngine && layer && layer.mask) {
      documentEngine.toggleMaskEnabled(layer.id);
      triggerUpdate();
    }
  };

  const handleInvertMask = () => {
    if (documentEngine && layer && layer.mask) {
      documentEngine.invertMask(layer.id);
      triggerUpdate();
    }
  };

  const handleFeatherChange = (feather: number) => {
    if (documentEngine && layer && layer.mask) {
      documentEngine.setMaskFeather(layer.id, feather);
      triggerUpdate();
    }
  };

  const handleDeleteMask = () => {
    if (documentEngine && layer) {
      documentEngine.removeLayerMask(layer.id);
      triggerUpdate();
    }
  };

  return (
    <div className={`space-y-3.5 text-xs select-none ${compact ? 'p-2' : 'p-3'}`}>
      {/* 1. LAYER IDENTITY HEADER */}
      <div className="bg-[#141414] border border-[#222222] p-2.5 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="mono text-[9px] text-[#737373]">INSPECTOR</span>
          <span className="mono text-[9px] px-1.5 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-800/40 uppercase">
            {layer.type}
          </span>
        </div>

        {/* Editable Name Field */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={layerName}
            onChange={(e) => setLayerName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && commitName()}
            className="w-full bg-[#0c0a09] border border-[#2e2e2e] focus:border-purple-500 rounded px-2 py-1 text-xs text-white font-medium outline-none transition-colors"
            placeholder="Layer name"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#777] mono pt-1 border-t border-[#1c1c1c]">
          <span>ID: {layer.id}</span>
          <span className="text-[#999]">{layer.visible ? 'Visible' : 'Hidden'} • {layer.locked ? 'Locked' : 'Unlocked'}</span>
        </div>
      </div>

      {/* 2. POSITION & SIZE (BOUNDS) */}
      <div className="space-y-1.5">
        <span className="mono text-[9px] text-[#737373] block uppercase">Position & Dimensions</span>
        <div className="grid grid-cols-2 gap-2">
          {/* X */}
          <div className="bg-[#141414] border border-[#242424] rounded-lg p-1.5 flex items-center justify-between">
            <span className="mono text-[9px] text-[#737373]">X</span>
            <input
              type="number"
              value={posX}
              onChange={(e) => updatePosition(parseInt(e.target.value) || 0, posY)}
              className="w-16 text-right bg-transparent text-white font-mono text-[11px] outline-none"
            />
          </div>

          {/* Y */}
          <div className="bg-[#141414] border border-[#242424] rounded-lg p-1.5 flex items-center justify-between">
            <span className="mono text-[9px] text-[#737373]">Y</span>
            <input
              type="number"
              value={posY}
              onChange={(e) => updatePosition(posX, parseInt(e.target.value) || 0)}
              className="w-16 text-right bg-transparent text-white font-mono text-[11px] outline-none"
            />
          </div>

          {/* Width */}
          <div className="bg-[#141414] border border-[#242424] rounded-lg p-1.5 flex items-center justify-between">
            <span className="mono text-[9px] text-[#737373]">W</span>
            <input
              type="number"
              value={width}
              onChange={(e) => updateSize(parseInt(e.target.value) || 10, height)}
              className="w-16 text-right bg-transparent text-white font-mono text-[11px] outline-none"
            />
          </div>

          {/* Height */}
          <div className="bg-[#141414] border border-[#242424] rounded-lg p-1.5 flex items-center justify-between">
            <span className="mono text-[9px] text-[#737373]">H</span>
            <input
              type="number"
              value={height}
              onChange={(e) => updateSize(width, parseInt(e.target.value) || 10)}
              className="w-16 text-right bg-transparent text-white font-mono text-[11px] outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. ROTATION & TRANSFORM */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="mono text-[9px] text-[#737373] uppercase">Rotation Angle</span>
          <div className="flex items-center gap-1">
            <span className="mono text-[10px] text-white">{rotation}°</span>
            {rotation !== 0 && (
              <button
                onClick={() => updateRotation(0)}
                className="text-[9px] text-purple-400 hover:text-purple-300 ml-1 cursor-pointer"
                title="Reset angle to 0°"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={-180}
            max={180}
            value={rotation}
            onChange={(e) => updateRotation(parseInt(e.target.value))}
            className="w-full h-1 accent-purple-500 bg-[#333] rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* 4. BLENDING & OPACITY */}
      <div className="space-y-2 pt-1 border-t border-[#1f1f1f]">
        <span className="mono text-[9px] text-[#737373] block uppercase">Compositing & Blend</span>

        {/* Blend Mode Dropdown */}
        <div className="flex items-center justify-between bg-[#141414] border border-[#242424] p-1.5 rounded-lg">
          <span className="mono text-[10px] text-[#888]">Blend Mode</span>
          <select
            value={blendMode}
            onChange={(e) => updateBlendMode(e.target.value as BlendMode)}
            className="bg-[#1c1c1c] border border-[#333] text-white rounded px-2 py-0.5 text-[10px] mono outline-none cursor-pointer"
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
            <option value="color-dodge">Color Dodge</option>
            <option value="color-burn">Color Burn</option>
            <option value="hard-light">Hard Light</option>
            <option value="soft-light">Soft Light</option>
            <option value="difference">Difference</option>
          </select>
        </div>

        {/* Opacity Slider */}
        <div className="space-y-1">
          <div className="flex justify-between mono text-[10px]">
            <span className="text-[#888]">Opacity</span>
            <span className="text-white">{opacity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => updateOpacity(parseInt(e.target.value))}
            className="w-full h-1 accent-purple-500 bg-[#333] rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* 5. MASK SYSTEM CONTROLS */}
      <div className="space-y-2 pt-2 border-t border-[#1f1f1f]">
        <div className="flex items-center justify-between">
          <span className="mono text-[9px] text-[#737373] uppercase">Layer Mask</span>
          {layer.mask && (
            <span className="mono text-[9px] text-purple-400 bg-purple-950/40 px-1.5 py-0.2 rounded">
              {layer.mask.type}
            </span>
          )}
        </div>

        {!layer.mask ? (
          <button
            onClick={handleCreateMask}
            className="w-full py-1.5 px-2 rounded bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/40 text-purple-300 text-[10px] mono flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Shield className="w-3 h-3 text-purple-400" />
            <span>+ Add Alpha Mask</span>
          </button>
        ) : (
          <div className="bg-[#141414] border border-[#242424] p-2 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium text-[11px]">Mask Active</span>
              <button
                onClick={handleToggleMask}
                className={`px-2 py-0.5 rounded mono text-[9px] cursor-pointer transition-colors ${
                  layer.mask.enabled
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                    : 'bg-[#222] text-[#888] border border-[#333]'
                }`}
              >
                {layer.mask.enabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Invert & Delete */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleInvertMask}
                className={`py-1 px-2 rounded mono text-[9px] flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  layer.mask.inverted
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#1a1a1a] hover:bg-[#252525] text-purple-300 border border-[#333]'
                }`}
                title="Invert mask clipping"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>{layer.mask.inverted ? 'Inverted (Active)' : 'Invert Mask'}</span>
              </button>

              <button
                onClick={handleDeleteMask}
                className="py-1 px-2 rounded bg-red-950/20 hover:bg-red-900/40 text-red-300 border border-red-900/30 mono text-[9px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Remove mask from layer"
              >
                <Trash2 className="w-2.5 h-2.5 text-red-400" />
                <span>Delete Mask</span>
              </button>
            </div>

            {/* Feather slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between mono text-[9px]">
                <span className="text-[#888]">Edge Feather</span>
                <span className="text-white">{layer.mask.feather || 0} px</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={layer.mask.feather || 0}
                onChange={(e) => handleFeatherChange(parseInt(e.target.value))}
                className="w-full h-1 accent-purple-500 bg-[#333] rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
