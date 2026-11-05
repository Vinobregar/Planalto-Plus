/**
 * Módulo F (Parte 1): Trilha do Edital & Controle de Metas (src/features/studyTrail.js)
 * - Trilha com cálculo de meta diária (artigos lidos via `IntersectionObserver` e estimativa de tempo).
 * - Sincronização Local-First com o Supabase (`user_study_progress`).
 */

import { syncStudyProgressWithCloud } from '../services/cloudSync.js';

const TRAIL_STORAGE_PREFIX = 'planalto_plus_study_progress_v1:';
const WORDS_PER_MINUTE = 190; // Velocidade média de leitura técnica de texto legal

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

async function getLocalProgress(lawId) {
  const key = `${TRAIL_STORAGE_PREFIX}${lawId}`;
  const storage = getStorageApi();
  if (storage) {
    return new Promise((resolve) => {
      try {
        storage.get([key], (res) => {
          resolve(res && res[key] ? res[key] : null);
        });
      } catch {
        resolve(null);
      }
    });
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Calcula estatísticas detalhadas da Trilha do Edital para a norma aberta:
 * - Total de artigos vigentes
 * - Artigos já lidos
 * - Meta diária de artigos com base no prazo desejado (ex: 15, 30, 60 dias)
 * - Estimativa de tempo restante e diário (minutos)
 */
export function calculateStudyTrailStats(doc, progressEntry) {
  const activeArticles = (doc?.articles || []).filter((a) => !a.isRevoked);
  const totalArticles = activeArticles.length || 1;
  const readSet = new Set(progressEntry?.readArticleIds || []);
  const readCount = activeArticles.filter((a) => readSet.has(a.id)).length;
  const remainingArticles = Math.max(0, totalArticles - readCount);
  const targetDays = Math.max(1, Number(progressEntry?.targetDays) || 15);
  
  // Dias da semana ativos (1 = Seg, 2 = Ter, ..., 7 = Dom). Default: todos os 7 dias
  const studyDaysOfWeek = Array.isArray(progressEntry?.studyDaysOfWeek) && progressEntry.studyDaysOfWeek.length > 0
    ? progressEntry.studyDaysOfWeek
    : [1, 2, 3, 4, 5, 6, 7];
  
  // Proporção de dias de estudo na semana
  const daysPerWeek = Math.max(1, Math.min(7, studyDaysOfWeek.length));
  const estimatedStudySessions = Math.max(1, Math.round((targetDays / 7) * daysPerWeek));

  const dailyGoalArticles = Math.max(
    1,
    Math.ceil(remainingArticles / estimatedStudySessions)
  );

  // Conta palavras restantes para estimativa realista de tempo de leitura
  let remainingWords = 0;
  for (const art of activeArticles) {
    if (!readSet.has(art.id)) {
      const subText = (art.subClauses || []).map((s) => s.text).join(' ');
      const words = `${art.caputText} ${subText}`.trim().split(/\s+/).length;
      remainingWords += words;
    }
  }

  const estimatedRemainingMinutes = Math.max(
    1,
    Math.ceil(remainingWords / WORDS_PER_MINUTE)
  );
  const estimatedDailyMinutes = Math.max(
    1,
    Math.ceil(estimatedRemainingMinutes / estimatedStudySessions)
  );
  const percentage = Math.min(
    100,
    Math.round((readCount / totalArticles) * 100)
  );

  return {
    totalArticles,
    readCount,
    remainingArticles,
    percentage,
    targetDays,
    dailyGoalArticles,
    studyDaysOfWeek,
    daysPerWeek,
    showReadBadges: Boolean(progressEntry?.showReadBadges),
    showOabBadges: Boolean(progressEntry?.showOabBadges),
    estimatedRemainingMinutes,
    estimatedDailyMinutes,
  };
}

/**
 * Carrega o progresso da Trilha do Edital (Local-First + Pull da nuvem se PRO)
 */
export async function loadStudyTrailProgress(doc) {
  const lawId = doc?.lawId || 'default';
  const synced = await syncStudyProgressWithCloud(lawId, null);
  if (synced) return synced;

  const local = await getLocalProgress(lawId);
  if (local) return local;

  const totalArticles = (doc?.articles || []).filter((a) => !a.isRevoked).length || 10;
  const defaultTargetDays = 15;
  return {
    lawId,
    readArticleIds: [],
    targetDays: defaultTargetDays,
    dailyGoalArticles: Math.max(1, Math.ceil(totalArticles / defaultTargetDays)),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Registra um artigo como lido e sincroniza em segundo plano
 */
export async function markArticleAsRead(doc, currentProgress, articleId) {
  const lawId = doc?.lawId || 'default';
  const base = currentProgress || (await loadStudyTrailProgress(doc));
  if (base.readArticleIds.includes(articleId)) {
    return base;
  }

  const next = {
    ...base,
    lawId,
    readArticleIds: [...base.readArticleIds, articleId],
    updatedAt: new Date().toISOString(),
  };

  await syncStudyProgressWithCloud(lawId, next);
  return next;
}

/**
 * Atualiza opções da trilha de estudos (ex: exibição de badges OAB/Lido e dias da semana)
 */
export async function updateStudyTrailSettings(doc, currentProgress, partialSettings) {
  const lawId = doc?.lawId || 'default';
  const base = currentProgress || (await loadStudyTrailProgress(doc));
  const next = {
    ...base,
    lawId,
    ...partialSettings,
    updatedAt: new Date().toISOString(),
  };

  await syncStudyProgressWithCloud(lawId, next);
  return next;
}

/**
 * Atualiza a meta de dias da Trilha do Edital
 */
export async function updateStudyTrailTargetDays(doc, currentProgress, targetDays) {
  const lawId = doc?.lawId || 'default';
  const base = currentProgress || (await loadStudyTrailProgress(doc));
  const cleanDays = Math.max(1, Math.min(365, Number(targetDays) || 15));
  const totalArticles = (doc?.articles || []).filter((a) => !a.isRevoked).length || 1;

  const next = {
    ...base,
    lawId,
    targetDays: cleanDays,
    dailyGoalArticles: Math.max(1, Math.ceil(totalArticles / cleanDays)),
    updatedAt: new Date().toISOString(),
  };

  await syncStudyProgressWithCloud(lawId, next);
  return next;
}

/**
 * Reinicia o progresso de leitura da lei atual
 */
export async function resetStudyTrailProgress(doc, currentProgress) {
  const lawId = doc?.lawId || 'default';
  const base = currentProgress || (await loadStudyTrailProgress(doc));
  const next = {
    ...base,
    lawId,
    readArticleIds: [],
    updatedAt: new Date().toISOString(),
  };
  await syncStudyProgressWithCloud(lawId, next);
  return next;
}

/**
 * Cria um IntersectionObserver para marcar automaticamente os artigos lidos conforme o estudante avança na leitura
 */
export function attachStudyTrailObserver({
  scrollRoot,
  onArticleRead,
  dwellTimeMs = 1800,
}) {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window) || !scrollRoot) {
    return () => {};
  }

  const timers = new Map();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const articleId = entry.target.getAttribute('id');
        if (!articleId || !articleId.startsWith('art-')) continue;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!timers.has(articleId)) {
            const t = setTimeout(() => {
              timers.delete(articleId);
              onArticleRead(articleId);
            }, dwellTimeMs);
            timers.set(articleId, t);
          }
        } else {
          const existing = timers.get(articleId);
          if (existing) {
            clearTimeout(existing);
            timers.delete(articleId);
          }
        }
      }
    },
    {
      root: scrollRoot,
      threshold: [0.5],
    }
  );

  const rootNode = scrollRoot.getRootNode ? scrollRoot.getRootNode() : document;
  const articles = rootNode.querySelectorAll
    ? rootNode.querySelectorAll('article[id^="art-"]')
    : [];
  articles.forEach((el) => observer.observe(el));

  return () => {
    for (const t of timers.values()) {
      clearTimeout(t);
    }
    timers.clear();
    observer.disconnect();
  };
}
