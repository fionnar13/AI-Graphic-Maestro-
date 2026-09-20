/**
 * @file LayerPanel.tsx
 * Real Layer Management Panel for AI Graphic Maestro.
 * Supports:
 * - Real layer hierarchy and stacking order traversal
 * - Create (Raster, Vector, Text, Group, Adjustment)
 * - Delete, Duplicate, Inline Rename
 * - Move Up / Move Down in stacking order
 * - Group / Ungroup
 * - Visibility Toggle & Lock Toggle
 * - Real-time Opacity slider & Blend Mode selector
 * - Layer Mask management (Create Mask, Toggle Mask, Invert Mask, Delete Mask)
 * - Synchronized selection with Canvas Workspace
 */

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  FolderPlus,
  FolderMinus,
  Edit2,
  Check,
  X,
  Sparkles,
  Type,
  Square,
  Image as ImageIcon,
  Sliders,
  Folder,
  SlidersHorizontal,
} from 'lucide-react';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { HistoryEngine } from '../history/HistoryEngine';
import { DocumentMutationCommand } from '../history/commands/DocumentMutationCommand';
import { DocumentLayer, LayerType, BlendMode } from '../models/document.types';

interface LayerPanelProps {
  documentEngine?: MaestroDocumentEngine;
  graphicsEngine?: GraphicsEngine;
  historyEngine?: HistoryEngine;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string | null) => void;
  onLayerUpdate?: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  documentEngine,
  graphicsEngine,
  historyEngine,
  selectedLayerId,
  onSelectLayer,
  onLayerUpdate,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Read all document layers
  const docLayers: DocumentLayer[] = documentEngine ? documentEngine.getAllLayers() : [];

  // Layers in rendering order: in canvas rendering, index 0 is at the bottom, last index is on top.
  // In graphic editors (like Photoshop/Figma), the layer panel displays top layers at the top of the list.
  // So we reverse for display order, or display clearly with stacking rank:
  const displayLayers = [...docLayers].reverse();

  const handleSelect = (id: string) => {
    if (onSelectLayer) {
      onSelectLayer(id);
    }
  };

  const triggerUpdate = () => {
    if (graphicsEngine) {
      graphicsEngine.renderDocument();
    }
    if (onLayerUpdate) {
      onLayerUpdate();
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!documentEngine) return;
    if (historyEngine) {
      const cmd = new DocumentMutationCommand(
        'Toggle Visibility',
        'layer.visibility',
        { layerId: id },
        documentEngine,
        (doc) => doc.toggleVisibility(id),
        graphicsEngine
      );
      void historyEngine.executeCommand(cmd);
    } else {
      documentEngine.toggleVisibility(id);
    }
    triggerUpdate();
  };

  // Toggle Lock
  const handleToggleLock = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!documentEngine) return;
    if (historyEngine) {
      const cmd = new DocumentMutationCommand(
        'Toggle Lock',
        'layer.lock',
        { layerId: id },
        documentEngine,
        (doc) => doc.toggleLocked(id),
        graphicsEngine
      );
      void historyEngine.executeCommand(cmd);
    } else {
      documentEngine.toggleLocked(id);
    }
    triggerUpdate();
  };

  // Start Rename
  const handleStartRename = (e: React.MouseEvent, layer: DocumentLayer) => {
    e.stopPropagation();
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  // Save Rename
  const handleSaveRename = (id: string) => {
    if (documentEngine && editingName.trim()) {
      const newName = editingName.trim();
      if (historyEngine) {
        const cmd = new DocumentMutationCommand(
          'Rename Layer',
          'layer.rename',
          { layerId: id, newName },
          documentEngine,
          (doc) => doc.renameLayer(id, newName),
          graphicsEngine
        );
        void historyEngine.executeCommand(cmd);
      } else {
        documentEngine.renameLayer(id, newName);
      }
      triggerUpdate();
    }
    setEditingId(null);
  };

  // Create New Layer
  const handleCreateLayer = (type: LayerType) => {
    if (!documentEngine) return;
    const canvas = documentEngine.getCanvas();
    const cw = canvas.dimensions.width || 800;
    const ch = canvas.dimensions.height || 500;

    const layerCount = docLayers.length + 1;
    let name = `Layer ${layerCount}`;
    let bounds = { x: Math.round(cw * 0.25), y: Math.round(ch * 0.25), width: Math.round(cw * 0.5), height: Math.round(ch * 0.5) };
    let content: any = { kind: 'raster' };

    if (type === 'text') {
      name = `Headline ${layerCount}`;
      bounds = { x: Math.round(cw * 0.2), y: Math.round(ch * 0.4), width: 360, height: 60 };
      content = { kind: 'text', text: 'Maestro Graphic Typography', fontSize: 28, color: '#ffffff', fontWeight: 600, align: 'left' };
    } else if (type === 'vector') {
      name = `Shape Card ${layerCount}`;
      bounds = { x: Math.round(cw * 0.3), y: Math.round(ch * 0.3), width: 220, height: 160 };
      content = { kind: 'vector', shapeType: 'rectangle', fillColor: '#7c3aed', cornerRadius: 12 };
    } else if (type === 'group') {
      name = `Group ${layerCount}`;
      content = { kind: 'group', childIds: [] };
    } else if (type === 'adjustment') {
      name = `Adjustment Layer ${layerCount}`;
      bounds = { x: 0, y: 0, width: cw, height: ch };
      content = { kind: 'adjustment', filterType: 'vignette', parameters: { strength: 0.3 } };
    }

    const created = documentEngine.createLayer({
      name,
      type,
      bounds,
      opacity: 1,
      blendMode: 'normal',
      content,
    });

    setShowCreateMenu(false);
    if (onSelectLayer && created) {
      onSelectLayer(created.id);
    }
    triggerUpdate();
  };

  // Duplicate Selected
  const handleDuplicate = () => {
    if (!documentEngine || !selectedLayerId) return;
    if (historyEngine) {
      const cmd = new DocumentMutationCommand(
        'Duplicate Layer',
        'layer.duplicate',
        { layerId: selectedLayerId },
        documentEngine,
        (doc) => {
          const dup = doc.duplicateLayer(selectedLayerId);
          if (dup && onSelectLayer) onSelectLayer(dup.id);
        },
        graphicsEngine
      );
      void historyEngine.executeCommand(cmd);
    } else {
      const dup = documentEngine.duplicateLayer(selectedLayerId);
      if (dup && onSelectLayer) {
        onSelectLayer(dup.id);
      }
    }
    triggerUpdate();
  };

  // Delete Selected
  const handleDelete = () => {
    if (!documentEngine || !selectedLayerId) return;
    if (historyEngine) {
      const cmd = new DocumentMutationCommand(
        'Delete Layer',
        'layer.delete',
        { layerId: selectedLayerId },
        documentEngine,
        (doc) => {
          doc.deleteLayer(selectedLayerId);
          const remaining = doc.getAllLayers();
          if (onSelectLayer) {
            onSelectLayer(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
          }
        },
        graphicsEngine
      );
      void historyEngine.executeCommand(cmd);
    } else {
      documentEngine.deleteLayer(selectedLayerId);
      const remaining = documentEngine.getAllLayers();
      if (onSelectLayer) {
        onSelectLayer(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
    }
    triggerUpdate();
  };

  // Move Up in stacking order
  const handleMoveUp = () => {
    if (!documentEngine || !selectedLayerId) return;
    if (historyEngine) {
      const cmd = new DocumentMutationCommand(
        'Move Layer Up',
        'layer.move_up',
        { layerId: selectedLayerId },
        documentEngine,
        (doc) => doc.moveLayerUp(selectedLayerId),
        graphicsEngine
      );
      void historyEngine.executeCommand(cmd);
    } else {
      documentEngine.moveLayerUp(selectedLayerId);
    }
    triggerUpdate();
  };

  // Move Down in stacking order
  const handleMoveDown = () => {
    if (!documentEngine || !selectedLayerId) return;
    if (historyEngine) {
      const cmd = new DocumentMutationCommand(
        'Move Layer Down',
        'layer.move_down',
        { layerId: selectedLayerId },
        documentEngine,
        (doc) => doc.moveLayerDown(selectedLayerId),
        graphicsEngine
      );
      void historyEngine.executeCommand(cmd);
    } else {
      documentEngine.moveLayerDown(selectedLayerId);
    }
    triggerUpdate();
  };

  // Group Selected Layer
  const handleGroup = () => {
    if (!documentEngine || !selectedLayerId) return;
    if (historyEngine) {
      const cmd = new DocumentMutationCommand(
        'Group Layer',
        'layer.group',
        { layerId: selectedLayerId },
        documentEngine,
        (doc) => {
          const grp = doc.groupLayers([selectedLayerId], 'Layer Group');
          if (grp && onSelectLayer) onSelectLayer(grp.id);
        },
        graphicsEngine
      );
      void historyEngine.executeCommand(cmd);
    } else {
      const grp = documentEngine.groupLayers([selectedLayerId], 'Layer Group');
      if (grp && onSelectLayer) {
        onSelectLayer(grp.id);
      }
    }
    triggerUpdate();
  };

  // Ungroup if group is selected
  const handleUngroup = () => {
    if (!documentEngine || !selectedLayerId) return;
    const layer = documentEngine.getLayer(selectedLayerId);
    if (layer && layer.type === 'group') {
      if (historyEngine) {
        const cmd = new DocumentMutationCommand(
          'Ungroup Layer',
          'layer.ungroup',
          { layerId: selectedLayerId },
          documentEngine,
          (doc) => doc.ungroup(selectedLayerId),
          graphicsEngine
        );
        void historyEngine.executeCommand(cmd);
      } else {
        documentEngine.ungroup(selectedLayerId);
      }
      triggerUpdate();
    }
  };

  // Change Opacity
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (!documentEngine) return;
    const val = parseFloat(e.target.value) / 100;
    if (historyEngine) {
      const cmd = new DocumentMutationCommand(
        'Change Opacity',
        'layer.opacity',
        { layerId: id, opacity: val },
        documentEngine,
        (doc) => doc.setOpacity(id, val),
        graphicsEngine
      );
      void historyEngine.executeCommand(cmd);
    } else {
      documentEngine.setOpacity(id, val);
    }
    triggerUpdate();
  };

  // Change Blend Mode
  const handleBlendModeChange = (e: React.ChangeEvent<HTMLSelectElement>, id: string) => {
    if (!documentEngine) return;
    const mode = e.target.value as BlendMode;
    if (historyEngine) {
      const cmd = new DocumentMutationCommand(
        'Change Blend Mode',
        'layer.blend_mode',
        { layerId: id, blendMode: mode },
        documentEngine,
        (doc) => doc.setBlendMode(id, mode),
        graphicsEngine
      );
      void historyEngine.executeCommand(cmd);
    } else {
      documentEngine.setBlendMode(id, mode);
    }
    triggerUpdate();
  };

  // Toggle Mask
  const handleToggleMask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!documentEngine) return;
    const layer = documentEngine.getLayer(id);
    if (!layer) return;

    if (!layer.mask) {
      documentEngine.createDefaultMask(id);
    } else {
      documentEngine.toggleMaskEnabled(id);
    }
    triggerUpdate();
  };

  // Invert Mask
  const handleInvertMask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!documentEngine) return;
    documentEngine.invertMask(id);
    triggerUpdate();
  };

  // Delete Mask
  const handleDeleteMask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!documentEngine) return;
    documentEngine.removeLayerMask(id);
    triggerUpdate();
  };

  // Layer Type Icon helper
  const renderTypeIcon = (type: LayerType) => {
    switch (type) {
      case 'raster':
        return <ImageIcon className="w-3 h-3 text-cyan-400" />;
      case 'vector':
        return <Square className="w-3 h-3 text-purple-400" />;
      case 'text':
        return <Type className="w-3 h-3 text-amber-400" />;
      case 'group':
        return <Folder className="w-3 h-3 text-emerald-400" />;
      case 'adjustment':
        return <SlidersHorizontal className="w-3 h-3 text-pink-400" />;
      default:
        return <Square className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="flex gap-3 h-full select-none">
      {/* 1. LAYER LIST */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
        {displayLayers.length === 0 ? (
          <div className="text-[#666] text-center py-6 mono text-[11px] border border-dashed border-[#262626] rounded-xl">
            No layers found in document. Click "New Layer" to create one.
          </div>
        ) : (
          displayLayers.map((layer) => {
            const isSelected = selectedLayerId === layer.id;
            const isEditing = editingId === layer.id;

            return (
              <div
                key={layer.id}
                onClick={() => handleSelect(layer.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1e1a29] border-purple-500/80 shadow-[0_0_12px_rgba(124,58,237,0.25)] text-white'
                    : 'bg-[#141414] border-[#222222] text-[#cccccc] hover:bg-[#181818] hover:border-[#333333]'
                }`}
              >
                {/* Left: Visibility, Lock, Icon, Name */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Visibility Button */}
                  <button
                    onClick={(e) => handleToggleVisibility(e, layer.id)}
                    className="p-1 rounded hover:bg-black/40 transition-colors text-[#737373] hover:text-white shrink-0 cursor-pointer"
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-[#555]" />
                    )}
                  </button>

                  {/* Lock Button */}
                  <button
                    onClick={(e) => handleToggleLock(e, layer.id)}
                    className="p-1 rounded hover:bg-black/40 transition-colors text-[#737373] hover:text-white shrink-0 cursor-pointer"
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {layer.locked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-[#444]" />
                    )}
                  </button>

                  {/* Layer Type Badge */}
                  <div
                    className="p-1 rounded bg-[#202020] border border-[#2e2e2e] shrink-0"
                    title={`Type: ${layer.type}`}
                  >
                    {renderTypeIcon(layer.type)}
                  </div>

                  {/* Editable Name */}
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1 flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(layer.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="bg-[#0c0a09] border border-purple-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full max-w-[140px]"
                      />
                      <button
                        onClick={() => handleSaveRename(layer.id)}
                        className="p-0.5 text-emerald-400 hover:text-emerald-300"
                        title="Save name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-0.5 text-[#777] hover:text-white"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span
                        className="font-medium text-[11px] truncate"
                        onDoubleClick={(e) => handleStartRename(e, layer)}
                        title="Double-click to rename"
                      >
                        {layer.name}
                      </span>
                      <button
                        onClick={(e) => handleStartRename(e, layer)}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-[#666] hover:text-white p-0.5"
                        title="Rename layer"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Center: Mask Badge & Controls */}
                <div className="flex items-center gap-1.5 px-2">
                  {layer.mask ? (
                    <div className="flex items-center gap-1 bg-[#1a1329] border border-purple-800/60 rounded px-1.5 py-0.5 text-[9px] mono">
                      <button
                        onClick={(e) => handleToggleMask(e, layer.id)}
                        className={`cursor-pointer font-bold ${
                          layer.mask.enabled ? 'text-purple-300' : 'text-gray-500 line-through'
                        }`}
                        title={layer.mask.enabled ? 'Disable mask' : 'Enable mask'}
                      >
                        MASK {layer.mask.enabled ? 'ON' : 'OFF'}
                      </button>
                      <button
                        onClick={(e) => handleInvertMask(e, layer.id)}
                        className={`px-1 rounded cursor-pointer ${
                          layer.mask.inverted ? 'bg-purple-600 text-white' : 'text-purple-400 hover:bg-purple-900/50'
                        }`}
                        title="Invert mask"
                      >
                        INV
                      </button>
                      <button
                        onClick={(e) => handleDeleteMask(e, layer.id)}
                        className="text-red-400 hover:text-red-300 ml-0.5 cursor-pointer"
                        title="Delete mask"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleToggleMask(e, layer.id)}
                      className="text-[9px] mono text-[#666] hover:text-purple-300 px-1 py-0.5 rounded hover:bg-purple-950/40 border border-transparent hover:border-purple-800/40 transition-colors cursor-pointer"
                      title="Add alpha mask"
                    >
                      + Mask
                    </button>
                  )}
                </div>

                {/* Right: Blend Mode, Opacity Slider */}
                <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Blend Mode Dropdown */}
                  <select
                    value={layer.blendMode}
                    onChange={(e) => handleBlendModeChange(e, layer.id)}
                    className="bg-[#1a1a1a] border border-[#2d2d2d] hover:border-[#444] text-white rounded px-1.5 py-0.5 text-[10px] mono outline-none cursor-pointer"
                    title="Layer Blend Mode"
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

                  {/* Opacity Control */}
                  <div className="flex items-center gap-1.5 w-24">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(layer.opacity * 100)}
                      onChange={(e) => handleOpacityChange(e, layer.id)}
                      className="w-14 h-1 accent-purple-500 bg-[#333] rounded-lg cursor-pointer"
                      title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
                    />
                    <span className="mono text-[10px] text-[#aaa] w-7 text-right">
                      {Math.round(layer.opacity * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. LAYER ACTIONS SIDE TOOLBAR */}
      <div className="w-40 border-l border-[#222222] pl-3 flex flex-col justify-between shrink-0">
        <div className="space-y-1.5">
          <span className="mono text-[9px] text-[#737373] block mb-1">LAYER OPERATIONS</span>

          {/* New Layer Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="w-full py-1.5 px-2 rounded bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/50 text-[10px] text-purple-200 font-medium flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>New Layer</span>
              </div>
              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
            </button>

            {showCreateMenu && (
              <div className="absolute left-0 bottom-full mb-1 w-44 bg-[#141414] border border-[#2e2e2e] rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                <button
                  onClick={() => handleCreateLayer('raster')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#202020] text-xs text-white flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Raster Layer</span>
                </button>
                <button
                  onClick={() => handleCreateLayer('vector')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#202020] text-xs text-white flex items-center gap-2 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-purple-400" />
                  <span>Vector Shape</span>
                </button>
                <button
                  onClick={() => handleCreateLayer('text')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#202020] text-xs text-white flex items-center gap-2 cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5 text-amber-400" />
                  <span>Text Layer</span>
                </button>
                <button
                  onClick={() => handleCreateLayer('adjustment')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#202020] text-xs text-white flex items-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
                  <span>Adjustment Layer</span>
                </button>
                <button
                  onClick={() => handleCreateLayer('group')}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#202020] text-xs text-white flex items-center gap-2 cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5 text-emerald-400" />
                  <span>New Folder / Group</span>
                </button>
              </div>
            )}
          </div>

          {/* Duplicate Button */}
          <button
            onClick={handleDuplicate}
            disabled={!selectedLayerId}
            className="w-full py-1.5 px-2 rounded bg-[#171717] hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed border border-[#262626] text-[10px] text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Duplicate selected layer"
          >
            <Copy className="w-3 h-3 text-purple-400" />
            <span>Duplicate</span>
          </button>

          {/* Move Up & Move Down Stack */}
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={handleMoveUp}
              disabled={!selectedLayerId}
              className="py-1 px-1 rounded bg-[#171717] hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed border border-[#262626] text-[9px] text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Move layer up (towards top)"
            >
              <ChevronUp className="w-3 h-3 text-cyan-400" />
              <span>Up</span>
            </button>
            <button
              onClick={handleMoveDown}
              disabled={!selectedLayerId}
              className="py-1 px-1 rounded bg-[#171717] hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed border border-[#262626] text-[9px] text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Move layer down (towards bottom)"
            >
              <ChevronDown className="w-3 h-3 text-cyan-400" />
              <span>Down</span>
            </button>
          </div>

          {/* Group & Ungroup */}
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={handleGroup}
              disabled={!selectedLayerId}
              className="py-1 px-1 rounded bg-[#171717] hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed border border-[#262626] text-[9px] text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Group selected layer"
            >
              <FolderPlus className="w-3 h-3 text-emerald-400" />
              <span>Group</span>
            </button>
            <button
              onClick={handleUngroup}
              disabled={!selectedLayerId}
              className="py-1 px-1 rounded bg-[#171717] hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed border border-[#262626] text-[9px] text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Ungroup if group is selected"
            >
              <FolderMinus className="w-3 h-3 text-amber-400" />
              <span>Ungroup</span>
            </button>
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={!selectedLayerId}
            className="w-full py-1.5 px-2 rounded bg-red-950/20 hover:bg-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed border border-red-900/30 text-[10px] text-red-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Delete selected layer"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
            <span>Delete Layer</span>
          </button>
        </div>

        {/* Footer Meta */}
        <div className="pt-2 border-t border-[#1f1f1f] mono text-[9px] text-[#666] space-y-0.5">
          <div className="flex justify-between">
            <span>Total Layers:</span>
            <span className="text-white font-bold">{docLayers.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Active:</span>
            <span className="text-purple-300 truncate max-w-[70px]">
              {selectedLayerId ? selectedLayerId.substring(0, 10) : 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
