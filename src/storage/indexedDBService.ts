/**
 * Planalto Plus - IndexedDB Local High-Capacity Cache Service
 * Provides fast, zero-token, zero-latency local caching for AI explanations,
 * jurisprudence panoramas, and legal analysis.
 */

export interface AICacheEntry {
  key: string;
  lawId: string;
  articleId: string;
  actionType: string;
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

const DB_NAME = 'PlanaltoPlusDB';
const DB_VERSION = 1;
const AI_STORE = 'ai_cache';

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Initializes and returns the IndexedDB instance
 */
export function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbOpenPromise) {
    return dbOpenPromise;
  }

  dbOpenPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(AI_STORE)) {
          const store = db.createObjectStore(AI_STORE, { keyPath: 'key' });
          store.createIndex('by_lawId', 'lawId', { unique: false });
          store.createIndex('by_articleId', 'articleId', { unique: false });
          store.createIndex('by_timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        dbInstance.onclose = () => {
          dbInstance = null;
          dbOpenPromise = null;
        };
        resolve(dbInstance);
      };

      request.onerror = (err) => {
        console.warn('Erro ao abrir IndexedDB (Planalto Plus):', err);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('IndexedDB bloqueado para atualização de versão');
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB indisponível no ambiente atual:', e);
      resolve(null);
    }
  });

  return dbOpenPromise;
}

function buildCacheKey(lawId: string, articleId: string, actionType: string): string {
  const cleanLaw = (lawId || 'default').toLowerCase().trim();
  const cleanArt = (articleId || 'general').toLowerCase().trim();
  const cleanAction = (actionType || 'explain').toLowerCase().trim();
  return `${cleanLaw}:${cleanArt}:${cleanAction}`;
}

/**
 * Retrieves cached AI response from IndexedDB
 */
export async function getAICache(
  lawId: string,
  articleId: string,
  actionType: string
): Promise<AICacheEntry | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    const key = buildCacheKey(lawId, articleId, actionType);

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(AI_STORE, 'readonly');
        const store = tx.objectStore(AI_STORE);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result ? (req.result as AICacheEntry) : null);
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Saves AI response to IndexedDB cache
 */
export async function setAICache(
  lawId: string,
  articleId: string,
  actionType: string,
  content: string,
  provider?: string,
  model?: string
): Promise<void> {
  try {
    const db = await getDB();
    if (!db || !content || content.length < 5) return;

    const key = buildCacheKey(lawId, articleId, actionType);
    const entry: AICacheEntry = {
      key,
      lawId: (lawId || 'default').toLowerCase().trim(),
      articleId: (articleId || 'general').toLowerCase().trim(),
      actionType: (actionType || 'explain').toLowerCase().trim(),
      content,
      timestamp: new Date().toISOString(),
      provider,
      model,
    };

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(AI_STORE, 'readwrite');
        const store = tx.objectStore(AI_STORE);
        const req = store.put(entry);

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore silently
  }
}

/**
 * Deletes cached responses for a specific article or action
 */
export async function deleteAICache(
  lawId: string,
  articleId: string,
  actionType?: string
): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;

    if (actionType) {
      const key = buildCacheKey(lawId, articleId, actionType);
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(AI_STORE, 'readwrite');
          const store = tx.objectStore(AI_STORE);
          const req = store.delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    // Delete all action types for this article
    const actions = ['explain', 'jurisprudence', 'mnemonic', 'quiz'];
    for (const act of actions) {
      await deleteAICache(lawId, articleId, act);
    }
  } catch {
    // Ignore silently
  }
}

/**
 * Clears all cached AI items from IndexedDB
 */
export async function clearAllAICache(): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(AI_STORE, 'readwrite');
        const store = tx.objectStore(AI_STORE);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore silently
  }
}

/**
 * Computes cache stats (count of items and estimated size in KB)
 */
export async function getAICacheStats(): Promise<{ count: number; estimatedSizeKb: number }> {
  try {
    const db = await getDB();
    if (!db) return { count: 0, estimatedSizeKb: 0 };

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(AI_STORE, 'readonly');
        const store = tx.objectStore(AI_STORE);
        const countReq = store.count();

        countReq.onsuccess = () => {
          const count = countReq.result || 0;
          // Approximate size estimation: ~2.5KB average per cached explanation
          const estimatedSizeKb = Math.round(count * 2.5);
          resolve({ count, estimatedSizeKb });
        };

        countReq.onerror = () => {
          resolve({ count: 0, estimatedSizeKb: 0 });
        };
      } catch {
        resolve({ count: 0, estimatedSizeKb: 0 });
      }
    });
  } catch {
    return { count: 0, estimatedSizeKb: 0 };
  }
}
