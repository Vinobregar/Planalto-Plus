/**
 * Módulo F (Parte 2): Mapeador de Incidência OAB (src/features/oabMapper.js)
 * Carrega o preset oficial `assets/data/oab_incidence.json` com estatísticas e tooltips
 * de recorrência nas provas da FGV/OAB para destacar os artigos mais cobrados.
 */

import oabPresetData from '../../public/assets/data/oab_incidence.json';
import { resolveCanonicalLawSlug } from './editalParser.js';
import { isProUser } from '../services/auth.js';

let cachedPreset = oabPresetData;

/**
 * Carrega o preset oficial `assets/data/oab_incidence.json` (via fetch de recurso da extensão ou bundle direto)
 */
export async function loadOabIncidencePreset() {
  if (cachedPreset && cachedPreset.laws) {
    return cachedPreset;
  }

  try {
    const getUrl =
      typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL.bind(chrome.runtime)
        : typeof globalThis !== 'undefined' && globalThis.browser?.runtime?.getURL
        ? globalThis.browser.runtime.getURL.bind(globalThis.browser.runtime)
        : null;

    if (getUrl) {
      const url = getUrl('assets/data/oab_incidence.json');
      const res = await fetch(url);
      if (res.ok) {
        cachedPreset = await res.json();
        return cachedPreset;
      }
    }
  } catch {
    // Usa o preset embutido como fallback imediato
  }

  return oabPresetData;
}

/**
 * Retorna o mapa de incidência OAB/FGV indexado pelo `articleId` da lei atual.
 */
export async function getOabIncidenceForDocument(doc) {
  const pro = await isProUser();
  const preset = await loadOabIncidencePreset();
  const slug = resolveCanonicalLawSlug(doc);
  const lawItems = (preset?.laws && preset.laws[slug]) || [];

  const byArticleId = {};
  const matchedList = [];

  for (const item of lawItems) {
    const cleanTarget = String(item.articleNumber || '')
      .replace(/[º°.\s]/g, '')
      .toLowerCase();

    const matchedArt = (doc?.articles || []).find((a) => {
      const cleanArt = String(a.number || '')
        .replace(/[º°.\s]/g, '')
        .toLowerCase();
      return cleanArt === cleanTarget;
    });

    if (matchedArt) {
      const entry = {
        ...item,
        articleId: matchedArt.id,
        articleLabel: matchedArt.label,
        tooltipText: `Cobrado ${item.recurrenceCount}x na OAB/FGV (Exames: ${item.exams.join(
          ', '
        )}) — ${item.summary}`,
      };
      byArticleId[matchedArt.id] = entry;
      matchedList.push(entry);
    }
  }

  return {
    isPro: pro,
    lawSlug: slug,
    totalMapped: matchedList.length,
    byArticleId,
    items: matchedList,
  };
}
