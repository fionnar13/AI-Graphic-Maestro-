/**
 * @file Planner.ts
 * Dynamic Autonomous Planner for AI Graphic Maestro.
 * Translates natural language user prompts and scene analysis into a dynamic,
 * non-hardcoded DAG/Linear Execution Plan and Graphic DSL instructions.
 */

import { DSLOperation, ToolCategory } from '../models/types';
import { IntentAnalysisResult } from '../reasoning/ReasoningEngine';
import { SceneAnalysisResult } from '../adapters/types';
import { DesignConstraints, DynamicPlan, DynamicPlanStep } from './types';

export class Planner {
  /**
   * Derives design constraints dynamically from prompt and detected intent/scene.
   */
  public deriveConstraints(
    userPrompt: string,
    intent?: IntentAnalysisResult,
    scene?: SceneAnalysisResult
  ): DesignConstraints {
    const promptLower = userPrompt.toLowerCase();
    const isLuxury =
      promptLower.includes('لوکس') ||
      promptLower.includes('luxury') ||
      promptLower.includes('premium') ||
      promptLower.includes('عالی');

    const isMinimalist =
      promptLower.includes('مینیمال') ||
      promptLower.includes('ساده') ||
      promptLower.includes('minimal');

    const isVibrant =
      promptLower.includes('روشن') ||
      promptLower.includes('شاد') ||
      promptLower.includes('vibrant');

    let stylePreset: DesignConstraints['stylePreset'] = 'editorial';
    let backgroundColor = '#1a1a1a';
    let shadowBlur = 12;
    let shadowOpacity = 0.45;
    let lightingIntensity = 0.25;
    let scaleFactor = 1.05;

    if (isLuxury) {
      stylePreset = 'luxury';
      backgroundColor = '#0c0a09'; // Deep rich obsidian
      shadowBlur = 14;
      shadowOpacity = 0.5;
      lightingIntensity = 0.28;
      scaleFactor = 1.05;
    } else if (isMinimalist) {
      stylePreset = 'minimalist';
      backgroundColor = '#f4f4f5';
      shadowBlur = 8;
      shadowOpacity = 0.25;
      lightingIntensity = 0.15;
      scaleFactor = 1.0;
    } else if (isVibrant) {
      stylePreset = 'vibrant';
      backgroundColor = '#0f172a';
      shadowBlur = 10;
      shadowOpacity = 0.4;
      lightingIntensity = 0.35;
      scaleFactor = 1.08;
    }

    // Determine lighting direction from scene or defaults
    let lightingDirection: DesignConstraints['lightingDirection'] = 'top_left';
    if (scene?.lighting?.direction) {
      const dir = scene.lighting.direction.toLowerCase();
      if (dir.includes('right')) lightingDirection = 'top_right';
      else if (dir.includes('center')) lightingDirection = 'center';
    }

    return {
      stylePreset,
      backgroundColor,
      lightingDirection,
      lightingIntensity,
      shadowOffset: { x: 18, y: 18 },
      shadowBlur,
      shadowOpacity,
      colorHarmonizationBlend: 0.15,
      scaleFactor,
      preserveBrandPixels: true,
      maxAllowedColorShiftDeltaE: 2.0,
      qualityThreshold: 0.8,
    };
  }

