# PHASE 14.3.2 — IMPLEMENTATION PLAN

> Source-of-Truth Reconciliation & Command Pipeline Hardening
> Branch: `phase-14.3.2-source-of-truth-reconciliation`
> Base: `main` @ `195f5741ecd031a78e7d7be96447f8cc82a7e6a2`
> Agent: GLM 5.3
> Status: APPROVED (Draft 2 + human directives)

This document is the recovered Phase 14.3.2 implementation plan. It was
originally authored as commit 0 of the phase and lost when the agent
environment was reset. The 6 fix commits in the branch were preserved via
git bundle and are the source of truth for what was actually implemented;
this document is the faithful written record of the plan that produced
those commits.

---

## 0. Repo State Confirmation

| Field | Value |
|---|---|
| Repository | `fionnar13/AI-Graphic-Maestro-` |
| Branch (start) | `main` |
| HEAD commit (start) | `195f5741ecd031a78e7d7be96447f8cc82a7e6a2` |
| Working tree (start) | CLEAN |
| Implementation branch | `phase-14.3.2-source-of-truth-reconciliation` |
| Commits landed | 6 (one per fix) |

---

## 1. Investigation Findings (Q0, Q9, Q11)

### Q0 — HistoryEngine default-constructs a 4th MaestroDocumentEngine

- **Source:** `src/history/HistoryEngine.ts:60-78`
- **Caller:** `src/orchestrator/Orchestrator.ts:88` (original line) — `new HistoryEngine()` (no args)
- **Finding:** YES. A 4th `MaestroDocumentEngine` instance is constructed when `HistoryEngine` is instantiated without args. `captureInternalSnapshot` (line 223), `createSnapshot` (line 265), and `restoreSnapshot` (line 280) all operate on this 4th instance.
- **Sub-fix 1a:** `Orchestrator.ts:88` (new line) changed to `new HistoryEngine(this.documentEngine.realEngine, this.graphicsEngine)` (two-phase wiring per Approach 2.1).
- This finding EXTENDS (does not contradict) the audit report. The audit said "two instances"; the actual count is four.

### Q9 — Magic-string dispatch fires for default layers; acceptable

- **Source:** `src/graphics/GraphicsEngine.ts:742-829` (raster content branch of `renderDocument`)
- **Default layers:** `src/graphics/GraphicsEngine.ts:137-210` (`ensureDefaultLayers`)
- **Finding:** YES. All 3 default raster layers trigger the dispatch:
  - `'Studio Backdrop'` → contains `'backdrop'` → matches procedural backdrop
  - `'Contact Shadow'` → contains `'shadow'` → matches procedural shadow
  - `'Perfume Bottle Hero'` → contains `'bottle'` and `'hero'` → matches procedural bottle
- **Conclusion:** Acceptable for Fix 3. The procedural demo renders through the document model — undo/redo that restores document state properly changes the rendered output. No sub-fix needed; flagged as a future cleanup candidate.

### Q11 — getDocument() returns a REFERENCE; Fix 6 must wrap in cloneDocument()

- **Source:** `src/document/MaestroDocumentEngine.ts:86-88` — `return this.document;` (direct reference)
- **Source:** `src/document/DocumentEngine.ts:55-57` — `return this.realEngine.getDocument();` (delegates, also reference)
- **Finding:** REFERENCE, not clone.
- **Sub-fix 6a:** Fix 6's 3 Orchestrator call sites use `this.documentEngine.realEngine.cloneDocument()` (deep clone), NOT `this.documentEngine.getRealDocument()` (reference).

### Additional finding — SelfRevisionEngine.ts 8 uncloned snapshot captures

- **Source:** `src/critic/SelfRevisionEngine.ts` lines 92, 145, 180, 223, 287, 349, 402, 452
- All 8 sites do `documentSnapshot: graphicsEngine.getDocumentEngine().getDocument() as any`
- These capture a REFERENCE to the canonical model.
- **Status:** OUT OF SCOPE for Phase 14.3.2 (audit T2 named only `Orchestrator.ts:287, 500, 536`). Future phase should apply the same `cloneDocument()` pattern.

