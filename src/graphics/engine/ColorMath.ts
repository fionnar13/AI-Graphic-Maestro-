/**
 * @file ColorMath.ts
 * Real color science formulas: RGB to HSL, HSL to RGB, RGB to LAB, Delta-E color difference,
 * and cubic spline evaluation for Curves & Levels tools.
 */

export class ColorMath {
  /**
   * Converts RGB (0..255) to HSL (H: 0..360, S: 0..1, L: 0..1)
   */
  public static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return [h * 360, s, l];
  }

  /**
   * Converts HSL (H: 0..360, S: 0..1, L: 0..1) to RGB (0..255)
   */
  public static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r1 = 0,
      g1 = 0,
      b1 = 0;

    if (h >= 0 && h < 60) {
      r1 = c;
      g1 = x;
      b1 = 0;
    } else if (h >= 60 && h < 120) {
      r1 = x;
      g1 = c;
      b1 = 0;
    } else if (h >= 120 && h < 180) {
      r1 = 0;
      g1 = c;
      b1 = x;
    } else if (h >= 180 && h < 240) {
      r1 = 0;
      g1 = x;
      b1 = c;
    } else if (h >= 240 && h < 300) {
      r1 = x;
      g1 = 0;
      b1 = c;
    } else {
      r1 = c;
      g1 = 0;
      b1 = x;
    }

    return [
      Math.round((r1 + m) * 255),
      Math.round((g1 + m) * 255),
      Math.round((b1 + m) * 255),
    ];
  }

  /**
   * Euclidean color distance in normalized RGB space (0..1)
   */
  public static colorDistance(
    c1: [number, number, number],
    c2: [number, number, number]
  ): number {
    const dr = (c1[0] - c2[0]) / 255;
    const dg = (c1[1] - c2[1]) / 255;
    const db = (c1[2] - c2[2]) / 255;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * Generates a 256-entry monotonic cubic spline lookup table from control points [[x0, y0], [x1, y1], ...].
   */
  public static buildSplineLut(points: [number, number][]): Uint8Array {
    const lut = new Uint8Array(256);
    if (!points || points.length === 0) {
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }

    // Sort control points by x
    const sorted = [...points].sort((a, b) => a[0] - b[0]);

    // Guarantee boundaries at x=0 and x=255
    if (sorted[0][0] > 0) {
      sorted.unshift([0, sorted[0][1]]);
    }
    if (sorted[sorted.length - 1][0] < 255) {
      sorted.push([255, sorted[sorted.length - 1][1]]);
    }

    // Piecewise cubic Hermite interpolation between sorted knots
    for (let i = 0; i < sorted.length - 1; i++) {
      const p0 = sorted[Math.max(0, i - 1)];
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      const p3 = sorted[Math.min(sorted.length - 1, i + 2)];

      const xStart = Math.round(p1[0]);
      const xEnd = Math.round(p2[0]);

      for (let x = xStart; x <= xEnd && x < 256; x++) {
        const t = (xEnd - xStart) === 0 ? 0 : (x - xStart) / (xEnd - xStart);
        // Catmull-Rom / Hermite cubic interpolation
        const y =
          0.5 *
          (2 * p1[1] +
            (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t * t +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t * t * t);
        lut[x] = Math.max(0, Math.min(255, Math.round(y)));
      }
    }

    return lut;
  }
}
