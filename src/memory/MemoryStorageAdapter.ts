/**
 * @file MemoryStorageAdapter.ts
 * Persistence storage adapters for the Memory Engine.
 * Supports LocalStorage in browser environments and InMemoryStorage in test/server environments.
 */

export interface IMemoryStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  getStorageName(): string;
}

export class InMemoryStorageAdapter implements IMemoryStorageAdapter {
  private store = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public getStorageName(): string {
    return 'in_memory';
  }
}

export class LocalStorageMemoryAdapter implements IMemoryStorageAdapter {
  private fallbackStore = new InMemoryStorageAdapter();

  private isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public getItem(key: string): string | null {
    if (this.isAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return this.fallbackStore.getItem(key);
      }
    }
    return this.fallbackStore.getItem(key);
  }

  public setItem(key: string, value: string): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // In case of quota exceeded or disabled, use fallback
        this.fallbackStore.setItem(key, value);
      }
    } else {
      this.fallbackStore.setItem(key, value);
    }
  }

  public removeItem(key: string): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        this.fallbackStore.removeItem(key);
      }
    } else {
      this.fallbackStore.removeItem(key);
    }
  }

  public clear(): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.clear();
      } catch {
        this.fallbackStore.clear();
      }
    } else {
      this.fallbackStore.clear();
    }
  }

  public getStorageName(): string {
    return this.isAvailable() ? 'local_storage' : 'in_memory_fallback';
  }
}
