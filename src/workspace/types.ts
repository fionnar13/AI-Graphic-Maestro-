/**
 * @file types.ts
 * Type definitions for AI Graphic Maestro Professional Workspace.
 */

import { LucideIcon } from 'lucide-react';

export type WorkspaceMode = 'create' | 'inspect' | 'ai_studio';

export type ToolId =
  | 'tool.select'
  | 'tool.move'
  | 'tool.crop'
  | 'tool.transform'
  | 'tool.brush'
  | 'tool.eraser'
  | 'tool.mask'
  | 'tool.clone'
  | 'tool.heal'
  | 'tool.text'
  | 'tool.shape'
  | 'tool.hand'
  | 'tool.zoom';

export type ToolStatus = 'engine_active' | 'hook_ready';

export interface WorkspaceTool {
  id: ToolId;
  name: string;
  shortcut: string;
  category: 'select' | 'transform' | 'retouch' | 'vector' | 'navigate';
  status: ToolStatus;
  statusLabel: string;
  description: string;
}

export type RightDockTab = 'ai' | 'inspector';

export type BottomDockTab = 'layers' | 'properties' | 'assets' | 'history' | 'ai_activity';

export interface CanvasViewportState {
  zoom: number; // 0.1 to 5.0 (1.0 = 100%)
  pan: { x: number; y: number };
  showWireframe: boolean;
  showBounds: boolean;
  showCheckerboard: boolean;
  showTransformHandles: boolean;
  isFullscreen: boolean;
}

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TransformHandle = 'tl' | 'tc' | 'tr' | 'mr' | 'br' | 'bc' | 'bl' | 'ml' | 'rot';

export type ManipulationMode = 'none' | 'move' | 'scale' | 'rotate' | 'crop';

export interface SelectionState {
  selectedLayerId: string | null;
  selectedObjectId: string | null;
  selectionBounds: { x: number; y: number; width: number; height: number } | null;
}

export interface InteractiveTestItem {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'pending' | 'running';
  details?: string;
}

export interface SelectedLayerProperties {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  shadowBlur: number;
  shadowOpacity: number;
  shadowOffset: { x: number; y: number };
  lightIntensity: number;
  lightDirection: 'top_left' | 'top_right' | 'center' | 'bottom';
  recolorBlend: number;
}


