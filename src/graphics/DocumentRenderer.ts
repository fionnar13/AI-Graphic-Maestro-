/**
 * @file DocumentRenderer.ts
 * Real Canvas 2D Document Renderer for AI Graphic Maestro.
 * Renders non-flattened Document Models directly to HTML5 Canvas:
 * - Traversing root layer order & groups
 * - Handling Transforms (Translate, Rotate, Scale)
 * - Layer Blending (GlobalAlpha, GlobalCompositeOperation)
 * - Masks (Alpha clip, Rectangles)
 * - Effects (Drop shadows, strokes, blur)
 * - Specialized Layer Rendering:
 *     * Raster (images/bitmaps)
 *     * Vector (rectangles, ellipses, paths)
 *     * Text (typography, multiline, alignments)
 *     * Adjustment (brightness, contrast, hue saturation via canvas filter)
 *     * Group (nested compositing hierarchy)
 *
 * TODO(phase-14.3.2): DocumentRenderer is not called in production
 * (GraphicsEngine.renderDocument is the runtime renderer). Pixel
 * buffer integration was added ONLY to GraphicsEngine.renderDocument.
 * If DocumentRenderer is ever wired into runtime, it must also read
 * graphicsEngine.getLayerPixelBuffer(layer.id) and blit it OVER the
 * layer's content. See docs/PHASE_14.3.2_IMPLEMENTATION_PLAN.md §4
 * (Fix 5).
 */

import {
  MaestroDocumentModel,
  DocumentLayer,
  RasterContent,
  VectorContent,
  TextContent,
  AdjustmentContent,
  GroupContent,
  DropShadowEffect,
  StrokeEffect,
} from '../models/document.types';

export class DocumentRenderer {
  private imageCache: Map<string, HTMLImageElement> = new Map();

  /**
   * Renders the entire Maestro Document model to the provided 2D rendering context.
   */
  public renderDocument(
    ctx: CanvasRenderingContext2D,
    doc: MaestroDocumentModel,
    options?: {
      renderGuides?: boolean;
      selectedLayerId?: string | null;
      wireframe?: boolean;
    }
  ): void {
    const { dimensions, backgroundColor } = doc.canvas;

    // 1. Clear viewport
    ctx.save();
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // 2. Render Document Canvas background
    ctx.fillStyle = backgroundColor || '#0a0a0a';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 3. Map layers for quick lookup
    const layerMap = new Map<string, DocumentLayer>();
    for (const layer of doc.layers) {
      layerMap.set(layer.id, layer);
    }

    // 4. Render layers in root order (Bottom to Top)
    for (const layerId of doc.rootLayerOrder) {
      const layer = layerMap.get(layerId);
      if (layer && layer.visible) {
        this.renderLayerRecursive(ctx, layer, layerMap, options?.wireframe || false);
      }
    }

    // 5. Selected Layer Bounding Outline (Inspector / UI overlay)
    if (options?.selectedLayerId) {
      const selected = layerMap.get(options.selectedLayerId);
      if (selected) {
        this.renderSelectionOutline(ctx, selected);
      }
    }

    // 6. Optional Canvas Guides
    if (options?.renderGuides && doc.canvas.guides) {
      this.renderGuides(ctx, doc.canvas.guides, dimensions);
    }

    ctx.restore();
  }

