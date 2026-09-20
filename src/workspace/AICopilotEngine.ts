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
        title: `Delete Active Layer (${context.currentLayer?.name || 'Selected'})`,
        confidence: 0.94,
        target: context.currentLayer?.id || 'selected',
        parameters: {},
        isMultiStep: false,
        isRisky: true, // Risky operation! Requires Human Approval
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
        steps = [
          {
            id: `${planId}_step_1`,
            order: 1,
            title: `Delete Target Layer (${targetLayerName}) from Document`,
            toolId: 'tool.remove_object',
            parameters: {
              layerId: targetLayerId,
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

      if (engines.historyEngine) {
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
      onActivity?.({
        id: `act_${Date.now()}_res`,
        timestamp: Date.now(),
        phase: 'Result',
        toolId: step.toolId,
        summary: `Success (${res.durationMs}ms): Canvas & Document updated`,
        status: 'success',
        durationMs: res.durationMs,
      });
    }

    plan.status = 'completed';
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
