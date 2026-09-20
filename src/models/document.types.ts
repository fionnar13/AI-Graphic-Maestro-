/**
 * @file document.types.ts
 * Real, production-grade Document Object Model (DOM) for AI Graphic Maestro.
 * Not a flattened image: full hierarchical tree of Raster, Vector, Text, Group, and Adjustment layers.
 */

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'soft-light'
  | 'hard-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export type LayerType = 'raster' | 'vector' | 'text' | 'group' | 'adjustment';

export interface Point2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface RectBounds extends Point2D, Size2D {}

export interface LayerTransform {
  position: Point2D;
  scale: Point2D; // 1 = 100%
  rotation: number; // in degrees
  origin: Point2D; // anchor point relative to bounds [0..1]
  skew?: Point2D;
}

// --------------------------------------------------------------------------
// Masks
// --------------------------------------------------------------------------
export type MaskType = 'alpha_bitmap' | 'vector_path' | 'luminance' | 'clipping';

export interface LayerMask {
  id: string;
  type: MaskType;
  enabled: boolean;
  inverted: boolean;
  feather: number; // in px
  opacity: number; // 0..1
  // For alpha_bitmap / luminance: image or canvas data
  bitmapDataUrl?: string;
  // For vector_path: SVG path data
  vectorPath?: string;
  bounds?: RectBounds;
}

// --------------------------------------------------------------------------
// Layer Effects
// --------------------------------------------------------------------------
export interface DropShadowEffect {
  type: 'drop_shadow';
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  opacity: number;
}

export interface InnerShadowEffect {
  type: 'inner_shadow';
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  opacity: number;
}

export interface GaussianBlurEffect {
  type: 'blur';
  enabled: boolean;
  radius: number;
}

export interface ColorOverlayEffect {
  type: 'color_overlay';
  enabled: boolean;
  color: string;
  opacity: number;
  blendMode: BlendMode;
}

export interface StrokeEffect {
  type: 'stroke';
  enabled: boolean;
  color: string;
  width: number;
  position: 'inside' | 'center' | 'outside';
}

export type LayerEffect =
  | DropShadowEffect
  | InnerShadowEffect
  | GaussianBlurEffect
  | ColorOverlayEffect
  | StrokeEffect;

// --------------------------------------------------------------------------
// Layer Contents (Typed by LayerType)
// --------------------------------------------------------------------------

// 1. Raster content: image data / bitmap
export interface RasterContent {
  kind: 'raster';
  assetId?: string;
  dataUrl?: string; // Base64 or local blob URL
  resolution: Size2D;
  pixelCrop?: RectBounds;
}

// 2. Vector content: shapes, paths, SVG geometry
export interface VectorContent {
  kind: 'vector';
  pathData?: string; // SVG path command string (e.g. M 0,0 L 100,0 ...)
  shapeType?: 'rect' | 'circle' | 'ellipse' | 'rounded_rect' | 'path';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  cornerRadius?: number;
}

// 3. Text content: rich typography parameters
export interface TextContent {
  kind: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number | string;
  lineHeight?: number;
  letterSpacing?: number;
  color: string;
  align: 'left' | 'center' | 'right' | 'justify';
}

// 4. Group content: container referencing children IDs in order
export interface GroupContent {
  kind: 'group';
  childIds: string[];
}

// 5. Adjustment content: color grading, tone curves, exposure
export interface AdjustmentContent {
  kind: 'adjustment';
  adjustments: {
    brightness?: number; // -100 to +100
    contrast?: number; // -100 to +100
    saturation?: number; // -100 to +100
    exposure?: number; // -5 to +5
    temperature?: number; // -100 (cool) to +100 (warm)
    tint?: number; // -100 to +100
    hueRotate?: number; // 0 to 360
    colorHarmonization?: {
      targetColor: string;
      strength: number; // 0..1
    };
  };
}

export type LayerContent =
  | RasterContent
  | VectorContent
  | TextContent
  | GroupContent
  | AdjustmentContent;

// --------------------------------------------------------------------------
// The Core Layer Model
// --------------------------------------------------------------------------
export interface MaestroBaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  transform: LayerTransform;
  bounds: RectBounds;
  content: LayerContent;
  mask?: LayerMask;
  effects: LayerEffect[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    aiGenerated?: boolean;
    customData?: Record<string, unknown>;
  };
  parentId?: string | null;
}

// Specific Layer Type Aliases for strict typing
export interface RasterLayer extends MaestroBaseLayer {
  type: 'raster';
  content: RasterContent;
}

export interface VectorLayer extends MaestroBaseLayer {
  type: 'vector';
  content: VectorContent;
}

export interface TextLayer extends MaestroBaseLayer {
  type: 'text';
  content: TextContent;
}

export interface GroupLayer extends MaestroBaseLayer {
  type: 'group';
  content: GroupContent;
}

export interface AdjustmentLayer extends MaestroBaseLayer {
  type: 'adjustment';
  content: AdjustmentContent;
}

export type DocumentLayer =
  | RasterLayer
  | VectorLayer
  | TextLayer
  | GroupLayer
  | AdjustmentLayer;

// --------------------------------------------------------------------------
// Canvas, References & Assets
// --------------------------------------------------------------------------
export interface DocumentCanvas {
  dimensions: Size2D; // e.g., 1920x1080 or 800x500
  resolutionDpi: number; // e.g., 72 or 300
  backgroundColor: string; // e.g., '#0a0a0a' or transparent
  guides: {
    horizontal: number[]; // y positions
    vertical: number[]; // x positions
  };
}

export interface DocumentAsset {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  width: number;
  height: number;
  fileSize?: number;
  sourceUri?: string;
  checksum?: string;
}

export interface DocumentReference {
  id: string;
  name: string;
  type: 'style' | 'palette' | 'moodboard' | 'spec';
  dataUrl?: string;
  notes?: string;
  attributes?: Record<string, unknown>;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  version: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  author: string;
  colorProfile: 'sRGB' | 'display-p3' | 'adobe-rgb';
  description?: string;
  tags?: string[];
}

// --------------------------------------------------------------------------
// Root Document Model
// --------------------------------------------------------------------------
export interface MaestroDocumentModel {
  metadata: DocumentMetadata;
  canvas: DocumentCanvas;
  layers: DocumentLayer[]; // Top-level and nested layer map
  rootLayerOrder: string[]; // Rendering stack order from bottom to top
  assets: DocumentAsset[];
  references: DocumentReference[];
}
