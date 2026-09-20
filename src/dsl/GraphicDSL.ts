/**
 * @file GraphicDSL
 * Parser and Execution Compiler for Maestro Graphic DSL scripts.
 */

import { DSLOperation, ToolCategory } from '../models/types';

/**
 * Graphic DSL Tool Call definition as specified in Prompt 13.4.
 * Structured JSON representation for all graphic operations executed by AI.
 */
export interface GraphicToolCall {
  operation: string; // e.g. 'move_object', 'scale_object', 'rotate_object', 'recolor', 'create_mask', 'remove_object', 'blend', 'transform', 'select_object', 'crop', 'evaluate', 'rollback'
  target?: string; // e.g. 'layer.garment', 'selected', layer ID
  delta?: { x: number; y: number };
  scale?: { x?: number; y?: number; factor?: number };
  angle?: number;
  opacity?: number;
  blendMode?: string;
  color?: string;
  mask?: { type?: string; feather?: number; invert?: boolean };
  parameters?: Record<string, any>;
}

export interface DSLValidationResult {
  valid: boolean;
  errors: string[];
  canonicalToolId: string;
  sanitizedParams: Record<string, any>;
}

export class GraphicDSL {
  /**
   * Static DSL script parser that parses statements into an AST.
   */
  public static parse(script: string): { statements: Array<{ id: number; command: string; raw: string; args: Record<string, any> }> } {
    const lines = script
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    const statements = lines.map((line, idx) => {
      const parts = line.split(/\s+/);
      const command = parts[0];
      const rest = parts.slice(1).join(' ');
      const args: Record<string, any> = {};

      if (rest) {
        rest.split(/\s+/).forEach((argToken) => {
          if (argToken.includes('=')) {
            const [k, v] = argToken.split('=');
            const num = Number(v);
            args[k] = !isNaN(num) ? num : v.replace(/^"|"$/g, '');
          } else if (argToken) {
            const num = Number(argToken);
            args.value = !isNaN(num) ? num : argToken.replace(/^"|"$/g, '');
          }
        });
      }

      return {
        id: idx + 1,
        command,
        raw: line,
        args,
      };
    });

    return { statements };
  }

  /**
   * Translates an abstract Graphic DSL operation to the canonical registry tool ID.
   */
  public static mapOperationToToolId(operation: string): string {
    const op = operation.toLowerCase().trim();
    switch (op) {
      case 'move_object':
      case 'move':
        return 'tool.move';
      case 'scale_object':
      case 'scale':
        return 'tool.scale';
      case 'rotate_object':
      case 'rotate':
        return 'tool.rotate';
      case 'recolor':
      case 'color':
        return 'tool.recolor';
      case 'create_mask':
      case 'mask':
        return 'tool.mask';
      case 'remove_object':
      case 'delete_layer':
      case 'delete':
        return 'tool.remove_object';
      case 'blend':
      case 'set_opacity':
        return 'tool.blend';
      case 'transform':
        return 'tool.transform';
      case 'select_object':
      case 'select':
        return 'tool.selection';
      case 'crop':
        return 'tool.crop';
      case 'evaluate':
        return 'tool.evaluate';
      case 'rollback':
      case 'undo':
        return 'tool.rollback';
      default:
        if (op.startsWith('tool.') || op.startsWith('primitive.') || op.startsWith('vision.')) {
          return op;
        }
        return `tool.${op}`;
    }
  }