---

## 2. Final Landing Order

| Order | Fix | T-ID | Sub-fixes | Complexity |
|---|---|---|---|---|
| 1 | Fix 6 | T2 | + Fix 6a | S |
| 2 | Fix 1 | T1 | + Fix 1a | M |
| 3 | Fix 4 | T6 | — | S |
| 4 | Fix 3 | T4 | — | S |
| 5 | Fix 2 | T3 | — | M |
| 6 | Fix 5 | T5 | — | M |

**Commit sequence (6 commits):**
- `fix(14.3.2-1): snapshot captures canonical model via cloneDocument` (Fix 6 + 6a)
- `fix(14.3.2-2): single MaestroDocumentEngine + HistoryEngine` (Fix 1 + 1a)
- `fix(14.3.2-3): GraphicsToolCommand rollback guard && -> ||` (Fix 4)
- `fix(14.3.2-4): AppShell undo/redo renders document not demo` (Fix 3)
- `fix(14.3.2-5): canvas drag routes through DocumentMutationCommand` (Fix 2)
- `fix(14.3.2-6): renderer composites layerPixelBuffers` (Fix 5)

---

## 3. Branch Strategy

- Branch name: `phase-14.3.2-source-of-truth-reconciliation`
- Base: `main` @ `195f5741ecd031a78e7d7be96447f8cc82a7e6a2`
- 6 fix commits + this doc commit
- Commit message format: `fix(14.3.2-N): <short description>` + body with Files/Tests/Acceptance

---

## 4. Fix-by-Fix Plan

### Fix 6 — T2: History snapshots capture the canonical model

**Files touched:**
- `src/document/DocumentEngine.ts` — `@deprecated` JSDoc on `getDocument()` and `getRealDocument()`
- `src/models/types.ts` — widen `HistorySnapshot.documentSnapshot` from `MaestroDocument` to `MaestroDocument | MaestroDocumentModel` (union); add `import type { MaestroDocumentModel } from './document.types'`
- `src/orchestrator/Orchestrator.ts` — 3 call sites (`~287`, `~500`, `~536`) changed from `this.documentEngine.getDocument()` to `this.documentEngine.realEngine.cloneDocument()` (sub-fix 6a)

**Acceptance criteria:**
1. After `Orchestrator.runAutonomousPipeline(...)`, `getLegacySnapshots()[0].documentSnapshot` has `.layers` array.
2. Create 3-layer doc → run pipeline → snapshot has 3 layers.
3. Mutate document after snapshot → snapshot unchanged (deep clone).
4. `DocumentEngine.getDocument()` still works (deprecated but functional).
5. `npm test` passes (62 tests).
6. `ComprehensiveTestSuite` passes (34 tests).
7. `tsc --noEmit` no NEW errors beyond pre-existing 2 in `ToolRegistry.ts:7`.

---

### Fix 1 + 1a — T1: Single MaestroDocumentEngine instance + HistoryEngine wiring

**Files touched:**
- `src/graphics/GraphicsEngine.ts:95-132` — constructor signature: `documentEngine` and `historyEngine` both REQUIRED (no defaults, no internal construction). Removed internal `new HistoryEngine(...)` line.
- `src/orchestrator/Orchestrator.ts:76-104` — two-phase construction (Approach 2.1):
  1. `this.history = new HistoryEngine(this.documentEngine.realEngine);`
  2. `this.graphicsEngine = new GraphicsEngine(800, 500, this.documentEngine.realEngine, this.history);`
  3. `this.history.setGraphicsEngine(this.graphicsEngine);`
- 6 test files updated to two-phase construction pattern:
  - `src/tests/comprehensive.test.ts` (6 sites)
  - `src/tests/critic_revision.test.ts` (5 sites)
  - `src/tests/copilot.test.ts` (1 site)
  - `src/tests/graphics.test.ts` (1 site + import)
  - `src/tests/memory.test.ts` (1 site)
  - `src/tests/pipeline.test.ts` (3 sites)

