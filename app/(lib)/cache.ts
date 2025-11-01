type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CacheStore = Map<string, CacheEntry<unknown>>;

declare global {
   
  var __sqCache: CacheStore | undefined;
}

function getStore(): CacheStore {
  if (!globalThis.__sqCache) {
    globalThis.__sqCache = new Map();
  }
  return globalThis.__sqCache;
}

export function getCached<T>(key: string): T | null {
  const store = getStore();
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number) {
  const store = getStore();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
