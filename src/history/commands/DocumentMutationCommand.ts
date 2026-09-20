/**
 * @file DocumentMutationCommand.ts
 * Reversible Command wrapper for direct Document Model mutations.
 * Guarantees that UI-triggered layer, transform, opacity, visibility, and lock
 * mutations flow strictly through HistoryEngine for deterministic undo/redo.
 */

import { BaseCommand } from './BaseCommand';
import { MaestroDocumentEngine } from '../../document/MaestroDocumentEngine';
import { GraphicsEngine } from '../../graphics/GraphicsEngine';

export class DocumentMutationCommand extends BaseCommand {
  private documentEngine: MaestroDocumentEngine;
  private graphicsEngine?: GraphicsEngine;
  private mutator: (docEngine: MaestroDocumentEngine) => void;
  private beforeDocSnapshot: any = null;
  private afterDocSnapshot: any = null;

  constructor(
    name: string,
    toolId: string,
    parameters: Record<string, any>,
    documentEngine: MaestroDocumentEngine,
    mutator: (docEngine: MaestroDocumentEngine) => void,
    graphicsEngine?: GraphicsEngine,
    parentId: string | null = null
  ) {
    super(name, toolId, parameters, parentId);
    this.documentEngine = documentEngine;
    this.mutator = mutator;
    this.graphicsEngine = graphicsEngine;
  }

  protected async doExecute(): Promise<any> {
    this.beforeDocSnapshot = this.documentEngine.cloneDocument();
    this.mutator(this.documentEngine);
    this.afterDocSnapshot = this.documentEngine.cloneDocument();

    if (this.graphicsEngine) {
      this.graphicsEngine.renderDocument();
    }

    return { mutated: true, toolId: this.toolId };
  }

  protected async doUndo(): Promise<boolean> {
    if (!this.beforeDocSnapshot) return false;
    this.documentEngine.restoreDocument(this.beforeDocSnapshot);
    if (this.graphicsEngine) {
      this.graphicsEngine.renderDocument();
    }
    return true;
  }
}
