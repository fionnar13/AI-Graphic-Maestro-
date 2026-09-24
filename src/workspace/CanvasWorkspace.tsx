/**
 * @file CanvasWorkspace.tsx
 * Center Stage Real Canvas Viewport for AI Graphic Maestro.
 * Provides authentic HTML5 Canvas 2D rendering, direct layer selection & transforms
 * (Move, Scale, Rotate), cursor-anchored Zoom, Pan, Image Import (Drag-and-Drop,
 * File Picker, Clipboard Paste), Real Document Crop, and Inspection Wireframes.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { HistoryEngine } from '../history/HistoryEngine';
import { DocumentMutationCommand } from '../history/commands/DocumentMutationCommand';
import { DocumentLayer } from '../models/document.types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Layers,
  Grid,
  Move,
  Eye,
  Crosshair,
  RotateCw,
  Crop as CropIcon,
  Check,
  X,
  Upload,
  Play,
} from 'lucide-react';
import { ToolId, WorkspaceMode, TransformHandle } from './types';

interface CanvasWorkspaceProps {
  graphicsEngine: GraphicsEngine;
  // Phase 14.3.2 (Fix 2, T3) — historyEngine is now REQUIRED so canvas drag
  // operations can commit DocumentMutationCommand entries through the
  // authoritative history pipeline.
  historyEngine: HistoryEngine;
  activeToolId: ToolId;
  onSelectTool?: (toolId: ToolId) => void;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  mode: WorkspaceMode;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomFit: () => void;
  onZoomReset: () => void;
  showWireframe: boolean;
  onToggleWireframe: () => void;
  showCheckerboard: boolean;
  onToggleCheckerboard: () => void;
  scenarioName?: string;
  onOpenTestModal?: () => void;
  onLayerUpdate?: () => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  graphicsEngine,
  historyEngine,
  activeToolId,
  onSelectTool,
  selectedLayerId,
  onSelectLayer,
  mode,
  zoom,
  onZoomChange,
  pan,
  onPanChange,
  onZoomFit,
  onZoomReset,
  showWireframe,
  onToggleWireframe,
  showCheckerboard,
  onToggleCheckerboard,
  scenarioName = 'Luxury Crimson Hero',
  onOpenTestModal,
  onLayerUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHolderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pan interaction states
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Drag-and-drop import states
  const [isDragOver, setIsDragOver] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Direct manipulation interaction states
  const [activeHandle, setActiveHandle] = useState<TransformHandle | null>(null);
  const [isManipulating, setIsManipulating] = useState(false);
  const [manipulationType, setManipulationType] = useState<'move' | 'scale' | 'rotate' | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [initialBounds, setInitialBounds] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [initialRotation, setInitialRotation] = useState<number>(0);

  // Phase 14.3.2 (Fix 2, T3) — Live preview state. During drag, the document
  // is NOT mutated. Instead, previewBounds/previewRotation hold the would-be
  // committed values and renderDocument() reads them via previewOverrides.
  // On mouseUp, a DocumentMutationCommand commits the final values atomically
  // (one history entry per drag gesture). Escape sets dragCancelled=true to
  // discard the preview without committing.
  const [previewBounds, setPreviewBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number | null>(null);
  const dragCancelled = useRef<boolean>(false);

  // Crop mode state
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 40,
    y: 30,
    width: 720,
    height: 440,
  });
  const [activeCropHandle, setActiveCropHandle] = useState<string | null>(null);
  const [isCroppingDrag, setIsCroppingDrag] = useState(false);

  // Document dimensions sync
  const [canvasDim, setCanvasDim] = useState({
    width: graphicsEngine.width || 800,
    height: graphicsEngine.height || 500,
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3200);
  };

  // Keyboard listeners: Space for Pan, Enter/Esc for Crop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setIsSpacePressed(true);
      }
      if (activeToolId === 'tool.crop') {
        if (e.key === 'Enter') {
          handleApplyCrop();
        } else if (e.key === 'Escape') {
          if (onSelectTool) onSelectTool('tool.select');
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeToolId, cropBox]);

  // Phase 14.3.2 (Fix 2, T3) — Escape key during drag cancels the gesture.
  // Sets dragCancelled ref so handleMouseUp knows to discard the preview
  // without committing a DocumentMutationCommand. Per Q3-i, no history
  // entry is created for a cancelled drag.
  useEffect(() => {
    if (!isManipulating) return;
    const handleDragEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dragCancelled.current = true;
        setIsManipulating(false);
        setManipulationType(null);
        setActiveHandle(null);
        setPreviewBounds(null);
        setPreviewRotation(null);
        graphicsEngine.renderDocument();
      }
    };
    window.addEventListener('keydown', handleDragEscape);
    return () => {
      window.removeEventListener('keydown', handleDragEscape);
    };
  }, [isManipulating, graphicsEngine]);

  // Sync canvas DOM element from GraphicsEngine
  useEffect(() => {
    const holder = canvasHolderRef.current;
    if (!holder) return;

    const realCanvas = graphicsEngine.getCanvas();
    realCanvas.className = 'block rounded-none shadow-2xl';
    realCanvas.style.width = `${graphicsEngine.width}px`;
    realCanvas.style.height = `${graphicsEngine.height}px`;
    realCanvas.style.display = 'block';

    setCanvasDim({ width: graphicsEngine.width, height: graphicsEngine.height });

    holder.innerHTML = '';
    holder.appendChild(realCanvas);

    // Initial render
    graphicsEngine.renderDocument();
  }, [graphicsEngine, graphicsEngine.width, graphicsEngine.height]);

  // Subscribe to GraphicsEngine / Document updates
  useEffect(() => {
    const unsubscribe = graphicsEngine.subscribe(() => {
      setCanvasDim({ width: graphicsEngine.width, height: graphicsEngine.height });
    });
    return unsubscribe;
  }, [graphicsEngine]);

  // Clipboard Paste Image Listener
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const dataUrl = event.target?.result as string;
              if (dataUrl) {
                const layer = await graphicsEngine.importImageAsLayer(dataUrl, `Pasted Image ${Date.now()}`);
                onSelectLayer(layer.id);
                showNotification(`Imported clipboard image as layer "${layer.name}"`);
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [graphicsEngine, onSelectLayer]);

  // File Picker handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportFile(file);
    }
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const layer = await graphicsEngine.importImageAsLayer(dataUrl, file.name);
        onSelectLayer(layer.id);
        showNotification(`Imported asset "${file.name}" to Canvas`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleImportFile(file);
      } else {
        showNotification('Supported formats: PNG, JPG, JPEG, WEBP');
      }
    }
  };

  // Cursor-anchored Wheel Zoom handling
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || activeToolId === 'tool.zoom') {
      e.preventDefault();
      const holder = canvasHolderRef.current;
      if (!holder) return;

      const rect = holder.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const nextZoom = Math.min(4.0, Math.max(0.2, zoom * zoomFactor));

      // Calculate anchor point in canvas space
      const docX = (mouseX - pan.x) / zoom;
      const docY = (mouseY - pan.y) / zoom;

      // Adjust pan to keep anchor point stationary
      const nextPanX = mouseX - docX * nextZoom;
      const nextPanY = mouseY - docY * nextZoom;

      onPanChange({ x: Math.round(nextPanX), y: Math.round(nextPanY) });
      onZoomChange(Math.round(nextZoom * 100) / 100);
    }
  };

  // Canvas coordinate converter
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const holder = canvasHolderRef.current;
    if (!holder) return { x: 0, y: 0 };
    const rect = holder.getBoundingClientRect();
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    return { x, y };
  };

  // Get active selected layer
  const selectedLayer = selectedLayerId
    ? graphicsEngine.getDocumentEngine().getLayer(selectedLayerId)
    : null;

  // Pointer Down on main container / canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    // 1. Check Pan trigger
    if (e.button === 1 || activeToolId === 'tool.hand' || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    // 2. Crop mode interaction
    if (activeToolId === 'tool.crop') {
      // In crop mode, handled by crop overlay handles
      return;
    }

    // 3. Hit-test layers for Selection
    const { x: canvasX, y: canvasY } = getCanvasCoords(e.clientX, e.clientY);
    const hitLayer = graphicsEngine.getLayerAtPoint(canvasX, canvasY);

    if (hitLayer) {
      onSelectLayer(hitLayer.id);
      // Start moving if clicking on selected layer
      setIsManipulating(true);
      setManipulationType('move');
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setInitialBounds({ ...hitLayer.bounds });
      setInitialRotation(hitLayer.transform?.rotation || 0);
      // Phase 14.3.2 (Fix 2) — reset dragCancelled at gesture start
      dragCancelled.current = false;
      setPreviewBounds(null);
      setPreviewRotation(null);
    } else {
      // Clicked on empty canvas space
      if (!isManipulating) {
        onSelectLayer(null);
      }
    }
  };

  // Pointer Down on Transform Handle (Scale / Rotate)
  const handleHandleMouseDown = (
    e: React.MouseEvent,
    handle: TransformHandle,
    layer: DocumentLayer
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setActiveHandle(handle);
    setIsManipulating(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialBounds({ ...layer.bounds });
    setInitialRotation(layer.transform?.rotation || 0);
    // Phase 14.3.2 (Fix 2) — reset dragCancelled at gesture start
    dragCancelled.current = false;
    setPreviewBounds(null);
    setPreviewRotation(null);

    if (handle === 'rot') {
      setManipulationType('rotate');
    } else {
      setManipulationType('scale');
    }
  };

  // Pointer Down on Crop Handle
  const handleCropHandleDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveCropHandle(handle);
    setIsCroppingDrag(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  // Pointer Move (manipulation, crop, pan)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      onPanChange({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    // Direct Manipulation (Move / Scale / Rotate)
    // Phase 14.3.2 (Fix 2, T3) — During drag, the document is NOT mutated.
    // Preview bounds/rotation are stored in React state and passed to
    // renderDocument() via previewOverrides. Commit happens on mouseUp.
    if (isManipulating && selectedLayer && manipulationType) {
      const deltaX = (e.clientX - dragStartPos.x) / zoom;
      const deltaY = (e.clientY - dragStartPos.y) / zoom;

      if (manipulationType === 'move') {
        const nextX = Math.round(initialBounds.x + deltaX);
        const nextY = Math.round(initialBounds.y + deltaY);
        const nextBounds = { ...initialBounds, x: nextX, y: nextY };
        setPreviewBounds(nextBounds);
        setPreviewRotation(null);
        graphicsEngine.renderDocument({
          layerId: selectedLayer.id,
          bounds: nextBounds,
        });
      } else if (manipulationType === 'scale' && activeHandle) {
        let newX = initialBounds.x;
        let newY = initialBounds.y;
        let newW = initialBounds.width;
        let newH = initialBounds.height;

        if (activeHandle.includes('r')) newW = Math.max(20, Math.round(initialBounds.width + deltaX));
        if (activeHandle.includes('l')) {
          const w = Math.max(20, Math.round(initialBounds.width - deltaX));
          newX = initialBounds.x + (initialBounds.width - w);
          newW = w;
        }
        if (activeHandle.includes('b')) newH = Math.max(20, Math.round(initialBounds.height + deltaY));
        if (activeHandle.includes('t')) {
          const h = Math.max(20, Math.round(initialBounds.height - deltaY));
          newY = initialBounds.y + (initialBounds.height - h);
          newH = h;
        }

        const nextBounds = { x: newX, y: newY, width: newW, height: newH };
        setPreviewBounds(nextBounds);
        setPreviewRotation(null);
        graphicsEngine.renderDocument({
          layerId: selectedLayer.id,
          bounds: nextBounds,
        });
      } else if (manipulationType === 'rotate') {
        const { x: canvasX, y: canvasY } = getCanvasCoords(e.clientX, e.clientY);
        const centerX = initialBounds.x + initialBounds.width / 2;
        const centerY = initialBounds.y + initialBounds.height / 2;
        const rad = Math.atan2(canvasY - centerY, canvasX - centerX);
        let deg = Math.round((rad * 180) / Math.PI) + 90;
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15; // 15-deg snap with Shift
        }
        setPreviewBounds(null);
        setPreviewRotation(deg);
        graphicsEngine.renderDocument({
          layerId: selectedLayer.id,
          transform: { rotation: deg },
        });
      }
      return;
    }

    // Crop Handle Dragging
    if (isCroppingDrag && activeCropHandle) {
      const deltaX = (e.clientX - dragStartPos.x) / zoom;
      const deltaY = (e.clientY - dragStartPos.y) / zoom;
      setDragStartPos({ x: e.clientX, y: e.clientY });

      setCropBox((prev) => {
        let { x, y, width, height } = prev;
        if (activeCropHandle === 'crop_br') {
          width = Math.max(50, width + deltaX);
          height = Math.max(50, height + deltaY);
        } else if (activeCropHandle === 'crop_tl') {
          x = Math.max(0, x + deltaX);
          y = Math.max(0, y + deltaY);
          width = Math.max(50, width - deltaX);
          height = Math.max(50, height - deltaY);
        } else if (activeCropHandle === 'crop_tr') {
          y = Math.max(0, y + deltaY);
          width = Math.max(50, width + deltaX);
          height = Math.max(50, height - deltaY);
        } else if (activeCropHandle === 'crop_bl') {
          x = Math.max(0, x + deltaX);
          width = Math.max(50, width - deltaX);
          height = Math.max(50, height + deltaY);
        } else if (activeCropHandle === 'crop_body') {
          x = Math.max(0, Math.min(canvasDim.width - width, x + deltaX));
          y = Math.max(0, Math.min(canvasDim.height - height, y + deltaY));
        }
        return {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        };
      });
    }
  };

  // Pointer Up
  // Phase 14.3.2 (Fix 2, T3) — On mouseUp, commit a single
  // DocumentMutationCommand for the entire drag gesture (one history entry
  // per drag). If dragCancelled (Escape), discard preview without committing.
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isManipulating) {
      const wasCancelled = dragCancelled.current;
      const layerId = selectedLayer?.id;
      const finalBounds = previewBounds;
      const finalRotation = previewRotation;
      const currentManipulationType = manipulationType;

      setIsManipulating(false);
      setManipulationType(null);
      setActiveHandle(null);
      setPreviewBounds(null);
      setPreviewRotation(null);

      // Commit only if NOT cancelled AND there is an actual change to commit
      if (!wasCancelled && layerId && (finalBounds || finalRotation !== null)) {
        const documentEngine = graphicsEngine.getDocumentEngine();
        const mutator = (doc: typeof documentEngine) => {
          if (finalBounds) {
            doc.setBounds(layerId, finalBounds);
          }
          if (finalRotation !== null && currentManipulationType === 'rotate') {
            doc.setTransform(layerId, { rotation: finalRotation });
          }
        };
        const cmdName =
          currentManipulationType === 'move'
            ? 'Canvas Drag Move'
            : currentManipulationType === 'scale'
            ? 'Canvas Drag Scale'
            : currentManipulationType === 'rotate'
            ? 'Canvas Drag Rotate'
            : 'Canvas Drag Transform';
        const cmd = new DocumentMutationCommand(
          cmdName,
          `ui.canvas_drag.${currentManipulationType}`,
          { layerId, bounds: finalBounds, rotation: finalRotation },
          documentEngine,
          mutator,
          graphicsEngine
        );
        void historyEngine.executeCommand(cmd);
      } else {
        // Cancelled or no-op: re-render to discard preview, restore committed state
        graphicsEngine.renderDocument();
      }
      if (onLayerUpdate) onLayerUpdate();
    }
    if (isCroppingDrag) {
      setIsCroppingDrag(false);
      setActiveCropHandle(null);
    }
  };

  // Execute Real Crop
  const handleApplyCrop = () => {
    graphicsEngine.cropDocument(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    setCanvasDim({ width: graphicsEngine.width, height: graphicsEngine.height });
    showNotification(`Canvas cropped to ${cropBox.width} × ${cropBox.height} px`);
    if (onSelectTool) onSelectTool('tool.select');
  };

  const isWireframeActive = showWireframe || mode === 'inspect';
  const isCropActive = activeToolId === 'tool.crop';

  return (
    <main
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex-1 w-full h-full overflow-hidden flex items-center justify-center select-none ${
        activeToolId === 'tool.hand' || isPanning
          ? 'cursor-grab active:cursor-grabbing'
          : activeToolId === 'tool.crop'
          ? 'cursor-crosshair'
          : 'cursor-default'
      }`}
      style={{
        background: '#0a0a0a',
      }}
    >
      {/* Hidden File Input for Image Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#7c3aed]/20 border-2 border-dashed border-[#7c3aed] flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none animate-in fade-in duration-100">
          <Upload className="w-12 h-12 text-[#a78bfa] animate-bounce" />
          <h3 className="text-sm font-semibold text-white mt-2">
            DROP IMAGE TO IMPORT AS LAYER
          </h3>
          <p className="mono text-xs text-[#c4b5fd] mt-1">
            Supports PNG • JPG • WEBP
          </p>
        </div>
      )}

      {/* Ephemeral Toast Notification */}
      {notification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-black/90 text-white border border-[#7c3aed]/50 shadow-2xl backdrop-blur-md mono text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Background Coordinate Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, #333333 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating Canvas Transform & Bounds Stage */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning || isManipulating || isCroppingDrag ? 'none' : 'transform 0.1s ease-out',
        }}
        className="relative shadow-2xl"
      >
        {/* Transparent Checkerboard Matting Container */}
        <div
          className="relative p-0 border border-[#2e2e2e] shadow-2xl"
          style={{
            width: `${canvasDim.width}px`,
            height: `${canvasDim.height}px`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            backgroundColor: showCheckerboard ? '#141414' : '#0c0a09',
            backgroundImage: showCheckerboard
              ? `linear-gradient(45deg, #1c1c1c 25%, transparent 25%),
                 linear-gradient(-45deg, #1c1c1c 25%, transparent 25%),
                 linear-gradient(45deg, transparent 75%, #1c1c1c 75%),
                 linear-gradient(-45deg, transparent 75%, #1c1c1c 75%)`
              : 'none',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        >
          {/* Authentic Canvas Element from GraphicsEngine */}
          <div ref={canvasHolderRef} className="w-full h-full pointer-events-none" />

          {/* Dynamic Bounding Box & Transform Handles for Selected Layer */}
          {selectedLayer && !isCropActive && (
            <div
              className="absolute border-2 border-[#7c3aed] pointer-events-none z-20"
              style={{
                left: `${selectedLayer.bounds.x}px`,
                top: `${selectedLayer.bounds.y}px`,
                width: `${selectedLayer.bounds.width}px`,
                height: `${selectedLayer.bounds.height}px`,
                transform: `rotate(${selectedLayer.transform?.rotation || 0}deg)`,
                transformOrigin: 'center center',
              }}
            >
              {/* Draggable move body overlay */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsManipulating(true);
                  setManipulationType('move');
                  setDragStartPos({ x: e.clientX, y: e.clientY });
                  setInitialBounds({ ...selectedLayer.bounds });
                }}
                className="absolute inset-0 cursor-move pointer-events-auto bg-[#7c3aed]/5 hover:bg-[#7c3aed]/10 transition-colors"
              />

              {/* 8 Scalable Transform Handles */}
              {/* Corners */}
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'tl', selectedLayer)}
                className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-[#7c3aed] shadow-sm pointer-events-auto cursor-nwse-resize z-30"
              />
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'tr', selectedLayer)}
                className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-[#7c3aed] shadow-sm pointer-events-auto cursor-nesw-resize z-30"
              />
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'bl', selectedLayer)}
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-[#7c3aed] shadow-sm pointer-events-auto cursor-nesw-resize z-30"
              />
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'br', selectedLayer)}
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-[#7c3aed] shadow-sm pointer-events-auto cursor-nwse-resize z-30"
              />

              {/* Edges */}
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'tc', selectedLayer)}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-[#7c3aed] shadow-sm pointer-events-auto cursor-ns-resize z-30"
              />
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'bc', selectedLayer)}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-[#7c3aed] shadow-sm pointer-events-auto cursor-ns-resize z-30"
              />
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'ml', selectedLayer)}
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border border-[#7c3aed] shadow-sm pointer-events-auto cursor-ew-resize z-30"
              />
              <div
                onMouseDown={(e) => handleHandleMouseDown(e, 'mr', selectedLayer)}
                className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border border-[#7c3aed] shadow-sm pointer-events-auto cursor-ew-resize z-30"
              />

              {/* Rotation Handle with stem line */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto z-30">
                <div
                  onMouseDown={(e) => handleHandleMouseDown(e, 'rot', selectedLayer)}
                  className="w-3.5 h-3.5 rounded-full bg-white border border-[#7c3aed] shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                  title="Drag to Rotate (Shift snaps to 15°)"
                >
                  <RotateCw className="w-2 h-2 text-[#7c3aed]" />
                </div>
                <div className="w-[1px] h-3 bg-[#7c3aed]" />
              </div>

              {/* Center Anchor Point */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-[#7c3aed] bg-white/90 flex items-center justify-center pointer-events-none">
                <Crosshair className="w-2 h-2 text-[#7c3aed]" />
              </div>

              {/* Layer metadata pill */}
              <div className="absolute -top-7 left-0 px-2 py-0.5 rounded bg-[#7c3aed] text-white mono text-[9px] font-medium whitespace-nowrap shadow-md pointer-events-none">
                {selectedLayer.name} ({selectedLayer.bounds.x}, {selectedLayer.bounds.y}) • {selectedLayer.bounds.width}×{selectedLayer.bounds.height}px
                {selectedLayer.transform?.rotation ? ` • ${selectedLayer.transform.rotation}°` : ''}
              </div>
            </div>
          )}

          {/* Real Interactive Crop Mode Overlay */}
          {isCropActive && (
            <div className="absolute inset-0 pointer-events-auto z-40 overflow-hidden">
              {/* Outer dimmed mask (surrounds crop box) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <mask id="crop-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <rect
                      x={cropBox.x}
                      y={cropBox.y}
                      width={cropBox.width}
                      height={cropBox.height}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="rgba(0, 0, 0, 0.65)"
                  mask="url(#crop-mask)"
                />
              </svg>

              {/* Active Crop Box with Rule of Thirds */}
              <div
                className="absolute border-2 border-white pointer-events-auto shadow-2xl"
                style={{
                  left: `${cropBox.x}px`,
                  top: `${cropBox.y}px`,
                  width: `${cropBox.width}px`,
                  height: `${cropBox.height}px`,
                }}
              >
                {/* Move crop box body */}
                <div
                  onMouseDown={(e) => handleCropHandleDown(e, 'crop_body')}
                  className="absolute inset-0 cursor-move"
                />

                {/* Rule of thirds grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-b border-white/60" />
                  <div className="border-r border-white/60" />
                  <div className="border-r border-white/60" />
                  <div />
                </div>

                {/* 4 Corner Crop Handles */}
                <div
                  onMouseDown={(e) => handleCropHandleDown(e, 'crop_tl')}
                  className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-black shadow-md cursor-nwse-resize z-50"
                />
                <div
                  onMouseDown={(e) => handleCropHandleDown(e, 'crop_tr')}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-black shadow-md cursor-nesw-resize z-50"
                />
                <div
                  onMouseDown={(e) => handleCropHandleDown(e, 'crop_bl')}
                  className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-black shadow-md cursor-nesw-resize z-50"
                />
                <div
                  onMouseDown={(e) => handleCropHandleDown(e, 'crop_br')}
                  className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-black shadow-md cursor-nwse-resize z-50"
                />

                {/* Crop Dimensions Pill */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-black/90 border border-white/20 text-white mono text-[10px] font-semibold whitespace-nowrap shadow-xl">
                  {cropBox.width} × {cropBox.height} px
                </div>
              </div>
            </div>
          )}

          {/* Diagnostic Inspection Wireframe Overlay */}
          {isWireframeActive && !isCropActive && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="absolute top-[160px] left-[320px] w-[160px] h-[160px] border border-dashed border-red-500/80 rounded-lg">
                <span className="absolute -top-5 left-0 mono text-[9px] px-1.5 py-0.5 rounded bg-red-600 text-white font-medium">
                  Hero Product: [320, 160, 160, 160]
                </span>
                <span className="absolute -bottom-5 left-0 mono text-[8px] text-red-300">
                  Contrast: 4.8:1 • Mask Confidence: 99.4%
                </span>
              </div>

              <div className="absolute top-[315px] left-[310px] w-[180px] h-[28px] border border-dashed border-amber-400/90 rounded-full flex items-center justify-center">
                <span className="mono text-[8px] text-amber-300 px-1 py-0.5 rounded bg-black/70 border border-amber-500/40">
                  Floor Contact Shadow (Blur: 12px, Opacity: 45%)
                </span>
              </div>

              <div className="absolute top-6 left-8 flex items-center gap-1.5 mono text-[9px] text-amber-400 bg-black/80 px-2 py-1 rounded border border-amber-500/30">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Keylight: Top-Left (Azimuth: 315°, Elevation: 45°)
              </div>

              <div className="absolute inset-6 border border-[#7c3aed]/30 pointer-events-none">
                <span className="absolute top-1 left-2 mono text-[8px] text-purple-400/60">
                  Title Safe Margin (24px)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Dimension Label Bar */}
        <div className="flex items-center justify-between mt-1 px-1 mono text-[9px] text-[#666666]">
          <span>
            {canvasDim.width} × {canvasDim.height} px • 300 DPI
          </span>
          <span>sRGB • 8-bit Canvas 2D Engine</span>
          <span>{scenarioName}</span>
        </div>
      </div>

      {/* Floating Crop Control Bar (Visible in Crop Mode) */}
      {isCropActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-xl border bg-[#141414]/95 border-[#333333] shadow-2xl backdrop-blur-xl z-40">
          <div className="flex items-center gap-1 px-2 mono text-xs text-[#a3a3a3]">
            <CropIcon className="w-3.5 h-3.5 text-[#a78bfa]" />
            <span>CROP BOUNDS:</span>
            <span className="text-white font-bold">
              {cropBox.width} × {cropBox.height} px
            </span>
          </div>

          <div className="w-[1px] h-4 bg-[#333333]" />

          <button
            onClick={handleApplyCrop}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white mono text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>APPLY CROP</span>
          </button>

          <button
            onClick={() => onSelectTool && onSelectTool('tool.select')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[#cccccc] hover:text-white mono text-xs font-medium transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>CANCEL</span>
          </button>
        </div>
      )}

      {/* Floating Viewport HUD Controls (Top Right) */}
      <div
        className="absolute top-4 right-4 flex items-center gap-1 p-1 rounded-xl border backdrop-blur-xl shadow-2xl z-30"
        style={{
          background: 'rgba(18, 18, 18, 0.9)',
          borderColor: '#262626',
        }}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded-lg text-[#a3a3a3] hover:text-white mono text-[11px] transition-colors cursor-pointer"
          title="Import Image Layer (PNG, JPG, WEBP)"
        >
          <Upload className="w-3.5 h-3.5 text-[#a78bfa]" />
          <span className="hidden sm:inline">Import</span>
        </button>

        <div className="w-[1px] h-4 bg-[#262626] mx-0.5" />

        <button
          onClick={() => onZoomChange(Math.min(4.0, zoom + 0.2))}
          className="p-1.5 hover:bg-white/10 rounded-lg text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
          title="Zoom In (Ctrl++)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onZoomChange(Math.max(0.2, zoom - 0.2))}
          className="p-1.5 hover:bg-white/10 rounded-lg text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
          title="Zoom Out (Ctrl+-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            onPanChange({ x: 0, y: 0 });
            onZoomReset();
          }}
          className="p-1.5 hover:bg-white/10 rounded-lg text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
          title="Reset Pan & 100% Zoom"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            onPanChange({ x: 0, y: 0 });
            onZoomFit();
          }}
          className="p-1.5 hover:bg-white/10 rounded-lg text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
          title="Fit Canvas in Viewport"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-[#262626] mx-0.5" />

        <button
          onClick={onToggleWireframe}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isWireframeActive
              ? 'bg-[#7c3aed] text-white shadow-sm'
              : 'hover:bg-white/10 text-[#a3a3a3] hover:text-white'
          }`}
          title="Toggle Inspection Wireframes & Bounding Boxes"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleCheckerboard}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showCheckerboard
              ? 'bg-[#2a2a2a] text-white'
              : 'hover:bg-white/10 text-[#a3a3a3] hover:text-white'
          }`}
          title="Toggle Transparency Checkerboard Grid"
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        {onOpenTestModal && (
          <>
            <div className="w-[1px] h-4 bg-[#262626] mx-0.5" />
            <button
              onClick={onOpenTestModal}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#7c3aed]/20 hover:bg-[#7c3aed]/30 text-[#c4b5fd] hover:text-white mono text-[11px] font-semibold border border-[#7c3aed]/40 transition-colors cursor-pointer"
              title="Open 10 Direct Manipulation Interactive Tests"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>10 Tests</span>
            </button>
          </>
        )}
      </div>

      {/* Viewport Status Pill (Bottom Left) */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-none z-30">
        <div className="mono text-[10px] px-2.5 py-1 rounded-lg bg-black/80 text-[#cccccc] backdrop-blur-md border border-white/10 shadow-lg flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>REAL CANVAS 2D</span>
          <span className="text-[#666666]">•</span>
          <span>ZOOM: {Math.round(zoom * 100)}%</span>
          {isPanning && <span className="text-purple-400">• PANNING</span>}
          {selectedLayer && (
            <>
              <span className="text-[#666666]">•</span>
              <span className="text-emerald-300">SELECTED: {selectedLayer.name}</span>
            </>
          )}
        </div>
      </div>
    </main>
  );
};
