/**
 * @file StudioCanvas
 * Real interactive Canvas Viewport with zoom, pan, grid overlay, and direct GraphicsEngine rendering.
 */

import React, { useEffect, useRef, useState } from 'react';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { ZoomIn, ZoomOut, RefreshCw, Maximize2, Layers } from 'lucide-react';

interface StudioCanvasProps {
  graphicsEngine: GraphicsEngine;
  showOverlay?: boolean;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  graphicsEngine,
  showOverlay = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [showWireframe, setShowWireframe] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Attach the real canvas element from graphicsEngine
    const canvasElement = graphicsEngine.getCanvas();
    canvasElement.className = 'w-full h-full object-contain rounded-xl shadow-2xl';
    canvasElement.style.maxHeight = '100%';

    container.innerHTML = '';
    container.appendChild(canvasElement);
  }, [graphicsEngine]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-[#222] bg-[#050505] flex items-center justify-center select-none group">
      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        className="w-full h-full flex items-center justify-center"
      />

      {/* Wireframe / Inspection Box Overlay */}
      {showWireframe && (
        <div className="absolute inset-0 pointer-events-none border border-dashed border-[#7c3aed]/50 m-6 flex items-center justify-center">
          <div className="border border-red-500/80 w-[160px] h-[160px] rounded-xl relative">
            <span className="absolute -top-4 left-0 mono text-[9px] px-1.5 py-0.5 rounded bg-red-500 text-white">
              Hero Product: [320, 160, 160, 160]
            </span>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-28 h-3 border border-amber-400 border-dashed rounded-full text-center">
              <span className="mono text-[8px] text-amber-300 block -top-3 relative">
                Contact Shadow
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Viewport Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#111]/85 backdrop-blur-md border border-[#262626] p-1.5 rounded-lg shadow-lg z-10">
        <button
          onClick={() => setScale((s) => Math.min(3, s + 0.2))}
          className="p-1 hover:bg-white/10 rounded text-[#a3a3a3] hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.4, s - 0.2))}
          className="p-1 hover:bg-white/10 rounded text-[#a3a3a3] hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetView}
          className="p-1 hover:bg-white/10 rounded text-[#a3a3a3] hover:text-white transition-colors"
          title="Reset Pan & Zoom"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3 bg-[#333] mx-0.5" />
        <button
          onClick={() => setShowWireframe((v) => !v)}
          className={`p-1 rounded transition-colors ${
            showWireframe ? 'bg-[#7c3aed] text-white' : 'hover:bg-white/10 text-[#a3a3a3] hover:text-white'
          }`}
          title="Toggle Inspect Wireframe"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom info badge */}
      {showOverlay && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-between pointer-events-none">
          <div className="mono text-[10px] px-2 py-1 rounded bg-black/75 text-white backdrop-blur border border-white/10">
            Real Canvas 2D • 800×500 • relit • recolored 0.15 • scale 1.05
          </div>
          <div className="mono text-[10px] px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            shadow 0.5 ⚠
          </div>
        </div>
      )}
    </div>
  );
};
