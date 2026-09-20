/**
 * @file memory.test.ts
 * Comprehensive Test Suite for Autonomous Maestro Memory System:
 * - 6 Memory Categories (Project, Operation, User Preference, Visual Decision, Failure, Successful Workflow)
 * - Persistent across storage reloads
 * - Queryable with compound filters (type, keyword, tags, confidence, sort)
 * - Inspectable with full metadata
 * - Editable in-place with storage sync
 * - Deletable (single and categorized)
 * - Proven workflow extraction: Product → Mask → Background → Relight → Shadow
 * - Strict Separation: History (what happened) vs. Memory (what was learned)
 */

import { MemoryEngine } from '../memory/MemoryEngine';
import { InMemoryStorageAdapter } from '../memory/MemoryStorageAdapter';
import { HistoryEngine } from '../history/HistoryEngine';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';
import { GraphicsEngine } from '../graphics/GraphicsEngine';

export class MemoryTestSuite {
  public async runAllTests(): Promise<{ name: string; passed: boolean; message?: string }[]> {
    const results: { name: string; passed: boolean; message?: string }[] = [];

    // Test 1: 6 Memory Types
    results.push(await this.testSixMemoryCategories());

    // Test 2: Workflow Extraction (Product → Mask → Background → Relight → Shadow)
    results.push(await this.testSuccessfulWorkflowExtraction());

    // Test 3: History vs Memory Strict Separation
    results.push(await this.testHistoryVsMemorySeparation());

    // Test 4: Persistence across Storage Reloads
    results.push(await this.testPersistenceAcrossReloads());

    // Test 5: Retrieval & Compound Querying
    results.push(await this.testRetrievalAndCompoundQuerying());

    // Test 6: Inspectability
    results.push(await this.testInspectability());

    // Test 7: Editability
    results.push(await this.testEditability());

    // Test 8: Deletability
    results.push(await this.testDeletability());

    return results;
  }

