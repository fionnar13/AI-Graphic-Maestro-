/**
 * @file LayerEngine
 * Handles layer stack management, blend mode calculations, and hierarchy.
 */

import { MaestroLayer, BlendMode, LayerType } from '../models/types';

export class LayerEngine {
  private layers: Map<string, MaestroLayer> = new Map();
  private layerOrder: string[] = []; // bottom to top

  constructor() {
    this.createRootLayer();
  }

  private createRootLayer(): MaestroLayer {
    const rootLayer: MaestroLayer = {
      id: 'root_layer',
      name: 'Background Environment',
      type: 'image',
      parentId: null,
      childIds: [],
      transform: {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
      },
      properties: {
        opacity: 1,
        blendMode: 'normal',
        visible: true,
        locked: true,
      },
    };
    this.layers.set(rootLayer.id, rootLayer);
    this.layerOrder.push(rootLayer.id);
    return rootLayer;
  }

  public addLayer(
    name: string,
    type: LayerType,
    parentId: string | null = null,
    assetId?: string
  ): MaestroLayer {
    const id = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const layer: MaestroLayer = {
      id,
      name,
      type,
      parentId,
      childIds: [],
      transform: {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
      },
      properties: {
        opacity: 1,
        blendMode: 'normal',
        visible: true,
        locked: false,
      },
      assetId,
    };

    this.layers.set(id, layer);
    this.layerOrder.push(id);

    if (parentId && this.layers.has(parentId)) {
      const parent = this.layers.get(parentId)!;
      parent.childIds.push(id);
    }

    return layer;
  }

  public getLayer(id: string): MaestroLayer | undefined {
    return this.layers.get(id);
  }

  public getAllLayers(): MaestroLayer[] {
    return this.layerOrder.map((id) => this.layers.get(id)!).filter(Boolean);
  }

  public updateProperties(
    id: string,
    properties: Partial<MaestroLayer['properties']>
  ): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    layer.properties = { ...layer.properties, ...properties };
    return true;
  }

  public updateTransform(
    id: string,
    transform: Partial<MaestroLayer['transform']>
  ): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    layer.transform = { ...layer.transform, ...transform };
    return true;
  }

  public setBlendMode(id: string, blendMode: BlendMode): boolean {
    return this.updateProperties(id, { blendMode });
  }

  public setOpacity(id: string, opacity: number): boolean {
    const clamped = Math.max(0, Math.min(1, opacity));
    return this.updateProperties(id, { opacity: clamped });
  }

  public toggleVisibility(id: string): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    layer.properties.visible = !layer.properties.visible;
    return true;
  }

  public removeLayer(id: string): boolean {
    if (id === 'root_layer') return false; // Protected
    const layer = this.layers.get(id);
    if (!layer) return false;

    // Remove from order
    this.layerOrder = this.layerOrder.filter((item) => item !== id);
    // Remove from parent
    if (layer.parentId && this.layers.has(layer.parentId)) {
      const parent = this.layers.get(layer.parentId)!;
      parent.childIds = parent.childIds.filter((childId) => childId !== id);
    }
    // Remove children
    layer.childIds.forEach((childId) => this.removeLayer(childId));

    this.layers.delete(id);
    return true;
  }

  public duplicateLayer(id: string): MaestroLayer | null {
    const original = this.layers.get(id);
    if (!original) return null;

    const cloned: MaestroLayer = JSON.parse(JSON.stringify(original));
    cloned.id = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    cloned.name = `${original.name} Copy`;
    cloned.transform.position.x += 15;
    cloned.transform.position.y += 15;

    this.layers.set(cloned.id, cloned);
    const origIdx = this.layerOrder.indexOf(id);
    if (origIdx >= 0) {
      this.layerOrder.splice(origIdx + 1, 0, cloned.id);
    } else {
      this.layerOrder.push(cloned.id);
    }

    if (original.parentId && this.layers.has(original.parentId)) {
      this.layers.get(original.parentId)!.childIds.push(cloned.id);
    }

    return cloned;
  }

  public renameLayer(id: string, name: string): boolean {
    const layer = this.layers.get(id);
    if (!layer || !name.trim()) return false;
    layer.name = name.trim();
    return true;
  }

  public setLocked(id: string, locked: boolean): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;
    layer.properties.locked = locked;
    return true;
  }

  public reorderLayer(id: string, newIndex: number): boolean {
    const currentIndex = this.layerOrder.indexOf(id);
    if (currentIndex === -1) return false;

    this.layerOrder.splice(currentIndex, 1);
    const target = Math.max(0, Math.min(newIndex, this.layerOrder.length));
    this.layerOrder.splice(target, 0, id);
    return true;
  }

  public groupLayers(layerIds: string[], groupName = 'New Group'): MaestroLayer | null {
    if (!layerIds || layerIds.length === 0) return null;
    const group = this.addLayer(groupName, 'group');
    group.childIds = [];

    for (const lid of layerIds) {
      const l = this.layers.get(lid);
      if (l && lid !== group.id && lid !== 'root_layer') {
        l.parentId = group.id;
        group.childIds.push(lid);
      }
    }
    return group;
  }

  public ungroup(groupId: string): boolean {
    const group = this.layers.get(groupId);
    if (!group || group.type !== 'group') return false;

    for (const cid of group.childIds) {
      const child = this.layers.get(cid);
      if (child) {
        child.parentId = group.parentId || null;
      }
    }
    group.childIds = [];
    return this.removeLayer(groupId);
  }

  public getCanvasCompositeOperation(blendMode: BlendMode): GlobalCompositeOperation {
    switch (blendMode) {
      case 'multiply':
        return 'multiply';
      case 'screen':
        return 'screen';
      case 'overlay':
        return 'overlay';
      case 'darken':
        return 'darken';
      case 'lighten':
        return 'lighten';
      case 'color-dodge':
        return 'color-dodge';
      case 'color-burn':
        return 'color-burn';
      case 'soft-light':
        return 'soft-light';
      case 'hard-light':
        return 'hard-light';
      case 'difference':
        return 'difference';
      case 'normal':
      default:
        return 'source-over';
    }
  }
}
