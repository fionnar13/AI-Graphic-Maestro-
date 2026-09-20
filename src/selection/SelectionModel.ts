/**
 * @file SelectionModel.ts
 * Canonical Selection Model manager for AI Graphic Maestro.
 * Provides immutable selection state management with event subscription.
 */

import { SelectionState, SelectionMode, SelectionSource } from './types';
import { RectBounds } from '../models/document.types';

export class SelectionModel {
  private state: SelectionState;
  private listeners: Array<(state: SelectionState) => void> = [];

  constructor(initialState?: Partial<SelectionState>) {
    this.state = {
      selectedObjectIds: initialState?.selectedObjectIds || [],
      activeObjectId: initialState?.activeObjectId || null,
      selectionMode: initialState?.selectionMode || 'single',
      selectionBounds: initialState?.selectionBounds || null,
      source: initialState?.source || 'programmatic',
      timestamp: Date.now(),
      metadata: initialState?.metadata || {},
    };
  }

  public getState(): Readonly<SelectionState> {
    return { ...this.state, selectedObjectIds: [...this.state.selectedObjectIds] };
  }

  public setSelection(
    objectIds: string[],
    activeId: string | null = null,
    bounds: RectBounds | null = null,
    mode: SelectionMode = 'single',
    source: SelectionSource = 'user_click'
  ): SelectionState {
    const active = activeId || (objectIds.length > 0 ? objectIds[objectIds.length - 1] : null);
    this.state = {
      selectedObjectIds: [...objectIds],
      activeObjectId: active,
      selectionMode: mode,
      selectionBounds: bounds,
      source,
      timestamp: Date.now(),
    };
    this.notify();
    return this.getState();
  }

  public clearSelection(source: SelectionSource = 'user_click'): void {
    this.setSelection([], null, null, 'single', source);
  }

  public subscribe(listener: (state: SelectionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getState());
      } catch (err) {
        console.error('SelectionModel listener error:', err);
      }
    }
  }
}
