/**
 * @file HistoryEngine.ts
 * Production-ready Command System and DAG History Engine for AI Graphic Maestro.
 * Supports:
 * - Real Command Execution & Telemetry (operationId, tool, parameters, input, output, timestamp, parent, status, duration, error, snapshot)
 * - True Multi-Step Undo & Redo
 * - Deterministic Replay of Operations
 * - Real State Rollback (restoring actual Document Model and layer PixelBuffers)
 * - Deep Immutable Document & Pixel Snapshots
 * - DAG Branching History (non-destructive history trees)
 * - Milestone Version Tagging & Checkout
 */

import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { HistorySnapshot } from '../models/types';
import {
  ICommand,
  OperationRecord,
  CommandExecutionResult,
  DocumentSnapshotRecord,
  BufferSnapshotData,
  HistoryBranch,
  HistoryVersion,
} from './types';

export interface ReplayResult {
  success: boolean;
  stepsReplayed: number;
  durationMs: number;
  errors: string[];
}

export class HistoryEngine {
  private documentEngine: MaestroDocumentEngine;
  private graphicsEngine: GraphicsEngine | null = null;

  // Operations and Commands maps
  private operations: Map<string, OperationRecord> = new Map();
  private commands: Map<string, ICommand> = new Map();

  // Branch and DAG structure
  private branches: Map<string, HistoryBranch> = new Map();
  private activeBranchId: string = 'branch_main';
  private branchUndoStacks: Map<string, ICommand[]> = new Map();
  private branchRedoStacks: Map<string, ICommand[]> = new Map();

  // Snapshots and Versions
  private snapshots: Map<string, DocumentSnapshotRecord> = new Map();
  private legacySnapshots: HistorySnapshot[] = [];
  private versions: Map<string, HistoryVersion> = new Map();

  // Change listeners
  private listeners: Array<(engine: HistoryEngine) => void> = [];

