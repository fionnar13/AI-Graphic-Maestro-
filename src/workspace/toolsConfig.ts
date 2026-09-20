/**
 * @file toolsConfig.ts
 * Registry and configuration for all tools in the Left Toolbox.
 */

import {
  MousePointer,
  Move,
  Crop,
  Maximize2,
  Paintbrush,
  Eraser,
  Scissors,
  Stamp,
  Bandage,
  Type,
  Square,
  Hand,
  ZoomIn,
  LucideIcon,
} from 'lucide-react';
import { ToolId, WorkspaceTool } from './types';

export interface ToolConfigItem extends WorkspaceTool {
  icon: LucideIcon;
}

export const WORKSPACE_TOOLS: ToolConfigItem[] = [
  // Selection & Transform Group
  {
    id: 'tool.select',
    name: 'Select',
    shortcut: 'V',
    category: 'select',
    icon: MousePointer,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Select layers, bounding boxes, or click canvas elements',
  },
  {
    id: 'tool.move',
    name: 'Move',
    shortcut: 'M',
    category: 'select',
    icon: Move,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Reposition active layer or selection across canvas coordinates',
  },
  {
    id: 'tool.crop',
    name: 'Crop',
    shortcut: 'C',
    category: 'transform',
    icon: Crop,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Non-destructively crop canvas bounds and trim margins',
  },
  {
    id: 'tool.transform',
    name: 'Transform',
    shortcut: 'T',
    category: 'transform',
    icon: Maximize2,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Scale, rotate, and apply 3D perspective distortion matrix',
  },

  // Retouching & Compositing Group
  {
    id: 'tool.brush',
    name: 'Brush',
    shortcut: 'B',
    category: 'retouch',
    icon: Paintbrush,
    status: 'hook_ready',
    statusLabel: 'Hook Ready',
    description: 'Soft paint brush for manual shading and mask edge touchups',
  },
  {
    id: 'tool.eraser',
    name: 'Eraser',
    shortcut: 'E',
    category: 'retouch',
    icon: Eraser,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Erase pixels or refine alpha channel boundaries',
  },
  {
    id: 'tool.mask',
    name: 'Mask',
    shortcut: 'Q',
    category: 'retouch',
    icon: Scissors,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'AI Subject cutout mask and luminance thresholding',
  },
  {
    id: 'tool.clone',
    name: 'Clone Stamp',
    shortcut: 'S',
    category: 'retouch',
    icon: Stamp,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Sample source texture and stamp seamless background fill',
  },
  {
    id: 'tool.heal',
    name: 'Spot Heal',
    shortcut: 'J',
    category: 'retouch',
    icon: Bandage,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Patch blemishes and blend high-frequency textures',
  },

  // Vector & Typography Group
  {
    id: 'tool.text',
    name: 'Text',
    shortcut: 'P',
    category: 'vector',
    icon: Type,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Add typography, slogan text, or price tags',
  },
  {
    id: 'tool.shape',
    name: 'Vector Shape',
    shortcut: 'U',
    category: 'vector',
    icon: Square,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Create parametric rectangles, ellipses, and badges',
  },

  // Navigation Group
  {
    id: 'tool.hand',
    name: 'Hand',
    shortcut: 'H',
    category: 'navigate',
    icon: Hand,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Pan around the high-resolution canvas viewport',
  },
  {
    id: 'tool.zoom',
    name: 'Zoom',
    shortcut: 'Z',
    category: 'navigate',
    icon: ZoomIn,
    status: 'engine_active',
    statusLabel: 'Engine Active',
    description: 'Zoom into pixels or fit entire canvas to screen',
  },
];