  /**
   * Validates a GraphicToolCall against registered tool requirements.
   */
  public static validate(toolCall: GraphicToolCall): DSLValidationResult {
    const errors: string[] = [];

    if (!toolCall || typeof toolCall !== 'object') {
      return { valid: false, errors: ['Graphic DSL call must be a valid JSON object.'], canonicalToolId: '', sanitizedParams: {} };
    }

    if (!toolCall.operation || typeof toolCall.operation !== 'string') {
      errors.push("Field 'operation' is required and must be a string.");
    }

    const canonicalToolId = GraphicDSL.mapOperationToToolId(toolCall.operation || '');
    const sanitizedParams: Record<string, any> = { ...(toolCall.parameters || {}) };

    // Standardize parameters based on canonical operation
    if (toolCall.target) {
      sanitizedParams.target = toolCall.target;
      sanitizedParams.layerId = toolCall.target;
    }

    if (toolCall.delta) {
      if (typeof toolCall.delta.x === 'number') sanitizedParams.dx = toolCall.delta.x;
      if (typeof toolCall.delta.y === 'number') sanitizedParams.dy = toolCall.delta.y;
    }

    if (toolCall.scale) {
      if (typeof toolCall.scale.factor === 'number') {
        sanitizedParams.scaleX = toolCall.scale.factor;
        sanitizedParams.scaleY = toolCall.scale.factor;
      }
      if (typeof toolCall.scale.x === 'number') sanitizedParams.scaleX = toolCall.scale.x;
      if (typeof toolCall.scale.y === 'number') sanitizedParams.scaleY = toolCall.scale.y;
    }

    if (typeof toolCall.angle === 'number') {
      sanitizedParams.angleDegrees = toolCall.angle;
    }

    if (typeof toolCall.opacity === 'number') {
      sanitizedParams.opacity = toolCall.opacity;
    }

    if (toolCall.blendMode) {
      sanitizedParams.blendMode = toolCall.blendMode;
    }

    if (toolCall.color) {
      sanitizedParams.color = toolCall.color;
    }

    if (toolCall.mask) {
      sanitizedParams.action = toolCall.mask.invert ? 'invert' : 'from_selection';
      sanitizedParams.maskType = toolCall.mask.type || 'vignette';
      sanitizedParams.feather = toolCall.mask.feather ?? 10;
    }

    // Specific operation validations
    switch (canonicalToolId) {
      case 'tool.move':
        if (sanitizedParams.dx === undefined && sanitizedParams.dy === undefined) {
          errors.push("Operation 'move_object' requires 'delta' with 'x' or 'y' offsets.");
        }
        break;
      case 'tool.scale':
        if (sanitizedParams.scaleX === undefined && sanitizedParams.scaleY === undefined) {
          errors.push("Operation 'scale_object' requires 'scale' with 'factor' or 'x'/'y'.");
        }
        break;
      case 'tool.rotate':
        if (sanitizedParams.angleDegrees === undefined) {
          errors.push("Operation 'rotate_object' requires 'angle' in degrees.");
        }
        break;
      case 'tool.blend':
        if (sanitizedParams.opacity === undefined && sanitizedParams.blendMode === undefined) {
          errors.push("Operation 'blend' requires 'opacity' or 'blendMode'.");
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      canonicalToolId,
      sanitizedParams,
    };
  }

  /**
   * Parses a multi-line Graphic DSL script into an array of executable DSL operations.
   */
  public parseScript(script: string): DSLOperation[] {
    const lines = script
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    const operations: DSLOperation[] = [];

    lines.forEach((line, index) => {
      const op = this.parseLine(line, index + 1);
      if (op) {
        operations.push(op);
      }
    });

    return operations;
  }

  /**
   * Parses a single DSL instruction line:
   * e.g., "primitive.lighting (buffer perspective_corrected, intensity 0.25, direction top_left) -> relit // Relight"
   */
  public parseLine(line: string, id: number): DSLOperation | null {
    try {
      // Extract comment if present
      let comment = '';
      let cleanLine = line;
      if (line.includes('//')) {
        const parts = line.split('//');
        cleanLine = parts[0].trim();
        comment = parts.slice(1).join('//').trim();
      }

      // Split by arrow ->
      if (!cleanLine.includes('->')) {
        return null;
      }

      const [leftSide, rightSide] = cleanLine.split('->').map((s) => s.trim());
      const outputName = rightSide;

      // Parse tool name and optional params inside parenthesis
      let toolName = leftSide;
      const params: Record<string, unknown> = {};
      let inputRaw = '';

      if (leftSide.includes('(') && leftSide.endsWith(')')) {
        const openParen = leftSide.indexOf('(');
        toolName = leftSide.substring(0, openParen).trim();
        inputRaw = leftSide.substring(openParen + 1, leftSide.length - 1).trim();

        // Parse key-value arguments
        const argTokens = inputRaw.split(',').map((t) => t.trim());
        argTokens.forEach((token) => {
          const spaceIdx = token.indexOf(' ');
          if (spaceIdx > 0) {
            const key = token.substring(0, spaceIdx).trim();
            const val = token.substring(spaceIdx + 1).trim();
            const num = Number(val);
            params[key] = !isNaN(num) ? num : val;
          } else {
            params[token] = true;
          }
        });
      }

      const category = this.categorizeTool(toolName);

      return {
        id,
        tool: toolName,
        output: outputName,
        desc: comment || `Execute ${toolName}`,
        category,
        inputs: inputRaw || undefined,
        params,
        status: 'pending',
      };
    } catch {
      return null;
    }
  }

  private categorizeTool(toolName: string): ToolCategory {
    if (toolName.startsWith('vision.')) return 'vision';
    if (toolName.includes('shadow') || toolName.includes('lighting')) return 'lighting';
    if (toolName.includes('scale') || toolName.includes('perspective')) return 'transform';
    if (toolName.includes('recolor') || toolName.includes('color')) return 'color';
    if (toolName.includes('background') || toolName.includes('composite')) return 'compositing';
    return 'filter';
  }

  /**
   * Serializes an array of DSL operations back into formatted Maestro DSL string.
   */
  public serialize(operations: DSLOperation[]): string {
    return operations
      .map((op) => {
        const inputStr = op.inputs ? ` (${op.inputs})` : '';
        const commentStr = op.desc ? ` // ${op.desc}` : '';
        return `${op.tool}${inputStr} -> ${op.output}${commentStr}`;
      })
      .join('\n');
  }
}