  /**
   * Synthesizes a completely dynamic, context-aware execution plan from user prompt.
   * Plan is NOT hardcoded; it dynamically evaluates required tools and parameters.
   */
  public createDynamicPlan(
    userPrompt: string,
    intent?: IntentAnalysisResult,
    scene?: SceneAnalysisResult,
    customConstraints?: Partial<DesignConstraints>
  ): DynamicPlan {
    const constraints = {
      ...this.deriveConstraints(userPrompt, intent, scene),
      ...customConstraints,
    };

    const promptLower = userPrompt.toLowerCase();
    const steps: DynamicPlanStep[] = [];
    let order = 1;

    const needsSubjectExtraction =
      promptLower.includes('محصول') ||
      promptLower.includes('تبلیغ') ||
      promptLower.includes('product') ||
      promptLower.includes('ad') ||
      promptLower.includes('extract') ||
      promptLower.includes('background') ||
      promptLower.includes('پس‌زمینه') ||
      promptLower.includes('پس زمینه');

    const needsBackground =
      promptLower.includes('تبلیغ') ||
      promptLower.includes('لوکس') ||
      promptLower.includes('luxury') ||
      promptLower.includes('background') ||
      promptLower.includes('پس‌زمینه') ||
      promptLower.includes('پس زمینه') ||
      promptLower.includes('محیط');

    const needsShadow =
      promptLower.includes('تبلیغ') ||
      promptLower.includes('لوکس') ||
      promptLower.includes('luxury') ||
      promptLower.includes('سایه') ||
      promptLower.includes('shadow') ||
      needsBackground;

    const needsLighting =
      promptLower.includes('تبلیغ') ||
      promptLower.includes('لوکس') ||
      promptLower.includes('luxury') ||
      promptLower.includes('نور') ||
      promptLower.includes('light') ||
      needsBackground;

    const needsHarmonization =
      promptLower.includes('لوکس') ||
      promptLower.includes('رنگ') ||
      promptLower.includes('color') ||
      promptLower.includes('harmoniz') ||
      needsBackground;

    const needsCurves =
      promptLower.includes('لوکس') ||
      promptLower.includes('کنتراست') ||
      promptLower.includes('contrast') ||
      promptLower.includes('curve');

    const needsCompositionScale =
      promptLower.includes('لوکس') ||
      promptLower.includes('ترکیب') ||
      promptLower.includes('scale') ||
      promptLower.includes('composition');

    // 1. Perception & Subject Detection
    if (needsSubjectExtraction) {
      steps.push({
        stepId: `step_${order}`,
        order: order++,
        name: 'Detect Product Subject',
        tool: 'vision.subject_detection',
        reasonSummary: 'Locate and isolate the main commercial subject within the canvas boundaries.',
        params: {
          bboxGuide: intent?.constraints?.mainSubjectBbox || [101, 101, 198, 198],
        },
        dependencies: [],
        critical: true,
      });

      steps.push({
        stepId: `step_${order}`,
        order: order++,
        name: 'Segment Subject Alpha Matte',
        tool: 'vision.segmentation',
        reasonSummary: 'Extract high-fidelity alpha matte to separate foreground from original plate.',
        params: {
          featherRadius: 1.5,
          antiAliased: true,
        },
        dependencies: [`step_${order - 1}`],
        critical: true,
      });
    }

    // 2. Background Staging
    if (needsBackground) {
      steps.push({
        stepId: `step_${order}`,
        order: order++,
        name: 'Replace Background Environment',
        tool: 'primitive.background_replacement',
        alternativeTool: 'tool.composite',
        reasonSummary: `Synthesize high-end ${constraints.stylePreset} studio environment canvas.`,
        params: {
          style: `${constraints.stylePreset}_studio`,
          color: constraints.backgroundColor,
        },
        dependencies: needsSubjectExtraction ? [`step_${order - 1}`] : [],
        critical: true,
      });
    }

    // 3. Grounding & Perspective
    if (needsBackground || promptLower.includes('پرسپکتیو') || promptLower.includes('perspective')) {
      steps.push({
        stepId: `step_${order}`,
        order: order++,
        name: 'Perspective Alignment',
        tool: 'primitive.perspective',
        alternativeTool: 'tool.transform',
        reasonSummary: 'Align subject perspective coordinates with the horizon line of new background.',
        params: {
          tiltX: 0,
          tiltY: 0,
        },
        dependencies: [`step_${order - 1}`],
        critical: false,
      });
    }

    // 4. Lighting Integration
    if (needsLighting) {
      steps.push({
        stepId: `step_${order}`,
        order: order++,
        name: 'Studio Keylight Integration',
        tool: 'primitive.lighting',
        alternativeTool: 'tool.brightness',
        reasonSummary: `Cast realistic keylight from ${constraints.lightingDirection} at ${Math.round(constraints.lightingIntensity * 100)}% intensity.`,
        params: {
          intensity: constraints.lightingIntensity,
          direction: constraints.lightingDirection,
        },
        dependencies: [`step_${order - 1}`],
        critical: true,
      });
    }

    // 5. Color Harmonization
    if (needsHarmonization) {
      steps.push({
        stepId: `step_${order}`,
        order: order++,
        name: 'Color Tone Harmonization',
        tool: 'primitive.recolor',
        alternativeTool: 'tool.curves',
        reasonSummary: `Harmonize color gamut with ambient temperature using ${Math.round(constraints.colorHarmonizationBlend * 100)}% blend.`,
        params: {
          blend: constraints.colorHarmonizationBlend,
          tone: 'neutral',
        },
        dependencies: [`step_${order - 1}`],
        critical: false,
      });
    }

    // 6. Contact & Ambient Shadow
    if (needsShadow) {
      steps.push({
        stepId: `step_${order}`,
        order: order++,
        name: 'Contact Shadow Grounding',
        tool: 'primitive.shadow',
        alternativeTool: 'tool.blend',
        reasonSummary: `Anchor subject to ground plane with soft contact shadow (blur: ${constraints.shadowBlur}px, opacity: ${constraints.shadowOpacity}).`,
        params: {
          offsetX: constraints.shadowOffset.x,
          offsetY: constraints.shadowOffset.y,
          blur: constraints.shadowBlur,
          opacity: constraints.shadowOpacity,
        },
        dependencies: [`step_${order - 1}`],
        critical: true,
      });
    }

    // 7. Tone Curves
    if (needsCurves) {
      steps.push({
        stepId: `step_${order}`,
        order: order++,
        name: 'Tone Contrast Enhancement',
        tool: 'primitive.curves',
        alternativeTool: 'tool.contrast',
        reasonSummary: 'Apply photographic S-curve contrast adjustment for visual depth.',
        params: {
          contrast: 1.15,
        },
        dependencies: [`step_${order - 1}`],
        critical: false,
      });
    }

    // 8. Composition & Scale
    if (needsCompositionScale) {
      steps.push({
        stepId: `step_${order}`,
        order: order++,
        name: 'Composition Optical Scaling',
        tool: 'primitive.scale',
        alternativeTool: 'tool.scale',
        reasonSummary: `Scale subject by ${constraints.scaleFactor}x to establish optimal focal weight.`,
        params: {
          sx: constraints.scaleFactor,
          sy: constraints.scaleFactor,
        },
        dependencies: [`step_${order - 1}`],
        critical: false,
      });
    }

    // 9. Visual Saliency & Focal Balance Verification
    steps.push({
      stepId: `step_${order}`,
      order: order++,
      name: 'Visual Saliency Analysis',
      tool: 'vision.saliency',
      reasonSummary: 'Verify optical attention map, contrast balance, and focal alignment.',
      params: {},
      dependencies: [`step_${order - 1}`],
      critical: false,
    });

    // Compile to Graphic DSL
    const dslScript = this.compileStepsToDSL(steps);

    return {
      planId: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userPrompt,
      detectedIntent: intent?.intentCategories?.join(', ') || 'ad_creation',
      objective: `Execute dynamic ${constraints.stylePreset} composition pipeline matching natural language intent`,
      constraints,
      steps,
      dslScript,
      createdAt: Date.now(),
    };
  }

