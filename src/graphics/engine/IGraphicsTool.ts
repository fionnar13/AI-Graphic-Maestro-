/**
 * @file IGraphicsTool.ts
 * Standard contract for all independent Graphic Primitive Tools in AI Graphic Maestro.
 * Every tool must strictly implement validation, execution, and rollback.
 */

import { MaestroDocumentModel } from '../../models/document.types';
import { PixelBuffer } from './PixelBuffer';
import { MaestroDocumentEngine } from '../../document/MaestroDocumentEngine';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ToolExecutionContext {
  documentEngine: MaestroDocumentEngine;
  document: MaestroDocumentModel;
  activeLayerId: string | null;
  activeSelectionMask: PixelBuffer | null;
  setActiveSelectionMask: (mask: PixelBuffer | null) => void;
  getLayerPixelBuffer: (layerId: string) => PixelBuffer | null;
  setLayerPixelBuffer: (layerId: string, buffer: PixelBuffer) => void;
  /**
   * Phase 14.3.3 (A7) — Permanently removes the layer's pixel buffer.
   * Used by tool rollback to restore procedural-only rendering when a tool
   * auto-created a buffer for a layer that previously had none.
   * Returns true if a buffer was deleted.
   */
  deleteLayerPixelBuffer: (layerId: string) => boolean;
  /**
   * Phase 14.3.3 (A7) — Returns true if the layer has a real (non-auto-created)
   * pixel buffer. Tools should call this BEFORE getLayerPixelBuffer() to detect
   * whether they are modifying existing pixels or creating a fresh buffer.
   */
  hasLayerPixelBuffer: (layerId: string) => boolean;
  createPixelBuffer: (width: number, height: number, fillColor?: [number, number, number, number]) => PixelBuffer;
}

export interface ToolExecutionResult {
  success: boolean;
  toolId: string;
  affectedLayerIds: string[];
  message?: string;
  rollbackData: any;
  output?: Record<string, any>;
  durationMs?: number;
}

export interface ToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  min?: number;
  max?: number;
  enum?: (string | number)[];
}

export interface IGraphicsTool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, ToolParameterSchema>;
  readonly outputSchema: Record<string, any>;
  readonly parameters: Record<string, any>;

  /**
   * Validates parameters against inputSchema and contextual preconditions.
   */
  validate(context: ToolExecutionContext, params: Record<string, any>): ValidationResult;

  /**
   * Executes the real graphic operation on the document and pixel buffers.
   * Returns a ToolExecutionResult with rollbackData to enable deterministic undo.
   */
  execute(context: ToolExecutionContext, params: Record<string, any>): Promise<ToolExecutionResult> | ToolExecutionResult;

  /**
   * Reverts the changes made by execute using the saved rollbackData.
   */
  rollback(context: ToolExecutionContext, rollbackData: any): Promise<boolean> | boolean;
}
