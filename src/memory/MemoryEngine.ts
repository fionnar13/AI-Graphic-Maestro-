/**
 * @file MemoryEngine.ts
 * Comprehensive Autonomous Memory System for Maestro.
 * 
 * Manages 6 distinct memory categories:
 *  1. Project Memory
 *  2. Operation Memory
 *  3. User Preference Memory
 *  4. Visual Decision Memory
 *  5. Failure Memory
 *  6. Successful Workflow Memory
 * 
 * Features:
 *  - Persistent: Automatically syncs with storage adapter (LocalStorage / InMemory)
 *  - Queryable: Filter and search by type, tags, keyword, confidence, date, sorting
 *  - Inspectable: Full payload metadata, source attribution, utility scores
 *  - Editable: In-place update of memory items and their payloads
 *  - Deletable: Individual and bulk deletion with state integrity
 *  - Distinct from Document History (History = what happened; Memory = what was learned)
 */

import {
  BaseMemoryEntry,
  MemoryType,
  MemoryQuery,
  MemorySystemStats,
  ProjectMemoryData,
  OperationMemoryData,
  UserPreferenceMemoryData,
  VisualDecisionMemoryData,
  FailureMemoryData,
  SuccessfulWorkflowMemoryData,
} from './types';
import { IMemoryStorageAdapter, LocalStorageMemoryAdapter } from './MemoryStorageAdapter';
import { MaestroMemoryState, VisualDecision, SuccessfulWorkflowEntry } from '../models/types';

export class MemoryEngine {
  private static readonly STORAGE_KEY = 'maestro_agentic_memory_v2';
  private entries = new Map<string, BaseMemoryEntry>();
  private storage: IMemoryStorageAdapter;
  private lastPersisted: number | null = null;

  constructor(storageAdapter?: IMemoryStorageAdapter) {
    this.storage = storageAdapter || new LocalStorageMemoryAdapter();
    this.loadFromStorage();

    // If storage is empty, seed with initial foundational experience
    if (this.entries.size === 0) {
      this.seedDefaultMemories();
    }
  }

  // =========================================================================
  // PERSISTENCE (Load, Save, Export, Import)
  // =========================================================================

