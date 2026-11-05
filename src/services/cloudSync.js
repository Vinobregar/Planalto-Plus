/**
 * Módulo B: Sincronização em Nuvem Local-First (src/services/cloudSync.js)
 * Arquitetura Local-First para usuários PRO:
 * - Anotações, grifos de artigos, notas e progresso continuam gravados no armazenamento local
 *   (`chrome.storage.local` / IndexedDB) com latência zero (0ms) e suporte offline total.
 * - Para usuários PRO online, sincroniza em segundo plano com o Supabase
 *   (`user_annotations`, `user_study_progress`), protegido por Row-Level Security (RLS via `auth.uid()`).
 * - Ao abrir a extensão em outro computador, faz pull dos dados mais recentes baseado em `updated_at`.
 */

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  getAuthSession,
  isProUser,
} from './auth.js';

const ANNOTATIONS_PREFIX = 'planalto_moderno_annotations_v1:';
const PROGRESS_PREFIX = 'planalto_plus_study_progress_v1:';
const LAST_SYNC_KEY = 'planalto_plus_cloud_sync_meta_v1';

function getStorageApi() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return chrome.storage.local;
  }
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.browser &&
    globalThis.browser.storage &&
    globalThis.browser.storage.local
  ) {
    return globalThis.browser.storage.local;
  }
  return null;
}

