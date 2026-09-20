/**
 * @file CreateLayerCommand.ts
 * Command to create a new layer in the document, supporting undo/redo.
 */

import { BaseCommand } from './BaseCommand';
import { MaestroDocumentEngine } from '../../document/MaestroDocumentEngine';
import { DocumentLayer } from '../../models/document.types';
import { PixelBuffer } from '../../graphics/engine/PixelBuffer';
import { GraphicsEngine } from '../../graphics/GraphicsEngine';

export class CreateLayerCommand extends BaseCommand {
  private documentEngine: MaestroDocumentEngine;
  private graphicsEngine?: GraphicsEngine;
  private createdLayer: DocumentLayer | null = null;
  private savedBuffer: PixelBuffer | null = null;
  private layerIndex: number = -1;

  constructor(
    documentEngine: MaestroDocumentEngine,
    layerParams: Partial<DocumentLayer>,
    graphicsEngine?: GraphicsEngine,
    parentId: string | null = null
  ) {
    super(`Create Layer: ${layerParams.name || 'New Layer'}`, 'tool.create_layer', layerParams, parentId);
    this.documentEngine = documentEngine;
    this.graphicsEngine = graphicsEngine;
  }

  protected doExecute(): any {
    this.record.input = { ...this.parameters };

    if (this.createdLayer) {
      // Re-add layer if previously created and undone
      const doc = this.documentEngine.getDocument();
      const existing = doc.layers.find((l) => l.id === this.createdLayer!.id);
      if (!existing) {
        doc.layers.push(JSON.parse(JSON.stringify(this.createdLayer)));
        if (!doc.rootLayerOrder.includes(this.createdLayer.id)) {
          if (this.layerIndex >= 0 && this.layerIndex <= doc.rootLayerOrder.length) {
            doc.rootLayerOrder.splice(this.layerIndex, 0, this.createdLayer.id);
          } else {
            doc.rootLayerOrder.push(this.createdLayer.id);
          }
        }
      }
      if (this.graphicsEngine && this.savedBuffer) {
        this.graphicsEngine.setLayerPixelBuffer(this.createdLayer.id, this.savedBuffer.clone());
      }
      return { layerId: this.createdLayer.id, restored: true };
    }

    const layer = this.documentEngine.createLayer(this.parameters as any);
    this.createdLayer = JSON.parse(JSON.stringify(layer));

    // If initial buffer provided or default requested
    if (this.graphicsEngine) {
      const w = Math.max(1, layer.bounds.width);
      const h = Math.max(1, layer.bounds.height);
      const initialColor = this.parameters.initialColor || [140, 140, 140, 255];
      const buf = PixelBuffer.create(w, h, initialColor);
      this.graphicsEngine.setLayerPixelBuffer(layer.id, buf);
      this.savedBuffer = buf.clone();
    }

    return { layerId: layer.id, layer };
  }

  protected doUndo(): boolean {
    if (!this.createdLayer) return false;
    const doc = this.documentEngine.getDocument();
    this.layerIndex = doc.rootLayerOrder.indexOf(this.createdLayer.id);

    if (this.graphicsEngine) {
      const buf = this.graphicsEngine.getLayerPixelBuffer(this.createdLayer.id);
      if (buf) {
        this.savedBuffer = buf.clone();
      }
    }

    return this.documentEngine.deleteLayer(this.createdLayer.id);
  }
}