**Acceptance criteria:**
1. `graphicsEngine.documentEngine === orchestrator.documentEngine.realEngine` evaluates to `true`.
2. `graphicsEngine.historyEngine === orchestrator.history` evaluates to `true` (single HistoryEngine instance).
3. After `tool.move` via AI Copilot, the layer position change is visible in the rendered canvas (was previously broken).
4. `npm test` passes after mechanical updates.
5. `ComprehensiveTestSuite` passes.
6. `tsc --noEmit` no NEW errors beyond pre-existing 2.
7. IQ1 grep confirms no production code constructs `GraphicsEngine` or `HistoryEngine` without injection (only Orchestrator constructs, both with injection).

---

### Fix 4 — T6: Fix GraphicsToolCommand.ts:61 boolean guard

**Files touched:**
- `src/history/commands/GraphicsToolCommand.ts:60-70` — `&&` → `||` (one-char fix + explanatory comment block). Per Q10-i, `doUndo` returns `false` when `rollbackData` is null/undefined (HistoryEngine.undo handles failure by pushing command back onto the undo stack).
- `src/tests/comprehensive.test.ts` — added regression test in `'regression'` category asserting `doUndo` returns `false` for null and undefined `rollbackData`, and returns boolean for valid `rollbackData`.

**Acceptance criteria:**
1. `doUndo` with `rollbackData === null` returns `false`.
2. `doUndo` with `rollbackData === undefined` returns `false`.
3. `doUndo` with valid `rollbackData` calls `tool.rollback` and returns boolean.
4. `npm test` passes (62 tests).
5. `ComprehensiveTestSuite` passes (35 tests — was 34, +1 new regression).

---

### Fix 3 — T4: AppShell.handleUndo / handleRedo must NOT overwrite canvas

**Files touched:**
- `src/workspace/AppShell.tsx` — `handleUndo` (~line 238) and `handleRedo` (~line 243): replaced `renderCanvasComposition()` with `orchestrator.graphicsEngine.renderDocument()`. Added explanatory comment block.
- `renderCanvasComposition()` function itself NOT removed — still used at 4 legitimate sites (mount useEffect line ~138, after pipeline execution line ~189, rollback-to-snapshot line ~225, and the function definition line ~99).

**Per Q9 finding:** `renderDocument()` will still render the procedural demo for default layers (acceptable — the demo IS the default document state). After undo restores a different state, the rendered output changes accordingly.

**Acceptance criteria:**
1. After `DocumentMutationCommand` + undo, canvas shows pre-mutation state; `renderCanvasComposition()` not triggered.
2. Redo → canvas shows post-mutation state.
3. AI Studio mount still shows demo (line ~138 unaffected).
4. Pipeline execution still shows demo (line ~189 unaffected).
5. Rollback-to-snapshot still shows demo (line ~225 unaffected).
6. `npm test` passes (62 tests).
7. `ComprehensiveTestSuite` passes (35 tests).

---

### Fix 2 — T3: Route canvas drag through the command pipeline

**Design decisions (per human directives):**
- Q1-i: Preview state in React `useState` (CanvasWorkspace)
- Q2-iii: Commit using existing `DocumentMutationCommand`
- Q3-i: Escape discards preview, no commit

**Files touched:**
- `src/workspace/CanvasWorkspace.tsx`:
  - Added imports: `HistoryEngine`, `DocumentMutationCommand`
  - Added `historyEngine: HistoryEngine` to props interface + destructured
  - Added state: `previewBounds`, `previewRotation`, `dragCancelled` ref
  - `handleMouseDown` + `handleHandleMouseDown`: reset `dragCancelled.current = false` and clear preview state at gesture start
  - `handleMouseMove` (move/scale/rotate branches): removed direct `setBounds`/`setTransform` calls; instead update preview state and call `graphicsEngine.renderDocument({ previewOverrides })`
  - `handleMouseUp`: construct `DocumentMutationCommand` with mutator that sets bounds + transform.rotation; call `historyEngine.executeCommand(cmd)` if not cancelled; otherwise re-render to discard preview
  - Added `useEffect` for Escape key during drag (sets `dragCancelled.current = true`, clears preview, re-renders)