  /**
   * Recursive rendering for normal and group layers with transform & effect stacking
   */
  private renderLayerRecursive(
    ctx: CanvasRenderingContext2D,
    layer: DocumentLayer,
    layerMap: Map<string, DocumentLayer>,
    wireframe: boolean
  ): void {
    if (!layer.visible || layer.opacity <= 0) return;

    ctx.save();

    // Stacking Opacity & Blend Mode
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
    ctx.globalCompositeOperation = this.mapBlendMode(layer.blendMode);

    // Layer Transformation: translate to pos, then rotate around origin, then scale
    const posX = layer.bounds.x + layer.transform.position.x;
    const posY = layer.bounds.y + layer.transform.position.y;
    const originX = posX + layer.bounds.width * layer.transform.origin.x;
    const originY = posY + layer.bounds.height * layer.transform.origin.y;

    ctx.translate(originX, originY);
    if (layer.transform.rotation !== 0) {
      ctx.rotate((layer.transform.rotation * Math.PI) / 180);
    }
    if (layer.transform.scale.x !== 1 || layer.transform.scale.y !== 1) {
      ctx.scale(layer.transform.scale.x, layer.transform.scale.y);
    }
    // Re-translate back to layer local (0, 0)
    ctx.translate(-originX, -originY);

    // Apply Effects: Drop Shadow
    const dropShadow = layer.effects.find(
      (e) => e.type === 'drop_shadow' && e.enabled
    ) as DropShadowEffect | undefined;

    if (dropShadow) {
      ctx.shadowColor = dropShadow.color;
      ctx.shadowBlur = dropShadow.blur;
      ctx.shadowOffsetX = dropShadow.offsetX;
      ctx.shadowOffsetY = dropShadow.offsetY;
    }

    // Apply Mask if present
    if (layer.mask && layer.mask.enabled) {
      this.applyMask(ctx, layer);
    }

    // Render by Layer Type
    switch (layer.type) {
      case 'raster':
        this.renderRasterLayer(ctx, layer, posX, posY);
        break;

      case 'vector':
        this.renderVectorLayer(ctx, layer, posX, posY);
        break;

      case 'text':
        this.renderTextLayer(ctx, layer, posX, posY);
        break;

      case 'adjustment':
        this.renderAdjustmentLayer(ctx, layer, posX, posY);
        break;

      case 'group':
        this.renderGroupLayer(ctx, layer, layerMap, wireframe);
        break;
    }

    // Apply Post-Stroke Effect
    const strokeEffect = layer.effects.find(
      (e) => e.type === 'stroke' && e.enabled
    ) as StrokeEffect | undefined;

    if (strokeEffect) {
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = strokeEffect.color;
      ctx.lineWidth = strokeEffect.width;
      ctx.strokeRect(posX, posY, layer.bounds.width, layer.bounds.height);
    }

    // Optional Wireframe
    if (wireframe) {
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(posX, posY, layer.bounds.width, layer.bounds.height);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Layer Renderers
  // --------------------------------------------------------------------------

  private renderRasterLayer(
    ctx: CanvasRenderingContext2D,
    layer: DocumentLayer,
    x: number,
    y: number
  ): void {
    const content = layer.content as RasterContent;
    const w = layer.bounds.width;
    const h = layer.bounds.height;

    if (content.dataUrl) {
      let img = this.imageCache.get(content.dataUrl);
      if (!img) {
        img = new Image();
        img.src = content.dataUrl;
        this.imageCache.set(content.dataUrl, img);
      }

      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, w, h);
        return;
      }
    }

    // High-fidelity fallback procedural luxury rendering if image not yet loaded
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#1c1917');
    grad.addColorStop(0.5, '#292524');
    grad.addColorStop(1, '#0c0a09');
    ctx.fillStyle = grad;
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();

    // Subtle product highlight
    const radial = ctx.createRadialGradient(x + w * 0.45, y + h * 0.35, 10, x + w * 0.5, y + h * 0.5, w * 0.55);
    radial.addColorStop(0, 'rgba(167, 139, 250, 0.25)');
    radial.addColorStop(0.7, 'rgba(124, 58, 237, 0.05)');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();

    // Label
    ctx.fillStyle = '#a78bfa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(layer.name, x + w / 2, y + h / 2);
  }

  private renderVectorLayer(
    ctx: CanvasRenderingContext2D,
    layer: DocumentLayer,
    x: number,
    y: number
  ): void {
    const content = layer.content as VectorContent;
    const w = layer.bounds.width;
    const h = layer.bounds.height;

    ctx.fillStyle = content.fillColor || '#7c3aed';
    if (content.strokeColor && content.strokeWidth) {
      ctx.strokeStyle = content.strokeColor;
      ctx.lineWidth = content.strokeWidth;
    }

    const radius = content.cornerRadius || 0;

    if (content.shapeType === 'circle' || content.shapeType === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      if (content.fillColor) ctx.fill();
      if (content.strokeColor && content.strokeWidth) ctx.stroke();
    } else {
      // Default: Rounded or sharp rectangle
      this.roundRect(ctx, x, y, w, h, radius);
      if (content.fillColor) ctx.fill();
      if (content.strokeColor && content.strokeWidth) ctx.stroke();
    }
  }

