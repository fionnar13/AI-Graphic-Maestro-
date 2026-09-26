/**
 * @file AICopilotEngine.ts
 * Core AI Copilot Controller for Graphic Workspace & Tool Registry.
 *
 * Responsibilities:
 * 1. Read-only Context Snapshot builder (Restricted document access).
 * 2. Intent Recognition for Persian & English graphic directives.
 * 3. Multi-Step Plan Generator with Risk Assessment & Human Approval Gateways.
 * 4. Graphic DSL Code Synthesis & Pre-Execution Validation.
 * 5. Authoritative Tool Execution via ToolRegistry -> DocumentEngine -> GraphicsEngine -> Canvas.
 * 6. History Operation Logging & Error Recovery.
 */

import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { ToolRegistry } from '../tools/ToolRegistry';
import { HistoryEngine } from '../history/HistoryEngine';
import { GraphicDSL, GraphicToolCall } from '../dsl/GraphicDSL';
import { OperationRecord } from '../history/types';
import {
  CopilotContextSnapshot,
  CopilotIntent,
  CopilotPlan,
  CopilotPlanStep,
  ActivityEvent,
} from './copilotTypes';

export type AICopilotActivityEvent = ActivityEvent;

export class AICopilotEngine {
  private toolRegistry: ToolRegistry;

  constructor(toolRegistry?: ToolRegistry) {
    this.toolRegistry = toolRegistry || new ToolRegistry();
  }

