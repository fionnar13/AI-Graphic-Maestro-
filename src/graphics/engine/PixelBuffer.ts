/**
 * @file PixelBuffer.ts
 * High-performance, deterministic typed-array RGBA 2D pixel buffer.
 * Operates purely in standard memory (Uint8ClampedArray) so it runs with 100% fidelity
 * in Node.js (headless unit tests) and in the Browser (DOM/Workers/OffscreenCanvas).
 */

export class PixelBuffer {
  public readonly width: number;
  public readonly height: number;
  public readonly data: Uint8ClampedArray;

  constructor(width: number, height: number, data?: Uint8ClampedArray) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    const byteLength = this.width * this.height * 4;

    if (data && data.length === byteLength) {
      this.data = data;
    } else {
      this.data = new Uint8ClampedArray(byteLength);
    }
  }

  public static create(
    width: number,
    height: number,
    fillColor: [number, number, number, number] = [0, 0, 0, 0]
  ): PixelBuffer {
    const buf = new PixelBuffer(width, height);
    if (fillColor[0] === 0 && fillColor[1] === 0 && fillColor[2] === 0 && fillColor[3] === 0) {
      return buf;
    }
    const d = buf.data;
    const [r, g, b, a] = fillColor;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
    return buf;
  }

  public clone(): PixelBuffer {
    const copy = new Uint8ClampedArray(this.data.length);
    copy.set(this.data);
    return new PixelBuffer(this.width, this.height, copy);
  }

  public getPixel(x: number, y: number): [number, number, number, number] {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return [0, 0, 0, 0];
    }
    const idx = (y * this.width + x) * 4;
    return [this.data[idx], this.data[idx + 1], this.data[idx + 2], this.data[idx + 3]];
  }

  public setPixel(x: number, y: number, r: number, g: number, b: number, a: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.data[idx] = r;
    this.data[idx + 1] = g;
    this.data[idx + 2] = b;
    this.data[idx + 3] = a;
  }

  /**
   * Bilinear interpolation for smooth sub-pixel sampling during transforms/scaling.
   */
  public sampleBilinear(u: number, v: number): [number, number, number, number] {
    const x = Math.max(0, Math.min(this.width - 1, u));
    const y = Math.max(0, Math.min(this.height - 1, v));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(this.width - 1, x0 + 1);
    const y1 = Math.min(this.height - 1, y0 + 1);

    const fx = x - x0;
    const fy = y - y0;

    const p00 = this.getPixel(x0, y0);
    const p10 = this.getPixel(x1, y0);
    const p01 = this.getPixel(x0, y1);
    const p11 = this.getPixel(x1, y1);

    const out: [number, number, number, number] = [0, 0, 0, 0];
    for (let c = 0; c < 4; c++) {
      const top = p00[c] * (1 - fx) + p10[c] * fx;
      const bottom = p01[c] * (1 - fx) + p11[c] * fx;
      out[c] = Math.round(top * (1 - fy) + bottom * fy);
    }
    return out;
  }

  /**
   * Crops a region from the buffer and returns a new PixelBuffer.
   */
  public crop(x: number, y: number, width: number, height: number): PixelBuffer {
    const target = PixelBuffer.create(width, height);
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const sx = x + dx;
        const sy = y + dy;
        if (sx >= 0 && sx < this.width && sy >= 0 && sy < this.height) {
          const sIdx = (sy * this.width + sx) * 4;
          const tIdx = (dy * width + dx) * 4;
          target.data[tIdx] = this.data[sIdx];
          target.data[tIdx + 1] = this.data[sIdx + 1];
          target.data[tIdx + 2] = this.data[sIdx + 2];
          target.data[tIdx + 3] = this.data[sIdx + 3];
        }
      }
    }
    return target;
  }

  /**
   * Blits source buffer onto this buffer with optional coordinates, opacity, and mask.
   */
  public blit(
    source: PixelBuffer,
    destX: number,
    destY: number,
    options: {
      opacity?: number;
      mask?: PixelBuffer;
      blendMode?: string;
    } = {}
  ): void {
    const opacity = options.opacity !== undefined ? Math.max(0, Math.min(1, options.opacity)) : 1;
    const mask = options.mask;
    const blendMode = options.blendMode || 'normal';

    for (let sy = 0; sy < source.height; sy++) {
      const dy = destY + sy;
      if (dy < 0 || dy >= this.height) continue;

      for (let sx = 0; sx < source.width; sx++) {
        const dx = destX + sx;
        if (dx < 0 || dx >= this.width) continue;

        const sIdx = (sy * source.width + sx) * 4;
        let sA = (source.data[sIdx + 3] / 255) * opacity;

        if (mask) {
          const mVal = mask.getPixel(sx, sy)[3] / 255;
          sA *= mVal;
        }

        if (sA <= 0) continue;

        const dIdx = (dy * this.width + dx) * 4;
        const dR = this.data[dIdx];
        const dG = this.data[dIdx + 1];
        const dB = this.data[dIdx + 2];
        const dA = this.data[dIdx + 3] / 255;

        const sR = source.data[sIdx];
        const sG = source.data[sIdx + 1];
        const sB = source.data[sIdx + 2];

        // Apply blend mode
        const blended = this.computeBlend(blendMode, [sR, sG, sB], [dR, dG, dB]);

        // Standard alpha compositing (Porter-Duff over)
        const outA = sA + dA * (1 - sA);
        if (outA > 0) {
          this.data[dIdx] = Math.round((blended[0] * sA + dR * dA * (1 - sA)) / outA);
          this.data[dIdx + 1] = Math.round((blended[1] * sA + dG * dA * (1 - sA)) / outA);
          this.data[dIdx + 2] = Math.round((blended[2] * sA + dB * dA * (1 - sA)) / outA);
          this.data[dIdx + 3] = Math.round(outA * 255);
        }
      }
    }
  }

  private computeBlend(
    mode: string,
    src: [number, number, number],
    dst: [number, number, number]
  ): [number, number, number] {
    const s = [src[0] / 255, src[1] / 255, src[2] / 255];
    const d = [dst[0] / 255, dst[1] / 255, dst[2] / 255];
    const out: [number, number, number] = [0, 0, 0];

    for (let i = 0; i < 3; i++) {
      let val = s[i];
      switch (mode) {
        case 'multiply':
          val = s[i] * d[i];
          break;
        case 'screen':
          val = 1 - (1 - s[i]) * (1 - d[i]);
          break;
        case 'overlay':
          val = d[i] < 0.5 ? 2 * s[i] * d[i] : 1 - 2 * (1 - s[i]) * (1 - d[i]);
          break;
        case 'darken':
          val = Math.min(s[i], d[i]);
          break;
        case 'lighten':
          val = Math.max(s[i], d[i]);
          break;
        case 'color-dodge':
          val = s[i] === 1 ? 1 : Math.min(1, d[i] / (1 - s[i]));
          break;
        case 'difference':
          val = Math.abs(s[i] - d[i]);
          break;
        case 'normal':
        default:
          val = s[i];
          break;
      }
      out[i] = Math.round(Math.max(0, Math.min(1, val)) * 255);
    }
    return out;
  }

  /**
   * Applies lookup table to RGB channels.
   */
  public applyLut(lutR: Uint8Array, lutG: Uint8Array, lutB: Uint8Array): void {
    const d = this.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = lutR[d[i]];
      d[i + 1] = lutG[d[i + 1]];
      d[i + 2] = lutB[d[i + 2]];
    }
  }

  /**
   * Calculates luminance histogram of the buffer (256 bins).
   */
  public getHistogram(): { r: number[]; g: number[]; b: number[]; l: number[] } {
    const r = new Array(256).fill(0);
    const g = new Array(256).fill(0);
    const b = new Array(256).fill(0);
    const l = new Array(256).fill(0);

    const d = this.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue; // Skip fully transparent pixels
      const red = d[i];
      const green = d[i + 1];
      const blue = d[i + 2];
      r[red]++;
      g[green]++;
      b[blue]++;
      const lum = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
      l[lum]++;
    }
    return { r, g, b, l };
  }
}
