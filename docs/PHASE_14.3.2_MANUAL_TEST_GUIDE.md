# PHASE 14.3.2 — MANUAL BROWSER TEST GUIDE

> This guide verifies the 6 fixes landed in Phase 14.3.2 against a real browser environment. The headless test runner could not verify visual rendering (Fix 5), drag interaction (Fix 2), or undo/redo visual behavior (Fix 3). Manual browser testing is required before merging the branch.
>
> **Branch:** `phase-14.3.2-source-of-truth-reconciliation`
> **Base:** `main` @ `195f5741`
> **Estimated test time:** 30–45 minutes

---

## Section A — Setup

### A.1 Start the dev server

From the repository root:

```bash
bun install
bunx vite --port=3000 --host=0.0.0.0
```

**Expected output:**
```
VITE v6.x.x  ready in XXX ms
➜  Local:   http://localhost:3000/
```

**FAIL indicator:** Vite fails to start, or port 3000 is already in use.

### A.2 Open the app in a browser

Open `http://localhost:3000/` in a modern browser (Chrome, Firefox, Safari, Edge — latest stable).

**Expected:** The AI Graphic Maestro workspace loads. You see:
- Top bar (logo, mode switcher, scenario name)
- Left toolbox (tool icons)
- Center canvas (showing procedural demo: studio backdrop + contact shadow + perfume bottle + headline text)
- Right dock (AI Copilot / Inspector tabs)
- Bottom dock (layers panel, history panel)

**FAIL indicator:** Blank page, console errors (open DevTools → Console), or missing UI elements.

### A.3 Select the starting tab/tool

1. If the workspace shows multiple mode tabs (CREATE / INSPECT / AI STUDIO), click **CREATE** to enter canvas editing mode.
2. In the left toolbox, click the **Select** tool (cursor icon) if not already active.
3. In the bottom dock Layers panel, click the layer named **"Perfume Bottle Hero"** to select it.
4. Verify the Inspector panel (right dock) shows the layer's position, size, rotation, opacity, blend mode.

**FAIL indicator:** Cannot select a layer; Inspector panel shows empty state.

---

## Section B — Fix 2 (Canvas Drag → Command Pipeline)

**Validates:** Fix 2 (T3) — canvas drag routes through `DocumentMutationCommand`; one history entry per drag; Escape cancels without commit.

### B.1 Drag-move a layer

**Preconditions:**
- Layer "Perfume Bottle Hero" is selected (per A.3)
- Note its current position (Inspector panel shows `X` and `Y` values — write them down)
- History panel is empty or note its current entry count

**Steps:**
1. Click-and-hold on the perfume bottle in the canvas.
2. Drag the mouse to a new position (e.g., 50px to the right, 30px down).
3. While dragging, observe the canvas — the bottle should move with the cursor (live preview).
4. Release the mouse button.

**Expected result:**
- The bottle stays at the new position after release.
- Inspector panel `X` and `Y` values update to the new position.
- **History panel shows exactly ONE new entry** (label like "Canvas Drag Move").

**FAIL indicators:**
- Bottle does not move during drag (preview not working).
- Bottle snaps back to original position after release (commit failed).
- History panel shows ZERO entries (commit bypassed — regression to pre-Fix-2 behavior).
- History panel shows MULTIPLE entries (one per mousemove — regression).

### B.2 Undo the drag-move

**Steps:**
1. Click the **Undo** button (top bar or history panel).
2. Observe the canvas.