- `src/graphics/GraphicsEngine.ts:648-710` — `renderDocument` signature changed: accepts optional `previewOverrides?: { layerId: string; bounds?: RectBounds; transform?: { rotation?: number } }`. When rendering matching layer, uses preview values instead of committed values.
- `src/workspace/AppShell.tsx` — pass `historyEngine={orchestrator.history}` prop to `<CanvasWorkspace>`.

**Acceptance criteria:**
1. Drag-move → release → ONE history entry; undo restores; redo restores.
2. Drag-scale → release → ONE history entry (same path).
3. Drag-rotate → release → ONE history entry (mutator sets `transform.rotation`).
4. Escape during drag → no history entry, layer unchanged.
5. AI/DSL `tool.move` still works (regression).
6. InspectorPanel numeric input still works (regression).
7. Gizmo handles track the layer during preview.
8. `npm test` passes (62 tests).
9. `ComprehensiveTestSuite` passes (35 tests).
10. `tsc --noEmit` no NEW errors beyond pre-existing 2.

---

### Fix 5 — T5: Wire layerPixelBuffers into the renderer

**Design decisions (per human directives):**
- Q4-A: Wire pixel buffers into renderer (keep 11 pixel tools)
- Q4-sub: Pixel buffer renders OVER vector/text content
- §3.1: TODO comment added to `DocumentRenderer.ts` (production renderer is `GraphicsEngine.renderDocument`; `DocumentRenderer` is not called)
- §3.2 alpha handling: `ctx.globalCompositeOperation` is `'source-over'` (default for layer rendering); transparent pixels in buffer do NOT erase content; opaque pixels replace it
- §3.3: `setLayerPixelBuffer` already calls `notifySubscribers()` AFTER buffer is stored (verified at original line 308 — no change needed)
- Option 5-ii: Integrate ONLY into `GraphicsEngine.renderDocument`; skip `DocumentRenderer`

**Files touched:**
- `src/graphics/GraphicsEngine.ts` — in `renderDocument` layer loop, AFTER drawing layer's content and BEFORE `ctx.restore()`, check `this.getLayerPixelBuffer(layer.id)`. If present and DOM available, create offscreen canvas, `putImageData` the buffer onto it, then `drawImage(offscreen, 0, 0, b.width, b.height)`. The layer transform is already applied to `ctx` from the content rendering — `drawImage` honors it (unlike `putImageData` directly, which ignores transforms).
- `src/graphics/DocumentRenderer.ts` — added `TODO(phase-14.3.2)` comment block per §3.1 directive.
- `src/export/ExportEngine.ts` — verified `exportRaster` uses `graphicsEngine.getCanvas().toDataURL()` which includes the blit automatically. No change needed.
- `src/graphics/GraphicsEngine.ts:308` — `setLayerPixelBuffer` already calls `notifySubscribers()` AFTER store (per §3.3). No change needed.

**Acceptance criteria:**
1. `BrightnessTool` modification appears in rendered canvas (visually brighter).
2. `CurvesTool` modification appears.
3. `InpaintTool` modification appears.
4. `RecolorTool` modification appears.
5. Undo pixel-tool op → canvas reverts (pixel buffer restored via `tool.rollback`).
6. Export PNG includes pixel modifications.
7. `setLayerPixelBuffer` triggers re-render via `notifySubscribers`.
8. `npm test` passes (62 tests).
9. `ComprehensiveTestSuite` passes (35 tests).
10. `tsc --noEmit` no NEW errors beyond pre-existing 2.
- **NOTE:** Full visual verification requires a browser DOM environment (out of scope for headless test runner). Deferred to manual browser testing per `docs/PHASE_14.3.2_MANUAL_TEST_GUIDE.md`.

---

## 5. Cross-Fix Interactions