  /**
   * Test 1: All 6 distinct memory categories exist and store appropriate domain structures.
   */
  private async testSixMemoryCategories(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'MemoryEngine: 6 Distinct Memory Categories Exist and Record Correctly';
    try {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);
      memory.clear(); // start fresh

      // 1. Project Memory
      const proj = memory.recordProjectMemory('Brand Launch 2026', {
        domain: 'branding',
        targetStyle: 'minimalist_luxury',
        brandPalette: ['#000000', '#ffffff', '#gold'],
      });
      if (proj.type !== 'project' || proj.data.domain !== 'branding') {
        throw new Error('Project Memory failed to record correctly');
      }

      // 2. Operation Memory
      const op = memory.recordOperationMemory('primitive.shadow', {
        reliabilityScore: 0.96,
        recommendedParams: { blur: 14, opacity: 0.45 },
      });
      if (op.type !== 'operation' || op.data.toolId !== 'primitive.shadow') {
        throw new Error('Operation Memory failed to record correctly');
      }

      // 3. User Preference Memory
      const pref = memory.recordUserPreference('lighting_direction', 'top_left', 'lighting', true);
      if (pref.type !== 'user_preference' || pref.data.preferenceKey !== 'lighting_direction') {
        throw new Error('User Preference Memory failed to record correctly');
      }

      // 4. Visual Decision Memory
      const dec = memory.recordVisualDecision(
        'shadow',
        'Contact ground shadow with blur 14',
        'Grounds floating perfume bottle against studio floor'
      );
      if (dec.type !== 'visual_decision' || dec.data.category !== 'shadow') {
        throw new Error('Visual Decision Memory failed to record correctly');
      }

      // 5. Failure Memory
      const fail = memory.recordFailure({
        failedAction: 'relight without segmentation mask',
        triggerConditions: 'Lighting applied before mask step',
        failureReason: 'Highlights clipped on subject',
        rootCauseCategory: 'missing_mask',
        avoidPattern: 'Never relight unmasked full canvas',
        recommendedWorkaround: 'Extract silhouette mask first',
        occurrences: 2,
      });
      if (fail.type !== 'failure' || fail.data.rootCauseCategory !== 'missing_mask') {
        throw new Error('Failure Memory failed to record correctly');
      }

      // 6. Successful Workflow Memory
      const wf = memory.recordSuccessfulWorkflow({
        workflowName: 'Test Flow',
        intent: 'hero_shot',
        pipelineSequence: ['Product', 'Mask', 'Background', 'Relight', 'Shadow'],
        steps: [],
        finalQualityScore: 0.91,
      });
      if (wf.type !== 'successful_workflow' || wf.data.pipelineSequence.length !== 5) {
        throw new Error('Successful Workflow Memory failed to record correctly');
      }

      const stats = memory.getStats();
      if (stats.totalEntries !== 6) {
        throw new Error(`Expected exactly 6 total entries, got ${stats.totalEntries}`);
      }
      for (const t of ['project', 'operation', 'user_preference', 'visual_decision', 'failure', 'successful_workflow'] as const) {
        if (stats.byType[t] !== 1) {
          throw new Error(`Expected 1 entry for type ${t}, got ${stats.byType[t]}`);
        }
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 2: Workflow Experience Extraction:
   * Product → Mask → Background → Relight → Shadow
   */
  private async testSuccessfulWorkflowExtraction(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'MemoryEngine: Successful Workflow Extraction (Product → Mask → Background → Relight → Shadow)';
    try {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);
      memory.clear();

      const workflowSequence = ['Product', 'Mask', 'Background', 'Relight', 'Shadow'];
      const entry = memory.recordSuccessfulWorkflow({
        workflowName: 'Luxury Perfume Hero Composite',
        intent: 'luxury_product_advertisement',
        pipelineSequence: workflowSequence,
        steps: [
          {
            stepIndex: 1,
            toolId: 'vision.subject_detection',
            displayName: 'Product',
            purpose: 'Detect bounding coordinates of product',
            params: { threshold: 0.8 },
          },
          {
            stepIndex: 2,
            toolId: 'vision.segmentation',
            displayName: 'Mask',
            purpose: 'Generate alpha cutout',
            params: { feather: 1.2 },
          },
          {
            stepIndex: 3,
            toolId: 'primitive.background_replacement',
            displayName: 'Background',
            purpose: 'Apply studio backdrop',
            params: { style: 'luxury_gradient' },
          },
          {
            stepIndex: 4,
            toolId: 'primitive.lighting',
            displayName: 'Relight',
            purpose: 'Add directional keylight',
            params: { direction: 'top_left', intensity: 0.25 },
          },
          {
            stepIndex: 5,
            toolId: 'primitive.shadow',
            displayName: 'Shadow',
            purpose: 'Cast ground contact shadow',
            params: { offsetX: 16, offsetY: 20, blur: 14 },
          },
        ],
        finalQualityScore: 0.892,
        testedPreset: 'luxury_studio',
        inputRequirements: ['raw_product_image'],
      });

      if (!entry.id || entry.type !== 'successful_workflow') {
        throw new Error('Invalid workflow memory entry created');
      }

      // Query workflow by sequence keyword
      const queryResults = memory.query({
        type: 'successful_workflow',
        keyword: 'Relight',
      });

      if (queryResults.length === 0) {
        throw new Error('Failed to retrieve extracted workflow by keyword query');
      }

      const retrieved = queryResults[0].data;
      if (retrieved.pipelineSequence.join(' → ') !== 'Product → Mask → Background → Relight → Shadow') {
        throw new Error(`Unexpected sequence: ${retrieved.pipelineSequence.join(' → ')}`);
      }

      if (retrieved.finalQualityScore !== 0.892) {
        throw new Error(`Score mismatch: expected 0.892, got ${retrieved.finalQualityScore}`);
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 3: Strict Separation: History (what happened) vs Memory (what was learned).
   * Rolling back History must NOT wipe out Memory.
   */
  private async testHistoryVsMemorySeparation(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'MemoryEngine: Strict Separation (History = what happened vs Memory = what was learned)';
    try {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);
      const docEngine = new MaestroDocumentEngine();
      const graphics = new GraphicsEngine(800, 500, docEngine);
      const history = new HistoryEngine(docEngine, graphics);

      // 1. Record an initial lesson in Memory
      memory.recordVisualDecision('lighting', 'top_left keylight', 'initial optimal angle');
      const initialMemoryCount = memory.getTotalMemoryEntries();

      // 2. Perform actions in Document & History
      history.saveSnapshot({
        iteration: 1,
        score: 0.65,
        status: 'executed',
        documentSnapshot: docEngine.getDocument() as any,
        operationsExecuted: [],
        timestamp: Date.now(),
      });

      history.saveSnapshot({
        iteration: 2,
        score: 0.50, // Degraded quality!
        status: 'active',
        documentSnapshot: docEngine.getDocument() as any,
        operationsExecuted: [],
        timestamp: Date.now(),
      });

      // 3. Rollback History to iteration 1 (undoing the bad document state)
      history.rollbackTo(1);

      // Verify history snapshot status
      const currentSnapshots = history.getLegacySnapshots();
      if (currentSnapshots.length === 0) {
        throw new Error('History snapshots were lost');
      }

      // 4. Memory records the failure lesson (learning from the mistake)
      memory.recordFailure({
        failedAction: 'primitive.lighting_excessive',
        triggerConditions: 'Intensity set to 0.95',
        failureReason: 'Blinding glare over-exposed product logo',
        rootCauseCategory: 'contrast_clipping',
        avoidPattern: 'Do not use intensity > 0.4 on glossy products',
        recommendedWorkaround: 'Cap intensity at 0.3 for reflective glassware',
        occurrences: 1,
      });

      // 5. Verify Memory retained previous memories AND added the new failure insight,
      // despite the canvas history state being rolled back!
      if (memory.getTotalMemoryEntries() !== initialMemoryCount + 1) {
        throw new Error(
          `Memory was contaminated or cleared by History rollback: expected ${initialMemoryCount + 1}, got ${memory.getTotalMemoryEntries()}`
        );
      }

      const failures = memory.query({ type: 'failure' });
      if (!failures.some((f) => f.data.failedAction === 'primitive.lighting_excessive')) {
        throw new Error('Failure Memory did not capture lesson learned from rolled-back operation');
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 4: Persistence across Storage Reloads
   */
  private async testPersistenceAcrossReloads(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'MemoryEngine: Persistence across Storage Sessions & Reloads';
    try {
      const sharedAdapter = new InMemoryStorageAdapter();

      // Session 1: Create memories
      const session1 = new MemoryEngine(sharedAdapter);
      session1.clear();

      const item1 = session1.recordProjectMemory('Autumn Campaign', {
        domain: 'social_media',
        targetStyle: 'warm_autumn',
      });
      const item2 = session1.recordUserPreference('canvas_aspect_ratio', '4:5', 'layout', true);

      // Ensure storage has serialized bytes
      const rawStored = sharedAdapter.getItem('maestro_agentic_memory_v2');
      if (!rawStored || rawStored.length === 0) {
        throw new Error('No serialized data found in storage adapter');
      }

      // Session 2: Fresh instance using the same storage adapter
      const session2 = new MemoryEngine(sharedAdapter);

      const reloadedItem1 = session2.get(item1.id);
      const reloadedItem2 = session2.get(item2.id);

      if (!reloadedItem1 || reloadedItem1.data.projectName !== 'Autumn Campaign') {
        throw new Error('Failed to reload Project Memory intact from storage');
      }
      if (!reloadedItem2 || reloadedItem2.data.preferenceKey !== 'canvas_aspect_ratio') {
        throw new Error('Failed to reload User Preference Memory intact from storage');
      }

      if (session2.getTotalMemoryEntries() !== 2) {
        throw new Error(`Expected 2 entries reloaded, got ${session2.getTotalMemoryEntries()}`);
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 5: Retrieval & Compound Querying
   */
  private async testRetrievalAndCompoundQuerying(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'MemoryEngine: Queryable Engine (Filtering by Type, Tags, Keyword, Confidence, Sort)';
    try {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);
      memory.clear();

      // Seed specific test items
      memory.create({
        type: 'visual_decision',
        title: 'Contrast curve adjustment',
        summary: 'Deepened blacks in shadow region',
        tags: ['contrast', 'curves', 'color'],
        confidence: 0.92,
        data: { category: 'contrast' },
      });

      memory.create({
        type: 'visual_decision',
        title: 'Saturation boost on accents',
        summary: 'Gold accents saturation increased by 15%',
        tags: ['color', 'accents'],
        confidence: 0.70,
        data: { category: 'color' },
      });

      memory.create({
        type: 'failure',
        title: 'Color clipping on bright background',
        summary: 'Highlights burned out against white seamless background',
        tags: ['color', 'clipping'],
        confidence: 0.95,
        data: { rootCause: 'overexposure' },
      });

      // Query 1: Filter by type
      const decisions = memory.query({ type: 'visual_decision' });
      if (decisions.length !== 2) {
        throw new Error(`Expected 2 visual decisions, got ${decisions.length}`);
      }

      // Query 2: Filter by tag
      const colorTagged = memory.query({ tags: ['color'] });
      if (colorTagged.length !== 3) {
        throw new Error(`Expected 3 items with tag 'color', got ${colorTagged.length}`);
      }

      // Query 3: Filter by minConfidence
      const highConfidence = memory.query({ minConfidence: 0.9 });
      if (highConfidence.length !== 2) {
        throw new Error(`Expected 2 items with confidence >= 0.9, got ${highConfidence.length}`);
      }

      // Query 4: Keyword search
      const keywordMatches = memory.query({ keyword: 'saturation' });
      if (keywordMatches.length !== 1 || !keywordMatches[0].title.includes('Saturation')) {
        throw new Error('Keyword search failed to locate saturation item');
      }

      // Query 5: Sort by confidence descending
      const sorted = memory.query({ sortBy: 'confidence', sortOrder: 'desc' });
      if (sorted[0].confidence < sorted[1].confidence) {
        throw new Error('Sorting by confidence descending failed');
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 6: Inspectability
   */
  private async testInspectability(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'MemoryEngine: Inspectable (Detailed Payload, Metadata, Timestamps)';
    try {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);

      const created = memory.recordOperationMemory('primitive.lighting', {
        reliabilityScore: 0.93,
        averageDurationMs: 42,
        recommendedParams: { direction: 'top_left', intensity: 0.25 },
      });

      const inspected = memory.get(created.id);
      if (!inspected) {
        throw new Error('Failed to inspect memory by id');
      }

      // Check all required inspectable metadata fields
      const requiredFields: (keyof typeof inspected)[] = [
        'id',
        'type',
        'title',
        'summary',
        'tags',
        'confidence',
        'utilityScore',
        'data',
        'createdAt',
        'updatedAt',
        'source',
      ];

      for (const field of requiredFields) {
        if (inspected[field] === undefined) {
          throw new Error(`Missing metadata field: ${field}`);
        }
      }

      if (inspected.data.toolId !== 'primitive.lighting') {
        throw new Error('Inspected payload does not match stored data');
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 7: Editability
   */
  private async testEditability(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'MemoryEngine: Editable (In-Place Modifications & Storage Sync)';
    try {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);

      const item = memory.recordUserPreference('shadow_blur', 12, 'shadow', true);

      // Edit item
      const updated = memory.update(item.id, {
        title: 'Updated Shadow Blur Preference',
        confidence: 0.99,
        data: {
          ...item.data,
          value: 16, // modified value
        },
      });

      if (!updated || updated.title !== 'Updated Shadow Blur Preference') {
        throw new Error('Failed to update title');
      }
      if (updated.confidence !== 0.99) {
        throw new Error('Failed to update confidence');
      }
      if (updated.data.value !== 16) {
        throw new Error('Failed to update data payload');
      }

      // Verify update persisted in storage
      const reloadedMemory = new MemoryEngine(adapter);
      const persistentItem = reloadedMemory.get(item.id);
      if (!persistentItem || persistentItem.data.value !== 16) {
        throw new Error('Edit was not persisted to storage adapter');
      }

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }

  /**
   * Test 8: Deletability
   */
  private async testDeletability(): Promise<{ name: string; passed: boolean; message?: string }> {
    const name = 'MemoryEngine: Deletable (Single ID Deletion and Typed Clear)';
    try {
      const adapter = new InMemoryStorageAdapter();
      const memory = new MemoryEngine(adapter);
      memory.clear();

      const item1 = memory.recordVisualDecision('lighting', 'decision 1', 'rationale 1');
      const item2 = memory.recordVisualDecision('shadow', 'decision 2', 'rationale 2');
      const item3 = memory.recordProjectMemory('Project X', {});

      if (memory.getTotalMemoryEntries() !== 3) {
        throw new Error(`Expected 3 initial items, got ${memory.getTotalMemoryEntries()}`);
      }

      // 1. Delete single item
      const deleted = memory.delete(item1.id);
      if (!deleted) throw new Error('Failed to delete item1');
      if (memory.get(item1.id) !== undefined) throw new Error('Item1 still exists after deletion');
      if (memory.getTotalMemoryEntries() !== 2) throw new Error('Count mismatch after single delete');

      // 2. Clear only 'visual_decision' type
      memory.clear('visual_decision');
      if (memory.get(item2.id) !== undefined) throw new Error('Item2 should have been cleared');
      if (memory.get(item3.id) === undefined) throw new Error('Item3 (project) should have been preserved');
      if (memory.getTotalMemoryEntries() !== 1) throw new Error('Typed clear removed incorrect items');

      return { name, passed: true };
    } catch (err: any) {
      return { name, passed: false, message: err?.message || String(err) };
    }
  }
}
