# PHASE 14 — ARCHITECTURE CONTRACT

**Project:** AI Graphic Maestro  
**Phase:** 14.1 Reality Fix & Architecture Lock  
**Status:** LOCKED & VERIFIED  

---

## 1. Document Model Boundaries
- **Source of Truth:** The `DocumentModel` (`MaestroDocumentEngine`) is the sole authoritative source of truth for canvas dimensions, layers, blend modes, masks, and content tree.
- **Immutability & Clones:** Any mutation to document state produces deterministic, trackable changes. Direct mutations by UI or AI outside of the Command pattern are strictly forbidden.
- **Persistence & Hydration:** Document state can be fully serialized to standard JSON and restored without loss of layer structure or content.

---

## 2. Renderer Boundaries
- **Read-Only Operations:** The `GraphicsEngine` renderer is strictly a read-only projection of the `DocumentEngine`.
- **Zero Business Logic:** The renderer contains zero document business logic, state decisions, or command dispatching.
- **Canvas Rendering:** `GraphicsEngine.renderDocument()` draws layers according to stacking order, visibility, opacity, blend modes, and clipping masks onto the display canvas.

---

## 3. Command & History Boundaries
- **Command Gate:** All document mutations must be encapsulated as an `ICommand` (e.g., `GraphicsToolCommand`, `CreateLayerCommand`, `DocumentMutationCommand`).
- **Deterministic Rollback:** Every command implements `doExecute()` and `doUndo()`. Rollback to any past state or checkpoint snapshot is 100% deterministic.
- **No Direct Bypass:** Neither UI event handlers nor AI execution steps may modify document layers without pushing or executing a command through `HistoryEngine`.

---

## 4. Tool Registry & Tool Call Boundaries
- **Authoritative Gateway:** `ToolRegistry` is the sole capability boundary for all graphic operations.
- **Schema Validation:** Every tool call is validated against parameter schemas before execution. Invalid parameter calls are rejected.
- **Honest Execution:** Tools declare `isImplemented: true` only when backed by genuine pixel algorithms. Unimplemented stubs return clear fallback metadata.

---

## 5. AI Copilot & Planner Boundaries
- **Context Isolation:** `AICopilotEngine` accesses document and application state exclusively via a read-only `CopilotContextSnapshot`.
- **No Direct Engine Access:** AI agents cannot directly manipulate `DocumentEngine` methods or private canvas buffers.
- **Plan Authorization:** AI generates structured plans (`CopilotPlan`) containing explicit tool calls. Risky tools require human approval before execution.

---

## 6. Vision Engine Boundaries
- **Visual Analysis Only:** The Vision Engine performs visual scene analysis, object detection, palette extraction, and spatial understanding.
- **Read-Only Input:** Operates purely on rendered canvas pixel buffers or layer snapshots. It cannot directly mutate the document.

---

## 7. Critic Engine Boundaries
- **Independent Quality Auditor:** `CriticEngine` evaluates composition, lighting, contrast, and alignment across 10 dimensions.
- **Output:** Produces structured evaluation reports (`CriticEvaluationResult`, `StructuredCriticReport`).
- **Separation:** Contains no rendering or document mutation code; feeds recommendations back into the Orchestrator/Planner loop.

---

## 8. Memory Engine Boundaries
- **Contextual Intelligence:** `MemoryEngine` manages project experience, user preferences, visual decisions, and failure patterns.
- **No Document State:** Memory entries represent learned experience, NOT document state or layer trees.
- **Isolation:** Memory persists to storage adapters independently and never directly modifies the active document.

---

## 9. Model Adapter Boundaries
- **Provider Independence:** `ModelAdapterRegistry` decouples AI model vendors from graphic logic.
- **Role Separation:** Models are categorized into Reasoning, Vision, and Image models.
- **Local Fallback:** Local deterministic processing requires no external cloud API key.

---

## 10. Selection Architecture Extension Contract
- **Centralized Model:** Selection state is managed by `SelectionModel` (`src/selection/SelectionModel.ts`).
- **State Schema:** Tracks `selectedObjectIds`, `activeObjectId`, `selectionMode`, `selectionBounds`, and `source`.
- **Modes:** Supports `single`, `multi`, `group`, `semantic`, `geometric`, and `area` modes.

---

## 11. Vector Intelligence Extension Contract
- **Hierarchical Path Model:** `VectorObject` -> `Path` -> `SubPath` -> `Segment` -> `Anchor` -> Bezier Handles (`src/vector/types.ts`).
- **Backward Compatibility:** `VectorModel.fromVectorContent()` and `toVectorContent()` maintain 100% compatibility with standard SVG path strings.

---

## 12. Data Flow & Error Protocol
- **Unidirectional Flow:** User / AI Prompt -> AI Copilot -> Graphic DSL -> ToolRegistry Validation -> Command Execution -> History Engine -> Document Engine -> Graphics Engine Render.
- **Error Recovery:** Parameter validation failures attempt tool alternatives. Unrecoverable failures trigger automated rollback.

---

## 13. Security & Trace Privacy Contract
- **Sanitized Execution Trace:** Public activity logs contain ONLY sanitized action titles, summaries, status, and duration.
- **Privacy Guard:** Private internal thought chains or raw model prompts are never exposed in user-facing activity logs.

---

## 14. Deterministic Undo/Redo & Rollback Contract
- **Snapshot Preserving:** Every state mutation supports instant checkpoint snapshots and rollback.
- **Branching History:** `HistoryEngine` supports tree/branch history traversal, allowing non-destructive state experimentation.
