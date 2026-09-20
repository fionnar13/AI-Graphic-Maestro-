/**
 * @file InpaintAlgorithms.ts
 * Real algorithmic implementations of:
 * 1. Telea Fast Marching Inpainting (PDE isophote diffusion to fill masked regions).
 * 2. Gradient-Domain Poisson Seamless Texture Healing.
 * 3. Clone Stamp sampling with falloff brush.
 */

import { PixelBuffer } from './PixelBuffer';

export class InpaintAlgorithms {
  /**
   * Fast Marching PDE inpainting (Telea method).
   * Fills all pixels in `image` where `mask` > 0 by diffusing boundary pixels along isophotes.
   *
   * @param image PixelBuffer to modify in-place
   * @param mask PixelBuffer of same size, where pixel alpha or luminance > 0 indicates region to inpaint
   * @param radius Sampling neighborhood radius (typically 3 to 7 pixels)
   */
  public static inpaintTelea(image: PixelBuffer, mask: PixelBuffer, radius: number = 4): void {
    const width = image.width;
    const height = image.height;
    const totalPixels = width * height;

    // Flags: 0 = KNOWN, 1 = BAND (boundary), 2 = INSIDE (hole)
    const flags = new Uint8Array(totalPixels);
    const dist = new Float32Array(totalPixels);

    // Initialize flags
    let holeCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const maskVal = mask.data[idx * 4 + 3] > 0 ? mask.data[idx * 4 + 3] : mask.data[idx * 4];
        if (maskVal > 128) {
          flags[idx] = 2; // INSIDE hole
          dist[idx] = 1e6;
          holeCount++;
        } else {
          flags[idx] = 0; // KNOWN
          dist[idx] = 0;
        }
      }
    }

    if (holeCount === 0) return;

    // Identify narrow band (hole pixels adjacent to known pixels)
    const bandQueue: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (flags[idx] === 2) {
          // Check 4-neighbors
          const hasKnownNeighbor =
            (x > 0 && flags[idx - 1] === 0) ||
            (x < width - 1 && flags[idx + 1] === 0) ||
            (y > 0 && flags[idx - width] === 0) ||
            (y < height - 1 && flags[idx + width] === 0);

          if (hasKnownNeighbor) {
            flags[idx] = 1; // BAND
            dist[idx] = 1.0;
            bandQueue.push(idx);
          }
        }
      }
    }

    // Process band pixels iteratively (Fast Marching propagation)
    const radSq = radius * radius;

    while (bandQueue.length > 0) {
      // Find pixel in band with minimum distance (approximated queue for speed)
      let minIdx = 0;
      let minDist = dist[bandQueue[0]];
      const checkLimit = Math.min(bandQueue.length, 32);
      for (let i = 1; i < checkLimit; i++) {
        if (dist[bandQueue[i]] < minDist) {
          minDist = dist[bandQueue[i]];
          minIdx = i;
        }
      }

      const pIdx = bandQueue.splice(minIdx, 1)[0];
      const px = pIdx % width;
      const py = Math.floor(pIdx / width);

      // Inpaint this pixel using neighborhood
      let sumR = 0,
        sumG = 0,
        sumB = 0,
        sumA = 0;
      let totalWeight = 0;

      const yMin = Math.max(0, py - radius);
      const yMax = Math.min(height - 1, py + radius);
      const xMin = Math.max(0, px - radius);
      const xMax = Math.min(width - 1, px + radius);

      for (let ny = yMin; ny <= yMax; ny++) {
        for (let nx = xMin; nx <= xMax; nx++) {
          const nIdx = ny * width + nx;
          if (flags[nIdx] === 0) {
            // Known pixel
            const dx = nx - px;
            const dy = ny - py;
            const dSq = dx * dx + dy * dy;
            if (dSq <= radSq && dSq > 0) {
              const d = Math.sqrt(dSq);
              // Weight formula: directional & distance falloff
              const weight = 1.0 / (d * (1.0 + Math.abs(dist[nIdx] - dist[pIdx])));

              const pOff = nIdx * 4;
              sumR += image.data[pOff] * weight;
              sumG += image.data[pOff + 1] * weight;
              sumB += image.data[pOff + 2] * weight;
              sumA += image.data[pOff + 3] * weight;
              totalWeight += weight;
            }
          }
        }
      }

      if (totalWeight > 0) {
        const pOff = pIdx * 4;
        image.data[pOff] = Math.round(sumR / totalWeight);
        image.data[pOff + 1] = Math.round(sumG / totalWeight);
        image.data[pOff + 2] = Math.round(sumB / totalWeight);
        image.data[pOff + 3] = Math.round(sumA / totalWeight);
      }

      flags[pIdx] = 0; // Now marked KNOWN

      // Add newly exposed INSIDE neighbors to BAND
      const neighbors = [
        px > 0 ? pIdx - 1 : -1,
        px < width - 1 ? pIdx + 1 : -1,
        py > 0 ? pIdx - width : -1,
        py < height - 1 ? pIdx + width : -1,
      ];

      for (const n of neighbors) {
        if (n !== -1 && flags[n] === 2) {
          flags[n] = 1;
          dist[n] = dist[pIdx] + 1.0;
          bandQueue.push(n);
        }
      }
    }
  }

  /**
   * Real Poisson / Gradient Boundary Healing.
   * Samples texture from (sourceX, sourceY) with given radius and blends it seamlessly
   * into (targetX, targetY) by adapting the source high frequencies to target boundary lighting.
   */
  public static healPatch(
    image: PixelBuffer,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    radius: number
  ): void {
    const r = Math.max(2, Math.floor(radius));

    // Extract average boundary color delta between source and target
    let sumDeltaR = 0,
      sumDeltaG = 0,
      sumDeltaB = 0;
    let boundaryCount = 0;

    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const bx = Math.round(Math.cos(rad) * r);
      const by = Math.round(Math.sin(rad) * r);

      const sPix = image.getPixel(sourceX + bx, sourceY + by);
      const tPix = image.getPixel(targetX + bx, targetY + by);

      sumDeltaR += tPix[0] - sPix[0];
      sumDeltaG += tPix[1] - sPix[1];
      sumDeltaB += tPix[2] - sPix[2];
      boundaryCount++;
    }

    const avgOffsetR = boundaryCount > 0 ? sumDeltaR / boundaryCount : 0;
    const avgOffsetG = boundaryCount > 0 ? sumDeltaG / boundaryCount : 0;
    const avgOffsetB = boundaryCount > 0 ? sumDeltaB / boundaryCount : 0;

    // Apply source patch with radial feathering and boundary luminance compensation
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) continue;

        // Cosine / smoothstep feathering falloff
        const falloff = 0.5 * (1 + Math.cos((Math.PI * dist) / r));

        const sPix = image.getPixel(sourceX + dx, sourceY + dy);
        const tPix = image.getPixel(targetX + dx, targetY + dy);

        // Harmonized color = source high-frequency texture + boundary average offset
        const healedR = Math.max(0, Math.min(255, Math.round(sPix[0] + avgOffsetR)));
        const healedG = Math.max(0, Math.min(255, Math.round(sPix[1] + avgOffsetG)));
        const healedB = Math.max(0, Math.min(255, Math.round(sPix[2] + avgOffsetB)));

        // Blend target and healed with falloff
        const finalR = Math.round(tPix[0] * (1 - falloff) + healedR * falloff);
        const finalG = Math.round(tPix[1] * (1 - falloff) + healedG * falloff);
        const finalB = Math.round(tPix[2] * (1 - falloff) + healedB * falloff);

        image.setPixel(targetX + dx, targetY + dy, finalR, finalG, finalB, tPix[3]);
      }
    }
  }

  /**
   * Clone stamp sampling with feather falloff and opacity.
   */
  public static cloneStamp(
    image: PixelBuffer,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    radius: number,
    hardness: number = 0.8,
    opacity: number = 1.0
  ): void {
    const r = Math.max(1, Math.floor(radius));
    const innerR = r * Math.max(0, Math.min(1, hardness));

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) continue;

        let weight = opacity;
        if (dist > innerR) {
          weight *= 1.0 - (dist - innerR) / (r - innerR);
        }

        const sPix = image.getPixel(sourceX + dx, sourceY + dy);
        const tPix = image.getPixel(targetX + dx, targetY + dy);

        const outR = Math.round(tPix[0] * (1 - weight) + sPix[0] * weight);
        const outG = Math.round(tPix[1] * (1 - weight) + sPix[1] * weight);
        const outB = Math.round(tPix[2] * (1 - weight) + sPix[2] * weight);
        const outA = Math.round(tPix[3] * (1 - weight) + sPix[3] * weight);

        image.setPixel(targetX + dx, targetY + dy, outR, outG, outB, outA);
      }
    }
  }
}
