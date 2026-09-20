/**
 * @file ExportEngine
 * Handles high-resolution raster export (PNG, JPEG, WebP) and Scene Graph JSON packaging.
 */

import { DocumentEngine } from '../document/DocumentEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export class ExportEngine {
  /**
   * Generates a downloadable data URL for the rendered graphics buffer.
   */
  public exportRaster(
    graphicsEngine: GraphicsEngine,
    format: ExportFormat = 'image/png',
    quality: number = 0.95
  ): string {
    const canvas = graphicsEngine.getCanvas();
    return canvas.toDataURL(format, quality);
  }

  /**
   * Triggers a browser download of the composed graphics file.
   */
  public triggerDownload(dataUrl: string, filename: string = 'composed_final.png'): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Serializes the document and scene graph for project export.
   */
  public exportProjectBundle(documentEngine: DocumentEngine): string {
    return documentEngine.exportJSON();
  }
}
