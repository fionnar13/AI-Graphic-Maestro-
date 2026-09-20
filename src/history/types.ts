/**
 * @file types.ts
 * Type definitions for AI Graphic Maestro Command System and History Engine.
 */

import { MaestroDocumentModel } from '../models/document.types';

export type OperationStatus = 'pending' | 'executing' | 'success' | 'failed' | 'rolled_back';

/**
 * Full telemetry and tracking record for every operation executed in the system.
 */
export interface OperationRecord {
  operationId: string;
  tool: string;
  parameters: Record<string, any>;
  input: any;
  output: any;
  timestamp: number;
  parent: string | null;
  status: OperationStatus;
  duration: number; // in milliseconds
  error: string | null;
  snapshot?: DocumentSnapshotRecord;
}

/**
 * Pixel buffer serialized state for snapshots.
 */
export interface BufferSnapshotData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Immutable snapshot of the entire document and all layer pixel buffers.
 */
export interface DocumentSnapshotRecord {
  id: string;
  name: string;
  timestamp: number;
  document: MaestroDocumentModel;
  buffers: Record<string, BufferSnapshotData>;
  selectionMask: BufferSnapshotData | null;
  activeLayerId: string | null;
  metadata?: Record<string, any>;
}

/**
 * Branch in the DAG history tree.
 */
export interface HistoryBranch {
  id: string;
  name: string;
  rootOperationId: string | null;
  headOperationId: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Tagged milestone version of the document.
 */
export interface HistoryVersion {
  versionId: string;
  name: string;
  description: string;
  snapshotId: string;
  operationId: string | null;
  timestamp: number;
  tags: string[];
}

/**
 * Result returned by a Command execution.
 */
export interface CommandExecutionResult {
  success: boolean;
  error?: string;
  durationMs: number;
  output?: any;
}

/**
 * Standard contract for all Commands.
 */
export interface ICommand {
  readonly id: string;
  readonly name: string;
  readonly toolId: string;
  readonly parameters: Record<string, any>;

  execute(): Promise<CommandExecutionResult> | CommandExecutionResult;
  undo(): Promise<boolean> | boolean;
  redo(): Promise<boolean> | boolean;
  getOperationRecord(): OperationRecord;
}
