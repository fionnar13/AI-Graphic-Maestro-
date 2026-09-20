/**
 * @file MaestroDocumentEngine.ts
 * Production-ready Document Engine for AI Graphic Maestro.
 * Supports:
 * - Real Document Model: Canvas, Layers, Groups, Masks, Adjustments, Effects, Assets, References, Metadata
 * - Hierarchical Layer Operations: Create, Delete, Duplicate, Rename, Reorder, Group, Ungroup, Visibility, Opacity, Lock, Transform
 * - Non-flattened Document representation with deep cloning and JSON import/export.
 */

import {
  MaestroDocumentModel,
  DocumentLayer,
  LayerType,
  BlendMode,
  LayerTransform,
  RectBounds,
  LayerMask,
  MaskType,
  LayerEffect,
  LayerContent,
  RasterContent,
  VectorContent,
  TextContent,
  GroupContent,
  AdjustmentContent,
  DocumentAsset,
  DocumentReference,
  DocumentCanvas,
  DocumentMetadata,
} from '../models/document.types';

export class MaestroDocumentEngine {
  private document: MaestroDocumentModel;
  private listeners: Array<(doc: MaestroDocumentModel) => void> = [];

  constructor(
    initialDocumentOrWidth?: Partial<MaestroDocumentModel> | number,
    height?: number,
    name?: string,
    colorProfile?: string
  ) {
    if (typeof initialDocumentOrWidth === 'number') {
      const width = initialDocumentOrWidth;
      const h = height || 500;
      const title = name || 'Untitled Document';
      this.document = this.createDefaultDocument({
        metadata: { title, colorProfile: colorProfile || 'sRGB' } as any,
        canvas: { dimensions: { width, height: h } } as any,
      });
    } else {
      this.document = this.createDefaultDocument(initialDocumentOrWidth);
    }
  }

  // --------------------------------------------------------------------------
  // Document Initialization & Serialization
  // --------------------------------------------------------------------------
  private createDefaultDocument(initial?: Partial<MaestroDocumentModel>): MaestroDocumentModel {
    const now = Date.now();
    return {
      metadata: {
        id: initial?.metadata?.id || `doc_${now}_${Math.random().toString(36).substring(2, 7)}`,
        title: initial?.metadata?.title || 'Untitled Maestro Composition',
        version: '1.0.0',
        schemaVersion: 2,
        createdAt: initial?.metadata?.createdAt || now,
        updatedAt: now,
        author: initial?.metadata?.author || 'AI Graphic Maestro',
        colorProfile: initial?.metadata?.colorProfile || 'sRGB',
        description: initial?.metadata?.description || 'Autonomous multi-layer visual ad composition',
        tags: initial?.metadata?.tags || ['luxury', 'ad', 'autonomous'],
      },
      canvas: {
        dimensions: initial?.canvas?.dimensions || { width: 800, height: 500 },
        resolutionDpi: initial?.canvas?.resolutionDpi || 72,
        backgroundColor: initial?.canvas?.backgroundColor || '#0a0a0a',
        guides: initial?.canvas?.guides || { horizontal: [], vertical: [] },
      },
      layers: initial?.layers ? JSON.parse(JSON.stringify(initial.layers)) : [],
      rootLayerOrder: initial?.rootLayerOrder ? [...initial.rootLayerOrder] : [],
      assets: initial?.assets ? JSON.parse(JSON.stringify(initial.assets)) : [],
      references: initial?.references ? JSON.parse(JSON.stringify(initial.references)) : [],
    };
  }

  public getDocument(): MaestroDocumentModel {
    return this.document;
  }

  public cloneDocument(): MaestroDocumentModel {
    return JSON.parse(JSON.stringify(this.document));
  }

  public restoreDocument(doc: MaestroDocumentModel): void {
    this.document = JSON.parse(JSON.stringify(doc));
    this.touch();
  }

  public exportJSON(pretty = true): string {
    return JSON.stringify(this.document, null, pretty ? 2 : undefined);
  }

