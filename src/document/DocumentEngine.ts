/**
 * @file DocumentEngine
 * Manages document metadata, canvas boundaries, color space and asset references.
 */

import { MaestroDocument, MaestroAsset, DocumentMetadata } from '../models/types';
import { MaestroDocumentEngine } from './MaestroDocumentEngine';
import { MaestroDocumentModel } from '../models/document.types';

export class DocumentEngine {
  private document: MaestroDocument;
  public realEngine: MaestroDocumentEngine;

  constructor(initialMetadata?: Partial<DocumentMetadata>) {
    this.document = {
      metadata: {
        id: initialMetadata?.id || `doc_${Date.now()}`,
        title: initialMetadata?.title || 'Luxury Product Ad Composition',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0.4',
        author: 'AI Graphic Maestro',
        colorSpace: initialMetadata?.colorSpace || 'sRGB',
        dimensions: initialMetadata?.dimensions || { width: 1920, height: 1080 },
        backgroundColor: initialMetadata?.backgroundColor || '#0a0a0a',
      },
      assets: [],
      rootNodeId: 'root_layer',
    };

    this.realEngine = new MaestroDocumentEngine({
      metadata: {
        id: this.document.metadata.id,
        title: this.document.metadata.title,
        createdAt: this.document.metadata.createdAt,
        updatedAt: this.document.metadata.updatedAt,
        version: this.document.metadata.version,
        author: this.document.metadata.author,
        colorProfile: 'sRGB',
        schemaVersion: 2,
      },
      canvas: {
        dimensions: this.document.metadata.dimensions,
        resolutionDpi: 72,
        backgroundColor: this.document.metadata.backgroundColor,
        guides: { horizontal: [250, 400], vertical: [400] },
      },
    });
  }

  public getDocument(): MaestroDocument {
    return JSON.parse(JSON.stringify(this.document));
  }

  public getRealDocument(): MaestroDocumentModel {
    return this.realEngine.getDocument();
  }

  public getDimensions() {
    return this.document.metadata.dimensions;
  }

  public setDimensions(width: number, height: number): void {
    this.document.metadata.dimensions = { width, height };
    this.document.metadata.updatedAt = Date.now();
    this.realEngine.setCanvasDimensions(width, height);
  }

  public registerAsset(asset: MaestroAsset): void {
    const existingIdx = this.document.assets.findIndex((a) => a.id === asset.id);
    if (existingIdx >= 0) {
      this.document.assets[existingIdx] = asset;
    } else {
      this.document.assets.push(asset);
    }
    this.document.metadata.updatedAt = Date.now();
  }

  public getAsset(id: string): MaestroAsset | undefined {
    return this.document.assets.find((a) => a.id === id);
  }

  public exportJSON(): string {
    return JSON.stringify(this.document, null, 2);
  }

  public loadFromJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString) as MaestroDocument;
      if (parsed.metadata && parsed.rootNodeId) {
        this.document = parsed;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