async function getLocal(key, fallback = null) {
  const storage = getStorageApi();
  if (storage) {
    return new Promise((resolve) => {
      try {
        const res = storage.get([key], (result) => {
          if (typeof chrome !== 'undefined' && chrome.runtime?.lastError) {
            resolve(fallback);
            return;
          }
          resolve(result && result[key] !== undefined ? result[key] : fallback);
        });
        if (res && typeof res.then === 'function') {
          res
            .then((result) =>
              resolve(result && result[key] !== undefined ? result[key] : fallback)
            )
            .catch(() => resolve(fallback));
        }
      } catch {
        resolve(fallback);
      }
    });
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function setLocal(key, value) {
  const storage = getStorageApi();
  if (storage) {
    return new Promise((resolve) => {
      try {
        const res = storage.set({ [key]: value }, () => resolve());
        if (res && typeof res.then === 'function') {
          res.then(() => resolve()).catch(() => resolve());
        }
      } catch {
        resolve();
      }
    });
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/**
 * Obtém o timestamp mais recente de um mapa de anotações
 */
function getLatestAnnotationTimestamp(annotationsMap) {
  if (!annotationsMap || typeof annotationsMap !== 'object') return 0;
  let maxTime = 0;
  for (const item of Object.values(annotationsMap)) {
    if (item && item.updatedAt) {
      const t = new Date(item.updatedAt).getTime();
      if (!isNaN(t) && t > maxTime) {
        maxTime = t;
      }
    }
  }
  return maxTime;
}

/**
 * Mescla anotações locais e remotas por artigo baseando-se no `updated_at` / `updatedAt` mais recente
 */
export function mergeAnnotationsByUpdatedAt(localMap = {}, remoteMap = {}) {
  const merged = { ...localMap };
  let changedLocally = false;

  for (const [articleId, remoteEntry] of Object.entries(remoteMap)) {
    if (!remoteEntry) continue;
    const localEntry = merged[articleId];
    if (!localEntry) {
      merged[articleId] = remoteEntry;
      changedLocally = true;
      continue;
    }

    const localTime = new Date(localEntry.updatedAt || 0).getTime();
    const remoteTime = new Date(remoteEntry.updatedAt || 0).getTime();

    if (remoteTime > localTime) {
      merged[articleId] = remoteEntry;
      changedLocally = true;
    }
  }

  return { merged, changedLocally };
}

/**
 * Sincroniza em segundo plano (Push) as anotações de uma lei para a tabela `user_annotations` (RLS: auth.uid())
 * Execução não-bloqueante para garantir latência 0ms na escrita local.
 */
export async function pushLawAnnotationsToCloud(lawId, annotationsMap) {
  const pro = await isProUser();
  if (!pro) return { synced: false, reason: 'free_tier' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: false, reason: 'offline' };
  }

  const session = await getAuthSession();
  if (!session || !session.accessToken || !session.profile?.id) {
    return { synced: false, reason: 'unauthenticated' };
  }

  const nowIso = new Date().toISOString();
  const payload = {
    user_id: session.profile.id,
    law_id: lawId,
    annotations_json: annotationsMap,
    updated_at: nowIso,
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_annotations`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    await setLocal(LAST_SYNC_KEY, {
      lastSyncAt: nowIso,
      lawId,
      status: res.ok ? 'synced' : 'queued_local',
    });

    return { synced: res.ok, updatedAt: nowIso };
  } catch {
    await setLocal(LAST_SYNC_KEY, {
      lastSyncAt: nowIso,
      lawId,
      status: 'local_only_fallback',
    });
    return { synced: false, reason: 'network_error' };
  }
}

/**
 * Faz Pull das anotações mais recentes do Supabase (`user_annotations`) ao abrir a lei em outro computador,
 * comparando `updated_at` e mesclando sem perda de dados locais.
 */
export async function pullLawAnnotationsFromCloud(lawId) {
  const localKey = `${ANNOTATIONS_PREFIX}${lawId}`;
  const localAnnotations = await getLocal(localKey, {});

  const pro = await isProUser();
  if (!pro) {
    return { annotations: localAnnotations, updatedFromCloud: false };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { annotations: localAnnotations, updatedFromCloud: false };
  }

  const session = await getAuthSession();
  if (!session || !session.accessToken || !session.profile?.id) {
    return { annotations: localAnnotations, updatedFromCloud: false };
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/user_annotations?user_id=eq.${encodeURIComponent(
      session.profile.id
    )}&law_id=eq.${encodeURIComponent(lawId)}&select=*&order=updated_at.desc&limit=1`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return { annotations: localAnnotations, updatedFromCloud: false };
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      // Se não há registro remoto mas há anotações locais, envia silenciosamente para a nuvem
      if (Object.keys(localAnnotations).length > 0) {
        pushLawAnnotationsToCloud(lawId, localAnnotations).catch(() => {});
      }
      return { annotations: localAnnotations, updatedFromCloud: false };
    }

    const remoteRow = rows[0];
    const remoteMap = remoteRow.annotations_json || {};
    const remoteUpdatedAt = new Date(remoteRow.updated_at || 0).getTime();
    const localUpdatedAt = getLatestAnnotationTimestamp(localAnnotations);

    const { merged, changedLocally } = mergeAnnotationsByUpdatedAt(
      localAnnotations,
      remoteMap
    );

    if (changedLocally || remoteUpdatedAt > localUpdatedAt) {
      await setLocal(localKey, merged);
      await setLocal(LAST_SYNC_KEY, {
        lastSyncAt: new Date().toISOString(),
        lawId,
        status: 'pulled',
      });
      return { annotations: merged, updatedFromCloud: true };
    }
  } catch {
    // Offline fallback silencioso (Local-First)
  }

  return { annotations: localAnnotations, updatedFromCloud: false };
}

/**
 * Sincroniza o progresso de estudo da Trilha do Edital (`user_study_progress`) com resolução por `updated_at`
 */
export async function syncStudyProgressWithCloud(lawId, localProgress = null) {
  const localKey = `${PROGRESS_PREFIX}${lawId}`;
  const storedLocal = localProgress || (await getLocal(localKey, null));

  if (localProgress) {
    // Escrita Local-First com 0ms de latência
    await setLocal(localKey, localProgress);
  }

  const pro = await isProUser();
  if (!pro || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return storedLocal;
  }

  const session = await getAuthSession();
  if (!session || !session.accessToken || !session.profile?.id) {
    return storedLocal;
  }

  try {
    if (localProgress) {
      await fetch(`${SUPABASE_URL}/rest/v1/user_study_progress`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: session.profile.id,
          law_id: lawId,
          read_article_ids: localProgress.readArticleIds || [],
          target_days: localProgress.targetDays || 30,
          daily_goal_articles: localProgress.dailyGoalArticles || 10,
          updated_at: localProgress.updatedAt || new Date().toISOString(),
        }),
      });
      return localProgress;
    }

    // Pull quando chamado sem novo localProgress
    const url = `${SUPABASE_URL}/rest/v1/user_study_progress?user_id=eq.${encodeURIComponent(
      session.profile.id
    )}&law_id=eq.${encodeURIComponent(lawId)}&select=*&order=updated_at.desc&limit=1`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const remote = rows[0];
        const remoteTime = new Date(remote.updated_at || 0).getTime();
        const localTime = storedLocal
          ? new Date(storedLocal.updatedAt || 0).getTime()
          : 0;

        if (!storedLocal || remoteTime > localTime) {
          const mergedReadIds = Array.from(
            new Set([
              ...(storedLocal?.readArticleIds || []),
              ...(remote.read_article_ids || []),
            ])
          );
          const updated = {
            lawId,
            readArticleIds: mergedReadIds,
            targetDays: remote.target_days || storedLocal?.targetDays || 30,
            dailyGoalArticles:
              remote.daily_goal_articles || storedLocal?.dailyGoalArticles || 10,
            startedAt: storedLocal?.startedAt || remote.created_at || new Date().toISOString(),
            updatedAt: remote.updated_at || new Date().toISOString(),
          };
          await setLocal(localKey, updated);
          return updated;
        }
      }
    }
  } catch {
    // Mantém dados locais intactos
  }

  return storedLocal;
}

/**
 * Retorna os metadados da última sincronização em nuvem
 */
export async function getCloudSyncStatus() {
  return getLocal(LAST_SYNC_KEY, null);
}
