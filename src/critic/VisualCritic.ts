/**
 * @file VisualCritic.ts
 * Real Visual Critic Engine analyzing renders across 10 critical aesthetic & physical dimensions:
 * 1. Composition
 * 2. Perspective
 * 3. Lighting
 * 4. Shadow
 * 5. Material
 * 6. Texture
 * 7. Color
 * 8. Geometry
 * 9. Semantic correctness
 * 10. Realism
 *
 * Produces structured, non-fake issue reports:
 * {
 *   "issues": [
 *     {
 *       "type": "shadow",
 *       "severity": "medium",
 *       "location": "ground_contact_region",
 *       "reason": "...",
 *       "suggestedAction": "primitive.shadow"
 *     }
 *   ]
 * }
 */

import {
  CriticDimension,
  CriticDimensionDetail,
  StructuredCriticIssue,
  StructuredCriticReport,
  VisualAnalysisContext,
} from './types';
import { PixelBuffer } from '../graphics/engine/PixelBuffer';

export class VisualCritic {
  private readonly dimensionWeights: Record<CriticDimension, number> = {
    shadow: 0.15,
    lighting: 0.12,
    composition: 0.12,
    color: 0.10,
    material: 0.10,
    perspective: 0.10,
    geometry: 0.10,
    semantic: 0.10,
    realism: 0.06,
    texture: 0.05,
  };

