/**
 * @file StudioTab
 * Interactive Studio Workspace: live real-time canvas rendering, parameter tweaking,
 * and export functions using the modular GraphicsEngine and ExportEngine.
 */

import React, { useState, useEffect } from 'react';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { ExportEngine } from '../export/ExportEngine';
import { StudioCanvas } from '../canvas/StudioCanvas';
import { Download, Sliders, Sun, CloudRain, RotateCcw, Sparkles } from 'lucide-react';

interface StudioTabProps {
  graphicsEngine: GraphicsEngine;
  exportEngine: ExportEngine;
  onRunAutonomousPipeline: () => void;
}

export const StudioTab: React.FC<StudioTabProps> = ({
  graphicsEngine,
  exportEngine,
  onRunAutonomousPipeline,
}) => {
  const [shadowBlur, setShadowBlur] = useState(12);
  const [shadowOpacity, setShadowOpacity] = useState(0.45);
  const [shadowOffset, setShadowOffset] = useState({ x: 18, y: 18 });
  const [lightIntensity, setLightIntensity] = useState(0.25);
  const [lightDirection, setLightDirection] = useState<'top_left' | 'top_right' | 'center'>('top_left');
  const [recolorBlend, setRecolorBlend] = useState(0.15);
  const [subjectScale, setSubjectScale] = useState(1.05);

  const reRender = () => {
    graphicsEngine.clear();
    graphicsEngine.renderStudioBackground();
    graphicsEngine.renderContactShadow(320, 160, 160, 160, {
      offsetX: shadowOffset.x,
      offsetY: shadowOffset.y,
      blur: shadowBlur,
      opacity: shadowOpacity,
    });
    graphicsEngine.renderSubject(
      320,
      160,
      160,
      160,
      {
        position: { x: 0, y: 0 },
        scale: { x: subjectScale, y: subjectScale },
        rotation: 0,
        perspective: { tiltX: 0, tiltY: 0, depth: 100 },
      },
      {
        intensity: lightIntensity,
        direction: lightDirection,
      },
      recolorBlend
    );
  };

  useEffect(() => {
    reRender();
  }, [shadowBlur, shadowOpacity, shadowOffset, lightIntensity, lightDirection, recolorBlend, subjectScale]);

  const handleExportPNG = () => {
    const dataUrl = exportEngine.exportRaster(graphicsEngine, 'image/png');
    exportEngine.triggerDownload(dataUrl, 'maestro_composed_ad.png');
  };

  return (
    <div className="grid md:grid-cols-12 gap-6 mb-8">
      {/* Interactive Canvas */}
      <div
        className="md:col-span-8 rounded-2xl border p-6 flex flex-col justify-between"
        style={{ background: '#111111', borderColor: '#222222' }}
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="mono text-[11px] tracking-widest text-[#737373]">
              LIVE STUDIO VIEWPORT • REAL 2D CANVAS PIPELINE
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPNG}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] mono font-medium bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-white transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 text-[#a78bfa]" />
                EXPORT PNG
              </button>
              <button
                onClick={onRunAutonomousPipeline}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] mono font-medium bg-[#7c3aed] hover:bg-[#6d28d9] text-white transition-colors cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3 h-3" />
                RUN PIPELINE
              </button>
            </div>
          </div>

          <StudioCanvas graphicsEngine={graphicsEngine} />
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] mono text-[#737373] border-t border-[#1a1a1a] pt-3">
          <span>Viewport: 800×500 px (Render Target)</span>
          <span className="text-[#10b981]">Engine: Active Canvas 2D</span>
        </div>
      </div>

      {/* Real-time Parameters & Adjustment Sliders */}
      <div
        className="md:col-span-4 rounded-2xl border p-6 space-y-6"
        style={{ background: '#111111', borderColor: '#222222' }}
      >
        <div className="flex items-center justify-between">
          <div className="mono text-[11px] tracking-widest text-[#737373] flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#a78bfa]" />
            MODULAR ENGINE CONTROLS
          </div>
          <button
            onClick={() => {
              setShadowBlur(12);
              setShadowOpacity(0.45);
              setShadowOffset({ x: 18, y: 18 });
              setLightIntensity(0.25);
              setLightDirection('top_left');
              setRecolorBlend(0.15);
              setSubjectScale(1.05);
            }}
            className="text-[10px] mono text-[#737373] hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {/* Contact Shadow Controls */}
        <div className="space-y-3 p-3.5 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e]">
          <div className="flex items-center gap-2 mono text-[11px] text-white font-medium">
            <CloudRain className="w-3.5 h-3.5 text-amber-400" />
            primitive.shadow Parameters
          </div>

          <div>
            <div className="flex justify-between text-[10px] mono text-[#737373] mb-1">
              <span>Shadow Blur Radius</span>
              <span className="text-white">{shadowBlur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={shadowBlur}
              onChange={(e) => setShadowBlur(Number(e.target.value))}
              className="w-full accent-[#7c3aed] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] mono text-[#737373] mb-1">
              <span>Shadow Opacity</span>
              <span className="text-white">{(shadowOpacity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={shadowOpacity}
              onChange={(e) => setShadowOpacity(Number(e.target.value))}
              className="w-full accent-[#7c3aed] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] mono text-[#737373] mb-1">
              <span>Offset X / Y</span>
              <span className="text-white">
                {shadowOffset.x}, {shadowOffset.y}
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={30}
              step={1}
              value={shadowOffset.x}
              onChange={(e) => setShadowOffset({ x: Number(e.target.value), y: Number(e.target.value) })}
              className="w-full accent-[#7c3aed] cursor-pointer"
            />
          </div>
        </div>

        {/* Lighting Controls */}
        <div className="space-y-3 p-3.5 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e]">
          <div className="flex items-center gap-2 mono text-[11px] text-white font-medium">
            <Sun className="w-3.5 h-3.5 text-[#a78bfa]" />
            primitive.lighting Parameters
          </div>

          <div>
            <div className="flex justify-between text-[10px] mono text-[#737373] mb-1">
              <span>Light Intensity</span>
              <span className="text-white">{(lightIntensity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.8}
              step={0.05}
              value={lightIntensity}
              onChange={(e) => setLightIntensity(Number(e.target.value))}
              className="w-full accent-[#7c3aed] cursor-pointer"
            />
          </div>

          <div>
            <div className="text-[10px] mono text-[#737373] mb-1.5">Light Direction</div>
            <div className="grid grid-cols-3 gap-1.5 mono text-[10px]">
              {(['top_left', 'center', 'top_right'] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setLightDirection(dir)}
                  className={`py-1 rounded border transition-colors cursor-pointer ${
                    lightDirection === dir
                      ? 'bg-[#7c3aed] border-[#7c3aed] text-white'
                      : 'bg-[#1a1a1a] border-[#262626] text-[#737373] hover:text-white'
                  }`}
                >
                  {dir.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transform & Recolor */}
        <div className="space-y-3 p-3.5 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e]">
          <div>
            <div className="flex justify-between text-[10px] mono text-[#737373] mb-1">
              <span>primitive.scale (Composition)</span>
              <span className="text-white">{subjectScale.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min={0.7}
              max={1.4}
              step={0.01}
              value={subjectScale}
              onChange={(e) => setSubjectScale(Number(e.target.value))}
              className="w-full accent-[#7c3aed] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] mono text-[#737373] mb-1">
              <span>primitive.recolor (Blend)</span>
              <span className="text-white">{(recolorBlend * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.02}
              value={recolorBlend}
              onChange={(e) => setRecolorBlend(Number(e.target.value))}
              className="w-full accent-[#7c3aed] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