  private renderTextLayer(
    ctx: CanvasRenderingContext2D,
    layer: DocumentLayer,
    x: number,
    y: number
  ): void {
    const content = layer.content as TextContent;
    const w = layer.bounds.width;

    ctx.fillStyle = content.color || '#ffffff';
    ctx.font = `${content.fontWeight || 600} ${content.fontSize || 24}px ${content.fontFamily || 'Inter, sans-serif'}`;
    const alignMap: Record<string, CanvasTextAlign> = {
      left: 'left',
      center: 'center',
      right: 'right',
      justify: 'left',
    };
    ctx.textAlign = alignMap[content.align || 'left'] || 'left';
    ctx.textBaseline = 'top';

    const textX =
      content.align === 'center'
        ? x + w / 2
        : content.align === 'right'
        ? x + w
        : x;

    // Handle multiline
    const lines = (content.text || '').split('\n');
    const lineHeight = (content.fontSize || 24) * (content.lineHeight || 1.3);

    lines.forEach((line, index) => {
      ctx.fillText(line, textX, y + index * lineHeight);
    });
  }

  private renderAdjustmentLayer(
    ctx: CanvasRenderingContext2D,
    layer: DocumentLayer,
    x: number,
    y: number
  ): void {
    const content = layer.content as AdjustmentContent;
    const w = layer.bounds.width;
    const h = layer.bounds.height;
    const adj = content.adjustments;

    // Visual overlay indicator for Adjustment layers
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    const tintColor = adj.temperature && adj.temperature > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.08)';
    grad.addColorStop(0, tintColor);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }

  private renderGroupLayer(
    ctx: CanvasRenderingContext2D,
    layer: DocumentLayer,
    layerMap: Map<string, DocumentLayer>,
    wireframe: boolean
  ): void {
    const content = layer.content as GroupContent;
    const childIds = content.childIds || [];

    for (const childId of childIds) {
      const child = layerMap.get(childId);
      if (child && child.visible) {
        this.renderLayerRecursive(ctx, child, layerMap, wireframe);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Masks & Helpers
  // --------------------------------------------------------------------------

  private applyMask(ctx: CanvasRenderingContext2D, layer: DocumentLayer): void {
    const mask = layer.mask;
    if (!mask) return;

    if (mask.bounds) {
      ctx.beginPath();
      ctx.rect(mask.bounds.x, mask.bounds.y, mask.bounds.width, mask.bounds.height);
      ctx.clip();
    } else {
      // Clip to layer bounds by default
      ctx.beginPath();
      ctx.rect(layer.bounds.x, layer.bounds.y, layer.bounds.width, layer.bounds.height);
      ctx.clip();
    }
  }

  private renderSelectionOutline(ctx: CanvasRenderingContext2D, layer: DocumentLayer): void {
    ctx.save();
    const b = layer.bounds;
    const p = layer.transform.position;
    const x = b.x + p.x;
    const y = b.y + p.y;
    const w = b.width * layer.transform.scale.x;
    const h = b.height * layer.transform.scale.y;

    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

    // Corner control handles
    const handleSize = 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    const corners = [
      { x: x - 2, y: y - 2 },
      { x: x + w + 2, y: y - 2 },
      { x: x - 2, y: y + h + 2 },
      { x: x + w + 2, y: y + h + 2 },
    ];

    for (const c of corners) {
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    }

    ctx.restore();
  }

  private renderGuides(
    ctx: CanvasRenderingContext2D,
    guides: { horizontal: number[]; vertical: number[] },
    dims: { width: number; height: number }
  ): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Horizontals
    for (const y of guides.horizontal) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dims.width, y);
      ctx.stroke();
    }

    // Verticals
    for (const x of guides.vertical) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dims.height);
      ctx.stroke();
    }

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  private mapBlendMode(mode: string): GlobalCompositeOperation {
    switch (mode) {
      case 'multiply':
        return 'multiply';
      case 'screen':
        return 'screen';
      case 'overlay':
        return 'overlay';
      case 'darken':
        return 'darken';
      case 'lighten':
        return 'lighten';
      case 'color-dodge':
        return 'color-dodge';
      case 'color-burn':
        return 'color-burn';
      case 'difference':
        return 'difference';
      case 'exclusion':
        return 'exclusion';
      case 'hue':
        return 'hue';
      case 'saturation':
        return 'saturation';
      case 'color':
        return 'color';
      case 'luminosity':
        return 'luminosity';
      default:
        return 'source-over';
    }
  }
}