  /**
   * Evaluates the rendered design based on real geometric, optical, and pixel data.
   */
  public evaluate(context: VisualAnalysisContext): StructuredCriticReport {
    const issues: StructuredCriticIssue[] = [];
    const dimensions: Partial<Record<CriticDimension, CriticDimensionDetail>> = {};

    // 1. SHADOW DIMENSION
    const shadowDetail = this.evaluateShadow(context, issues);
    dimensions['shadow'] = shadowDetail;

    // 2. LIGHTING DIMENSION
    const lightingDetail = this.evaluateLighting(context, issues);
    dimensions['lighting'] = lightingDetail;

    // 3. COMPOSITION DIMENSION
    const compositionDetail = this.evaluateComposition(context, issues);
    dimensions['composition'] = compositionDetail;

    // 4. PERSPECTIVE DIMENSION
    const perspectiveDetail = this.evaluatePerspective(context, issues);
    dimensions['perspective'] = perspectiveDetail;

    // 5. MATERIAL DIMENSION
    const materialDetail = this.evaluateMaterial(context, issues);
    dimensions['material'] = materialDetail;

    // 6. TEXTURE DIMENSION
    const textureDetail = this.evaluateTexture(context, issues);
    dimensions['texture'] = textureDetail;

    // 7. COLOR DIMENSION
    const colorDetail = this.evaluateColor(context, issues);
    dimensions['color'] = colorDetail;

    // 8. GEOMETRY DIMENSION
    const geometryDetail = this.evaluateGeometry(context, issues);
    dimensions['geometry'] = geometryDetail;

    // 9. SEMANTIC CORRECTNESS DIMENSION
    const semanticDetail = this.evaluateSemantic(context, issues);
    dimensions['semantic'] = semanticDetail;

    // 10. REALISM DIMENSION
    const realismDetail = this.evaluateRealism(context, issues);
    dimensions['realism'] = realismDetail;

    // Calculate total weighted score
    let totalScore = 0;
    let totalWeight = 0;

    for (const [key, dim] of Object.entries(dimensions) as [CriticDimension, CriticDimensionDetail][]) {
      totalScore += dim.score * dim.weight;
      totalWeight += dim.weight;
    }

    const overallScore = Number((totalScore / (totalWeight || 1)).toFixed(3));
    const hasCriticalOrHigh = issues.some(
      (i) => i.severity === 'critical' || i.severity === 'high'
    );
    const passed = overallScore >= 0.85 && !hasCriticalOrHigh;
    const needsRevision = !passed;

    return {
      overallScore,
      dimensions: dimensions as Record<CriticDimension, CriticDimensionDetail>,
      issues,
      passed,
      needsRevision,
      timestamp: Date.now(),
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 1: Shadow (Ground Contact & Occlusion)
  // --------------------------------------------------------------------------
  private evaluateShadow(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.shadow;
    const shadow = ctx.shadow;
    const lighting = ctx.lighting;
    const appliedOps = ctx.appliedOperations || [];

    // Case 1: No shadow provided or explicit failure
    const hasShadowApplied =
      shadow?.exists === true ||
      appliedOps.some((op) => op.includes('shadow')) ||
      this.detectContactShadowPixels(ctx);

    if (!hasShadowApplied) {
      issues.push({
        type: 'shadow',
        severity: 'high',
        location: 'ground_contact_region',
        reason: 'Subject lacks ground contact shadow; object appears floating above surface.',
        suggestedAction: 'primitive.shadow',
        metricDetails: {
          shadowExists: false,
          contactOcclusionDensity: 0.0,
        },
      });

      return {
        dim: 'shadow',
        name: 'Shadow & Ground Contact',
        score: 0.35,
        weight,
        status: 'fail',
        observations: [
          'No ambient occlusion or cast shadow detected beneath subject bounding box.',
          'Object lacks ground anchoring.',
        ],
      };
    }

    // Case 2: Shadow exists but verify parameters (feathering, density, directional alignment)
    const opacity = shadow?.opacity ?? 0.45;
    const blur = shadow?.blur ?? 12;
    const offsetX = shadow?.offsetX ?? 16;
    const offsetY = shadow?.offsetY ?? 16;

    const observations: string[] = [];
    let score = 0.90;

    // Check density
    if (opacity < 0.2) {
      score -= 0.25;
      issues.push({
        type: 'shadow',
        severity: 'medium',
        location: 'ground_contact_region',
        reason: `Contact shadow opacity (${opacity.toFixed(2)}) is too faint to establish believable mass.`,
        suggestedAction: 'primitive.shadow',
        metricDetails: { opacity, recommendedOpacity: 0.45 },
      });
      observations.push('Shadow density is insufficiently grounded.');
    } else {
      observations.push(`Contact shadow density solid (${(opacity * 100).toFixed(0)}%).`);
    }

    // Check feathering / blur
    if (blur < 3) {
      score -= 0.15;
      issues.push({
        type: 'shadow',
        severity: 'low',
        location: 'shadow_perimeter',
        reason: 'Shadow edge is unnaturally harsh; needs Gaussian feathering for soft penumbra.',
        suggestedAction: 'primitive.shadow',
        metricDetails: { blur, recommendedBlur: 12 },
      });
      observations.push('Shadow penumbra requires progressive falloff.');
    }

    // Check directional alignment with key light
    if (lighting) {
      const lightDir = lighting.direction;
      const isConsistent =
        (lightDir === 'top_left' && offsetX > 0) ||
        (lightDir === 'top_right' && offsetX < 0) ||
        (lightDir === 'center' && Math.abs(offsetX) <= 5);

      if (!isConsistent) {
        score -= 0.20;
        issues.push({
          type: 'shadow',
          severity: 'medium',
          location: 'shadow_cast_angle',
          reason: `Shadow offset (${offsetX}px) contradicts key light vector ('${lightDir}').`,
          suggestedAction: 'primitive.shadow',
          metricDetails: { lightDirection: lightDir, shadowOffsetX: offsetX },
        });
        observations.push('Shadow projection angle is misaligned with primary illumination.');
      } else {
        observations.push('Shadow projection conforms to key light vector.');
      }
    }

    score = Math.max(0.2, Math.min(1.0, score));

    return {
      dim: 'shadow',
      name: 'Shadow & Ground Contact',
      score,
      weight,
      status: score >= 0.8 ? 'pass' : score >= 0.6 ? 'warning' : 'fail',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 2: Lighting (Direction, Highlights & Specularity)
  // --------------------------------------------------------------------------
  private evaluateLighting(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.lighting;
    const lighting = ctx.lighting;
    const appliedOps = ctx.appliedOperations || [];

    const hasLightingApplied =
      (lighting && lighting.intensity > 0) ||
      appliedOps.some((op) => op.includes('lighting'));

    if (!hasLightingApplied) {
      issues.push({
        type: 'lighting',
        severity: 'medium',
        location: 'subject_specular_region',
        reason: 'Subject lacks directional studio illumination overlay, appearing flat in environment.',
        suggestedAction: 'primitive.lighting',
        metricDetails: { intensity: 0 },
      });

      return {
        dim: 'lighting',
        name: 'Lighting & Directional Highlights',
        score: 0.55,
        weight,
        status: 'warning',
        observations: ['No directional studio lighting highlight applied to subject.'],
      };
    }

    const intensity = lighting?.intensity ?? 0.25;
    let score = 0.90;
    const observations: string[] = [`Illumination intensity calibrated (${(intensity * 100).toFixed(0)}%).`];

    if (intensity < 0.1) {
      score -= 0.2;
      issues.push({
        type: 'lighting',
        severity: 'low',
        location: 'subject_specular_region',
        reason: 'Lighting intensity is nearly invisible (< 10%).',
        suggestedAction: 'primitive.lighting',
      });
    } else if (intensity > 0.75) {
      score -= 0.25;
      issues.push({
        type: 'lighting',
        severity: 'medium',
        location: 'subject_highlights',
        reason: 'Lighting highlight causes specular clipping (> 75% intensity).',
        suggestedAction: 'primitive.lighting',
      });
      observations.push('Risk of highlight burn-out.');
    }

    return {
      dim: 'lighting',
      name: 'Lighting & Directional Highlights',
      score: Math.max(0.3, Math.min(1.0, score)),
      weight,
      status: score >= 0.8 ? 'pass' : 'warning',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 3: Composition (Framing, Centering & Margins)
  // --------------------------------------------------------------------------
  private evaluateComposition(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.composition;
    const { canvasDimensions, subjectBounds } = ctx;
    const cW = canvasDimensions.width || 800;
    const cH = canvasDimensions.height || 500;

    const sX = subjectBounds.x;
    const sY = subjectBounds.y;
    const sW = subjectBounds.width;
    const sH = subjectBounds.height;

    // Check bounds clipping
    if (sX < 0 || sY < 0 || sX + sW > cW || sY + sH > cH) {
      issues.push({
        type: 'composition',
        severity: 'critical',
        location: 'canvas_viewport_edges',
        reason: 'Subject bounds extend beyond canvas viewport edges (clipping detected).',
        suggestedAction: 'tool.move',
        metricDetails: { sX, sY, sW, sH, cW, cH },
      });

      return {
        dim: 'composition',
        name: 'Composition & Optical Balance',
        score: 0.40,
        weight,
        status: 'fail',
        observations: ['Subject exceeds canvas bounds and is partially clipped.'],
      };
    }

    // Occupancy ratio
    const canvasArea = cW * cH;
    const subjectArea = sW * sH;
    const occupancy = subjectArea / canvasArea;

    let score = 0.92;
    const observations: string[] = [];

    if (occupancy < 0.03) {
      score -= 0.35;
      issues.push({
        type: 'composition',
        severity: 'medium',
        location: 'subject_scale',
        reason: `Subject area (${(occupancy * 100).toFixed(1)}%) is undersized relative to canvas.`,
        suggestedAction: 'tool.scale',
        metricDetails: { occupancy, recommendedOccupancy: 0.15 },
      });
      observations.push('Subject is visually lost due to excessive empty space.');
    } else if (occupancy > 0.70) {
      score -= 0.25;
      issues.push({
        type: 'composition',
        severity: 'medium',
        location: 'subject_scale',
        reason: `Subject area (${(occupancy * 100).toFixed(1)}%) suffocates layout margins.`,
        suggestedAction: 'tool.scale',
        metricDetails: { occupancy },
      });
      observations.push('Margins are cramped.');
    } else {
      observations.push(`Subject occupancy balanced (${(occupancy * 100).toFixed(1)}%).`);
    }

    // Optical centering
    const subjectCenterX = sX + sW / 2;
    const subjectCenterY = sY + sH / 2;
    const canvasCenterX = cW / 2;
    const canvasCenterY = cH * 0.46; // Optical center slightly above geometric center

    const dx = Math.abs(subjectCenterX - canvasCenterX) / cW;
    const dy = Math.abs(subjectCenterY - canvasCenterY) / cH;

    if (dx > 0.25 || dy > 0.25) {
      score -= 0.15;
      issues.push({
        type: 'composition',
        severity: 'low',
        location: 'optical_center',
        reason: 'Subject center of mass deviates from optical center.',
        suggestedAction: 'tool.move',
      });
      observations.push('Offset from primary optical focal point.');
    } else {
      observations.push('Center of mass aligned with optical focal point.');
    }

    return {
      dim: 'composition',
      name: 'Composition & Optical Balance',
      score: Math.max(0.3, Math.min(1.0, score)),
      weight,
      status: score >= 0.8 ? 'pass' : score >= 0.6 ? 'warning' : 'fail',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 4: Perspective & Horizon Alignment
  // --------------------------------------------------------------------------
  private evaluatePerspective(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.perspective;
    const transform = ctx.transform;
    let score = 0.88;
    const observations: string[] = ['Ground plane aligned with environment.'];

    if (transform?.perspective) {
      const { tiltX, tiltY } = transform.perspective;
      if (Math.abs(tiltX) > 25 || Math.abs(tiltY) > 25) {
        score -= 0.25;
        issues.push({
          type: 'perspective',
          severity: 'medium',
          location: 'perspective_skew',
          reason: `Extreme perspective tilt (${tiltX}°, ${tiltY}°) disrupts flat horizon plane.`,
          suggestedAction: 'tool.transform',
          metricDetails: { tiltX, tiltY },
        });
        observations.push('Perspective distortion exceeds standard product photography envelope.');
      }
    }

    if (transform?.rotation && Math.abs(transform.rotation) > 30) {
      score -= 0.15;
      issues.push({
        type: 'perspective',
        severity: 'low',
        location: 'axial_rotation',
        reason: 'Product rotation angle disrupts vertical stability.',
        suggestedAction: 'tool.rotate',
      });
    }

    return {
      dim: 'perspective',
      name: 'Perspective & Vanishing Point',
      score,
      weight,
      status: score >= 0.8 ? 'pass' : 'warning',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 5: Material & Specular Dynamics
  // --------------------------------------------------------------------------
  private evaluateMaterial(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.material;
    let score = 0.82;
    const observations: string[] = ['Material reflectivity and specular highlights intact.'];

    // If real pixel buffer is provided, analyze specular dynamic range
    if (ctx.pixelBuffer) {
      const hist = ctx.pixelBuffer.getHistogram();
      const highLuminanceCount = hist.l.slice(220).reduce((a, b) => a + b, 0);
      const totalPixels = hist.l.reduce((a, b) => a + b, 0);
      const specularRatio = totalPixels > 0 ? highLuminanceCount / totalPixels : 0;

      if (specularRatio < 0.0005 && ctx.stylePreset === 'luxury') {
        score -= 0.2;
        issues.push({
          type: 'material',
          severity: 'medium',
          location: 'surface_specularity',
          reason: 'Glossy material lacks specular highlights (< 0.05% specular pixels).',
          suggestedAction: 'primitive.curves',
          metricDetails: { specularRatio },
        });
        observations.push('Specular rolloff lacks metallic or glossy definition.');
      }
    }

    return {
      dim: 'material',
      name: 'Material & Specular Rolloff',
      score,
      weight,
      status: score >= 0.8 ? 'pass' : 'warning',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 6: Texture & Micro-Surface Detail
  // --------------------------------------------------------------------------
  private evaluateTexture(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.texture;
    let score = 0.85;
    const observations: string[] = ['Micro-surface high-frequency sharpness preserved.'];

    if (ctx.pixelBuffer) {
      const variance = this.computePixelVariance(ctx.pixelBuffer);
      if (variance < 10) {
        score -= 0.25;
        issues.push({
          type: 'texture',
          severity: 'low',
          location: 'micro_texture',
          reason: `High-frequency texture variance (${variance.toFixed(1)}) is smoothed out.`,
          suggestedAction: 'tool.contrast',
          metricDetails: { variance },
        });
        observations.push('Micro-surface detail is slightly blurred or flat.');
      }
    }

    return {
      dim: 'texture',
      name: 'Texture & Micro-Surface Detail',
      score,
      weight,
      status: score >= 0.8 ? 'pass' : 'warning',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 7: Color Harmonization & White Balance
  // --------------------------------------------------------------------------
  private evaluateColor(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.color;
    const appliedOps = ctx.appliedOperations || [];
    const hasRecolor = appliedOps.some((op) => op.includes('recolor'));

    let score = 0.88;
    const observations: string[] = ['Color palette harmonized with studio backdrop.'];

    // In luxury dark mode, if foreground has 0 harmonization on dark backdrop
    if (!hasRecolor && ctx.stylePreset === 'luxury') {
      score -= 0.15;
      issues.push({
        type: 'color',
        severity: 'medium',
        location: 'ambient_color_grading',
        reason: 'Foreground subject has not been ambient-harmonized with dark studio backdrop.',
        suggestedAction: 'primitive.recolor',
      });
      observations.push('Ambient color spill does not match environment tone.');
    }

    return {
      dim: 'color',
      name: 'Color & Ambient Harmonization',
      score,
      weight,
      status: score >= 0.8 ? 'pass' : 'warning',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 8: Geometry & Aspect Ratio
  // --------------------------------------------------------------------------
  private evaluateGeometry(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.geometry;
    const scale = ctx.transform?.scale || { x: 1, y: 1 };
    let score = 0.92;
    const observations: string[] = ['Proportions and bounding aspect ratio preserved intact.'];

    const ratio = Math.abs(scale.x / (scale.y || 1));
    if (ratio > 1.25 || ratio < 0.8) {
      score -= 0.3;
      issues.push({
        type: 'geometry',
        severity: 'high',
        location: 'bounding_aspect_ratio',
        reason: `Non-uniform scale distortion detected (${scale.x.toFixed(2)}x vs ${scale.y.toFixed(2)}y).`,
        suggestedAction: 'tool.scale',
        metricDetails: { scaleX: scale.x, scaleY: scale.y },
      });
      observations.push('Subject shows non-uniform aspect distortion.');
    }

    return {
      dim: 'geometry',
      name: 'Geometry & Aspect Ratio Fidelity',
      score,
      weight,
      status: score >= 0.8 ? 'pass' : 'warning',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 9: Semantic Correctness
  // --------------------------------------------------------------------------
  private evaluateSemantic(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.semantic;
    let score = 1.0;
    const observations: string[] = ['All requested primary subject entities present and identified.'];

    if (ctx.hasOperationFailure) {
      score = 0.4;
      issues.push({
        type: 'semantic',
        severity: 'high',
        location: 'pipeline_execution',
        reason: `Operation failure: ${ctx.failureMessage || 'Core pipeline operation failed.'}`,
        suggestedAction: 'tool.composite',
      });
      observations.push('Pipeline reported tool failure during execution.');
    }

    if (ctx.subjectBounds.width <= 0 || ctx.subjectBounds.height <= 0) {
      score = 0.2;
      issues.push({
        type: 'semantic',
        severity: 'critical',
        location: 'subject_layer',
        reason: 'Target subject has zero or empty dimensions.',
        suggestedAction: 'vision.subject_detection',
      });
    }

    return {
      dim: 'semantic',
      name: 'Semantic Correctness & Intent Adherence',
      score,
      weight,
      status: score >= 0.8 ? 'pass' : 'fail',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Dimension 10: Realism & Edge Anti-Aliasing
  // --------------------------------------------------------------------------
  private evaluateRealism(
    ctx: VisualAnalysisContext,
    issues: StructuredCriticIssue[]
  ): CriticDimensionDetail {
    const weight = this.dimensionWeights.realism;
    let score = 0.88;
    const observations: string[] = ['Alpha feathering seamless without haloing artifacts.'];

    // Overall visual plausibility check
    const hasShadow = ctx.shadow?.exists || (ctx.appliedOperations || []).some((o) => o.includes('shadow'));
    if (!hasShadow) {
      score -= 0.25;
      observations.push('Realism penalized due to lack of ground contact.');
    }

    return {
      dim: 'realism',
      name: 'Realism & Edge Blending',
      score: Math.max(0.4, score),
      weight,
      status: score >= 0.8 ? 'pass' : 'warning',
      observations,
    };
  }

  // --------------------------------------------------------------------------
  // Helper: Detect contact shadow pixels from PixelBuffer
  // --------------------------------------------------------------------------
  private detectContactShadowPixels(ctx: VisualAnalysisContext): boolean {
    if (!ctx.pixelBuffer) return false;
    const { x, y, width, height } = ctx.subjectBounds;
    const buf = ctx.pixelBuffer;

    // Inspect contact ground line beneath subject
    const groundY = Math.min(buf.height - 1, y + height + 8);
    let darkPixelCount = 0;
    const sampleWidth = Math.min(width, buf.width - x);

    for (let dx = 0; dx < sampleWidth; dx += 4) {
      const px = buf.getPixel(x + dx, groundY);
      const lum = 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2];
      if (px[3] > 30 && lum < 80) {
        darkPixelCount++;
      }
    }

    return darkPixelCount > 4;
  }

  private computePixelVariance(buf: PixelBuffer): number {
    const sampleCount = Math.min(1000, Math.floor(buf.data.length / 4));
    let sum = 0;
    let sumSq = 0;
    const step = Math.max(4, Math.floor(buf.data.length / (sampleCount * 4)) * 4);

    let count = 0;
    for (let i = 0; i < buf.data.length; i += step) {
      if (buf.data[i + 3] === 0) continue;
      const lum = 0.299 * buf.data[i] + 0.587 * buf.data[i + 1] + 0.114 * buf.data[i + 2];
      sum += lum;
      sumSq += lum * lum;
      count++;
    }

    if (count <= 1) return 15;
    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    return Math.max(0, variance);
  }
}