| Fix pair | Interaction | Land together? | Rollback independently? |
|---|---|---|---|
| Fix 6 → Fix 1 | Fix 6 fixes `legacySnapshots`. Fix 1+1a fixes `snapshots` Map. Together fix both. | Independent (sequential) | Both |
| Fix 1 → Fix 4 | Fix 1 corrects instance. Fix 4 corrects guard. Together AI undo works. | Independent | Both |
| Fix 1 → Fix 3 | Fix 1 corrects instance. Fix 3 makes undo visible. | Independent | Both |
| Fix 1 → Fix 2 | Fix 2 uses `DocumentMutationCommand` which needs correct instance. | Independent | Both |
| Fix 1 → Fix 5 | Pixel buffers live on `graphicsEngine` not document. No direct effect. | Independent | Both |
| Fix 4 → Fix 3 | Fix 4 corrects `GraphicsToolCommand.doUndo`. Fix 3 makes undo visible. | Independent | Both |
| Fix 3 → Fix 2 | Fix 3 makes undo visible. Fix 2 makes drag undoable. **Fix 3 MUST land before Fix 2.** | Sequential | Both |
| Fix 2 → Fix 5 | No direct interaction. | Independent | Both |
| Fix 5 → all | Largest, most isolated. Lands last. | Independent | Both |

---

## 6. Regression Test Plan

### Tests added:

| Test name | File | Fix |
|---|---|---|
| `single MaestroDocumentEngine instance` (verification script) | external `verify_fix1.ts` | Fix 1 |
| `GraphicsToolCommand doUndo with null rollbackData returns false` | `comprehensive.test.ts` ('regression' category) | Fix 4 |
| `GraphicsToolCommand doUndo with valid rollbackData calls tool.rollback` | `comprehensive.test.ts` | Fix 4 |
| `canvas drag move produces one history entry` (verification script) | external `verify_fix2.ts` | Fix 2 |
| `BrightnessTool modification appears in rendered canvas` (verification script) | external `verify_fix5.ts` | Fix 5 |

### Tests modified:

| Test | File | Change | Reason |
|---|---|---|---|
| All `new GraphicsEngine(W, H)` sites | 6 test files | Add 3rd/4th args (two-phase construction) | Fix 1 |
| All `new HistoryEngine()` no-args sites | test files | Pass explicit instance | Fix 1a |

### Existing tests that may break:

| Test | Risk | Mitigation |
|---|---|---|
| Tests asserting `renderDocument()` output | Fix 5 adds pixel-buffer blit | Audit test expectations; no test has pixel buffer set during render assertions. |
| Tests asserting `getLegacySnapshots()` shape | Fix 6 widens type | Tests using `as any` casts continue to compile. |
| `comprehensive.test.ts` Security test | Tests `tools.validate('system.eval_arbitrary_code', ...)` | Fix 4 doesn't touch validation. No breakage. |

---

## 7. Out of Scope (Explicit)

1. Multi-selection (`SelectionModel` orphaned)
2. Semantic Role System
3. Constraint Engine
4. Transaction Model
5. Command Serialization
6. Command Registry
7. Spatial Index (R-tree/BVH)
8. Scene Graph
9. Vector Model
10. 35 missing conceptual tools
11. `GraphicsEngine.historyStack`/`redoStack` parallel undo system (T7)
12. `recordOperationDirectly` telemetry backdoor (T9)
13. `executeTool` switch dead code (T10)
14. `tool.remove_object` without bbox bypass (T8)
15. `MoveTool` double-apply bug (T22)
16. `RotateTool` doesn't update bounds (T23)
17. `ScaleTool` canvas drag leaves `transform.scale` stale (T24) — fixed INDIRECTLY for canvas drag path only
18. `tsc --noEmit` pre-existing 2 errors in `ToolRegistry.ts:7`
19. 5 test files excluded from `npm test`
20. Pixel buffer serialization in document JSON
21. `AppShell.handleRollback` (line 225) calling `renderCanvasComposition()`
22. `renderCanvasComposition()` function itself
23. `DocumentEngine` (legacy class)
24. `LayerEngine` (legacy parallel layer tree)
25. `SelfRevisionEngine.ts` 8 uncloned snapshot captures — DEFERRED to future phase
26. `GraphicsEngine.renderDocument` magic-string layer-name dispatch — future cleanup
27. `DocumentRenderer` standalone class — NOT updated with pixel buffer integration (TODO comment added per §3.1)
28. `HistoryEngine.rollbackTo(iteration)` does not restore document — pre-existing issue

