/**
 * @file FilterWorker
 * Worker abstraction and typed buffer processing for intensive graphic operations.
 */

export interface FilterTask {
  type: 'blur' | 'grayscale' | 'tint' | 'luminance_mask';
  width: number;
  height: number;
  data: Uint8ClampedArray;
  options?: Record<string, number | string>;
}

export class FilterWorker {
  /**
   * Executes synchronous pixel filtering on TypedArrays.
   * Can be dispatched to WebWorker thread in future extensions.
   */
  public processImageData(task: FilterTask): Uint8ClampedArray {
    const { data, type, options } = task;

    if (type === 'tint' && options?.strength) {
      const strength = Number(options.strength) || 0.15;
      const targetR = 124; // Luxury purple tint
      const targetG = 58;
      const targetB = 237;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] * (1 - strength) + targetR * strength);
        data[i + 1] = Math.round(data[i + 1] * (1 - strength) + targetG * strength);
        data[i + 2] = Math.round(data[i + 2] * (1 - strength) + targetB * strength);
      }
    }

    return data;
  }
}