  public importJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString) as MaestroDocumentModel;
      if (!parsed.canvas || !parsed.layers || !parsed.rootLayerOrder) {
        throw new Error('Invalid Maestro document structure');
      }
      this.document = parsed;
      this.touch();
      return true;
    } catch (err) {
      console.error('Failed to import document JSON:', err);
      return false;
    }
  }

  public subscribe(listener: (doc: MaestroDocumentModel) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private touch(): void {
    this.document.metadata.updatedAt = Date.now();
    for (const listener of this.listeners) {
      listener(this.document);
    }
  }

  // --------------------------------------------------------------------------
  // Canvas Operations
  // --------------------------------------------------------------------------
  public getCanvas(): DocumentCanvas {
    return this.document.canvas;
  }

  public setCanvasDimensions(width: number, height: number): void {
    this.document.canvas.dimensions = { width, height };
    this.touch();
  }

  public setCanvasBackground(color: string): void {
    this.document.canvas.backgroundColor = color;
    this.touch();
  }

  // --------------------------------------------------------------------------
  // Layer Querying
  // --------------------------------------------------------------------------
  public getAllLayers(): DocumentLayer[] {
    return this.document.layers;
  }

  public getLayer(id: string): DocumentLayer | undefined {
    return this.document.layers.find((l) => l.id === id);
  }

  public getRootLayers(): DocumentLayer[] {
    const map = new Map(this.document.layers.map((l) => [l.id, l]));
    return this.document.rootLayerOrder.map((id) => map.get(id)).filter(Boolean) as DocumentLayer[];
  }

  public getChildLayers(groupId: string): DocumentLayer[] {
    const group = this.getLayer(groupId);
    if (!group || group.type !== 'group') return [];
    const childIds = (group.content as GroupContent).childIds || [];
    const map = new Map(this.document.layers.map((l) => [l.id, l]));
    return childIds.map((cid) => map.get(cid)).filter(Boolean) as DocumentLayer[];
  }

  // --------------------------------------------------------------------------
  // Layer Factory Helpers
  // --------------------------------------------------------------------------
  private createDefaultTransform(): LayerTransform {
    return {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      origin: { x: 0.5, y: 0.5 },
    };
  }

  private createDefaultContent(type: LayerType, contentOverride?: Partial<LayerContent>): LayerContent {
    switch (type) {
      case 'raster':
        return {
          kind: 'raster',
          resolution: { width: 100, height: 100 },
          ...(contentOverride as Partial<RasterContent>),
        };
      case 'vector':
        return {
          kind: 'vector',
          shapeType: 'rect',
          fillColor: '#7c3aed',
          strokeColor: '#a78bfa',
          strokeWidth: 2,
          cornerRadius: 8,
          ...(contentOverride as Partial<VectorContent>),
        };
      case 'text':
        return {
          kind: 'text',
          text: 'Luxury Modern Ad',
          fontSize: 32,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          color: '#ffffff',
          align: 'left',
          ...(contentOverride as Partial<TextContent>),
        };
      case 'group':
        return {
          kind: 'group',
          childIds: [],
          ...(contentOverride as Partial<GroupContent>),
        };
      case 'adjustment':
        return {
          kind: 'adjustment',
          adjustments: {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            exposure: 0,
            temperature: 0,
          },
          ...(contentOverride as Partial<AdjustmentContent>),
        };
    }
  }

  // --------------------------------------------------------------------------
  // Real Action 1: Create Layer
  // --------------------------------------------------------------------------
  public createLayer(params: {
    name: string;
    type: LayerType;
    bounds?: RectBounds;
    transform?: Partial<LayerTransform>;
    content?: Partial<LayerContent>;
    mask?: LayerMask;
    effects?: LayerEffect[];
    parentId?: string | null;
    blendMode?: BlendMode;
    opacity?: number;
    tags?: string[];
  }): DocumentLayer {
    const id = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const layer: DocumentLayer = {
      id,
      name: params.name,
      type: params.type,
      visible: true,
      locked: false,
      opacity: params.opacity !== undefined ? params.opacity : 1.0,
      blendMode: params.blendMode || 'normal',
      transform: {
        ...this.createDefaultTransform(),
        ...(params.transform || {}),
      },
      bounds: params.bounds || { x: 0, y: 0, width: 200, height: 200 },
      content: this.createDefaultContent(params.type, params.content),
      mask: params.mask,
      effects: params.effects || [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        tags: params.tags || [],
      },
      parentId: params.parentId || null,
    } as DocumentLayer;

    this.document.layers.push(layer);

    if (params.parentId) {
      const parent = this.getLayer(params.parentId);
      if (parent && parent.type === 'group') {
        const groupContent = parent.content as GroupContent;
        if (!groupContent.childIds.includes(id)) {
          groupContent.childIds.push(id);
        }
      } else {
        this.document.rootLayerOrder.push(id);
      }
    } else {
      this.document.rootLayerOrder.push(id);
    }

    this.touch();
    return layer;
  }

  public addLayer(params: any): DocumentLayer {
    return this.createLayer(params);
  }

  // --------------------------------------------------------------------------
  // Real Action 2: Delete Layer
  // --------------------------------------------------------------------------
  public deleteLayer(id: string): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;

    // If it's a group, delete its children recursively or unparent them
    if (layer.type === 'group') {
      const childIds = [...((layer.content as GroupContent).childIds || [])];
      for (const childId of childIds) {
        this.deleteLayer(childId);
      }
    }

    // Remove from parent group if nested
    if (layer.parentId) {
      const parent = this.getLayer(layer.parentId);
      if (parent && parent.type === 'group') {
        const groupContent = parent.content as GroupContent;
        groupContent.childIds = groupContent.childIds.filter((cid) => cid !== id);
      }
    }

    // Remove from root order
    this.document.rootLayerOrder = this.document.rootLayerOrder.filter((lid) => lid !== id);

    // Remove from layers array
    this.document.layers = this.document.layers.filter((l) => l.id !== id);

    this.touch();
    return true;
  }

  // --------------------------------------------------------------------------
  // Real Action 3: Duplicate Layer
  // --------------------------------------------------------------------------
  public duplicateLayer(id: string): DocumentLayer | null {
    const original = this.getLayer(id);
    if (!original) return null;

    const cloned: DocumentLayer = JSON.parse(JSON.stringify(original));
    cloned.id = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    cloned.name = `${original.name} Copy`;
    cloned.metadata.createdAt = Date.now();
    cloned.metadata.updatedAt = Date.now();
    // Offset slightly so user sees the duplicate
    cloned.bounds.x += 20;
    cloned.bounds.y += 20;

    // If group, recursively duplicate children
    if (cloned.type === 'group') {
      const originalChildIds = [...(original.content as GroupContent).childIds];
      const newChildIds: string[] = [];
      for (const cid of originalChildIds) {
        const childDup = this.duplicateLayer(cid);
        if (childDup) {
          childDup.parentId = cloned.id;
          newChildIds.push(childDup.id);
        }
      }
      (cloned.content as GroupContent).childIds = newChildIds;
    }

    this.document.layers.push(cloned);

    // Insert next to original in order
    if (original.parentId) {
      const parent = this.getLayer(original.parentId);
      if (parent && parent.type === 'group') {
        const pContent = parent.content as GroupContent;
        const idx = pContent.childIds.indexOf(original.id);
        pContent.childIds.splice(idx + 1, 0, cloned.id);
      }
    } else {
      const idx = this.document.rootLayerOrder.indexOf(original.id);
      if (idx >= 0) {
        this.document.rootLayerOrder.splice(idx + 1, 0, cloned.id);
      } else {
        this.document.rootLayerOrder.push(cloned.id);
      }
    }

    this.touch();
    return cloned;
  }

  // --------------------------------------------------------------------------
  // Real Action 4: Rename Layer
  // --------------------------------------------------------------------------
  public renameLayer(id: string, newName: string): boolean {
    const layer = this.getLayer(id);
    if (!layer || !newName.trim()) return false;
    layer.name = newName.trim();
    layer.metadata.updatedAt = Date.now();
    this.touch();
    return true;
  }

  // --------------------------------------------------------------------------
  // Real Action 5: Reorder Layer (Stacking Order)
  // --------------------------------------------------------------------------
  public reorderLayer(id: string, targetIndex: number, newParentId?: string | null): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;

    // Remove from current parent / root
    if (layer.parentId) {
      const oldParent = this.getLayer(layer.parentId);
      if (oldParent && oldParent.type === 'group') {
        const gContent = oldParent.content as GroupContent;
        gContent.childIds = gContent.childIds.filter((cid) => cid !== id);
      }
    } else {
      this.document.rootLayerOrder = this.document.rootLayerOrder.filter((lid) => lid !== id);
    }

    // Determine target list
    const destParentId = newParentId !== undefined ? newParentId : layer.parentId;
    layer.parentId = destParentId;

    if (destParentId) {
      const newParent = this.getLayer(destParentId);
      if (!newParent || newParent.type !== 'group') return false;
      const gContent = newParent.content as GroupContent;
      const clampedIndex = Math.max(0, Math.min(targetIndex, gContent.childIds.length));
      gContent.childIds.splice(clampedIndex, 0, id);
    } else {
      const clampedIndex = Math.max(0, Math.min(targetIndex, this.document.rootLayerOrder.length));
      this.document.rootLayerOrder.splice(clampedIndex, 0, id);
    }

    this.touch();
    return true;
  }

  public moveLayerUp(id: string): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    if (layer.parentId) {
      const parent = this.getLayer(layer.parentId);
      if (!parent || parent.type !== 'group') return false;
      const gContent = parent.content as GroupContent;
      const idx = gContent.childIds.indexOf(id);
      if (idx < gContent.childIds.length - 1 && idx >= 0) {
        gContent.childIds.splice(idx, 1);
        gContent.childIds.splice(idx + 1, 0, id);
        this.touch();
        return true;
      }
    } else {
      const idx = this.document.rootLayerOrder.indexOf(id);
      if (idx < this.document.rootLayerOrder.length - 1 && idx >= 0) {
        this.document.rootLayerOrder.splice(idx, 1);
        this.document.rootLayerOrder.splice(idx + 1, 0, id);
        this.touch();
        return true;
      }
    }
    return false;
  }

  public moveLayerDown(id: string): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    if (layer.parentId) {
      const parent = this.getLayer(layer.parentId);
      if (!parent || parent.type !== 'group') return false;
      const gContent = parent.content as GroupContent;
      const idx = gContent.childIds.indexOf(id);
      if (idx > 0) {
        gContent.childIds.splice(idx, 1);
        gContent.childIds.splice(idx - 1, 0, id);
        this.touch();
        return true;
      }
    } else {
      const idx = this.document.rootLayerOrder.indexOf(id);
      if (idx > 0) {
        this.document.rootLayerOrder.splice(idx, 1);
        this.document.rootLayerOrder.splice(idx - 1, 0, id);
        this.touch();
        return true;
      }
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // Real Action 6: Group Layers
  // --------------------------------------------------------------------------
  public groupLayers(layerIds: string[], groupName = 'New Group'): DocumentLayer | null {
    if (!layerIds || layerIds.length === 0) return null;

    const validLayers = layerIds.map((id) => this.getLayer(id)).filter(Boolean) as DocumentLayer[];
    if (validLayers.length === 0) return null;

    // Calculate bounding box enclosing all grouped layers
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const l of validLayers) {
      minX = Math.min(minX, l.bounds.x);
      minY = Math.min(minY, l.bounds.y);
      maxX = Math.max(maxX, l.bounds.x + l.bounds.width);
      maxY = Math.max(maxY, l.bounds.y + l.bounds.height);
    }

    const groupBounds: RectBounds = {
      x: minX === Infinity ? 0 : minX,
      y: minY === Infinity ? 0 : minY,
      width: maxX === -Infinity ? 200 : maxX - minX,
      height: maxY === -Infinity ? 200 : maxY - minY,
    };

    // Determine target parent (e.g. from first layer)
    const targetParentId = validLayers[0].parentId || null;

    const group = this.createLayer({
      name: groupName,
      type: 'group',
      bounds: groupBounds,
      parentId: targetParentId,
    });

    const gContent = group.content as GroupContent;
    gContent.childIds = [];

    // Move layers into group
    for (const l of validLayers) {
      // Remove from root order or old parent
      if (l.parentId) {
        const oldP = this.getLayer(l.parentId);
        if (oldP && oldP.type === 'group') {
          const oldGContent = oldP.content as GroupContent;
          oldGContent.childIds = oldGContent.childIds.filter((cid) => cid !== l.id);
        }
      } else {
        this.document.rootLayerOrder = this.document.rootLayerOrder.filter((lid) => lid !== l.id);
      }

      l.parentId = group.id;
      gContent.childIds.push(l.id);
    }

    this.touch();
    return group;
  }

  // --------------------------------------------------------------------------
  // Real Action 7: Ungroup Layer
  // --------------------------------------------------------------------------
  public ungroup(groupId: string): boolean {
    const group = this.getLayer(groupId);
    if (!group || group.type !== 'group') return false;

    const childIds = [...((group.content as GroupContent).childIds || [])];
    const parentId = group.parentId || null;

    // Find position of the group in parent or root
    let insertIndex = 0;
    if (parentId) {
      const parent = this.getLayer(parentId);
      if (parent && parent.type === 'group') {
        insertIndex = (parent.content as GroupContent).childIds.indexOf(groupId);
      }
    } else {
      insertIndex = this.document.rootLayerOrder.indexOf(groupId);
    }
    if (insertIndex < 0) insertIndex = 0;

    // Move each child out to group's parent/root
    for (let i = 0; i < childIds.length; i++) {
      const cid = childIds[i];
      const child = this.getLayer(cid);
      if (child) {
        child.parentId = parentId;
        if (parentId) {
          const parent = this.getLayer(parentId);
          if (parent && parent.type === 'group') {
            (parent.content as GroupContent).childIds.splice(insertIndex + i, 0, cid);
          }
        } else {
          this.document.rootLayerOrder.splice(insertIndex + i, 0, cid);
        }
      }
    }

    // Delete group layer itself
    (group.content as GroupContent).childIds = [];
    this.deleteLayer(groupId);

    this.touch();
    return true;
  }

  // --------------------------------------------------------------------------
  // Real Action 8: Visibility Toggle
  // --------------------------------------------------------------------------
  public setVisibility(id: string, visible: boolean): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    layer.visible = visible;
    this.touch();
    return true;
  }

  public toggleVisibility(id: string): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    layer.visible = !layer.visible;
    this.touch();
    return layer.visible;
  }

  // --------------------------------------------------------------------------
  // Real Action 9: Opacity
  // --------------------------------------------------------------------------
  public setOpacity(id: string, opacity: number): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    layer.opacity = Math.max(0, Math.min(1, opacity));
    this.touch();
    return true;
  }

  // --------------------------------------------------------------------------
  // Real Action 10: Lock Toggle
  // --------------------------------------------------------------------------
  public setLocked(id: string, locked: boolean): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    layer.locked = locked;
    this.touch();
    return true;
  }

  public toggleLocked(id: string): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    layer.locked = !layer.locked;
    this.touch();
    return layer.locked;
  }

  // --------------------------------------------------------------------------
  // Real Action 11: Transform (Translate, Scale, Rotate)
  // --------------------------------------------------------------------------
  public setTransform(id: string, transform: Partial<LayerTransform>): boolean {
    const layer = this.getLayer(id);
    if (!layer || layer.locked) return false;
    layer.transform = {
      ...layer.transform,
      ...transform,
    };
    this.touch();
    return true;
  }

  public setBounds(id: string, bounds: Partial<RectBounds>): boolean {
    const layer = this.getLayer(id);
    if (!layer || layer.locked) return false;
    layer.bounds = {
      ...layer.bounds,
      ...bounds,
    };
    this.touch();
    return true;
  }

  public setBlendMode(id: string, blendMode: BlendMode): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    layer.blendMode = blendMode;
    this.touch();
    return true;
  }

  // --------------------------------------------------------------------------
  // Masks & Effects Management
  // --------------------------------------------------------------------------
  public setLayerMask(id: string, mask: LayerMask | undefined): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    layer.mask = mask;
    this.touch();
    return true;
  }

  public createDefaultMask(id: string, type: MaskType = 'alpha_bitmap'): LayerMask | null {
    const layer = this.getLayer(id);
    if (!layer) return null;
    const mask: LayerMask = {
      id: `mask_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      enabled: true,
      inverted: false,
      feather: 0,
      opacity: 1.0,
      bounds: { ...layer.bounds },
    };
    layer.mask = mask;
    this.touch();
    return mask;
  }

  public removeLayerMask(id: string): boolean {
    return this.setLayerMask(id, undefined);
  }

  public deleteMask(id: string): boolean {
    return this.removeLayerMask(id);
  }

  public toggleMaskEnabled(id: string): boolean {
    const layer = this.getLayer(id);
    if (!layer || !layer.mask) return false;
    layer.mask.enabled = !layer.mask.enabled;
    this.touch();
    return layer.mask.enabled;
  }

  public invertMask(id: string): boolean {
    const layer = this.getLayer(id);
    if (!layer || !layer.mask) return false;
    layer.mask.inverted = !layer.mask.inverted;
    this.touch();
    return layer.mask.inverted;
  }

  public setMaskFeather(id: string, feather: number): boolean {
    const layer = this.getLayer(id);
    if (!layer || !layer.mask) return false;
    layer.mask.feather = Math.max(0, feather);
    this.touch();
    return true;
  }

  public addLayerEffect(id: string, effect: LayerEffect): boolean {
    const layer = this.getLayer(id);
    if (!layer) return false;
    layer.effects.push(effect);
    this.touch();
    return true;
  }

  public removeLayerEffect(id: string, effectIndex: number): boolean {
    const layer = this.getLayer(id);
    if (!layer || effectIndex < 0 || effectIndex >= layer.effects.length) return false;
    layer.effects.splice(effectIndex, 1);
    this.touch();
    return true;
  }

  // --------------------------------------------------------------------------
  // Assets & References Management
  // --------------------------------------------------------------------------
  public addAsset(asset: DocumentAsset): void {
    this.document.assets = this.document.assets.filter((a) => a.id !== asset.id);
    this.document.assets.push(asset);
    this.touch();
  }

  public getAsset(id: string): DocumentAsset | undefined {
    return this.document.assets.find((a) => a.id === id);
  }

  public getAssets(): DocumentAsset[] {
    return [...this.document.assets];
  }

  public addReference(ref: DocumentReference): void {
    this.document.references = this.document.references.filter((r) => r.id !== ref.id);
    this.document.references.push(ref);
    this.touch();
  }

  public getReferences(): DocumentReference[] {
    return this.document.references;
  }

  public getMetadata(): DocumentMetadata {
    return this.document.metadata;
  }

  public setMetadata(meta: Partial<DocumentMetadata>): void {
    this.document.metadata = {
      ...this.document.metadata,
      ...meta,
      updatedAt: Date.now(),
    };
    this.touch();
  }

  /**
   * Crops the entire document canvas and translates layers to keep them in coordinate frame.
   */
  public crop(x: number, y: number, newWidth: number, newHeight: number): void {
    this.document.canvas.dimensions.width = Math.max(50, Math.round(newWidth));
    this.document.canvas.dimensions.height = Math.max(50, Math.round(newHeight));
    for (const layer of this.document.layers) {
      layer.bounds.x = Math.round(layer.bounds.x - x);
      layer.bounds.y = Math.round(layer.bounds.y - y);
    }
    this.touch();
  }
}