  /**
   * Compiles dynamic plan steps to Graphic DSL script.
   */
  public compileStepsToDSL(steps: DynamicPlanStep[]): string {
    return steps
      .map((s) => {
        const paramEntries = Object.entries(s.params)
          .map(([k, v]) => `${k} ${v}`)
          .join(', ');
        const paramStr = paramEntries.length > 0 ? ` (${paramEntries})` : '';
        const outputName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return `${s.tool}${paramStr} -> ${outputName} // ${s.reasonSummary}`;
      })
      .join('\n');
  }

  /**
   * Converts DynamicPlan to array of DSLOperation.
   */
  public planToOperations(plan: DynamicPlan): DSLOperation[] {
    return plan.steps.map((step) => {
      let category: ToolCategory = 'compositing';
      if (step.tool.startsWith('vision.')) category = 'vision';
      else if (step.tool.includes('shadow') || step.tool.includes('lighting')) category = 'lighting';
      else if (step.tool.includes('scale') || step.tool.includes('perspective') || step.tool.includes('transform')) category = 'transform';
      else if (step.tool.includes('recolor') || step.tool.includes('curves') || step.tool.includes('color')) category = 'color';
      else if (step.tool.includes('select') || step.tool.includes('mask')) category = 'selection';

      return {
        id: step.order,
        tool: step.tool,
        output: step.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        desc: step.reasonSummary,
        category,
        params: step.params,
        status: 'pending',
      };
    });
  }

  /**
   * Backward-compatible helper method.
   */
  public generatePlan(analysis: IntentAnalysisResult): DSLOperation[] {
    const dynamicPlan = this.createDynamicPlan(analysis.rawPrompt, analysis);
    return this.planToOperations(dynamicPlan);
  }
}
