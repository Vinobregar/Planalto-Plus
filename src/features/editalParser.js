/**
 * Módulo D: Analisador de Editais & Highlight Inteligente (src/features/editalParser.js)
 * Diferenciação de experiência:
 * - Usuário Gratuito (BYOK): A importação permanece aberta; se o usuário usar chave própria de IA,
 *   a extensão extrai e aplica os destaques estritamente na lei que estiver aberta no momento.
 * - Usuário PRO: O analisador processa o edital completo e armazena os tópicos mapeados para
 *   múltiplas legislações simultaneamente. Conforme o estudante navega de uma lei para outra
 *   (ex: CF/88 hoje, Código Penal amanhã, Lei 8.112 depois), os artigos cobrados naquele edital
 *   aparecem destacados automaticamente em todas as leis visitadas.
 */

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  getAuthSession,
  isProUser,
} from '../services/auth.js';
import { analyzeEditalAndSelectArticles } from '../services/aiService';

const MULTI_LAW_EDITAL_STORE_KEY = 'planalto_plus_pro_multi_law_edital_v1';

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

async function getStoredEditalMap() {
  const storage = getStorageApi();
  if (storage) {
    return new Promise((resolve) => {
      try {
        storage.get([MULTI_LAW_EDITAL_STORE_KEY], (res) => {
          resolve(
            res && res[MULTI_LAW_EDITAL_STORE_KEY]
              ? res[MULTI_LAW_EDITAL_STORE_KEY]
              : null
          );
        });
      } catch {
        resolve(null);
      }
    });
  }
  try {
    const raw = localStorage.getItem(MULTI_LAW_EDITAL_STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setStoredEditalMap(data) {
  const storage = getStorageApi();
  if (storage) {
    return new Promise((resolve) => {
      try {
        storage.set({ [MULTI_LAW_EDITAL_STORE_KEY]: data }, () => resolve());
      } catch {
        resolve();
      }
    });
  }
  try {
    localStorage.setItem(MULTI_LAW_EDITAL_STORE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Identifica a chave canônica da legislação aberta para casamento automático multi-leis (CF/88, CP, CC, CPC, CPP, CLT, Lei 8.112, etc.)
 */
export function resolveCanonicalLawSlug(doc) {
  const hay = `${doc?.lawId || ''} ${doc?.url || ''} ${doc?.epigraph || ''}`.toLowerCase();
  if (hay.includes('constituicao')) return 'cf88';
  if (hay.includes('del2848') || /2\.?848/.test(hay)) return 'cp40';
  if (hay.includes('del3689') || /3\.?689/.test(hay)) return 'cpp41';
  if (hay.includes('l10406') || /10\.?406/.test(hay)) return 'cc02';
  if (hay.includes('l13105') || /13\.?105/.test(hay)) return 'cpc15';
  if (hay.includes('del5452') || /5\.?452/.test(hay)) return 'clt43';
  if (hay.includes('l8112') || /8\.?112/.test(hay)) return 'lei8112';
  if (hay.includes('l14133') || /14\.?133/.test(hay)) return 'licitacoes21';
  if (hay.includes('l8429') || /8\.?429/.test(hay)) return 'improbidade92';
  if (hay.includes('l5172') || /5\.?172/.test(hay)) return 'ctn66';
  if (hay.includes('l8078') || /8\.?078/.test(hay)) return 'cdc90';
  if (hay.includes('l8906') || /8\.?906/.test(hay)) return 'oab94';
  if (hay.includes('l13146') || /13\.?146/.test(hay)) return 'lbi15';
  return (doc?.lawId || 'default').toLowerCase();
}

/**
 * Extrai mapeamento multi-legislações a partir do texto do edital para usuários PRO
 */
function buildMultiLawTopicMapping(editalName, extractedText, currentSlug, currentMatches) {
  const textLower = String(extractedText || '').toLowerCase();
  const lawsMap = {
    [currentSlug]: currentMatches,
  };

  // Mapeamento inteligente das principais leis citadas no edital para destaque automático ao visitar cada lei
  if (
    textLower.includes('constitucional') ||
    textLower.includes('constituição') ||
    textLower.includes('direitos e garantias fundamentais') ||
    textLower.includes('administração pública')
  ) {
    lawsMap.cf88 = lawsMap.cf88 || [
      {
        articleId: 'art-5',
        articleLabel: 'Art. 5º',
        editalTopic: 'Direitos e Deveres Individuais e Coletivos',
        reason: `Mapeado automaticamente do edital "${editalName}" (Direito Constitucional).`,
      },
      {
        articleId: 'art-37',
        articleLabel: 'Art. 37',
        editalTopic: 'Administração Pública — Princípios e Regras',
        reason: `Mapeado automaticamente do edital "${editalName}" (Administração Pública).`,
      },
    ];
  }

  if (
    textLower.includes('penal') ||
    textLower.includes('crime') ||
    textLower.includes('imputabilidade') ||
    textLower.includes('administração pública')
  ) {
    lawsMap.cp40 = lawsMap.cp40 || [
      {
        articleId: 'art-1',
        articleLabel: 'Art. 1º',
        editalTopic: 'Anterioridade da Lei Penal',
        reason: `Mapeado automaticamente do edital "${editalName}" (Direito Penal).`,
      },
      {
        articleId: 'art-312',
        articleLabel: 'Art. 312',
        editalTopic: 'Crimes contra a Administração Pública (Peculato)',
        reason: `Mapeado automaticamente do edital "${editalName}" (Crimes contra a Administração).`,
      },
    ];
  }

  if (
    textLower.includes('8.112') ||
    textLower.includes('8112') ||
    textLower.includes('servidores públicos') ||
    textLower.includes('regime jurídico')
  ) {
    lawsMap.lei8112 = lawsMap.lei8112 || [
      {
        articleId: 'art-116',
        articleLabel: 'Art. 116',
        editalTopic: 'Regime Disciplinar — Deveres do Servidor',
        reason: `Mapeado automaticamente do edital "${editalName}" (Lei 8.112/90).`,
      },
      {
        articleId: 'art-117',
        articleLabel: 'Art. 117',
        editalTopic: 'Regime Disciplinar — Proibições',
        reason: `Mapeado automaticamente do edital "${editalName}" (Lei 8.112/90).`,
      },
      {
        articleId: 'art-132',
        articleLabel: 'Art. 132',
        editalTopic: 'Penalidades de Demissão',
        reason: `Mapeado automaticamente do edital "${editalName}" (Lei 8.112/90).`,
      },
    ];
  }

  if (
    textLower.includes('civil') ||
    textLower.includes('atos ilícitos') ||
    textLower.includes('negócio jurídico') ||
    textLower.includes('personalidade')
  ) {
    lawsMap.cc02 = lawsMap.cc02 || [
      {
        articleId: 'art-186',
        articleLabel: 'Art. 186',
        editalTopic: 'Dos Atos Ilícitos e Responsabilidade Civil',
        reason: `Mapeado automaticamente do edital "${editalName}" (Direito Civil).`,
      },
      {
        articleId: 'art-927',
        articleLabel: 'Art. 927',
        editalTopic: 'Da Obrigação de Indenizar',
        reason: `Mapeado automaticamente do edital "${editalName}" (Responsabilidade Civil).`,
      },
    ];
  }

  if (
    textLower.includes('14.133') ||
    textLower.includes('licitações') ||
    textLower.includes('contratos administrativos')
  ) {
    lawsMap.licitacoes21 = lawsMap.licitacoes21 || [
      {
        articleId: 'art-5',
        articleLabel: 'Art. 5º',
        editalTopic: 'Princípios das Licitações (Lei 14.133/2021)',
        reason: `Mapeado automaticamente do edital "${editalName}" (Licitações e Contratos).`,
      },
      {
        articleId: 'art-75',
        articleLabel: 'Art. 75',
        editalTopic: 'Dispensa de Licitação',
        reason: `Mapeado automaticamente do edital "${editalName}" (Contratação Direta).`,
      },
    ];
  }

  return lawsMap;
}

/**
 * Processa o edital conforme o nível do usuário:
 * - Gratuito (BYOK): Extrai e aplica destaques estritamente na lei que estiver aberta no momento.
 * - PRO: Processa o edital completo (via Edge Function ou IA) e armazena tópicos mapeados para múltiplas
 *   legislações simultaneamente no armazenamento persistente.
 */
export async function parseEditalAndHighlight({
  aiConfig,
  doc,
  editalName,
  extractedText,
  pdfBase64,
  targetTagId = 'orange',
  addReasonToNotes = true,
}) {
  const pro = await isProUser();
  const currentSlug = resolveCanonicalLawSlug(doc);

  let currentLawMatches = [];

  // Usuário PRO pode usar a Edge Function nativa sem precisar configurar chave API própria
  const hasOwnKey = Boolean(aiConfig?.apiKeys?.[aiConfig?.provider]?.trim());

  if (pro && !hasOwnKey && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const session = await getAuthSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-edital`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.accessToken || SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editalName,
          extractedText: String(extractedText || '').slice(0, 50000),
          currentLawId: doc.lawId,
          currentEpigraph: doc.epigraph,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.matches)) {
          currentLawMatches = data.matches;
        }
      }
    } catch {
      // Fallback abaixo
    }
  }

  if (currentLawMatches.length === 0 && hasOwnKey) {
    currentLawMatches = await analyzeEditalAndSelectArticles(
      aiConfig,
      doc,
      editalName,
      extractedText,
      pdfBase64
    );
  }

  // Fallback heurístico local para PRO quando testando sem chave própria e offline
  if (currentLawMatches.length === 0 && pro) {
    const active = (doc.articles || []).filter((a) => !a.isRevoked);
    const words = String(extractedText || '')
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 5);

    const scored = active
      .map((art) => {
        const text = `${art.label} ${art.caputText}`.toLowerCase();
        let hits = 0;
        for (const w of words.slice(0, 60)) {
          if (text.includes(w)) hits++;
        }
        return { art, hits };
      })
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5);

    currentLawMatches = scored.map(({ art }) => ({
      articleId: art.id,
      articleLabel: art.label,
      editalTopic: editalName || 'Conteúdo Programático do Edital',
      reason: 'Dispositivo correlacionado aos tópicos mapeados do edital.',
    }));
  }

  if (!pro) {
    // Usuário Gratuito (BYOK): aplica estritamente na lei aberta no momento (não grava mapeamento multi-leis)
    return {
      mode: 'free_single_law',
      matches: currentLawMatches,
      mappedLawsCount: 1,
    };
  }

  // Usuário PRO: Armazena os tópicos mapeados para múltiplas legislações simultaneamente
  const lawsMap = buildMultiLawTopicMapping(
    editalName,
    extractedText,
    currentSlug,
    currentLawMatches
  );

  const proEditalPayload = {
    editalName: editalName || 'Edital Ativo',
    targetTagId,
    addReasonToNotes,
    updatedAt: new Date().toISOString(),
    lawsMap,
  };

  await setStoredEditalMap(proEditalPayload);

  return {
    mode: 'pro_multi_law',
    matches: currentLawMatches,
    mappedLawsCount: Object.keys(lawsMap).length,
    editalData: proEditalPayload,
  };
}

/**
 * Verifica se há um edital multi-legislações salvo (exclusivo PRO) e retorna os destaques automáticos
 * para a lei que acabou de ser aberta pelo estudante.
 */
export async function getAutoHighlightsForCurrentLaw(doc) {
  const pro = await isProUser();
  if (!pro) return null;

  const saved = await getStoredEditalMap();
  if (!saved || !saved.lawsMap) return null;

  const slug = resolveCanonicalLawSlug(doc);
  const rawMatches = saved.lawsMap[slug] || saved.lawsMap[doc.lawId] || [];
  if (!Array.isArray(rawMatches) || rawMatches.length === 0) return null;

  // Valida que os artigos existem no documento atual
  const validMatches = [];
  for (const m of rawMatches) {
    const found =
      doc.articles.find((a) => a.id === m.articleId) ||
      doc.articles.find(
        (a) => a.label.toLowerCase() === String(m.articleLabel || '').toLowerCase()
      );
    if (found) {
      validMatches.push({
        ...m,
        articleId: found.id,
        articleLabel: found.label,
      });
    }
  }

  if (validMatches.length === 0) return null;

  return {
    editalName: saved.editalName,
    targetTagId: saved.targetTagId || 'orange',
    addReasonToNotes: Boolean(saved.addReasonToNotes),
    matches: validMatches,
    mappedLawsCount: Object.keys(saved.lawsMap).length,
  };
}

export async function clearStoredMultiLawEdital() {
  await setStoredEditalMap(null);
}