  /**
   * Constructs a sanitized, read-only context snapshot of the current workspace.
   * AI receives this snapshot and never directly mutates Document state.
   */
  public buildContextSnapshot(
    documentEngine: MaestroDocumentEngine,
    graphicsEngine?: GraphicsEngine,
    selectedLayerId?: string | null,
    zoom: number = 1
  ): CopilotContextSnapshot {
    const docModel = documentEngine.getDocument();
    const allLayers = documentEngine.getAllLayers();
    const activeLayer = selectedLayerId
      ? documentEngine.getLayer(selectedLayerId) || allLayers[allLayers.length - 1] || null
      : allLayers.length > 0
      ? allLayers[allLayers.length - 1]
      : null;

    const availableTools = this.toolRegistry.getAllTools().map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
    }));

    const assets = documentEngine.getAssets().map((a) => ({
      id: a.id,
      name: a.name,
      mimeType: a.mimeType,
    }));

    return {
      document: {
        id: docModel.metadata.id,
        name: docModel.metadata.title,
        width: docModel.canvas.dimensions.width,
        height: docModel.canvas.dimensions.height,
        colorProfile: docModel.metadata.colorProfile,
        layerCount: allLayers.length,
      },
      currentLayer: activeLayer
        ? {
            id: activeLayer.id,
            name: activeLayer.name,
            type: activeLayer.type,
            bounds: { ...activeLayer.bounds },
            opacity: activeLayer.opacity,
            blendMode: activeLayer.blendMode,
            visible: activeLayer.visible,
            locked: activeLayer.locked,
            hasMask: Boolean(activeLayer.mask && activeLayer.mask.enabled),
          }
        : null,
      selectedObject: activeLayer
        ? {
            id: activeLayer.id,
            name: activeLayer.name,
            bounds: { ...activeLayer.bounds },
          }
        : null,
      selection: {
        hasSelection: false,
      },
      availableTools,
      canvasState: {
        zoom,
        viewport: {
          width: graphicsEngine ? graphicsEngine.width : docModel.canvas.dimensions.width,
          height: graphicsEngine ? graphicsEngine.height : docModel.canvas.dimensions.height,
        },
      },
      relevantAssets: assets,
    };
  }

  /**
   * Translates Persian or English natural language directives into graphic intents.
   */
  public parseIntent(prompt: string, context: CopilotContextSnapshot): CopilotIntent {
    const p = prompt.toLowerCase().trim();

    // 1. MOVE LAYER
    // "این لایه را 100 پیکسل به چپ ببر", "کمی به چپ ببر", "move left 100px"
    if (
      p.includes('چپ') ||
      p.includes('راست') ||
      p.includes('بالا') ||
      p.includes('پایین') ||
      p.includes('ببر') ||
      p.includes('جابجا') ||
      /\bmove\b/i.test(p) ||
      /\bshift\b/i.test(p) ||
      /\btranslate\b/i.test(p)
    ) {
      let dx = 0;
      let dy = 0;
      const numMatch = prompt.match(/\d+/);
      const val = numMatch ? parseInt(numMatch[0], 10) : 50;

      if (p.includes('چپ') || p.includes('left')) {
        dx = -val;
      } else if (p.includes('راست') || p.includes('right')) {
        dx = val;
      }

      if (p.includes('بالا') || p.includes('up')) {
        dy = -val;
      } else if (p.includes('پایین') || p.includes('down')) {
        dy = val;
      }

      if (dx === 0 && dy === 0) {
        dx = -50; // Default slight move left
      }

      return {
        type: 'MOVE_LAYER',
        title: `Move Layer by (${dx}px, ${dy}px)`,
        confidence: 0.96,
        target: context.currentLayer?.id || 'selected',
        parameters: { delta: { x: dx, y: dy } },
        isMultiStep: false,
        isRisky: false,
      };
    }

    // 2. SCALE LAYER
    // "این لایه را 20 درصد بزرگ کن", "scale up by 20%", "کوچک کن"
    if (
      p.includes('بزرگ') ||
      p.includes('کوچک') ||
      p.includes('scale') ||
      p.includes('enlarge') ||
      p.includes('shrink') ||
      p.includes('zoom')
    ) {
      const numMatch = prompt.match(/\d+/);
      let factor = 1.2;

      if (numMatch) {
        const percent = parseInt(numMatch[0], 10);
        if (p.includes('کوچک') || p.includes('shrink') || p.includes('down')) {
          factor = Math.max(0.1, (100 - percent) / 100);
        } else {
          factor = (100 + percent) / 100;
        }
      } else if (p.includes('کوچک') || p.includes('shrink')) {
        factor = 0.8;
      }

      return {
        type: 'SCALE_LAYER',
        title: `Scale Layer by factor ${factor.toFixed(2)}x`,
        confidence: 0.95,
        target: context.currentLayer?.id || 'selected',
        parameters: { scale: { factor } },
        isMultiStep: false,
        isRisky: false,
      };
    }

    // 3. REMOVE BACKGROUND (Multi-step) - checked before general REMOVE_OBJECT
    // "پسزمینه را حذف کن", "پس‌زمینه را بردار", "remove background", "isolate subject"
    if (
      p.includes('پسزمینه') ||
      p.includes('پس‌زمینه') ||
      p.includes('بک‌گراند') ||
      p.includes('background') ||
      p.includes('cutout') ||
      p.includes('isolate')
    ) {
      return {
        type: 'REMOVE_BACKGROUND',
        title: 'Multi-Step Autonomous Background Removal & Alpha Masking',
        confidence: 0.97,
        target: context.currentLayer?.id || 'selected',
        parameters: {},
        isMultiStep: true,
        isRisky: true, // Multi-step pipeline requires confirmation
      };
    }

    // 4. APPLY TEXTURE (Multi-step)
    // "بافت این پارچه را روی لباس اعمال کن", "apply fabric texture"
    if (
      p.includes('بافت') ||
      p.includes('پارچه') ||
      p.includes('لباس') ||
      p.includes('texture') ||
      p.includes('fabric') ||
      p.includes('garment')
    ) {
      return {
        type: 'APPLY_TEXTURE',
        title: 'Multi-Step Fabric Texture Transfer & Surface Harmonization',
        confidence: 0.91,
        target: context.currentLayer?.id || 'selected',
        parameters: { blendMode: 'multiply', opacity: 0.85 },
        isMultiStep: true,
        isRisky: true,
      };
    }

    // 5. SET OPACITY
    // "Opacity را به 50 درصد برسان", "شفافیت را ۵۰ درصد کن", "set opacity to 50%"
    if (
      p.includes('opacity') ||
      p.includes('شفافیت') ||
      p.includes('کدر') ||
      p.includes('تاری') ||
      p.includes('alpha')
    ) {
      const numMatch = prompt.match(/\d+/);
      let opacity = 0.5;
      if (numMatch) {
        const val = parseInt(numMatch[0], 10);
        opacity = val > 1 ? val / 100 : val;
      }

      return {
        type: 'SET_OPACITY',
        title: `Set Layer Opacity to ${Math.round(opacity * 100)}%`,
        confidence: 0.98,
        target: context.currentLayer?.id || 'selected',
        parameters: { opacity },
        isMultiStep: false,
        isRisky: false,
      };
    }

    // 6. RECOLOR
    // "رنگ این شیء را قرمز کن", "make this object red", "recolor"
    if (
      p.includes('رنگ') ||
      p.includes('قرمز') ||
      p.includes('آبی') ||
      p.includes('سبز') ||
      p.includes('طلایی') ||
      p.includes('color') ||
      p.includes('recolor')
    ) {
      let color = '#ef4444'; // Red default
      if (p.includes('آبی') || p.includes('blue')) color = '#3b82f6';
      if (p.includes('سبز') || p.includes('green')) color = '#22c55e';
      if (p.includes('طلایی') || p.includes('زرد') || p.includes('gold') || p.includes('yellow')) color = '#eab308';
      if (p.includes('سیاه') || p.includes('black')) color = '#171717';

      return {
        type: 'RECOLOR',
        title: `Recolor Object with tint ${color}`,
        confidence: 0.92,
        target: context.currentLayer?.id || 'selected',
        parameters: { color, blend: 0.35 },
        isMultiStep: false,
        isRisky: false,
      };
    }

    // 7. REMOVE OBJECT / DELETE LAYER
    // "این شیء را حذف کن", "این لایه را پاک کن", "remove this object", "delete layer"
    if (
      p.includes('حذف کن') ||
      p.includes('پاک کن') ||
      p.includes('از بین ببر') ||
      p.includes('remove') ||
      p.includes('delete') ||
      p.includes('erase')
    ) {
      return {
        type: 'REMOVE_OBJECT',
        title: `Remove Object from ${context.currentLayer?.name || 'Selected Layer'}`,
        confidence: 0.94,
        target: context.currentLayer?.id || 'selected',
        parameters: {},
        isMultiStep: false,
        isRisky: false,
      };
    }

    // 8. ROTATE
    if (p.includes('بچرخان') || p.includes('چرخش') || p.includes('rotate')) {
      const numMatch = prompt.match(/\d+/);
      const angle = numMatch ? parseInt(numMatch[0], 10) : 15;
      return {
        type: 'ROTATE_LAYER',
        title: `Rotate Layer by ${angle}°`,
        confidence: 0.95,
        target: context.currentLayer?.id || 'selected',
        parameters: { angle },
        isMultiStep: false,
        isRisky: false,
      };
    }

    // 9. CREATE MASK
    if (p.includes('ماسک') || p.includes('mask')) {
      return {
        type: 'CREATE_MASK',
        title: 'Create Feathered Layer Mask',
        confidence: 0.93,
        target: context.currentLayer?.id || 'selected',
        parameters: { type: 'vignette', feather: 15 },
        isMultiStep: false,
        isRisky: false,
      };
    }

    // 10. EVALUATE / CRITIC
    if (p.includes('ارزیابی') || p.includes('کیفیت') || p.includes('evaluate') || p.includes('critic')) {
      return {
        type: 'EVALUATE',
        title: 'Run 10-Dimensional Graphic Quality Critic',
        confidence: 0.98,
        parameters: {},
        isMultiStep: false,
        isRisky: false,
      };
    }

    // 11. ROLLBACK / UNDO
    if (p.includes('بازگشت') || p.includes('برگردان') || p.includes('undo') || p.includes('rollback')) {
      return {
        type: 'ROLLBACK',
        title: 'Rollback Last Operation in History',
        confidence: 0.99,
        parameters: {},
        isMultiStep: false,
        isRisky: false,
      };
    }

    // Phase 14.3.3 (A1) — Pixel tool intent mappings
    // Brightness
    if (p.includes('brightness') || p.includes('brighten') || p.includes('darken') ||
        p.includes('روشن') || p.includes('تاریک') || p.includes('روشنی')) {
      let brightness = 50;
      const numMatch = p.match(/(-?\d+)/);
      if (numMatch) brightness = Math.max(-100, Math.min(100, parseInt(numMatch[1])));
      if (p.includes('darken') || p.includes('تاریک')) brightness = -Math.abs(brightness);
      return {
        type: 'ADJUST_BRIGHTNESS', title: 'Adjust Brightness', confidence: 0.92,
        parameters: { brightness }, isMultiStep: false, isRisky: false,
      };
    }
    // Contrast
    if (p.includes('contrast') || p.includes('کنتراست')) {
      let contrast = 30;
      const numMatch = p.match(/(-?\d+)/);
      if (numMatch) contrast = Math.max(-100, Math.min(100, parseInt(numMatch[1])));
      return {
        type: 'ADJUST_CONTRAST', title: 'Adjust Contrast', confidence: 0.92,
        parameters: { contrast }, isMultiStep: false, isRisky: false,
      };
    }
    // Curves
    if (p.includes('curve') || p.includes('منحنی')) {
      return {
        type: 'ADJUST_CURVES', title: 'Adjust Curves', confidence: 0.88,
        parameters: { controlPoints: [[0, 0], [64, 50], [192, 210], [255, 255]], channel: 'rgb' },
        isMultiStep: false, isRisky: false,
      };
    }
    // Levels
    if (p.includes('level') || p.includes('سطوح')) {
      return {
        type: 'ADJUST_LEVELS', title: 'Adjust Levels', confidence: 0.88,
        parameters: { inputBlack: 10, inputWhite: 245, gamma: 1.2, outputBlack: 0, outputWhite: 255 },
        isMultiStep: false, isRisky: false,
      };
    }
    // Inpaint
    if (p.includes('inpaint') || p.includes('ترمیم') || p.includes('fill hole') || p.includes('restore')) {
      return {
        type: 'INPAINT_REGION', title: 'Inpaint Region', confidence: 0.88,
        parameters: { radius: 4 }, isMultiStep: false, isRisky: false,
      };
    }
    // Clone
    if (p.includes('clone') || p.includes('کلون') || p.includes('stamp')) {
      return {
        type: 'CLONE_STAMP', title: 'Clone Stamp', confidence: 0.88,
        parameters: { sourceX: 10, sourceY: 10, targetX: 30, targetY: 30, radius: 20, hardness: 0.8, opacity: 1.0 },
        isMultiStep: false, isRisky: false,
      };
    }
    // Heal
    if (p.includes('heal') || p.includes('درمان') || p.includes('patch') || p.includes('repair')) {
      return {
        type: 'HEAL_PATCH', title: 'Heal Patch', confidence: 0.88,
        parameters: { sourceX: 10, sourceY: 10, targetX: 30, targetY: 30, radius: 15 },
        isMultiStep: false, isRisky: false,
      };
    }
    // Composite
    if (p.includes('composite') || p.includes('merge') || p.includes('ترکیب') || p.includes('blend layers')) {
      return {
        type: 'COMPOSITE_STUDIO', title: 'Composite Layers', confidence: 0.88,
        parameters: { blendMode: 'normal', opacity: 1.0 }, isMultiStep: false, isRisky: false,
      };
    }
    // Crop
    if (p.includes('crop') || p.includes('برش')) {
      let cx = 0, cy = 0, cw = 400, ch = 300;
      const nums = p.match(/(-?\d+)/g);
      if (nums && nums.length >= 2) {
        cw = parseInt(nums[0]); ch = parseInt(nums[1]);
      }
      return {
        type: 'CROP_DOCUMENT', title: 'Crop Document', confidence: 0.88,
        parameters: { target: 'canvas', x: cx, y: cy, width: cw, height: ch },
        isMultiStep: false, isRisky: false,
      };
    }

    // Default fallback
    return {
      type: 'UNKNOWN',
      title: 'Analyze Directive & Graphic Intent',
      confidence: 0.5,
      parameters: {},
      isMultiStep: false,
      isRisky: false,
    };
  }

  /**
   * Generates a structured multi-step plan from detected Intent.
   */
  public generatePlan(intent: CopilotIntent, context: CopilotContextSnapshot): CopilotPlan {
    const planId = `plan_${Date.now()}`;
    const targetLayerId = intent.target || context.currentLayer?.id || 'selected';
    const targetLayerName = context.currentLayer?.name || 'Active Layer';
    let steps: CopilotPlanStep[] = [];

    switch (intent.type) {
      case 'MOVE_LAYER':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: `Translate Layer (${targetLayerName}) by (${intent.parameters.delta?.x || 0}px, ${intent.parameters.delta?.y || 0}px)`,
            toolId: 'tool.move',
            parameters: {
              layerId: targetLayerId,
              dx: intent.parameters.delta?.x || 0,
              dy: intent.parameters.delta?.y || 0,
            },
            status: 'pending',
          },
        ];
        break;

      case 'SCALE_LAYER':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: `Scale Layer (${targetLayerName}) by factor ${intent.parameters.scale?.factor || 1.2}x`,
            toolId: 'tool.scale',
            parameters: {
              layerId: targetLayerId,
              scaleX: intent.parameters.scale?.factor || 1.2,
              scaleY: intent.parameters.scale?.factor || 1.2,
            },
            status: 'pending',
          },
        ];
        break;

      case 'ROTATE_LAYER':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: `Rotate Layer (${targetLayerName}) by ${intent.parameters.angle || 15}°`,
            toolId: 'tool.rotate',
            parameters: {
              layerId: targetLayerId,
              angleDegrees: intent.parameters.angle || 15,
            },
            status: 'pending',
          },
        ];
        break;

      case 'SET_OPACITY':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: `Set Opacity on (${targetLayerName}) to ${Math.round((intent.parameters.opacity || 0.5) * 100)}%`,
            toolId: 'tool.blend',
            parameters: {
              layerId: targetLayerId,
              blendMode: context.currentLayer?.blendMode || 'normal',
              opacity: intent.parameters.opacity !== undefined ? intent.parameters.opacity : 0.5,
            },
            status: 'pending',
          },
        ];
        break;

      case 'RECOLOR':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: `Recolor Layer (${targetLayerName}) with hue tint ${intent.parameters.color || '#ef4444'}`,
            toolId: 'tool.recolor',
            parameters: {
              layerId: targetLayerId,
              color: intent.parameters.color || '#ef4444',
              blend: intent.parameters.blend || 0.35,
            },
            status: 'pending',
          },
        ];
        break;

      case 'REMOVE_OBJECT':
        // Phase 14.3.3 (A1) — Include boundingBox so RemoveObjectTool inpaints
        // the region instead of deleting the whole layer. Without boundingBox,
        // the tool falls through to documentEngine.deleteLayer() which is
        // destructive and bypasses the inpaint algorithm.
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: `Remove Object from Layer (${targetLayerName}) via Inpainting`,
            toolId: 'tool.remove_object',
            parameters: {
              layerId: targetLayerId,
              boundingBox: context.currentLayer?.bounds || { x: 0, y: 0, width: 100, height: 100 },
              dilateRadius: 2,
              coordinateSpace: 'canvas',
            },
            status: 'pending',
          },
        ];
        break;

      case 'CREATE_MASK':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: `Generate Feathered Layer Mask for (${targetLayerName})`,
            toolId: 'tool.mask',
            parameters: {
              layerId: targetLayerId,
              action: 'from_selection',
              maskType: intent.parameters.type || 'vignette',
              feather: intent.parameters.feather || 12,
            },
            status: 'pending',
          },
        ];
        break;

      case 'REMOVE_BACKGROUND':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: 'Step 1: Identify Subject Bounding Box',
            toolId: 'vision.subject_detection',
            parameters: { target: 'canvas' },
            status: 'pending',
          },
          {
            id: `${planId}_step_2`,
            order: 2,
            title: 'Step 2: Generate Subject Selection Matte',
            toolId: 'tool.selection',
            parameters: {
              shape: 'subject_matte',
              x: context.currentLayer?.bounds.x || 100,
              y: context.currentLayer?.bounds.y || 100,
              width: context.currentLayer?.bounds.width || 300,
              height: context.currentLayer?.bounds.height || 300,
            },
            status: 'pending',
          },
          {
            id: `${planId}_step_3`,
            order: 3,
            title: `Step 3: Create Non-Destructive Alpha Mask for (${targetLayerName})`,
            toolId: 'tool.mask',
            parameters: {
              layerId: targetLayerId,
              action: 'from_selection',
              maskType: 'alpha_matte',
              feather: 4,
            },
            status: 'pending',
          },
          {
            id: `${planId}_step_4`,
            order: 4,
            title: 'Step 4: Verify Cutout Boundary Quality',
            toolId: 'tool.evaluate',
            parameters: { criteria: 'edge_accuracy' },
            status: 'pending',
          },
        ];
        break;

      case 'APPLY_TEXTURE':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: 'Step 1: Identify Target Garment Silhouette',
            toolId: 'vision.segmentation',
            parameters: { label: 'garment' },
            status: 'pending',
          },
          {
            id: `${planId}_step_2`,
            order: 2,
            title: 'Step 2: Generate Boundary Selection Mask',
            toolId: 'tool.selection',
            parameters: {
              shape: 'polygon_matte',
              x: context.currentLayer?.bounds.x || 100,
              y: context.currentLayer?.bounds.y || 100,
              width: context.currentLayer?.bounds.width || 300,
              height: context.currentLayer?.bounds.height || 300,
            },
            status: 'pending',
          },
          {
            id: `${planId}_step_3`,
            order: 3,
            title: 'Step 3: Blend Fabric Texture with Multiply Mode',
            toolId: 'tool.blend',
            parameters: {
              layerId: targetLayerId,
              blendMode: 'multiply',
              opacity: 0.85,
            },
            status: 'pending',
          },
          {
            id: `${planId}_step_4`,
            order: 4,
            title: 'Step 4: Harmonize Rim Lighting across Folds',
            toolId: 'primitive.lighting',
            parameters: { intensity: 0.2, direction: 'top_left' },
            status: 'pending',
          },
        ];
        break;

      case 'EVALUATE':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: 'Run 10-Dimensional Graphic Quality Critic',
            toolId: 'tool.evaluate',
            parameters: {},
            status: 'pending',
          },
        ];
        break;

      case 'ROLLBACK':
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: 'Rollback Last Command in History Timeline',
            toolId: 'tool.rollback',
            parameters: {},
            status: 'pending',
          },
        ];
        break;

      // Phase 14.3.3 (A1) — Pixel tool plan cases
      case 'ADJUST_BRIGHTNESS':
        steps = [
          {
            id: `${planId}_step_1`, order: 1,
            title: `Adjust Brightness (${intent.parameters.brightness}) on ${targetLayerName}`,
            toolId: 'tool.brightness',
            parameters: { layerId: targetLayerId, brightness: intent.parameters.brightness },
            status: 'pending',
          },
        ];
        break;

      case 'ADJUST_CONTRAST':
        steps = [
          {
            id: `${planId}_step_1`, order: 1,
            title: `Adjust Contrast (${intent.parameters.contrast}) on ${targetLayerName}`,
            toolId: 'tool.contrast',
            parameters: { layerId: targetLayerId, contrast: intent.parameters.contrast },
            status: 'pending',
          },
        ];
        break;

      case 'ADJUST_CURVES':
        steps = [
          {
            id: `${planId}_step_1`, order: 1,
            title: `Adjust Curves on ${targetLayerName}`,
            toolId: 'tool.curves',
            parameters: {
              layerId: targetLayerId,
              channel: intent.parameters.channel || 'rgb',
              controlPoints: intent.parameters.controlPoints,
            },
            status: 'pending',
          },
        ];
        break;

      case 'ADJUST_LEVELS':
        steps = [
          {
            id: `${planId}_step_1`, order: 1,
            title: `Adjust Levels on ${targetLayerName}`,
            toolId: 'tool.levels',
            parameters: {
              layerId: targetLayerId,
              inputBlack: intent.parameters.inputBlack ?? 0,
              inputWhite: intent.parameters.inputWhite ?? 255,
              gamma: intent.parameters.gamma ?? 1.0,
              outputBlack: intent.parameters.outputBlack ?? 0,
              outputWhite: intent.parameters.outputWhite ?? 255,
            },
            status: 'pending',
          },
        ];
        break;

      case 'INPAINT_REGION':
        steps = [
          {
            id: `${planId}_step_1`, order: 1,
            title: `Inpaint Region on ${targetLayerName}`,
            toolId: 'tool.inpaint',
            parameters: {
              layerId: targetLayerId,
              maskRegion: context.currentLayer?.bounds || { x: 0, y: 0, width: 50, height: 50 },
              radius: intent.parameters.radius || 4,
            },
            status: 'pending',
          },
        ];
        break;

      case 'CLONE_STAMP':
        steps = [
          {
            id: `${planId}_step_1`, order: 1,
            title: `Clone Stamp on ${targetLayerName}`,
            toolId: 'tool.clone',
            parameters: {
              layerId: targetLayerId,
              sourceX: intent.parameters.sourceX,
              sourceY: intent.parameters.sourceY,
              targetX: intent.parameters.targetX,
              targetY: intent.parameters.targetY,
              radius: intent.parameters.radius,
              hardness: intent.parameters.hardness ?? 0.8,
              opacity: intent.parameters.opacity ?? 1.0,
            },
            status: 'pending',
          },
        ];
        break;

      case 'HEAL_PATCH':
        steps = [
          {
            id: `${planId}_step_1`, order: 1,
            title: `Heal Patch on ${targetLayerName}`,
            toolId: 'tool.heal',
            parameters: {
              layerId: targetLayerId,
              sourceX: intent.parameters.sourceX,
              sourceY: intent.parameters.sourceY,
              targetX: intent.parameters.targetX,
              targetY: intent.parameters.targetY,
              radius: intent.parameters.radius,
            },
            status: 'pending',
          },
        ];
        break;

      case 'COMPOSITE_STUDIO':
        steps = [
          {
            id: `${planId}_step_1`, order: 1,
            title: `Composite Layers`,
            toolId: 'tool.composite',
            parameters: {
              sourceLayerId: targetLayerId,
              destLayerId: targetLayerId,
              blendMode: intent.parameters.blendMode || 'normal',
              opacity: intent.parameters.opacity ?? 1.0,
            },
            status: 'pending',
          },
        ];
        break;

      case 'CROP_DOCUMENT':
        steps = [
          {
            id: `${planId}_step_1`, order: 1,
            title: `Crop Document`,
            toolId: 'tool.crop',
            parameters: {
              target: intent.parameters.target || 'canvas',
              layerId: targetLayerId,
              x: intent.parameters.x ?? 0,
              y: intent.parameters.y ?? 0,
              width: intent.parameters.width ?? 400,
              height: intent.parameters.height ?? 300,
            },
            status: 'pending',
          },
        ];
        break;

      default:
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: 'Analyze Scene and Evaluate Composition',
            toolId: 'tool.evaluate',
            parameters: {},
            status: 'pending',
          },
        ];
    }

    return {
      id: planId,
      userPrompt: intent.title,
      intent,
      title: intent.title,
      isRisky: intent.isRisky,
      status: intent.isRisky ? 'awaiting_approval' : 'executing',
      steps,
      createdAt: Date.now(),
    };
  }

  /**
   * Generates clean Graphic DSL JSON payload from plan step.
   */
  public generateDSL(step: CopilotPlanStep): GraphicToolCall {
    const op = step.toolId.replace(/^tool\./, '').replace(/^primitive\./, '').replace(/^vision\./, '');
    let operation = step.toolId;
    if (step.toolId === 'tool.move') operation = 'move_object';
    if (step.toolId === 'tool.scale') operation = 'scale_object';
    if (step.toolId === 'tool.rotate') operation = 'rotate_object';
    if (step.toolId === 'tool.remove_object') operation = 'remove_object';
    if (step.toolId === 'tool.recolor') operation = 'recolor';
    if (step.toolId === 'tool.mask') operation = 'create_mask';
    if (step.toolId === 'tool.blend') operation = 'blend';

    return {
      operation,
      target: step.parameters.layerId || step.parameters.target || 'selected',
      parameters: { ...step.parameters },
      ...(step.parameters.dx !== undefined || step.parameters.dy !== undefined
        ? { delta: { x: step.parameters.dx || 0, y: step.parameters.dy || 0 } }
        : {}),
      ...(step.parameters.scaleX !== undefined
        ? { scale: { x: step.parameters.scaleX, y: step.parameters.scaleY || step.parameters.scaleX } }
        : {}),
      ...(step.parameters.angleDegrees !== undefined ? { angle: step.parameters.angleDegrees } : {}),
      ...(step.parameters.opacity !== undefined ? { opacity: step.parameters.opacity } : {}),
      ...(step.parameters.blendMode ? { blendMode: step.parameters.blendMode } : {}),
      ...(step.parameters.color ? { color: step.parameters.color } : {}),
    };
  }

  /**
   * Authoritative Execution Gateway:
   * 1. Validates Tool Call via GraphicDSL
   * 2. Executes on Document & GraphicsEngine
   * 3. Re-renders Canvas immediately
   * 4. Logs to HistoryEngine
   * 5. Emits real-time operational Activity events
   */
  public async executePlan(
    plan: CopilotPlan,
    engines: {
      documentEngine: MaestroDocumentEngine;
      graphicsEngine: GraphicsEngine;
      historyEngine?: HistoryEngine;
      toolRegistry?: ToolRegistry;
    },
    onActivity?: (event: ActivityEvent) => void
  ): Promise<{
    success: boolean;
    executedSteps: number;
    error?: string;
  }> {
    const reg = engines.toolRegistry || this.toolRegistry;
    plan.status = 'executing';
    let executedCount = 0;
    // Phase 14.3.3 (A6) — Track whether any real document mutation occurred.
    // tool.evaluate is a no-op evaluator that returns success without mutation.
    // The plan should NOT report "COMPLETED" with "Canvas & Document updated"
    // when no actual mutation happened.
    let documentMutated = false;

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      step.status = 'executing';

      // 1. Activity: Tool Phase
      onActivity?.({
        id: `act_${Date.now()}_tool`,
        timestamp: Date.now(),
        phase: 'Tool',
        toolId: step.toolId,
        summary: `Selected tool: ${step.toolId}`,
        status: 'running',
      });

      // 2. Activity: Parameters Phase
      onActivity?.({
        id: `act_${Date.now()}_params`,
        timestamp: Date.now(),
        phase: 'Parameters',
        toolId: step.toolId,
        parameters: step.parameters,
        summary: `Validating parameters for ${step.title}`,
        status: 'info',
      });

      // 3. DSL Validation
      const dslCall = this.generateDSL(step);
      const validation = GraphicDSL.validate(dslCall);

      if (!validation.valid) {
        step.status = 'failed';
        step.error = validation.errors.join(', ');
        plan.status = 'failed';

        onActivity?.({
          id: `act_${Date.now()}_err`,
          timestamp: Date.now(),
          phase: 'Error',
          toolId: step.toolId,
          summary: `Validation Error: ${step.error}`,
          status: 'error',
        });

        return {
          success: false,
          executedSteps: executedCount,
          error: step.error,
        };
      }

      // 4. Activity: Executing Phase
      onActivity?.({
        id: `act_${Date.now()}_exec`,
        timestamp: Date.now(),
        phase: 'Executing',
        toolId: step.toolId,
        parameters: validation.sanitizedParams,
        summary: `Executing ${step.toolId} on Document Engine & Canvas`,
        status: 'running',
      });

      // Special handling for rollback
      if (step.toolId === 'tool.rollback' && engines.historyEngine) {
        const canUndo = engines.historyEngine.canUndo();
        if (canUndo) {
          await engines.historyEngine.undo();
          engines.graphicsEngine.renderDocument();
          step.status = 'completed';
          step.output = { rolledBack: true };
          executedCount++;

          onActivity?.({
            id: `act_${Date.now()}_rollback`,
            timestamp: Date.now(),
            phase: 'Rollback',
            toolId: step.toolId,
            summary: 'Successfully rolled back previous command state',
            status: 'success',
          });
          continue;
        }
      }

      // 5. Tool Registry Execution
      const res = await reg.execute(validation.canonicalToolId, validation.sanitizedParams, {
        graphicsEngine: engines.graphicsEngine,
        documentEngine: engines.documentEngine,
      });

      if (!res.success) {
        step.status = 'failed';
        step.error = res.error || 'Execution failed';
        plan.status = 'failed';

        onActivity?.({
          id: `act_${Date.now()}_err`,
          timestamp: Date.now(),
          phase: 'Error',
          toolId: step.toolId,
          summary: `Tool failed: ${step.error}`,
          status: 'error',
        });

        // Error Recovery Check: check for alternative tools
        const alts = reg.getAlternatives(step.toolId);
        if (alts.length > 0) {
          onActivity?.({
            id: `act_${Date.now()}_alt`,
            timestamp: Date.now(),
            phase: 'Planning',
            toolId: alts[0],
            summary: `Error Recovery: Fallback alternative available [${alts.join(', ')}]`,
            status: 'warning',
          });
        }

        return {
          success: false,
          executedSteps: executedCount,
          error: step.error,
        };
      }

      // 6. Record in History Engine
      step.status = 'completed';
      step.durationMs = res.durationMs;
      step.output = res.output;
      executedCount++;

      // Phase 14.3.3 (A6) — Track real mutation. tool.evaluate is a no-op
      // evaluator that returns success without any document mutation.
      // tool.rollback reverses a previous mutation (it's a state restoration,
      // not a forward mutation). Any other tool that succeeds is considered
      // a real mutation.
      if (step.toolId !== 'tool.evaluate' && step.toolId !== 'tool.rollback') {
        documentMutated = true;
      }

      // Phase 14.3.3 (A8) — DO NOT call historyEngine.recordOperationDirectly()
      // here. The tool already executed through GraphicsEngine.executeTool() →
      // executePrimitiveToolCommand() → historyEngine.executeCommand(), which
      // pushes a real undoable command onto the branch undo stack AND records
      // the operation telemetry in the operations Map.
      //
      // Calling recordOperationDirectly() here used to ADD A SECOND operation
      // record (parented to the command's record) which:
      //   1. Created duplicate entries in the History panel timeline
      //   2. Advanced branch.headOperationId past the command (so undo() on
      //      the command would leave the orphan direct-record as head)
      //   3. Diverged the "undoable command" stack from the "operation timeline"
      //
      // This was the parallel-history divergence (C1) root cause.
      // The command record from executeCommand() IS the canonical history entry.
      //
      // For non-tool.* steps (vision.*, primitive.*) that don't go through
      // GraphicsEngine.executeTool, we still want a telemetry record. We
      // detect this by checking whether the toolId is a registered primitive
      // tool in the GraphicsEngine (if so, executeCommand already recorded it).
      const isGraphicsTool = step.toolId.startsWith('tool.');
      if (engines.historyEngine && !isGraphicsTool) {
        const opRecord: OperationRecord = {
          operationId: `op_ai_${Date.now()}_${i}`,
          tool: step.toolId,
          parameters: validation.sanitizedParams,
          input: {},
          output: res.output,
          timestamp: Date.now(),
          parent: null,
          status: 'success',
          duration: res.durationMs,
          error: null,
        };
        engines.historyEngine.recordOperationDirectly(opRecord);
      }

      // 7. Activity: Result Phase
      // Phase 14.3.3 (A6) — Accurate status message. Only say "Canvas &
      // Document updated" when a real mutation occurred. tool.evaluate and
      // tool.rollback should not claim forward document mutation.
      const isMutationStep = step.toolId !== 'tool.evaluate' && step.toolId !== 'tool.rollback';
      onActivity?.({
        id: `act_${Date.now()}_res`,
        timestamp: Date.now(),
        phase: 'Result',
        toolId: step.toolId,
        summary: isMutationStep
          ? `Success (${res.durationMs}ms): Canvas & Document updated`
          : `Success (${res.durationMs}ms): Evaluated — no document changes`,
        status: 'success',
        durationMs: res.durationMs,
      });
    }

    // Phase 14.3.3 (A6) — Plan status reflects actual mutation.
    // 'completed' = at least one step mutated the document.
    // 'completed_noop' = all steps were no-ops (e.g., tool.evaluate).
    plan.status = documentMutated ? 'completed' : 'completed_noop';
    plan.completedAt = Date.now();

    return {
      success: true,
      executedSteps: executedCount,
    };
  }

  /**
   * Returns current Model Connection Status.
   */
  public getModelStatus(): { connected: boolean; statusText: string } {
    return {
      connected: false,
      statusText: 'MODEL NOT CONNECTED',
    };
  }

  /**
   * High-level entry point to process a natural language user directive end-to-end.
   */
  public async processUserRequest(
    prompt: string,
    engines: {
      documentEngine: MaestroDocumentEngine;
      graphicsEngine: GraphicsEngine;
      historyEngine?: HistoryEngine;
      toolRegistry?: ToolRegistry;
    },
    onActivity?: (event: any) => void
  ): Promise<{
    status: string;
    intent: CopilotIntent;
    plan: CopilotPlanStep[];
    executionResult?: { success: boolean; executedSteps: number; error?: string };
  }> {
    const activeLayerId = engines.graphicsEngine.getActiveLayer()?.id || null;
    const context = this.buildContextSnapshot(
      engines.documentEngine,
      engines.graphicsEngine,
      activeLayerId
    );

    const intent = this.parseIntent(prompt, context);
    const plan = this.generatePlan(intent, context);

    // Auto-approve for execution
    if (plan.status === 'awaiting_approval') {
      plan.status = 'executing';
    }

    const res = await this.executePlan(plan, engines, onActivity);

    return {
      status: plan.status,
      intent,
      plan: plan.steps,
      executionResult: res,
    };
  }
}