---

## 8. Rollback Plan

**Option A — Revert all fixes (return to audit-end state):**
```bash
git checkout main
git branch -D phase-14.3.2-source-of-truth-reconciliation
```

**Option B — Revert specific fix:**
```bash
git revert <commit-hash-of-fix-N>
```

**Revert safety:**
- All 6 fix commits are independently revertible.
- Recommended revert order (if partial): reverse order (6 → 5 → 4 → 3 → 2 → 1).

**Option C — Branch-based (recommended):** Implementation on branch; `main` untouched.

---

## 9. Acceptance Criteria for the ENTIRE Phase 14.3.2

1. `graphicsEngine.getDocumentEngine() === orchestrator.documentEngine.realEngine` AND `history['documentEngine'] === orchestrator.documentEngine.realEngine`
2. `getLegacySnapshots()[0].documentSnapshot.layers` is array; `createSnapshot('test').document.layers` is array
3. Snapshots are deep clones (mutating doc after snapshot doesn't mutate snapshot)
4. Canvas drag move undoable (ONE history entry, undo restores)
5. Canvas drag scale undoable
6. Canvas drag rotate undoable
7. Escape during drag cancels without history entry
8. AI/DSL `tool.move` still works
9. AI/DSL `tool.move` undo is correct (Fix 4)
10. InspectorPanel numeric input still works
11. Undo does not call `renderCanvasComposition` (calls `renderDocument` instead)
12. Pixel tool modifications visible (data-level; visual deferred to browser)
13. Snapshot restore preserves layers
14. `tsc --noEmit` no NEW errors beyond pre-existing 2
15. `vite build` succeeds
16. `npm test` (62 tests) + `ComprehensiveTestSuite` (35 tests) pass
17. Working tree clean at phase end

---

## 10. Investigation Findings Summary

### Q0 — HistoryEngine default-constructs a 4th MaestroDocumentEngine

- **Source:** `src/history/HistoryEngine.ts:60-78`
- **Caller:** `src/orchestrator/Orchestrator.ts` (original line 88) — `new HistoryEngine()` (no args)
- **Finding:** YES, a 4th instance is constructed.
- **Sub-fix:** Fix 1a — pass canonical instance via two-phase construction.

### Q9 — Magic-string dispatch fires for default layers; acceptable

- **Source:** `src/graphics/GraphicsEngine.ts:742-829`
- **Default layers:** `src/graphics/GraphicsEngine.ts:137-210` (`ensureDefaultLayers`)
- **Finding:** YES, all 3 default raster layers trigger the dispatch.
- **Conclusion:** Acceptable for Fix 3. No sub-fix needed. Flagged as future cleanup candidate.

### Q11 — getDocument() returns a REFERENCE; Fix 6 must wrap in cloneDocument()

- **Source:** `src/document/MaestroDocumentEngine.ts:86-88` — `return this.document;`
- **Source:** `src/document/DocumentEngine.ts:55-57` — `return this.realEngine.getDocument();`
- **Finding:** REFERENCE, not clone.
- **Sub-fix:** Fix 6a — use `cloneDocument()` (deep clone), NOT `getRealDocument()` (reference).

---

## 11. Open Questions

All design questions from Draft 1 were answered by the human (Q1–Q10) or by investigation (Q0, Q9, Q11). No new design questions arose during implementation. The implementation-time question IQ1 (grep for production call sites outside Orchestrator/tests) was resolved by the human directive: production call sites outside Orchestrator/tests trigger a stop; test files only proceed mechanically. No production call sites outside Orchestrator/tests were found.
