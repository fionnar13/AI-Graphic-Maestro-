/**
 * @file BaseCommand.ts
 * Abstract base class providing lifecycle and telemetry for all Commands.
 */

import { ICommand, OperationRecord, CommandExecutionResult, OperationStatus } from '../types';

export abstract class BaseCommand implements ICommand {
  public readonly id: string;
  public readonly name: string;
  public readonly toolId: string;
  public readonly parameters: Record<string, any>;

  protected record: OperationRecord;
  protected executed = false;

  constructor(name: string, toolId: string, parameters: Record<string, any>, parentId: string | null = null) {
    this.id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.name = name;
    this.toolId = toolId;
    this.parameters = { ...parameters };

    this.record = {
      operationId: this.id,
      tool: toolId,
      parameters: { ...parameters },
      input: null,
      output: null,
      timestamp: Date.now(),
      parent: parentId,
      status: 'pending',
      duration: 0,
      error: null,
    };
  }

  public setParent(parentId: string | null): void {
    this.record.parent = parentId;
  }

  public getOperationRecord(): OperationRecord {
    return { ...this.record };
  }

  public setStatus(status: OperationStatus): void {
    this.record.status = status;
  }

  public async execute(): Promise<CommandExecutionResult> {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.record.status = 'executing';
    this.record.timestamp = Date.now();

    try {
      const output = await this.doExecute();
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const duration = Math.round((end - start) * 100) / 100;

      this.record.status = 'success';
      this.record.duration = duration;
      this.record.output = output;
      this.executed = true;

      return {
        success: true,
        durationMs: duration,
        output,
      };
    } catch (err: any) {
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const duration = Math.round((end - start) * 100) / 100;

      this.record.status = 'failed';
      this.record.duration = duration;
      this.record.error = err?.message || String(err);

      return {
        success: false,
        error: this.record.error || 'Execution failed',
        durationMs: duration,
      };
    }
  }

  public async redo(): Promise<boolean> {
    const res = await this.execute();
    return res.success;
  }

  public async undo(): Promise<boolean> {
    if (!this.executed) return false;
    try {
      const success = await this.doUndo();
      if (success) {
        this.record.status = 'rolled_back';
        this.executed = false;
        return true;
      }
      return false;
    } catch (err: any) {
      this.record.error = `Undo failed: ${err?.message || err}`;
      return false;
    }
  }

  protected abstract doExecute(): Promise<any> | any;
  protected abstract doUndo(): Promise<boolean> | boolean;
}
