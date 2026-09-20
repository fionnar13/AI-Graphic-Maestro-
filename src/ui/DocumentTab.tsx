/**
 * @file DocumentTab.tsx
 * Real Document & Layer Engine Interactive Inspector.
 * Demonstrates:
 * - Real Document Canvas (Rendered directly from non-flattened Document Model)
 * - Real Layer Hierarchy (Raster, Vector, Text, Group, Adjustment)
 * - Layer Actions: Create, Delete, Duplicate, Rename, Reorder, Group, Ungroup, Visibility, Opacity, Lock, Transform
 * - Document Inspector: Canvas, Masks, Effects, Assets, References, Metadata
 */

import React, { useState, useEffect, useRef } from 'react';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { DocumentRenderer } from '../graphics/DocumentRenderer';
import {
  DocumentLayer,
  LayerType,
  BlendMode,
  MaestroDocumentModel,
  RasterContent,
  VectorContent,
  TextContent,
  AdjustmentContent,
} from '../models/document.types';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  FolderPlus,
  FolderMinus,
  MoveUp,
  MoveDown,
  Plus,
  Edit2,
  FileCode,
  Sliders,
  Type,
  Image as ImageIcon,
  Square,
  Sparkles,
  Download,
  Folder,
} from 'lucide-react';

interface DocumentTabProps {
  initialDocumentEngine?: MaestroDocumentEngine;
}