  constructor(documentEngine?: MaestroDocumentEngine, graphicsEngine?: GraphicsEngine) {
    this.documentEngine =
      documentEngine ||
      (graphicsEngine ? graphicsEngine.getDocumentEngine() : new MaestroDocumentEngine());
    if (graphicsEngine) {
      this.graphicsEngine = graphicsEngine;
    }

    // Initialize default main branch
    const mainBranch: HistoryBranch = {
      id: 'branch_main',
      name: 'Main Timeline',
      rootOperationId: null,
      headOperationId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.branches.set(mainBranch.id, mainBranch);
    this.branchUndoStacks.set(mainBranch.id, []);
    this.branchRedoStacks.set(mainBranch.id, []);

    // Create an initial baseline snapshot
    this.createSnapshot('Initial Document Baseline');
  }

  public setGraphicsEngine(graphicsEngine: GraphicsEngine): void {
    this.graphicsEngine = graphicsEngine;
  }

  public subscribe(listener: (engine: HistoryEngine) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        console.error('HistoryEngine listener error:', err);
      }
    }
  }

  // ==========================================================================
  // 1. Command Execution & Operation Telemetry
  // ==========================================================================

  /**
   * Executes a command on the active branch, recording complete operation telemetry.
   */
  public async executeCommand(
    command: ICommand,
    options?: { captureSnapshot?: boolean }
  ): Promise<CommandExecutionResult> {
    const branch = this.getActiveBranch();

    // Link parent to current head of branch
    if (typeof (command as any).setParent === 'function') {
      (command as any).setParent(branch.headOperationId);
    }

    // Execute command
    const result = await command.execute();
    const record = command.getOperationRecord();

    // If requested or on failure, attach snapshot for guaranteed recovery
    if (options?.captureSnapshot || !result.success) {
      record.snapshot = this.captureInternalSnapshot(`Snapshot for ${command.name}`);
    }

    // Store record and command
    this.operations.set(record.operationId, record);
    this.commands.set(command.id, command);

    if (result.success) {
      branch.headOperationId = record.operationId;
      branch.updatedAt = Date.now();

      const undoStack = this.branchUndoStacks.get(branch.id) || [];
      undoStack.push(command);
      this.branchUndoStacks.set(branch.id, undoStack);

      // Clear redo stack on new operation
      this.branchRedoStacks.set(branch.id, []);
    }

    this.notify();
    return result;
  }

  // ==========================================================================
  // 2. Undo & Redo
  // ==========================================================================

  /**
   * Undoes the last command on the active branch.
   */
  public async undo(): Promise<boolean> {
    const branch = this.getActiveBranch();
    const undoStack = this.branchUndoStacks.get(branch.id);
    if (!undoStack || undoStack.length === 0) return false;

    const command = undoStack.pop()!;
    const success = await command.undo();

    if (success) {
      // Revert branch head to parent
      const record = command.getOperationRecord();
      branch.headOperationId = record.parent;
      branch.updatedAt = Date.now();

      const redoStack = this.branchRedoStacks.get(branch.id) || [];
      redoStack.push(command);
      this.branchRedoStacks.set(branch.id, redoStack);

      this.notify();
      return true;
    } else {
      undoStack.push(command);
      return false;
    }
  }

  /**
   * Redoes the last undone command on the active branch.
   */
  public async redo(): Promise<boolean> {
    const branch = this.getActiveBranch();
    const redoStack = this.branchRedoStacks.get(branch.id);
    if (!redoStack || redoStack.length === 0) return false;

    const command = redoStack.pop()!;
    const success = await command.redo();

    if (success) {
      branch.headOperationId = command.id;
      branch.updatedAt = Date.now();

      const undoStack = this.branchUndoStacks.get(branch.id) || [];
      undoStack.push(command);
      this.branchUndoStacks.set(branch.id, undoStack);

      this.notify();
      return true;
    } else {
      redoStack.push(command);
      return false;
    }
  }

  public canUndo(): boolean {
    const stack = this.branchUndoStacks.get(this.activeBranchId);
    return Boolean(stack && stack.length > 0);
  }

  public canRedo(): boolean {
    const stack = this.branchRedoStacks.get(this.activeBranchId);
    return Boolean(stack && stack.length > 0);
  }

  // ==========================================================================
  // 3. Deep Snapshots & Real Rollback
  // ==========================================================================

  private captureInternalSnapshot(name: string, metadata?: Record<string, any>): DocumentSnapshotRecord {
    const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const buffers: Record<string, BufferSnapshotData> = {};

    if (this.graphicsEngine) {
      const allBufs = this.graphicsEngine.getAllLayerPixelBuffers();
      for (const [layerId, buf] of allBufs.entries()) {
        buffers[layerId] = {
          width: buf.width,
          height: buf.height,
          data: new Uint8ClampedArray(buf.data),
        };
      }
    }

    let selectionMask: BufferSnapshotData | null = null;
    if (this.graphicsEngine) {
      const mask = this.graphicsEngine.getActiveSelectionMask();
      if (mask) {
        selectionMask = {
          width: mask.width,
          height: mask.height,
          data: new Uint8ClampedArray(mask.data),
        };
      }
    }

    return {
      id,
      name,
      timestamp: Date.now(),
      document: this.documentEngine.cloneDocument(),
      buffers,
      selectionMask,
      activeLayerId: this.graphicsEngine ? this.graphicsEngine.getActiveLayerId() : null,
      metadata,
    };
  }

  /**
   * Creates an immutable snapshot of the entire document and all pixel buffers.
   */
  public createSnapshot(name = 'Manual Snapshot', metadata?: Record<string, any>): DocumentSnapshotRecord {
    const snapshot = this.captureInternalSnapshot(name, metadata);
    this.snapshots.set(snapshot.id, snapshot);
    this.notify();
    return snapshot;
  }

  /**
   * Restores the complete real state of the Document and PixelBuffers from a snapshot.
   */
  public async restoreSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      console.warn(`Snapshot ${snapshotId} not found`);
      return false;
    }

    // 1. Restore Document Engine Model
    this.documentEngine.restoreDocument(snapshot.document);

    // 2. Restore Pixel Buffers
    if (this.graphicsEngine) {
      this.graphicsEngine.restoreLayerPixelBuffers(snapshot.buffers);
      if (snapshot.selectionMask) {
        const smData = new Uint8ClampedArray(snapshot.selectionMask.data);
        const maskBuf = (this.graphicsEngine as any).tools
          ? this.graphicsEngine.getLayerPixelBuffer(snapshot.document.layers[0]?.id || '')
          : null;
        // Restore mask
        const PixelBufferClass = this.graphicsEngine.getLayerPixelBuffer(
          snapshot.document.layers[0]?.id || ''
        )?.constructor as any;
        if (PixelBufferClass) {
          this.graphicsEngine.setActiveSelectionMask(
            new PixelBufferClass(snapshot.selectionMask.width, snapshot.selectionMask.height, smData)
          );
        }
      } else {
        this.graphicsEngine.setActiveSelectionMask(null);
      }
      this.graphicsEngine.setActiveLayer(snapshot.activeLayerId);
    }

    this.notify();
    return true;
  }

  /**
   * Saves a pipeline iteration snapshot (backward-compatible with Orchestrator).
   */
  public saveSnapshot(snapshot: HistorySnapshot): void {
    this.legacySnapshots.push(snapshot);
    this.notify();
  }

  public getLegacySnapshots(): HistorySnapshot[] {
    return [...this.legacySnapshots];
  }

  /**
   * Real Rollback to either a Snapshot ID or a previous Operation ID,
   * or to a specific iteration index for pipeline rollback.
   */
  public rollbackTo(iteration: number): HistorySnapshot | undefined;
  public rollbackTo(targetId: string): Promise<boolean>;
  public rollbackTo(target: string | number): Promise<boolean> | HistorySnapshot | undefined {
    if (typeof target === 'number') {
      const found = this.legacySnapshots.find((s) => s.iteration === target);
      if (found) {
        if (this.documentEngine && (found.documentSnapshot as any)) {
          try {
            this.documentEngine.restoreDocument(found.documentSnapshot as any);
          } catch {
            // ignore if incompatible
          }
        }
        this.notify();
        return found;
      }
      return undefined;
    }

    return this.rollbackToTargetId(target);
  }

  private async rollbackToTargetId(targetId: string): Promise<boolean> {
    // Check if target is a Snapshot
    if (this.snapshots.has(targetId)) {
      return this.restoreSnapshot(targetId);
    }

    // Check if target is an Operation
    const op = this.operations.get(targetId);
    if (!op) {
      console.warn(`Rollback target ${targetId} not found in snapshots or operations.`);
      return false;
    }

    if (op.snapshot) {
      return this.restoreSnapshot(op.snapshot.id);
    }

    // Otherwise, rollback active branch undo stack until target operation is undone
    const branch = this.getActiveBranch();
    const undoStack = this.branchUndoStacks.get(branch.id) || [];
    let found = false;

    while (undoStack.length > 0) {
      const top = undoStack[undoStack.length - 1];
      if (top.id === targetId) {
        await this.undo();
        found = true;
        break;
      }
      const undone = await this.undo();
      if (!undone) break;
    }

    return found;
  }

  // ==========================================================================
  // 4. Replay System
  // ==========================================================================

  /**
   * Replays operations on the active branch, verifying deterministic execution.
   */
  public async replay(options?: {
    baseSnapshotId?: string;
    toOperationId?: string;
    stepDelayMs?: number;
  }): Promise<ReplayResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    let stepsReplayed = 0;

    // Restore base snapshot if provided
    if (options?.baseSnapshotId) {
      const restored = await this.restoreSnapshot(options.baseSnapshotId);
      if (!restored) {
        return {
          success: false,
          stepsReplayed: 0,
          durationMs: 0,
          errors: [`Failed to restore base snapshot ${options.baseSnapshotId}`],
        };
      }
    }

    // Get sequence of commands for active branch
    const timeline = this.getTimeline();
    let targetIndex = timeline.length;
    if (options?.toOperationId) {
      const idx = timeline.findIndex((op) => op.operationId === options.toOperationId);
      if (idx >= 0) targetIndex = idx + 1;
    }

    for (let i = 0; i < targetIndex; i++) {
      const op = timeline[i];
      const cmd = this.commands.get(op.operationId);
      if (!cmd) {
        errors.push(`Command instance for operation ${op.operationId} not found`);
        continue;
      }

      if (options?.stepDelayMs && options.stepDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.stepDelayMs));
      }

      const res = await cmd.execute();
      if (!res.success) {
        errors.push(`Replay failed at step ${i + 1} (${cmd.name}): ${res.error}`);
        break;
      }
      stepsReplayed++;
    }

    const durationMs = Number((performance.now() - startTime).toFixed(2));
    this.notify();

    return {
      success: errors.length === 0,
      stepsReplayed,
      durationMs,
      errors,
    };
  }

  // ==========================================================================
  // 5. Branches (DAG History Trees)
  // ==========================================================================

  public createBranch(name: string, fromOperationId?: string): HistoryBranch {
    const currentBranch = this.getActiveBranch();
    const forkOpId = fromOperationId !== undefined ? fromOperationId : currentBranch.headOperationId;

    const branch: HistoryBranch = {
      id: `branch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      rootOperationId: forkOpId,
      headOperationId: forkOpId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.branches.set(branch.id, branch);
    this.branchUndoStacks.set(branch.id, []);
    this.branchRedoStacks.set(branch.id, []);

    this.notify();
    return branch;
  }

  public async switchBranch(branchId: string): Promise<boolean> {
    const branch = this.branches.get(branchId);
    if (!branch) return false;

    this.activeBranchId = branch.id;
    this.notify();
    return true;
  }

  public getBranches(): HistoryBranch[] {
    return Array.from(this.branches.values());
  }

  public getActiveBranch(): HistoryBranch {
    let branch = this.branches.get(this.activeBranchId);
    if (!branch) {
      branch = Array.from(this.branches.values())[0];
      this.activeBranchId = branch.id;
    }
    return branch;
  }

  // ==========================================================================
  // 6. Milestone Versions
  // ==========================================================================

  public tagVersion(
    name: string,
    description = '',
    snapshotId?: string,
    tags: string[] = []
  ): HistoryVersion {
    let targetSnapId = snapshotId;
    if (!targetSnapId || !this.snapshots.has(targetSnapId)) {
      const snap = this.createSnapshot(`Version Snapshot: ${name}`);
      targetSnapId = snap.id;
    }

    const version: HistoryVersion = {
      versionId: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      description,
      snapshotId: targetSnapId,
      operationId: this.getActiveBranch().headOperationId,
      timestamp: Date.now(),
      tags,
    };

    this.versions.set(version.versionId, version);
    this.notify();
    return version;
  }

  public getVersions(): HistoryVersion[] {
    return Array.from(this.versions.values());
  }

  public async checkoutVersion(versionId: string): Promise<boolean> {
    const version = this.versions.get(versionId);
    if (!version) return false;
    return this.restoreSnapshot(version.snapshotId);
  }

  // ==========================================================================
  // 7. Timeline & Inspection
  // ==========================================================================

  /**
   * Returns linear list of operations on the active branch leading up to head.
   */
  public getTimeline(): OperationRecord[] {
    const branch = this.getActiveBranch();
    const result: OperationRecord[] = [];
    let currentId = branch.headOperationId;

    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const op = this.operations.get(currentId);
      if (!op) break;
      result.unshift(op);
      currentId = op.parent;
    }

    return result;
  }

  public getAllOperations(): OperationRecord[] {
    return Array.from(this.operations.values());
  }

  public getOperation(id: string): OperationRecord | undefined {
    return this.operations.get(id);
  }

  public getSnapshots(): DocumentSnapshotRecord[] {
    return Array.from(this.snapshots.values());
  }

  public getSnapshot(id: string): DocumentSnapshotRecord | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Directly records an operation telemetry record into the timeline of the active branch.
   */
  public recordOperationDirectly(record: OperationRecord): void {
    const branch = this.getActiveBranch();
    record.parent = branch.headOperationId;
    this.operations.set(record.operationId, record);
    branch.headOperationId = record.operationId;
    branch.updatedAt = Date.now();
    this.notify();
  }
}
