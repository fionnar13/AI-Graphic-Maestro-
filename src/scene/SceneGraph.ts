/**
 * @file SceneGraph
 * Hierarchical scene graph representation with bounding box resolution and traversal.
 */

import { SceneGraphNode, MaestroLayer, BoundingBox, Point2D } from '../models/types';

export class SceneGraph {
  private root: SceneGraphNode;
  private nodeMap: Map<string, SceneGraphNode> = new Map();

  constructor(rootLayer: MaestroLayer) {
    this.root = this.createNode(rootLayer);
  }

  private createNode(layer: MaestroLayer): SceneGraphNode {
    const node: SceneGraphNode = {
      id: layer.id,
      layer,
      children: [],
      computedBounds: {
        x: layer.transform.position.x,
        y: layer.transform.position.y,
        width: 100 * layer.transform.scale.x,
        height: 100 * layer.transform.scale.y,
      },
      isDirty: false,
    };
    this.nodeMap.set(layer.id, node);
    return node;
  }

  public getRoot(): SceneGraphNode {
    return this.root;
  }

  public getNode(id: string): SceneGraphNode | undefined {
    return this.nodeMap.get(id);
  }

  public insertNode(layer: MaestroLayer, parentId: string): SceneGraphNode | null {
    const parent = this.nodeMap.get(parentId);
    if (!parent) return null;

    const child = this.createNode(layer);
    parent.children.push(child);
    this.markDirty(parentId);
    return child;
  }

  public markDirty(nodeId: string): void {
    const node = this.nodeMap.get(nodeId);
    if (node) {
      node.isDirty = true;
    }
  }

  public traversePreOrder(callback: (node: SceneGraphNode) => void): void {
    const visit = (current: SceneGraphNode) => {
      callback(current);
      for (const child of current.children) {
        visit(child);
      }
    };
    visit(this.root);
  }

  public computeAbsolutePosition(nodeId: string): Point2D {
    let current = this.nodeMap.get(nodeId);
    let absX = 0;
    let absY = 0;

    while (current) {
      absX += current.layer.transform.position.x;
      absY += current.layer.transform.position.y;
      if (current.layer.parentId) {
        current = this.nodeMap.get(current.layer.parentId);
      } else {
        break;
      }
    }

    return { x: absX, y: absY };
  }

  public computeTotalBounds(): BoundingBox {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.traversePreOrder((node) => {
      if (!node.layer.properties.visible) return;
      const pos = this.computeAbsolutePosition(node.id);
      const w = node.computedBounds.width;
      const h = node.computedBounds.height;

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    });

    if (minX === Infinity) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}