  public persistToStorage(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.entries.values()));
      this.storage.setItem(MemoryEngine.STORAGE_KEY, serialized);
      this.lastPersisted = Date.now();
    } catch (err) {
      console.warn('MemoryEngine: Failed to persist memories to storage:', err);
    }
  }

  public loadFromStorage(): boolean {
    try {
      const raw = this.storage.getItem(MemoryEngine.STORAGE_KEY);
      if (!raw) return false;

      const parsed: BaseMemoryEntry[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.entries.clear();
        for (const entry of parsed) {
          if (entry && entry.id && entry.type) {
            this.entries.set(entry.id, entry);
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('MemoryEngine: Failed to load memories from storage:', err);
      return false;
    }
  }

  public exportToJSON(): string {
    return JSON.stringify(Array.from(this.entries.values()), null, 2);
  }

  public importFromJSON(jsonString: string): { imported: number; total: number } {
    try {
      const parsed: BaseMemoryEntry[] = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid JSON format: expected array of memory entries');
      }

      let count = 0;
      for (const item of parsed) {
        if (item.id && item.type) {
          this.entries.set(item.id, {
            ...item,
            updatedAt: Date.now(),
          });
          count++;
        }
      }
      this.persistToStorage();
      return { imported: count, total: this.entries.size };
    } catch (err: any) {
      throw new Error(`MemoryEngine import failed: ${err.message}`);
    }
  }

  // =========================================================================
  // CRUD & INSPECTION (Inspectable, Editable, Deletable)
  // =========================================================================

  public get(id: string): BaseMemoryEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    return JSON.parse(JSON.stringify(entry));
  }

  public getAll(): BaseMemoryEntry[] {
    return Array.from(this.entries.values()).map((e) => JSON.parse(JSON.stringify(e)));
  }

  public create<T = any>(entry: {
    type: MemoryType;
    title: string;
    summary: string;
    tags?: string[];
    confidence?: number;
    utilityScore?: number;
    data: T;
    source?: BaseMemoryEntry['source'];
  }): BaseMemoryEntry<T> {
    const id = `mem_${entry.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const newEntry: BaseMemoryEntry<T> = {
      id,
      type: entry.type,
      title: entry.title,
      summary: entry.summary,
      tags: entry.tags || [],
      confidence: entry.confidence !== undefined ? Math.min(1, Math.max(0, entry.confidence)) : 0.85,
      utilityScore: entry.utilityScore !== undefined ? entry.utilityScore : 0.8,
      data: entry.data,
      createdAt: now,
      updatedAt: now,
      source: entry.source || 'auto_extracted',
    };

    this.entries.set(id, newEntry);
    this.persistToStorage();
    return JSON.parse(JSON.stringify(newEntry));
  }

  public update<T = any>(
    id: string,
    updates: Partial<Omit<BaseMemoryEntry<T>, 'id' | 'createdAt'>>
  ): BaseMemoryEntry<T> | null {
    const existing = this.entries.get(id);
    if (!existing) return null;

    const updated: BaseMemoryEntry = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    if (updates.data && typeof updates.data === 'object') {
      updated.data = {
        ...existing.data,
        ...updates.data,
      };
    }

    this.entries.set(id, updated);
    this.persistToStorage();
    return JSON.parse(JSON.stringify(updated));
  }

  public delete(id: string): boolean {
    const existed = this.entries.delete(id);
    if (existed) {
      this.persistToStorage();
    }
    return existed;
  }

  public clear(type?: MemoryType): void {
    if (type) {
      for (const [id, item] of this.entries.entries()) {
        if (item.type === type) {
          this.entries.delete(id);
        }
      }
    } else {
      this.entries.clear();
    }
    this.persistToStorage();
  }

  // =========================================================================
  // QUERYABLE (Search & Filter Engine)
  // =========================================================================

  public query(q: MemoryQuery = {}): BaseMemoryEntry[] {
    let results = Array.from(this.entries.values());

    // Filter by type or types
    if (q.type) {
      const allowedTypes = Array.isArray(q.type) ? q.type : [q.type];
      results = results.filter((e) => allowedTypes.includes(e.type));
    }

    // Filter by source
    if (q.source) {
      results = results.filter((e) => e.source === q.source);
    }

    // Filter by minimum confidence
    if (q.minConfidence !== undefined) {
      results = results.filter((e) => e.confidence >= q.minConfidence!);
    }

    // Filter by date range
    if (q.startDate !== undefined) {
      results = results.filter((e) => e.createdAt >= q.startDate!);
    }
    if (q.endDate !== undefined) {
      results = results.filter((e) => e.createdAt <= q.endDate!);
    }

    // Filter by tags
    if (q.tags && q.tags.length > 0) {
      results = results.filter((e) => q.tags!.every((t) => e.tags.includes(t)));
    }

    // Keyword search (searches title, summary, tags, and data JSON string)
    if (q.keyword) {
      const kw = q.keyword.toLowerCase();
      results = results.filter((e) => {
        if (e.title.toLowerCase().includes(kw)) return true;
        if (e.summary.toLowerCase().includes(kw)) return true;
        if (e.tags.some((t) => t.toLowerCase().includes(kw))) return true;
        try {
          const json = JSON.stringify(e.data).toLowerCase();
          if (json.includes(kw)) return true;
        } catch {
          // ignore
        }
        return false;
      });
    }

    // Sorting
    const sortBy = q.sortBy || 'updatedAt';
    const sortOrder = q.sortOrder || 'desc';
    results.sort((a, b) => {
      let valA: number = (a as any)[sortBy] || 0;
      let valB: number = (b as any)[sortBy] || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    // Limit
    if (q.limit && q.limit > 0) {
      results = results.slice(0, q.limit);
    }

    return results.map((r) => JSON.parse(JSON.stringify(r)));
  }

  // =========================================================================
  // DOMAIN RECORDERS (6 Memory Types)
  // =========================================================================

  /**
   * 1. Record Project Memory: Project context, style constraints, asset requirements
   */
  public recordProjectMemory(
    projectName: string,
    data: Partial<ProjectMemoryData>,
    options?: { summary?: string; tags?: string[] }
  ): BaseMemoryEntry<ProjectMemoryData> {
    const fullData: ProjectMemoryData = {
      projectName,
      domain: data.domain || 'e_commerce',
      targetStyle: data.targetStyle || 'luxury_studio',
      aspectRatio: data.aspectRatio || '16:9',
      dimensions: data.dimensions || { width: 800, height: 500 },
      brandPalette: data.brandPalette || ['#121212', '#2a2a2a', '#d4af37'],
      keySubjects: data.keySubjects || ['product_primary'],
      notes: data.notes || ['E-commerce luxury product presentation'],
    };

    return this.create<ProjectMemoryData>({
      type: 'project',
      title: `Project: ${projectName}`,
      summary: options?.summary || `Context and visual standards for ${projectName}`,
      tags: ['project', fullData.domain, fullData.targetStyle, ...(options?.tags || [])],
      confidence: 0.95,
      utilityScore: 0.9,
      data: fullData,
      source: 'user_defined',
    });
  }

  /**
   * 2. Record Operation Memory: Tool performance, recommended parameters, reliability metrics
   */
  public recordOperationMemory(
    toolId: string,
    data: Partial<OperationMemoryData>,
    options?: { summary?: string }
  ): BaseMemoryEntry<OperationMemoryData> {
    const fullData: OperationMemoryData = {
      toolId,
      toolCategory: data.toolCategory || (toolId.startsWith('vision.') ? 'vision' : 'primitive'),
      recommendedParams: data.recommendedParams || {},
      reliabilityScore: data.reliabilityScore ?? 0.9,
      successCount: data.successCount ?? 1,
      failureCount: data.failureCount ?? 0,
      averageDurationMs: data.averageDurationMs ?? 45,
      bestPractices: data.bestPractices || [`Verified effective parameters for ${toolId}`],
    };

    return this.create<OperationMemoryData>({
      type: 'operation',
      title: `Operation: ${toolId}`,
      summary: options?.summary || `Reliability & best parameter profile for ${toolId}`,
      tags: ['operation', fullData.toolCategory, toolId],
      confidence: 0.88,
      utilityScore: 0.85,
      data: fullData,
      source: 'auto_extracted',
    });
  }

  /**
   * 3. Record User Preference Memory: Aesthetic preferences, constraints, style affinity
   */
  public recordUserPreference(
    preferenceKey: string,
    value: unknown,
    category: UserPreferenceMemoryData['category'],
    explicit = true
  ): BaseMemoryEntry<UserPreferenceMemoryData> {
    const fullData: UserPreferenceMemoryData = {
      preferenceKey,
      value,
      category,
      userExplicit: explicit,
      weight: explicit ? 1.0 : 0.7,
    };

    return this.create<UserPreferenceMemoryData>({
      type: 'user_preference',
      title: `Preference: ${preferenceKey}`,
      summary: `User prefers ${preferenceKey} = ${JSON.stringify(value)} (${category})`,
      tags: ['preference', category, preferenceKey],
      confidence: explicit ? 1.0 : 0.75,
      utilityScore: 0.95,
      data: fullData,
      source: explicit ? 'user_defined' : 'auto_extracted',
    });
  }

  /**
   * 4. Record Visual Decision Memory: Aesthetic reasoning, lighting/shadow choices, tradeoff rationales
   */
  public recordVisualDecision(
    category: VisualDecisionMemoryData['category'],
    decision: string,
    rationale: string,
    options?: { outcomeScore?: number; alternatives?: string[]; confidence?: number }
  ): BaseMemoryEntry<VisualDecisionMemoryData> {
    const fullData: VisualDecisionMemoryData = {
      category,
      decision,
      rationale,
      alternativesConsidered: options?.alternatives,
      outcomeScore: options?.outcomeScore,
    };

    return this.create<VisualDecisionMemoryData>({
      type: 'visual_decision',
      title: `Visual Decision: ${category}`,
      summary: `${decision} (${rationale})`,
      tags: ['visual_decision', category],
      confidence: options?.confidence ?? 0.85,
      utilityScore: options?.outcomeScore ?? 0.8,
      data: fullData,
      source: 'critic_feedback',
    });
  }

  /**
   * 5. Record Failure Memory: What failed, trigger conditions, anti-patterns to avoid
   */
  public recordFailure(
    data: FailureMemoryData,
    options?: { title?: string; summary?: string; confidence?: number }
  ): BaseMemoryEntry<FailureMemoryData> {
    return this.create<FailureMemoryData>({
      type: 'failure',
      title: options?.title || `Failure: ${data.failedAction}`,
      summary:
        options?.summary ||
        `Failure in ${data.failedAction}: ${data.failureReason}. Anti-pattern: ${data.avoidPattern}`,
      tags: ['failure', data.rootCauseCategory, data.failedAction],
      confidence: options?.confidence ?? 0.9,
      utilityScore: 0.95, // High utility: preventing repeated mistakes is critical
      data,
      source: 'self_revision',
    });
  }

  /**
   * 6. Record Successful Workflow Memory: Proven recipes and multi-step execution graphs
   * E.g.: Product -> Mask -> Background -> Relight -> Shadow
   */
  public recordSuccessfulWorkflow(
    data: SuccessfulWorkflowMemoryData,
    options?: { title?: string; summary?: string }
  ): BaseMemoryEntry<SuccessfulWorkflowMemoryData> {
    const sequenceStr = data.pipelineSequence.join(' → ');

    return this.create<SuccessfulWorkflowMemoryData>({
      type: 'successful_workflow',
      title: options?.title || `Workflow: ${data.workflowName}`,
      summary:
        options?.summary ||
        `Proven sequence [${sequenceStr}] achieved quality score ${data.finalQualityScore.toFixed(3)} for ${data.intent}`,
      tags: [
        'successful_workflow',
        data.intent,
        ...data.pipelineSequence.map((s) => s.toLowerCase()),
      ],
      confidence: Math.min(1.0, Math.max(0.7, data.finalQualityScore)),
      utilityScore: Math.min(1.0, data.finalQualityScore),
      data,
      source: 'pipeline_execution',
    });
  }

  // =========================================================================
  // STATS & BACKWARD COMPATIBILITY
  // =========================================================================

  public getStats(): MemorySystemStats {
    const entries = Array.from(this.entries.values());
    const byType: Record<MemoryType, number> = {
      project: 0,
      operation: 0,
      user_preference: 0,
      visual_decision: 0,
      failure: 0,
      successful_workflow: 0,
    };

    let totalConfidence = 0;
    for (const e of entries) {
      if (byType[e.type] !== undefined) {
        byType[e.type]++;
      }
      totalConfidence += e.confidence;
    }

    const json = JSON.stringify(entries);
    const storageSizeBytes = new TextEncoder().encode(json).length;

    return {
      totalEntries: entries.length,
      byType,
      averageConfidence: entries.length > 0 ? Number((totalConfidence / entries.length).toFixed(3)) : 0,
      lastPersisted: this.lastPersisted,
      storageSizeBytes,
    };
  }

  /**
   * Backward-compatible adapter for existing UI and orchestrator consumers.
   */
  public getState(): MaestroMemoryState {
    const workflows = this.query({ type: 'successful_workflow' });
    const visualDecs = this.query({ type: 'visual_decision' });
    const projectMems = this.query({ type: 'project' });

    const successfulWorkflows: SuccessfulWorkflowEntry[] = workflows.map((w) => {
      const data = w.data as SuccessfulWorkflowMemoryData;
      return {
        id: w.id,
        pipelineName: data.workflowName || w.title,
        intent: data.intent || 'e_commerce_ad',
        finalScore: data.finalQualityScore || w.confidence,
        operationCount: data.steps ? data.steps.length : data.pipelineSequence.length,
        dslScript: data.pipelineSequence.join(' -> '),
      };
    });

    const visualDecisions: VisualDecision[] = visualDecs.map((d) => {
      const data = d.data as VisualDecisionMemoryData;
      return {
        id: d.id,
        category: data.category || 'lighting',
        decision: data.decision || d.title,
        rationale: data.rationale || d.summary,
        timestamp: d.createdAt,
      };
    });

    const latestProject = projectMems[0]?.data as ProjectMemoryData | undefined;

    return {
      projectMemoryCount: projectMems.length || 1,
      successfulWorkflows,
      visualDecisions,
      projectStyle: latestProject?.targetStyle || 'luxury_studio',
      confidence: this.getStats().averageConfidence || 0.815,
    };
  }

  public getTotalMemoryEntries(): number {
    return this.entries.size;
  }

  // =========================================================================
  // SEED FOUNDATIONAL MEMORIES
  // =========================================================================

  private seedDefaultMemories(): void {
    // 1. Seed Project Memory
    this.recordProjectMemory('High-End E-Commerce Showcase', {
      domain: 'e_commerce',
      targetStyle: 'luxury_studio',
      aspectRatio: '16:9',
      dimensions: { width: 800, height: 500 },
      brandPalette: ['#121212', '#222222', '#d4af37', '#ffffff'],
      keySubjects: ['luxury_perfume_bottle'],
      notes: ['Reflective glass surface, dark gradient background, soft ground contact shadow'],
    });

    // 2. Seed Successful Workflow Memory: Product -> Mask -> Background -> Relight -> Shadow
    this.recordSuccessfulWorkflow({
      workflowName: 'Luxury Studio Product Composite',
      intent: 'e_commerce_product_advertisement',
      pipelineSequence: ['Product', 'Mask', 'Background', 'Relight', 'Shadow'],
      steps: [
        {
          stepIndex: 1,
          toolId: 'vision.subject_detection',
          displayName: 'Product Subject Extraction',
          purpose: 'Isolate primary foreground product bounding box',
          params: { confidenceThreshold: 0.85 },
        },
        {
          stepIndex: 2,
          toolId: 'vision.segmentation',
          displayName: 'Precise Alpha Masking',
          purpose: 'Generate clean pixel-accurate silhouette mask',
          params: { featherRadius: 1.5 },
        },
        {
          stepIndex: 3,
          toolId: 'primitive.background_replacement',
          displayName: 'Atmospheric Studio Background',
          purpose: 'Place dark luxury studio backdrop behind masked product',
          params: { style: 'luxury_dark_gradient' },
        },
        {
          stepIndex: 4,
          toolId: 'primitive.lighting',
          displayName: 'Top-Left Directional Relighting',
          purpose: 'Harmonize key light direction between product and background',
          params: { direction: 'top_left', intensity: 0.25 },
        },
        {
          stepIndex: 5,
          toolId: 'primitive.shadow',
          displayName: 'Ground Contact Shadow',
          purpose: 'Anchor product firmly to ground plane to prevent floating illusion',
          params: { offsetX: 16, offsetY: 22, blur: 14, opacity: 0.45 },
        },
      ],
      finalQualityScore: 0.885,
      testedPreset: 'luxury_studio',
      inputRequirements: ['high_res_product_photo'],
    });

    // 3. Seed Operation Memory
    this.recordOperationMemory('primitive.shadow', {
      toolCategory: 'primitive',
      recommendedParams: { offsetX: 16, offsetY: 20, blur: 14, opacity: 0.45 },
      reliabilityScore: 0.94,
      successCount: 42,
      failureCount: 2,
      averageDurationMs: 38,
      bestPractices: [
        'Always set blur >= 10 for soft ambient light',
        'Contact shadow opacity must match background luminance (0.35-0.55 for dark studio)',
      ],
    });

    // 4. Seed User Preference Memory
    this.recordUserPreference('preferred_lighting_direction', 'top_left', 'lighting', true);
    this.recordUserPreference('default_aesthetic_preset', 'luxury_studio', 'palette', true);

    // 5. Seed Visual Decision Memory
    this.recordVisualDecision(
      'lighting',
      'Top-left directional keylight with 0.25 intensity',
      'Matches luxury studio gradient light source angle, avoiding specular blowout on glass',
      { outcomeScore: 0.89 }
    );
    this.recordVisualDecision(
      'shadow',
      'Ground contact shadow with offset 16,22 and blur 14',
      'Anchors product firmly to floor plane, eliminating perceived floating defect',
      { outcomeScore: 0.92 }
    );

    // 6. Seed Failure Memory
    this.recordFailure({
      failedAction: 'primitive.lighting without segmentation mask',
      triggerConditions: 'Global canvas relighting applied before subject isolation',
      failureReason: 'Caused background contrast wash and washed out subject highlights',
      rootCauseCategory: 'missing_mask',
      avoidPattern: 'Do not invoke primitive.lighting on full composite without layer masking',
      recommendedWorkaround: 'Apply segmentation first, then relight subject and background independently',
      occurrences: 3,
    });
  }
}
