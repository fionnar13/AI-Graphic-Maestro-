/**
 * @file GraphicsToolCommand.ts
 * Command implementation that wraps any IGraphicsTool in the GraphicsEngine,
 * executing real graphics primitives with full validation, execution, and rollback.
 */

import { BaseCommand } from './BaseCommand';
import { GraphicsEngine } from '../../graphics/GraphicsEngine';
import { IGraphicsTool } from '../../graphics/engine/IGraphicsTool';

export class GraphicsToolCommand extends BaseCommand {
  protected graphicsEngine: GraphicsEngine;
  protected rollbackData: any = null;

  constructor(
    graphicsEngine: GraphicsEngine,
    toolId: string,
    parameters: Record<string, any>,
    commandName?: string,
    parentId: string | null = null
  ) {
    const tool = graphicsEngine.getTool(toolId);
    const resolvedName = commandName || (tool ? `${tool.name} Command` : `Tool ${toolId}`);
    super(resolvedName, toolId, parameters, parentId);
    this.graphicsEngine = graphicsEngine;
  }

  protected async doExecute(): Promise<any> {
    const tool: IGraphicsTool | undefined = this.graphicsEngine.getTool(this.toolId);
    if (!tool) {
      throw new Error(`Tool ${this.toolId} is not registered in GraphicsEngine`);
    }

    const context = (this.graphicsEngine as any).buildExecutionContext();
    const validation = tool.validate(context, this.parameters);
    if (!validation.valid) {
      throw new Error(`Tool [${tool.name}] validation failed: ${validation.errors?.join('; ')}`);
    }

    this.record.input = {
      activeLayerId: this.graphicsEngine.getActiveLayerId(),
      parameters: { ...this.parameters },
    };

    const result = await tool.execute(context, this.parameters);
    if (!result.success) {
      throw new Error(result.message || `Execution of tool ${tool.name} failed`);
    }

    this.rollbackData = result.rollbackData;
    this.graphicsEngine.notifySubscribers();

    return {
      affectedLayerIds: result.affectedLayerIds,
      toolId: this.toolId,
      output: result.output,
    };
  }

  protected async doUndo(): Promise<boolean> {
    // Phase 14.3.2 (Fix 4, T6) — Bug: original guard used `&&` which made
    // the condition always false (no value can be both null AND undefined).
    // Corrected to `||` so doUndo returns false immediately when
    // rollbackData is missing, instead of proceeding to call tool.rollback
    // with null/undefined (which would crash or silently fail). Per Q10-i
    // the safe behavior is to return false — HistoryEngine.undo() handles
    // failure by pushing the command back onto the undo stack.
    if (this.rollbackData === null || this.rollbackData === undefined) {
      return false;
    }

    const tool = this.graphicsEngine.getTool(this.toolId);
    if (!tool) return false;

    const context = (this.graphicsEngine as any).buildExecutionContext();
    const success = await tool.rollback(context, this.rollbackData);
    if (success) {
      this.graphicsEngine.notifySubscribers();
    }
    return success;
  }
}