export const DocumentTab: React.FC<DocumentTabProps> = ({ initialDocumentEngine }) => {
  // Initialize Document Engine with rich ad composition
  const [docEngine] = useState(() => {
    if (initialDocumentEngine) return initialDocumentEngine;
    const engine = new MaestroDocumentEngine({
      metadata: {
        id: 'doc_maestro_luxury_perfume',
        title: 'Luxury Perfume Commercial Ad',
        author: 'AI Graphic Maestro Document Engine',
        colorProfile: 'sRGB',
        version: '1.2.0',
        schemaVersion: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['perfume', 'luxury', 'commercial', 'pbr'],
      },
      canvas: {
        dimensions: { width: 800, height: 500 },
        resolutionDpi: 300,
        backgroundColor: '#0c0a09',
        guides: { horizontal: [150, 350], vertical: [400] },
      },
    });

    // 1. Studio Backdrop (Vector/Gradient)
    engine.createLayer({
      name: 'Studio Pedestal Backdrop',
      type: 'vector',
      bounds: { x: 100, y: 320, width: 600, height: 140 },
      content: {
        kind: 'vector',
        shapeType: 'rounded_rect',
        cornerRadius: 16,
        fillColor: '#171717',
        strokeColor: '#262626',
        strokeWidth: 1,
      },
      effects: [
        {
          type: 'drop_shadow',
          enabled: true,
          color: 'rgba(0,0,0,0.8)',
          offsetX: 0,
          offsetY: 20,
          blur: 30,
          spread: 0,
          opacity: 0.8,
        },
      ],
    });

    // 2. Contact Shadow (Vector)
    engine.createLayer({
      name: 'Directional Contact Shadow',
      type: 'vector',
      bounds: { x: 300, y: 360, width: 220, height: 45 },
      opacity: 0.55,
      content: {
        kind: 'vector',
        shapeType: 'ellipse',
        fillColor: '#000000',
      },
      effects: [
        {
          type: 'blur',
          enabled: true,
          radius: 12,
        },
      ],
    });

    // 3. Product Hero (Raster with Mask)
    const product = engine.createLayer({
      name: 'Perfume Hero Bottle',
      type: 'raster',
      bounds: { x: 310, y: 130, width: 180, height: 250 },
      content: {
        kind: 'raster',
        resolution: { width: 180, height: 250 },
      },
      effects: [
        {
          type: 'drop_shadow',
          enabled: true,
          color: 'rgba(124, 58, 237, 0.35)',
          offsetX: 0,
          offsetY: 8,
          blur: 24,
          spread: 0,
          opacity: 0.5,
        },
      ],
      mask: {
        id: 'mask_hero_alpha',
        type: 'vector_path',
        enabled: true,
        inverted: false,
        feather: 1,
        opacity: 1,
        bounds: { x: 310, y: 130, width: 180, height: 250 },
      },
    });

    // 4. Brand Typography (Text)
    engine.createLayer({
      name: 'Headline: Brand Name',
      type: 'text',
      bounds: { x: 60, y: 70, width: 400, height: 50 },
      content: {
        kind: 'text',
        text: 'NOCTURNE ÉLIXIR',
        fontSize: 32,
        fontFamily: 'serif',
        fontWeight: 700,
        color: '#ffffff',
        align: 'left',
      },
    });

    engine.createLayer({
      name: 'Tagline: Subtitle',
      type: 'text',
      bounds: { x: 62, y: 120, width: 350, height: 30 },
      opacity: 0.7,
      content: {
        kind: 'text',
        text: 'The Art of Autonomous Olfactory Design',
        fontSize: 13,
        fontFamily: 'sans-serif',
        fontWeight: 400,
        color: '#a78bfa',
        align: 'left',
      },
    });

    // 5. Global Color Adjustment
    engine.createLayer({
      name: 'Atmospheric Color Harmonization',
      type: 'adjustment',
      bounds: { x: 0, y: 0, width: 800, height: 500 },
      blendMode: 'overlay',
      opacity: 0.3,
      content: {
        kind: 'adjustment',
        adjustments: {
          temperature: 20,
          contrast: 15,
          brightness: -5,
        },
      },
    });

    // Group product + shadow
    engine.groupLayers([product.id], 'Product Group');

    // Register Reference Asset
    engine.addAsset({
      id: 'asset_ref_bottle',
      name: 'elixir_source_render.png',
      mimeType: 'image/png',
      dataUrl: '',
      width: 1024,
      height: 1024,
    });

    engine.addReference({
      id: 'ref_lighting_spec',
      name: 'Editorial Studio Moodboard',
      type: 'moodboard',
      notes: 'Key light 45° softbox, subtle purple fill.',
    });

    return engine;
  });

  const [documentModel, setDocumentModel] = useState<MaestroDocumentModel>(() => docEngine.getDocument());
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [showGuides, setShowGuides] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<DocumentRenderer>(new DocumentRenderer());

  // Subscribe to document updates
  useEffect(() => {
    const unsubscribe = docEngine.subscribe((updatedDoc) => {
      setDocumentModel({ ...updatedDoc });
    });
    return unsubscribe;
  }, [docEngine]);

  // Render to canvas whenever document updates or selection changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rendererRef.current.renderDocument(ctx, documentModel, {
      selectedLayerId,
      wireframe,
      renderGuides: showGuides,
    });
  }, [documentModel, selectedLayerId, wireframe, showGuides]);

  // Helpers
  const selectedLayer = selectedLayerId ? docEngine.getLayer(selectedLayerId) : null;

  // Actions
  const handleCreateLayer = (type: LayerType) => {
    const count = docEngine.getAllLayers().length + 1;
    const newLayer = docEngine.createLayer({
      name: `New ${type.toUpperCase()} Layer ${count}`,
      type,
      bounds: { x: 150, y: 150, width: 200, height: 120 },
    });
    setSelectedLayerId(newLayer.id);
  };

  const handleDeleteLayer = (id: string) => {
    docEngine.deleteLayer(id);
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const handleDuplicate = (id: string) => {
    const dup = docEngine.duplicateLayer(id);
    if (dup) setSelectedLayerId(dup.id);
  };

  const handleToggleVisibility = (id: string) => {
    docEngine.toggleVisibility(id);
  };

  const handleToggleLock = (id: string) => {
    docEngine.toggleLocked(id);
  };

  const handleRename = (id: string) => {
    const current = docEngine.getLayer(id);
    if (!current) return;
    const nextName = prompt('Enter new layer name:', current.name);
    if (nextName) {
      docEngine.renameLayer(id, nextName);
    }
  };

  const handleGroupSelected = () => {
    if (!selectedLayerId) return;
    const g = docEngine.groupLayers([selectedLayerId], `${selectedLayer?.name} Group`);
    if (g) setSelectedLayerId(g.id);
  };

  const handleUngroup = (id: string) => {
    docEngine.ungroup(id);
    setSelectedLayerId(null);
  };

  const handleExportJSON = () => {
    const jsonStr = docEngine.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentModel.metadata.title.toLowerCase().replace(/\s+/g, '_')}_model.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderLayerTypeIcon = (type: LayerType) => {
    switch (type) {
      case 'raster':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />;
      case 'vector':
        return <Square className="w-3.5 h-3.5 text-amber-400" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-sky-400" />;
      case 'group':
        return <Folder className="w-3.5 h-3.5 text-purple-400" />;
      case 'adjustment':
        return <Sliders className="w-3.5 h-3.5 text-pink-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining Real Document Model */}
      <div
        className="rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4"
        style={{ background: '#111111', borderColor: '#222222' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/40 flex items-center justify-center text-[#a78bfa]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="mono text-[13px] font-bold text-white flex items-center gap-2">
              REAL DOCUMENT OBJECT MODEL (DOM)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/25">
                NON-FLATTENED
              </span>
            </div>
            <div className="mono text-[11px] text-[#737373] mt-0.5">
              Canvas rendered directly from hierarchical layers, transforms, masks, adjustments, effects & assets
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-3 py-1.5 rounded-lg mono text-[10px] border transition-colors cursor-pointer ${
              wireframe ? 'bg-[#7c3aed] border-[#7c3aed] text-white' : 'bg-[#1a1a1a] border-[#262626] text-[#737373]'
            }`}
          >
            WIREFRAME {wireframe ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`px-3 py-1.5 rounded-lg mono text-[10px] border transition-colors cursor-pointer ${
              showGuides ? 'bg-[#1a1a1a] border-cyan-500/40 text-cyan-300' : 'bg-[#1a1a1a] border-[#262626] text-[#737373]'
            }`}
          >
            GUIDES {showGuides ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowJsonModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg mono text-[10px] border border-[#262626] bg-[#1a1a1a] text-[#a78bfa] hover:text-white cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            VIEW DOM JSON
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg mono text-[10px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT DOCUMENT
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas Rendering */}
        <div
          className="md:col-span-8 rounded-2xl border p-6 flex flex-col justify-between"
          style={{ background: '#111111', borderColor: '#222222' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="mono text-[11px] tracking-widest text-[#737373]">
                DOCUMENT CANVAS VIEWPORT • {documentModel.canvas.dimensions.width}×
                {documentModel.canvas.dimensions.height} PX • {documentModel.canvas.resolutionDpi} DPI
              </div>
              <div className="mono text-[10px] text-[#a78bfa]">
                Layers: {documentModel.layers.length} • Root: {documentModel.rootLayerOrder.length}
              </div>
            </div>

            {/* Canvas Element */}
            <div className="relative w-full rounded-xl overflow-hidden border border-[#222] bg-[#0c0a09] flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                width={documentModel.canvas.dimensions.width}
                height={documentModel.canvas.dimensions.height}
                className="max-w-full h-auto rounded shadow-2xl"
                style={{ aspectRatio: `${documentModel.canvas.dimensions.width} / ${documentModel.canvas.dimensions.height}` }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] mono text-[#737373] border-t border-[#1a1a1a] pt-3">
            <div className="flex items-center gap-4">
              <span>Color Profile: <span className="text-white">{documentModel.metadata.colorProfile}</span></span>
              <span>Author: <span className="text-white">{documentModel.metadata.author}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-[#10b981]">Document DOM Active & In-Memory</span>
            </div>
          </div>
        </div>

        {/* Right: Layer Hierarchy & Inspector */}
        <div className="md:col-span-4 space-y-6">
          {/* Layer Hierarchy Panel */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: '#111111', borderColor: '#222222' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="mono text-[11px] tracking-widest text-[#737373] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#a78bfa]" />
                LAYER STACK (NON-FLATTENED)
              </div>
              {/* Quick Add Menu */}
              <div className="flex items-center gap-1">
                {(['raster', 'vector', 'text', 'adjustment'] as LayerType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleCreateLayer(t)}
                    title={`Add new ${t} layer`}
                    className="p-1 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] text-[#a78bfa] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>

            {/* Stacking Order: Reverse for Photoshop/Figma style top-to-bottom list */}
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {[...documentModel.rootLayerOrder].reverse().map((layerId, visualIdx) => {
                const layer = docEngine.getLayer(layerId);
                if (!layer) return null;
                const isSelected = selectedLayerId === layer.id;

                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#1e172e] border-[#7c3aed] text-white'
                        : 'bg-[#0f0f0f] border-[#1e1e1e] text-[#a3a3a3] hover:border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {renderLayerTypeIcon(layer.type)}
                      <div className="truncate mono text-[11px] font-medium">
                        {layer.name}
                        {layer.type === 'group' && (
                          <span className="ml-1 text-[9px] text-[#737373]">
                            ({(layer.content as any).childIds?.length || 0})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Visibility Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(layer.id);
                        }}
                        className="p-1 text-[#737373] hover:text-white"
                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                      >
                        {layer.visible ? <Eye className="w-3 h-3 text-[#10b981]" /> : <EyeOff className="w-3 h-3 text-[#ef4444]" />}
                      </button>

                      {/* Lock Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLock(layer.id);
                        }}
                        className="p-1 text-[#737373] hover:text-white"
                        title={layer.locked ? 'Unlock' : 'Lock'}
                      >
                        {layer.locked ? <Lock className="w-3 h-3 text-[#f59e0b]" /> : <Unlock className="w-3 h-3 text-[#525252]" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Layer Action Buttons */}
            {selectedLayer && (
              <div className="mt-4 pt-3 border-t border-[#1e1e1e] flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleRename(selectedLayer.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] mono text-[10px] text-white cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Rename
                </button>
                <button
                  onClick={() => handleDuplicate(selectedLayer.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] mono text-[10px] text-white cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                {selectedLayer.type === 'group' ? (
                  <button
                    onClick={() => handleUngroup(selectedLayer.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] mono text-[10px] text-purple-300 cursor-pointer"
                  >
                    <FolderMinus className="w-3 h-3" /> Ungroup
                  </button>
                ) : (
                  <button
                    onClick={handleGroupSelected}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] mono text-[10px] text-purple-300 cursor-pointer"
                  >
                    <FolderPlus className="w-3 h-3" /> Group
                  </button>
                )}
                <button
                  onClick={() => handleDeleteLayer(selectedLayer.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/30 hover:bg-red-900/40 border border-red-800/40 mono text-[10px] text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>

          {/* Selected Layer Properties Inspector */}
          {selectedLayer ? (
            <div
              className="rounded-2xl border p-5 space-y-4"
              style={{ background: '#111111', borderColor: '#222222' }}
            >
              <div className="flex items-center justify-between">
                <div className="mono text-[11px] tracking-widest text-[#737373]">
                  INSPECTOR • {selectedLayer.type.toUpperCase()}
                </div>
                <span className="mono text-[9px] px-2 py-0.5 rounded bg-[#1a1a1a] text-[#a78bfa] border border-[#262626]">
                  {selectedLayer.id}
                </span>
              </div>

              {/* Opacity Slider */}
              <div>
                <div className="flex justify-between text-[10px] mono text-[#737373] mb-1">
                  <span>Opacity</span>
                  <span className="text-white">{(selectedLayer.opacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedLayer.opacity}
                  disabled={selectedLayer.locked}
                  onChange={(e) => docEngine.setOpacity(selectedLayer.id, Number(e.target.value))}
                  className="w-full accent-[#7c3aed] cursor-pointer"
                />
              </div>

              {/* Blend Mode Select */}
              <div>
                <div className="text-[10px] mono text-[#737373] mb-1">Blend Mode</div>
                <select
                  value={selectedLayer.blendMode}
                  disabled={selectedLayer.locked}
                  onChange={(e) => docEngine.setBlendMode(selectedLayer.id, e.target.value as BlendMode)}
                  className="w-full p-1.5 rounded bg-[#0f0f0f] border border-[#262626] mono text-[11px] text-white"
                >
                  {(
                    [
                      'normal',
                      'multiply',
                      'screen',
                      'overlay',
                      'darken',
                      'lighten',
                      'color-dodge',
                      'difference',
                    ] as BlendMode[]
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transform Position & Bounds */}
              <div className="grid grid-cols-2 gap-2 mono text-[10px]">
                <div className="p-2 rounded bg-[#0f0f0f] border border-[#1e1e1e]">
                  <div className="text-[#737373]">Position X / Y</div>
                  <div className="mt-1 text-white">
                    {selectedLayer.bounds.x}px, {selectedLayer.bounds.y}px
                  </div>
                </div>
                <div className="p-2 rounded bg-[#0f0f0f] border border-[#1e1e1e]">
                  <div className="text-[#737373]">Dimensions W / H</div>
                  <div className="mt-1 text-white">
                    {selectedLayer.bounds.width}px × {selectedLayer.bounds.height}px
                  </div>
                </div>
              </div>

              {/* Mask & Effects Info */}
              <div className="p-2.5 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#737373]">Mask</span>
                  <span className={selectedLayer.mask ? 'text-[#10b981]' : 'text-[#737373]'}>
                    {selectedLayer.mask ? `${selectedLayer.mask.type} (Active)` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Effects</span>
                  <span className="text-[#a78bfa]">
                    {selectedLayer.effects.length > 0
                      ? selectedLayer.effects.map((e) => e.type).join(', ')
                      : 'None'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl border p-5 text-center mono text-[11px] text-[#737373]"
              style={{ background: '#111111', borderColor: '#222222' }}
            >
              Select a layer from the stack above to inspect attributes, transforms, masks, and effects.
            </div>
          )}
        </div>
      </div>

      {/* JSON DOM Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-3xl max-h-[85vh] rounded-2xl border p-6 flex flex-col justify-between"
            style={{ background: '#111111', borderColor: '#262626' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#222]">
              <div className="mono text-[13px] font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#a78bfa]" />
                MAESTRO DOCUMENT MODEL • JSON SPECIFICATION
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="mono text-[11px] text-[#737373] hover:text-white px-2 py-1 rounded bg-[#1a1a1a] cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="my-4 overflow-y-auto max-h-[60vh] rounded-xl bg-[#090909] p-4 border border-[#1e1e1e]">
              <pre className="mono text-[11px] text-[#a78bfa] leading-relaxed">
                {docEngine.exportJSON()}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#222] mono text-[11px] text-[#737373]">
              <span>Layers: {documentModel.layers.length} • Root: {documentModel.rootLayerOrder.length}</span>
              <button
                onClick={handleExportJSON}
                className="px-4 py-1.5 rounded-lg bg-[#7c3aed] text-white hover:bg-[#6d28d9] cursor-pointer"
              >
                Download JSON File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