**Expected result:**
- Bottle returns to the original position (the values you wrote down in B.1 preconditions).
- History panel entry count unchanged (undo doesn't add entries; it moves the pointer).

**FAIL indicators:**
- Bottle stays at the dragged position (undo didn't work).
- Canvas shows the procedural demo (studio background + shadow + bottle re-rendered from scratch) instead of the actual document state — this would indicate Fix 3 regression.
- Console errors in DevTools.

### B.3 Redo the drag-move

**Steps:**
1. Click the **Redo** button.
2. Observe the canvas.

**Expected result:**
- Bottle moves back to the dragged position.

**FAIL indicators:**
- Bottle stays at the original position (redo didn't work).
- Console errors.

### B.4 Drag-scale a layer

**Preconditions:**
- Layer "Perfume Bottle Hero" is selected.
- Note its current size (Inspector panel `Width` and `Height`).

**Steps:**
1. The selected layer shows a bounding box with 8 scale handles (4 corners + 4 edge midpoints) and 1 rotation handle (top center).
2. Click-and-hold the **bottom-right corner handle** (labeled `br`).
3. Drag inward to shrink the layer by ~30%.
4. Release the mouse button.

**Expected result:**
- Layer resizes to the new dimensions.
- Inspector panel `Width` and `Height` update.
- History panel shows exactly ONE new entry (label like "Canvas Drag Scale").

**FAIL indicators:**
- Layer does not resize during drag (preview not working).
- History panel shows ZERO or MULTIPLE entries.

### B.5 Undo the drag-scale

**Steps:** Click Undo.

**Expected:** Layer returns to original size.

### B.6 Drag-rotate a layer

**Preconditions:**
- Layer "Perfume Bottle Hero" is selected.
- Note its current rotation (Inspector panel `Rotation`, likely 0°).

**Steps:**
1. Click-and-hold the **rotation handle** (the small circle above the top-center of the bounding box).
2. Drag in a circular motion to rotate the layer ~45°.
3. Release the mouse button.

**Expected result:**
- Layer rotates to the new angle.
- Inspector panel `Rotation` updates.
- History panel shows exactly ONE new entry (label like "Canvas Drag Rotate").

**FAIL indicators:**
- Layer does not rotate during drag (preview not working).
- Layer rotates but bounding box handles don't follow (gizmo desync).
- History panel shows ZERO or MULTIPLE entries.

### B.7 Undo the drag-rotate

**Steps:** Click Undo.

**Expected:** Layer returns to original rotation (0°).

### B.8 Escape during drag (cancel)

**Preconditions:**
- Layer "Perfume Bottle Hero" is selected at its original position.
- Note the history panel entry count.

**Steps:**
1. Click-and-hold on the bottle to start a move.
2. Drag it to a new position.
3. **While still dragging (mouse button held down), press the `Escape` key.**
4. Release the mouse button (or it may auto-release on Escape — observe behavior).

**Expected result:**
- Bottle returns to its original position (preview discarded).
- **History panel entry count is UNCHANGED** (no commit happened).

**FAIL indicators:**
- Bottle stays at the dragged position (Escape didn't cancel).
- History panel shows a new entry (commit happened despite Escape).
- Console errors.

### B.9 Gizmo handles track the layer during preview

**Preconditions:**
- Layer "Perfume Bottle Hero" is selected.

**Steps:**
1. Click-and-hold on the bottle to start a move.
2. Drag slowly and observe the bounding box handles (8 scale handles + 1 rotation handle).

**Expected result:**
- The bounding box and all 9 handles move WITH the layer during the drag (they track the preview position, not the committed position).

**FAIL indicators:**
- Bounding box stays at the original position while the layer visually moves (gizmo not tracking preview).
- Handles disappear during drag.

---

## Section C — Fix 3 (AppShell Undo/Redo Visual Behavior)

**Validates:** Fix 3 (T4) — `handleUndo`/`handleRedo` call `renderDocument()` instead of `renderCanvasComposition()`. Canvas reflects restored document state, NOT procedural demo.

### C.1 Move via InspectorPanel + Undo

**Preconditions:**
- Layer "Perfume Bottle Hero" is selected.
- Note its current `X` position in the Inspector panel.
- You are in the **AI STUDIO** tab (click the mode switcher to AI STUDIO if not already there).
- The canvas currently shows the procedural demo.

**Steps:**
1. Switch to **CREATE** mode (or stay in a mode where the Inspector panel is interactive).
2. In the Inspector panel, change the `X` value to a new number (e.g., add 50 to the current value).
3. Press Enter or click outside the input to commit.
4. Observe the canvas — the bottle should move to the new X position.
5. Switch back to **AI STUDIO** tab.
6. Click the **Undo** button.
7. Observe the canvas carefully.

**Expected result:**
- After undo, the canvas shows the bottle at its PREVIOUS position (the position before step 2).
- The canvas does NOT briefly flash the procedural demo.
- The canvas reflects the actual document state restored by HistoryEngine.

**FAIL indicators:**
- Canvas shows the procedural demo (bottle at the "default" position 320, 150 — not the position before step 2). This would indicate Fix 3 regression — `renderCanvasComposition()` was called instead of `renderDocument()`.
- Canvas goes blank.
- Console errors.

### C.2 Redo

**Steps:**
1. Click the **Redo** button.
2. Observe the canvas.

**Expected result:**
- Bottle moves back to the position from step 2.
- Canvas does NOT flash the procedural demo.

**FAIL indicators:** Same as C.1.

### C.3 AI Studio initial mount still shows demo (regression check)

**Steps:**
1. Refresh the browser page (`Cmd+R` / `Ctrl+R`).
2. The app reloads. Observe the canvas.

**Expected result:**
- The canvas shows the procedural demo (studio background + contact shadow + perfume bottle + headline text) on initial load.
- This confirms the `renderCanvasComposition()` call at AppShell mount still works — it was NOT removed by Fix 3.

**FAIL indicators:**
- Canvas is blank on mount.
- Canvas shows only the document layers without the procedural demo (would indicate mount useEffect broken).

### C.4 Pipeline execution still shows demo (regression check)

**Steps:**
1. In the AI Studio tab, find the prompt input (likely a text field with a default prompt).
2. Click the **Execute** / **Run Pipeline** button.
3. Observe the canvas during and after pipeline execution.

**Expected result:**
- After pipeline execution, the canvas shows the procedural demo (possibly with updated parameters based on the prompt).
- This confirms the `renderCanvasComposition()` call after pipeline execution still works.

**FAIL indicators:**
- Canvas goes blank after pipeline execution.
- Pipeline execution errors out.

---

## Section D — Fix 5 (Pixel Buffer Rendering)

**Validates:** Fix 5 (T5) — `layerPixelBuffers` is now read by `GraphicsEngine.renderDocument()` and blitted OVER layer content. Pixel-tool modifications are visible on the canvas.

### D.1 Select a layer for pixel-tool testing

**Preconditions:**
- You are in CREATE mode.
- The default document has a layer named "Perfume Bottle Hero" (raster type).

**Steps:**
1. In the Layers panel (bottom dock), select "Perfume Bottle Hero".
2. Verify the Inspector panel shows this layer's properties.

### D.2 Apply BrightnessTool

**Preconditions:**
- Layer "Perfume Bottle Hero" is selected.
- Note the current appearance of the bottle on the canvas (take a screenshot if helpful).

**Steps:**
1. Open the AI Copilot panel (right dock).
2. Type a command like: `increase brightness by 50` (or similar natural language).
   - Alternative: if there's a direct tool UI, find BrightnessTool and apply with brightness=50.
3. Execute the command.
4. Observe the canvas.

**Expected result:**
- The perfume bottle visibly brightens on the canvas.
- The change is IMMEDIATELY visible (no need to refresh or re-render).

**FAIL indicators:**
- Canvas shows NO change (pixel buffer not being rendered — Fix 5 regression).
- Canvas shows the procedural demo re-rendered (would indicate wrong render path).
- Console errors.

### D.3 Undo the BrightnessTool

**Steps:**
1. Click the **Undo** button.
2. Observe the canvas.

**Expected result:**
- The bottle reverts to its pre-brightness appearance.
- The pixel buffer is restored via `tool.rollback`.

**FAIL indicators:**
- Bottle stays bright (undo didn't restore pixel buffer).
- Canvas goes blank.

### D.4 Apply CurvesTool

**Steps:**
1. In the AI Copilot, type a command like: `apply curves adjustment` (or similar).
2. Execute.
3. Observe the canvas.

**Expected result:**
- The bottle's color tones shift visibly (curve adjustment applied).

**FAIL indicators:** Same as D.2.

### D.5 Export PNG and verify pixel changes

**Preconditions:**
- A pixel-tool modification (Brightness or Curves) has been applied and is visible on the canvas.

**Steps:**
1. Find the **Export PNG** button (likely in the top bar or a File menu).
2. Click it. A PNG file downloads.
3. Open the downloaded PNG in an image viewer.
4. Compare the PNG to what you see on the canvas.

**Expected result:**
- The PNG includes the pixel-tool modifications.
- The PNG matches the canvas appearance.

**FAIL indicators:**
- PNG shows the procedural demo WITHOUT pixel modifications (would indicate `ExportEngine.exportRaster` is not using `renderDocument()`).
- PNG is blank or corrupt.

---

## Section E — Regression Checks

**Validates:** That Fix 1, Fix 2, Fix 4, Fix 6 did not break existing functionality.

### E.1 AI/DSL tool.move still works

**Preconditions:**
- You are in CREATE mode.
- Layer "Perfume Bottle Hero" is selected.
- Note its current `X` position.

**Steps:**
1. Open the AI Copilot panel.
2. Type: `move layer 100 pixels right` (or similar natural language).
3. Execute the command.
4. Observe the canvas and Inspector panel.

**Expected result:**
- The bottle moves 100px to the right.
- Inspector panel `X` updates.
- History panel shows ONE new entry (from `tool.move` via `executePrimitiveToolCommand` → `GraphicsToolCommand`).

**FAIL indicators:**
- Bottle does not move (AI command path broken — Fix 1 or Fix 4 regression).
- Bottle moves but no history entry (command didn't register on canonical instance — Fix 1a regression).
- Console errors.

### E.2 AI/DSL undo works

**Steps:**
1. After E.1, click **Undo**.
2. Observe the canvas.

**Expected result:**
- Bottle returns to its pre-E.1 position.
- This confirms `GraphicsToolCommand.doUndo` works correctly (Fix 4 — the `&&`→`||` guard fix).

**FAIL indicators:**
- Undo returns false or throws (Fix 4 regression).
- Bottle stays at moved position.

### E.3 InspectorPanel numeric input still works

**Preconditions:**
- Layer "Perfume Bottle Hero" is selected.

**Steps:**
1. In the Inspector panel, change the `Width` value to a new number (e.g., 200).
2. Press Enter.
3. Observe the canvas.

**Expected result:**
- Layer resizes to the new width.
- History panel shows ONE new entry (from `DocumentMutationCommand`).

**FAIL indicators:**
- Layer does not resize (InspectorPanel path broken).
- No history entry (regression).

### E.4 Pipeline E2E still works

**Steps:**
1. In AI STUDIO tab, click **Execute Pipeline** (or similar).
2. Wait for the 12-stage pipeline to complete.
3. Observe the pipeline stepper UI (12 stages should light up).

**Expected result:**
- Pipeline completes without errors.
- All 12 stages show as done.
- Critic score displays (around 0.85–0.95).
- Snapshots are recorded in the history panel.

**FAIL indicators:**
- Pipeline errors out mid-execution.
- Stages don't progress.
- Critic score is 0 or NaN.

---

## Section F — Reporting Template

For each test, fill in the following:

```markdown
### Test: [Test name, e.g., B.1 Drag-move a layer]

- **Result:** PASS / FAIL
- **Date tested:** YYYY-MM-DD
- **Browser:** [e.g., Chrome 120, Firefox 121]
- **Notes:**
  - [Any observations, deviations from expected, or clarifications]
- **Screenshots:**
  - [Attach screenshots if possible — before/after/during drag, history panel, etc.]
- **Console errors (if any):**
  - [Copy-paste any errors from DevTools Console]
```

### Summary template (fill in after all tests):

```markdown
## Phase 14.3.2 Manual Test Summary

- **Date tested:** YYYY-MM-DD
- **Tester:** [Name]
- **Browser:** [Browser + version]
- **Branch:** phase-14.3.2-source-of-truth-reconciliation
- **HEAD tested:** [commit hash]

### Results by section:

| Section | Tests | PASS | FAIL | Blocked |
|---|---|---|---|---|
| A — Setup | 3 | _ | _ | _ |
| B — Fix 2 (Canvas Drag) | 9 | _ | _ | _ |
| C — Fix 3 (AppShell Undo/Redo) | 4 | _ | _ | _ |
| D — Fix 5 (Pixel Buffer Rendering) | 5 | _ | _ | _ |
| E — Regression Checks | 4 | _ | _ | _ |
| **Total** | **25** | _ | _ | _ |

### Critical issues found:
- [List any FAIL results with severity]

### Recommendation:
- [ ] MERGE — all critical tests pass
- [ ] MERGE WITH FOLLOWUP — minor issues, file as Phase 14.3.3 candidates
- [ ] DO NOT MERGE — critical regressions found

### Notes:
- [Any additional observations]
```

---

## Appendix — Quick Reference

### Default layer names (from `ensureDefaultLayers`)
1. "Studio Backdrop" — raster, full canvas, triggers procedural backdrop render
2. "Contact Shadow" — raster, triggers procedural shadow render
3. "Perfume Bottle Hero" — raster, triggers procedural bottle render
4. "Headline Text" — text, "MAESTRO NOIR"
5. "Subheading Text" — text, "EAU DE PARFUM • PARIS"

### Magic-string dispatch (per Q9 finding)
`GraphicsEngine.renderDocument()` dispatches on layer name:
- `'backdrop'` or `'background'` in name → procedural studio backdrop
- `'shadow'` in name → procedural contact shadow
- `'bottle'` or `'hero'` in name → procedural perfume bottle
- else → generic placeholder box

This is acceptable for Phase 14.3.2 (the demo IS the default document state). Flagged as future cleanup candidate.

### History panel entry labels to expect
- `"Canvas Drag Move"` — from Fix 2 (canvas drag-move commit)
- `"Canvas Drag Scale"` — from Fix 2 (canvas drag-scale commit)
- `"Canvas Drag Rotate"` — from Fix 2 (canvas drag-rotate commit)
- `"Move Position"` / `"Resize Layer"` / etc. — from InspectorPanel (pre-existing)
- Tool names like `"tool.move"` — from AI/DSL (pre-existing)

### Keyboard shortcuts
- `Space` (hold) — Pan mode
- `Escape` (during drag) — Cancel drag (Fix 2)
- `Enter` (in crop mode) — Apply crop
- `Escape` (in crop mode) — Exit crop mode

### DevTools console
Open DevTools (`F12` or `Cmd+Option+I`) → Console tab. Watch for:
- `HistoryEngine listener error:` — listener threw
- `Failed to import document JSON:` — serialization issue
- Any `TypeError` or `ReferenceError` — critical

If you see `Cannot read properties of null (reading '...')` during undo/redo, this may indicate the GraphicsToolCommand guard (Fix 4) is not catching a null rollbackData case — report immediately.
