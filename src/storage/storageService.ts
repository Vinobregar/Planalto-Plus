import {
  AIConfig,
  AppearanceSettings,
  ArticleAnnotation,
  FlashcardItem,
  HighlightTag,
  LegislationDocument,
} from '../types/legislation';

const APPEARANCE_KEY = 'planalto_moderno_appearance_v1';
const AI_CONFIG_KEY = 'planalto_moderno_ai_config_v1';
const HIGHLIGHT_TAGS_KEY = 'planalto_moderno_highlight_tags_v2';
const ANNOTATIONS_PREFIX = 'planalto_moderno_annotations_v1:';

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 15,
  lineHeight: 1.5,
  paragraphSpacing: 8,
  maxWidth: 880,
  compiledMode: true,
  accentColor: '#8b5cf6',
  hideAITools: false,
  sepiaIntensity: 50,
  darkIntensity: 100,
  enableVlibras: true,
  isPcdAudioAccess: false,
  highContrast: false,
  lockColumnWidth: false,
  textAlign: 'justify',
};

/**
 * Computes appearance defaults scaled proportionally to the user's viewport resolution,
 * using 1360x768 as the reference baseline. Accent color and font family stay default.
 */
export function computeProportionalAppearance(
  viewportWidth?: number
): AppearanceSettings {
  const width =
    viewportWidth ??
    (typeof window !== 'undefined'
      ? window.innerWidth || window.screen?.width || 1360
      : 1360);

  // Baseline width is 1360px
  const ratio = Math.max(0.7, Math.min(1.6, width / 1360));

  return {
    ...DEFAULT_APPEARANCE,
    accentColor: '#8b5cf6', // Violeta permanece como padrão
    fontFamily: 'serif', // Merriweather permanece como padrão
    fontSize: Math.round(15 * ratio),
    paragraphSpacing: Math.max(4, Math.round(8 * ratio)),
    lineHeight: Number((1.5 * Math.pow(ratio, 0.2)).toFixed(2)),
    maxWidth: Math.round(880 * ratio),
  };
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini',
  apiKeys: {
    gemini: '',
    openai: '',
    anthropic: '',
    openrouter: '',
  },
  models: {
    gemini: 'gemini-3.8-flash',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-sonnet-latest',
    openrouter: 'google/gemini-3.8-flash',
  },
  customBaseUrl: 'https://openrouter.ai/api/v1',
};

export const PRESET_TAG_SUGGESTIONS: string[] = [
  'Importante',
  'OAB',
  'Concursos',
  'Exceção / Prazos',
  'Jurisprudência / Súmula',
  'Edital Prioritário',
];

export const DEFAULT_HIGHLIGHT_TAGS: HighlightTag[] = [
  {
    id: 'yellow',
    name: '',
    colorLabel: 'Amarelo',
    color: '#f59e0b',
    isDefault: true,
  },
  {
    id: 'green',
    name: '',
    colorLabel: 'Verde',
    color: '#10b981',
    isDefault: true,
  },
  {
    id: 'blue',
    name: '',
    colorLabel: 'Azul',
    color: '#0ea5e9',
    isDefault: true,
  },
  {
    id: 'rose',
    name: '',
    colorLabel: 'Rosa',
    color: '#f43f5e',
    isDefault: true,
  },
  {
    id: 'purple',
    name: '',
    colorLabel: 'Roxo',
    color: '#8b5cf6',
    isDefault: true,
  },
  {
    id: 'orange',
    name: '',
    colorLabel: 'Laranja',
    color: '#f97316',
    isDefault: true,
  },
];

export function getHighlightTagDisplayName(tag?: HighlightTag): string {
  if (!tag) return 'Cor';
  const assigned = tag.name?.trim();
  if (assigned) return assigned;
  return tag.colorLabel || 'Sem tag';
}

export interface RelevantLawItem {
  id: string;
  shortName: string;
  fullName: string;
  category: string;
  url: string;
}

export const RELEVANT_BRAZILIAN_LAWS: RelevantLawItem[] = [
  {
    id: 'cf88',
    shortName: 'CF/88',
    fullName: 'Constituição da República Federativa do Brasil de 1988',
    category: 'Constitucional',
    url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
  },
  {
    id: 'cc02',
    shortName: 'Código Civil',
    fullName: 'Lei nº 10.406/2002 — Código Civil',
    category: 'Cível',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
  },
  {
    id: 'cpc15',
    shortName: 'CPC/2015',
    fullName: 'Lei nº 13.105/2015 — Código de Processo Civil',
    category: 'Processo Civil',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm',
  },
  {
    id: 'cp40',
    shortName: 'Código Penal',
    fullName: 'Decreto-Lei nº 2.848/1940 — Código Penal',
    category: 'Penal',
    url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm',
  },
  {
    id: 'cpp41',
    shortName: 'CPP',
    fullName: 'Decreto-Lei nº 3.689/1941 — Código de Processo Penal',
    category: 'Processo Penal',
    url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm',
  },
  {
    id: 'clt43',
    shortName: 'CLT',
    fullName: 'Decreto-Lei nº 5.452/1943 — Consolidação das Leis do Trabalho',
    category: 'Trabalho',
    url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm',
  },
  {
    id: 'ctn66',
    shortName: 'CTN',
    fullName: 'Lei nº 5.172/1966 — Código Tributário Nacional',
    category: 'Tributário',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm',
  },
  {
    id: 'cdc90',
    shortName: 'CDC',
    fullName: 'Lei nº 8.078/1990 — Código de Defesa do Consumidor',
    category: 'Consumidor',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
  },
  {
    id: 'oab94',
    shortName: 'Estatuto da OAB',
    fullName: 'Lei nº 8.906/1994 — Estatuto da Advocacia e a OAB',
    category: 'OAB / Ética',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8906.htm',
  },
  {
    id: 'licitacoes21',
    shortName: 'Lei de Licitações',
    fullName: 'Lei nº 14.133/2021 — Nova Lei de Licitações e Contratos',
    category: 'Administrativo',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm',
  },
  {
    id: 'improbidade92',
    shortName: 'Improbidade (LIA)',
    fullName: 'Lei nº 8.429/1992 — Lei de Improbidade Administrativa',
    category: 'Administrativo',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8429.htm',
  },
  {
    id: 'lei8112',
    shortName: 'Lei 8.112/90',
    fullName: 'Lei nº 8.112/1990 — Regime Jurídico dos Servidores Públicos Civis da União',
    category: 'Administrativo',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm',
  },
  {
    id: 'eca90',
    shortName: 'ECA',
    fullName: 'Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente',
    category: 'Especial',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8069.htm',
  },
  {
    id: 'lgpd18',
    shortName: 'LGPD',
    fullName: 'Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais',
    category: 'Digital / Civil',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
  },
  {
    id: 'lbi15',
    shortName: 'Lei Brasileira de Inclusão (LBI)',
    fullName:
      'Lei nº 13.146/2015 — Lei Brasileira de Inclusão da Pessoa com Deficiência (Estatuto da Pessoa com Deficiência)',
    category: 'Direitos Humanos / Civil',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm',
  },
  {
    id: 'lrf05',
    shortName: 'Recuperação Judicial e Falências',
    fullName:
      'Lei nº 11.101/2005 — Lei de Recuperação Judicial, Extrajudicial e Falência',
    category: 'Empresarial',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm',
  },
];

/**
 * Returns the popular/common name of a Brazilian law (e.g. "Consolidação das Leis do Trabalho",
 * "Código Penal", "Código Civil", "Constituição Federal de 1988") for the top-left header bar,
 * while keeping the official epigraph ("DECRETO-LEI Nº 5.452, DE 1º DE MAIO DE 1943") in the body.
 */
export function getCommonLawName(doc: LegislationDocument): string {
  const hay = `${doc.lawId} ${doc.url} ${doc.epigraph}`.toLowerCase();

  if (hay.includes('constituicao')) {
    return 'Constituição Federal de 1988';
  }
  if (hay.includes('del5452') || /5\.?452/.test(hay)) {
    return 'Consolidação das Leis do Trabalho';
  }
  if (hay.includes('del2848') || /2\.?848/.test(hay)) {
    return 'Código Penal';
  }
  if (hay.includes('del3689') || /3\.?689/.test(hay)) {
    return 'Código de Processo Penal';
  }
  if (hay.includes('l10406') || /10\.?406/.test(hay)) {
    return 'Código Civil';
  }
  if (hay.includes('l13105') || /13\.?105/.test(hay)) {
    return 'Código de Processo Civil';
  }
  if (hay.includes('l5172') || /5\.?172/.test(hay)) {
    return 'Código Tributário Nacional';
  }
  if (hay.includes('l8078') || /8\.?078/.test(hay)) {
    return 'Código de Defesa do Consumidor';
  }
  if (hay.includes('l8906') || /8\.?906/.test(hay)) {
    return 'Estatuto da Advocacia e da OAB';
  }
  if (hay.includes('l14133') || /14\.?133/.test(hay)) {
    return 'Lei de Licitações e Contratos Administrativos';
  }
  if (hay.includes('l8666') || /8\.?666/.test(hay)) {
    return 'Lei de Licitações (Lei nº 8.666/1993)';
  }
  if (hay.includes('l8429') || /8\.?429/.test(hay)) {
    return 'Lei de Improbidade Administrativa';
  }
  if (hay.includes('l8112') || /8\.?112/.test(hay)) {
    return 'Regime Jurídico dos Servidores Públicos Civis da União';
  }
  if (hay.includes('l8069') || /8\.?069/.test(hay)) {
    return 'Estatuto da Criança e do Adolescente';
  }
  if (hay.includes('l13709') || /13\.?709/.test(hay)) {
    return 'Lei Geral de Proteção de Dados Pessoais (LGPD)';
  }
  if (hay.includes('del4657') || /4\.?657/.test(hay)) {
    return 'Lei de Introdução às Normas do Direito Brasileiro (LINDB)';
  }
  if (hay.includes('l9503') || /9\.?503/.test(hay)) {
    return 'Código de Trânsito Brasileiro';
  }
  if (hay.includes('l4737') || /4\.?737/.test(hay)) {
    return 'Código Eleitoral';
  }
  if (hay.includes('l10741') || /10\.?741/.test(hay)) {
    return 'Estatuto da Pessoa Idosa';
  }
  if (hay.includes('l13146') || /13\.?146/.test(hay)) {
    return 'Estatuto da Pessoa com Deficiência';
  }
  if (hay.includes('l7210') || /7\.?210/.test(hay)) {
    return 'Lei de Execução Penal';
  }
  if (hay.includes('l8072') || /8\.?072/.test(hay)) {
    return 'Lei dos Crimes Hediondos';
  }
  if (hay.includes('l11340') || /11\.?340/.test(hay)) {
    return 'Lei Maria da Penha';
  }
  if (hay.includes('l11343') || /11\.?343/.test(hay)) {
    return 'Lei de Drogas';
  }
  if (hay.includes('l9099') || /9\.?099/.test(hay)) {
    return 'Lei dos Juizados Especiais Cíveis e Criminais';
  }
  if (hay.includes('l9784') || /9\.?784/.test(hay)) {
    return 'Lei do Processo Administrativo Federal';
  }
  if (hay.includes('l12016') || /12\.?016/.test(hay)) {
    return 'Lei do Mandado de Segurança';
  }
  if (hay.includes('l7347') || /7\.?347/.test(hay)) {
    return 'Lei da Ação Civil Pública';
  }
  if (hay.includes('l12846') || /12\.?846/.test(hay)) {
    return 'Lei Anticorrupção';
  }
  if (hay.includes('l11101') || /11\.?101/.test(hay)) {
    return 'Lei de Recuperação Judicial e Falência';
  }
  if (hay.includes('l12965') || /12\.?965/.test(hay)) {
    return 'Marco Civil da Internet';
  }
  if (hay.includes('del1001') || /1\.?001/.test(hay)) {
    return 'Código Penal Militar';
  }
  if (hay.includes('del1002') || /1\.?002/.test(hay)) {
    return 'Código de Processo Penal Militar';
  }

  // Fallback: try to extract a common name from the Ementa if it starts with "Institui o ...", "Aprova a ..."
  if (doc.ementa) {
    const ementaMatch = doc.ementa.match(
      /^(?:Institui|Aprova)\s+(?:o|a)\s+([^.;,]{5,75})/i
    );
    if (ementaMatch && ementaMatch[1]) {
      const extracted = ementaMatch[1].trim();
      return extracted.charAt(0).toUpperCase() + extracted.slice(1);
    }
  }

  return doc.epigraph;
}

/**
 * Formats the current legislation document into an ABNT NBR 6023 compliant bibliographic reference.
 */
export function formatLawAbntCitation(doc: LegislationDocument): string {
  const months = [
    'jan.',
    'fev.',
    'mar.',
    'abr.',
    'mai.',
    'jun.',
    'jul.',
    'ago.',
    'set.',
    'out.',
    'nov.',
    'dez.',
  ];
  const now = new Date();
  const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const cleanEpigraph = doc.epigraph.replace(/\.$/, '').trim();
  const cleanEmenta = doc.ementa ? `${doc.ementa.replace(/\.$/, '').trim()}. ` : '';
  const url = doc.url || 'https://www.planalto.gov.br';

  return `BRASIL. ${cleanEpigraph}. ${cleanEmenta}Brasília, DF: Presidência da República. Disponível em: ${url}. Acesso em: ${dateStr}.`;
}

function getExtensionStorage(): any {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return chrome.storage.local;
  }
  if (
    typeof (globalThis as any).browser !== 'undefined' &&
    (globalThis as any).browser?.storage &&
    (globalThis as any).browser?.storage?.local
  ) {
    return (globalThis as any).browser.storage.local;
  }
  return null;
}

async function getRaw<T>(key: string, fallback: T): Promise<T> {
  const storage = getExtensionStorage();
  if (storage) {
    return new Promise((resolve) => {
      let resolved = false;
      const safeResolve = (val: T) => {
        if (!resolved) {
          resolved = true;
          resolve(val);
        }
      };

      try {
        const res = storage.get([key], (result: any) => {
          if (typeof chrome !== 'undefined' && chrome.runtime?.lastError) {
            safeResolve(fallback);
            return;
          }
          if (result && result[key] !== undefined) {
            safeResolve(result[key] as T);
          } else {
            safeResolve(fallback);
          }
        });

        // In Firefox / WebExtension promise-based API
        if (res && typeof res.then === 'function') {
          res
            .then((result: any) => {
              if (result && result[key] !== undefined) {
                safeResolve(result[key] as T);
              } else {
                safeResolve(fallback);
              }
            })
            .catch(() => safeResolve(fallback));
        }
      } catch {
        safeResolve(fallback);
      }
    });
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function setRaw<T>(key: string, value: T): Promise<void> {
  const storage = getExtensionStorage();
  if (storage) {
    return new Promise((resolve) => {
      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      try {
        const res = storage.set({ [key]: value }, () => safeResolve());
        if (res && typeof res.then === 'function') {
          res.then(() => safeResolve()).catch(() => safeResolve());
        }
      } catch {
        safeResolve();
      }
    });
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors in fallback
  }
}

export async function loadAppearanceSettings(): Promise<AppearanceSettings> {
  const saved = await getRaw<Partial<AppearanceSettings>>(APPEARANCE_KEY, {});
  const baseDefaults = computeProportionalAppearance();
  const merged = { ...baseDefaults, ...saved };
  if (merged.fontFamily === 'mono') {
    merged.fontFamily = 'opendyslexic';
  }
  return merged;
}

export async function saveAppearanceSettings(
  settings: AppearanceSettings
): Promise<void> {
  await setRaw(APPEARANCE_KEY, settings);
}

export async function loadAIConfig(): Promise<AIConfig> {
  const saved = await getRaw<Partial<AIConfig>>(AI_CONFIG_KEY, {});
  const models = { ...DEFAULT_AI_CONFIG.models, ...(saved.models || {}) };
  if (models.gemini === 'gemini-2.5-flash' || !models.gemini) {
    models.gemini = 'gemini-3.8-flash';
  }
  return {
    provider: saved.provider || DEFAULT_AI_CONFIG.provider,
    apiKeys: { ...DEFAULT_AI_CONFIG.apiKeys, ...(saved.apiKeys || {}) },
    models,
    customBaseUrl: saved.customBaseUrl || DEFAULT_AI_CONFIG.customBaseUrl,
  };
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  await setRaw(AI_CONFIG_KEY, config);
}

export async function loadHighlightTags(): Promise<HighlightTag[]> {
  const saved = await getRaw<HighlightTag[] | null>(HIGHLIGHT_TAGS_KEY, null);
  if (!saved || !Array.isArray(saved) || saved.length === 0) {
    return DEFAULT_HIGHLIGHT_TAGS;
  }
  return saved;
}

export async function saveHighlightTags(tags: HighlightTag[]): Promise<void> {
  await setRaw(HIGHLIGHT_TAGS_KEY, tags);
}

export function resolveHighlightTag(
  colorOrTagId: string | undefined,
  tags: HighlightTag[]
): HighlightTag | undefined {
  if (!colorOrTagId) return undefined;
  const found = tags.find((t) => t.id === colorOrTagId);
  if (found) return found;
  const fallback = DEFAULT_HIGHLIGHT_TAGS.find((t) => t.id === colorOrTagId);
  if (fallback) return fallback;
  if (colorOrTagId.startsWith('#')) {
    return {
      id: colorOrTagId,
      name: 'Personalizado',
      color: colorOrTagId,
    };
  }
  return {
    id: colorOrTagId,
    name: colorOrTagId.toUpperCase(),
    color: '#f59e0b',
  };
}

export async function loadLawAnnotations(
  lawId: string
): Promise<Record<string, ArticleAnnotation>> {
  return getRaw<Record<string, ArticleAnnotation>>(
    `${ANNOTATIONS_PREFIX}${lawId}`,
    {}
  );
}

export async function saveLawAnnotations(
  lawId: string,
  annotations: Record<string, ArticleAnnotation>
): Promise<void> {
  await setRaw(`${ANNOTATIONS_PREFIX}${lawId}`, annotations);
  // Sincronização Local-First em segundo plano para assinantes PRO (0ms de latência na UI)
  import('../services/cloudSync.js')
    .then(({ pushLawAnnotationsToCloud }) => {
      pushLawAnnotationsToCloud(lawId, annotations).catch(() => {});
    })
    .catch(() => {});
}

export function exportAnnotationsToMarkdown(
  doc: LegislationDocument,
  annotations: Record<string, ArticleAnnotation>,
  tags: HighlightTag[] = DEFAULT_HIGHLIGHT_TAGS
): string {
  const entries = Object.values(annotations).filter(
    (a) =>
      a.note.trim().length > 0 ||
      Boolean(a.wholeHighlightColor) ||
      a.textHighlights.length > 0
  );

  const lines: string[] = [
    `# Caderno de Estudos — ${doc.epigraph}`,
    doc.ementa ? `> ${doc.ementa}\n` : '',
    `- **Fonte**: ${doc.url}`,
    `- **Exportado em**: ${new Date().toLocaleString('pt-BR')}`,
    `- **Artigos anotados/grifados**: ${entries.length}`,
    '',
    '---',
    '',
  ];

  for (const entry of entries) {
    const article = doc.articles.find((a) => a.id === entry.articleId);
    const wholeTag = resolveHighlightTag(entry.wholeHighlightColor, tags);
    const tagSuffix =
      wholeTag && wholeTag.name.trim() ? ` [${wholeTag.name}]` : '';

    lines.push(`## ${entry.articleLabel}${tagSuffix}`);
    if (article?.sectionPath?.length) {
      lines.push(`*${article.sectionPath.join(' › ')}*`);
    }
    if (article) {
      lines.push('');
      lines.push(`> **${article.label}** ${article.caputText}`);
    }
    if (entry.textHighlights.length > 0) {
      lines.push('');
      lines.push('### Trechos Grifados');
      for (const hl of entry.textHighlights) {
        const hlTag = resolveHighlightTag(hl.color, tags);
        const tagName = getHighlightTagDisplayName(hlTag);
        lines.push(`- **[${tagName}]** "${hl.quote}"`);
      }
    }
    if (entry.note.trim()) {
      lines.push('');
      lines.push('### Minhas Anotações');
      lines.push(entry.note.trim());
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export function exportHighlightsByTagMarkdown(
  doc: LegislationDocument,
  annotations: Record<string, ArticleAnnotation>,
  tags: HighlightTag[] = DEFAULT_HIGHLIGHT_TAGS
): string {
  const lines: string[] = [
    `# Relatório de Grifos — ${doc.epigraph}`,
    doc.ementa ? `> ${doc.ementa}\n` : '',
    `- **Exportado em**: ${new Date().toLocaleString('pt-BR')}`,
    '',
    '---',
    '',
  ];

  const grouped: Record<
    string,
    Array<{ articleLabel: string; text: string; isWhole: boolean }>
  > = {};

  for (const entry of Object.values(annotations)) {
    const article = doc.articles.find((a) => a.id === entry.articleId);
    if (entry.wholeHighlightColor) {
      const tag = resolveHighlightTag(entry.wholeHighlightColor, tags);
      const key = tag
        ? `${getHighlightTagDisplayName(tag)} (${tag.color})`
        : entry.wholeHighlightColor;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        articleLabel: entry.articleLabel,
        text: article ? article.caputText : entry.articleLabel,
        isWhole: true,
      });
    }
    for (const hl of entry.textHighlights) {
      const tag = resolveHighlightTag(hl.color, tags);
      const key = tag
        ? `${getHighlightTagDisplayName(tag)} (${tag.color})`
        : hl.color;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        articleLabel: entry.articleLabel,
        text: hl.quote,
        isWhole: false,
      });
    }
  }

  const groupKeys = Object.keys(grouped);
  if (groupKeys.length === 0) {
    lines.push('_Nenhum grifo registrado nesta lei._');
    return lines.join('\n');
  }

  for (const tagKey of groupKeys) {
    lines.push(`## Tag: ${tagKey}`);
    lines.push('');
    for (const item of grouped[tagKey]) {
      lines.push(
        `- **${item.articleLabel}** ${
          item.isWhole ? '(Artigo Inteiro)' : '(Trecho)'
        }: "${item.text}"`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function exportLawAnnotationsJson(
  lawId: string,
  epigraph: string,
  annotations: Record<string, ArticleAnnotation>,
  tags?: HighlightTag[]
): string {
  return JSON.stringify(
    {
      version: 2,
      lawId,
      epigraph,
      exportedAt: new Date().toISOString(),
      tags,
      annotations,
    },
    null,
    2
  );
}

/**
 * Returns optimal search keywords (acronym, common name, law number) for external question banks
 * like QConcursos, TEC Concursos, and Gran Questões.
 */
export function getLawSearchKeywords(doc: LegislationDocument): {
  acronym: string;
  commonName: string;
  lawNumber: string;
} {
  const hay = `${doc.lawId} ${doc.url} ${doc.epigraph}`.toLowerCase();
  const commonName = getCommonLawName(doc);
  const numMatch = doc.epigraph.match(
    /(?:LEI\s+(?:COMPLEMENTAR\s+)?N[º°o]?\s*|DECRETO(?:-LEI)?\s+N[º°o]?\s*)([\d.]+)/i
  );
  const lawNumber = numMatch ? numMatch[1] : '';

  if (hay.includes('constituicao')) {
    return { acronym: 'CF', commonName: 'Constituição Federal', lawNumber: '1988' };
  }
  if (hay.includes('del5452') || /5\.?452/.test(hay)) {
    return { acronym: 'CLT', commonName: 'Consolidação das Leis do Trabalho', lawNumber: '5.452' };
  }
  if (hay.includes('del2848') || /2\.?848/.test(hay)) {
    return { acronym: 'CP', commonName: 'Código Penal', lawNumber: '2.848' };
  }
  if (hay.includes('del3689') || /3\.?689/.test(hay)) {
    return { acronym: 'CPP', commonName: 'Código de Processo Penal', lawNumber: '3.689' };
  }
  if (hay.includes('l10406') || /10\.?406/.test(hay)) {
    return { acronym: 'CC', commonName: 'Código Civil', lawNumber: '10.406' };
  }
  if (hay.includes('l13105') || /13\.?105/.test(hay)) {
    return { acronym: 'CPC', commonName: 'Código de Processo Civil', lawNumber: '13.105' };
  }
  if (hay.includes('l5172') || /5\.?172/.test(hay)) {
    return { acronym: 'CTN', commonName: 'Código Tributário Nacional', lawNumber: '5.172' };
  }
  if (hay.includes('l8078') || /8\.?078/.test(hay)) {
    return { acronym: 'CDC', commonName: 'Código de Defesa do Consumidor', lawNumber: '8.078' };
  }
  if (hay.includes('l8906') || /8\.?906/.test(hay)) {
    return { acronym: 'Estatuto da OAB', commonName: 'Lei 8.906', lawNumber: '8.906' };
  }
  if (hay.includes('l14133') || /14\.?133/.test(hay)) {
    return { acronym: 'Lei 14.133', commonName: 'Lei de Licitações', lawNumber: '14.133' };
  }
  if (hay.includes('l8429') || /8\.?429/.test(hay)) {
    return { acronym: 'LIA', commonName: 'Lei 8.429', lawNumber: '8.429' };
  }
  if (hay.includes('l8112') || /8\.?112/.test(hay)) {
    return { acronym: 'Lei 8.112', commonName: 'Regime Jurídico Único', lawNumber: '8.112' };
  }
  if (hay.includes('l8069') || /8\.?069/.test(hay)) {
    return { acronym: 'ECA', commonName: 'Estatuto da Criança e do Adolescente', lawNumber: '8.069' };
  }
  if (hay.includes('l13709') || /13\.?709/.test(hay)) {
    return { acronym: 'LGPD', commonName: 'Lei 13.709', lawNumber: '13.709' };
  }
  if (hay.includes('l13146') || /13\.?146/.test(hay)) {
    return { acronym: 'LBI', commonName: 'Estatuto da Pessoa com Deficiência', lawNumber: '13.146' };
  }
  if (hay.includes('l11101') || /11\.?101/.test(hay)) {
    return { acronym: 'Lei 11.101', commonName: 'Recuperação Judicial', lawNumber: '11.101' };
  }

  return {
    acronym: lawNumber ? `Lei ${lawNumber}` : commonName,
    commonName,
    lawNumber,
  };
}

/**
 * Exports flashcards to standard CSV (with UTF-8 BOM for Excel / Quizlet / Notion / Anki).
 */
export function exportFlashcardsToCsv(
  cards: FlashcardItem[],
  lawTitle: string
): string {
  const escapeCsv = (val: string) =>
    `"${String(val || '')
      .replace(/\r?\n/g, ' ')
      .replace(/"/g, '""')}"`;

  const rows = [
    ['Frente (Pergunta)', 'Verso (Resposta)', 'Dispositivo', 'Norma', 'Tags']
      .map(escapeCsv)
      .join(';'),
  ];

  for (const c of cards) {
    const tagsStr = (c.tags || [c.articleRef]).join(', ');
    rows.push(
      [c.front, c.back, c.articleRef, lawTitle, tagsStr]
        .map(escapeCsv)
        .join(';')
    );
  }

  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Exports flashcards to RemNote (.rem) hierarchical format using `::` separator and `{{c1::...}}` cloze syntax.
 */
export function exportFlashcardsToRemNote(
  cards: FlashcardItem[],
  lawTitle: string
): string {
  const lines: string[] = [`# ${lawTitle} — Flashcards de Legislação`];

  for (const c of cards) {
    const cleanFront = c.front.replace(/\r?\n/g, ' ').trim();
    const cleanBack = c.back.replace(/\r?\n/g, ' — ').trim();
    if (/\{\{c\d+::/i.test(cleanFront)) {
      lines.push(`- [${c.articleRef}] ${cleanFront}`);
      if (cleanBack) {
        lines.push(`  - Fundamentação :: ${cleanBack}`);
      }
    } else {
      lines.push(`- [${c.articleRef}] ${cleanFront} :: ${cleanBack}`);
    }
  }

  return lines.join('\n');
}

/**
 * Exports flashcards to Anki 2.1.54+ Import Format (Tab-separated with #separator:tab, #html:true, #deck headers).
 */
export function exportFlashcardsToAnkiTxt(
  cards: FlashcardItem[],
  lawTitle: string
): string {
  const safeDeckName = lawTitle.replace(/[:\t\r\n]/g, ' ').trim();
  const headerLines = [
    '#separator:tab',
    '#html:true',
    `#deck:Planalto Plus::${safeDeckName}`,
    '#columns:Front\tBack\tTags',
    '#tags column:3',
  ];

  const sanitizeAnkiField = (val: string) =>
    String(val || '')
      .replace(/\t/g, ' ')
      .replace(/\r?\n/g, '<br>');

  const dataLines = cards.map((c) => {
    const frontHtml = `<b>[${sanitizeAnkiField(c.articleRef)} — ${sanitizeAnkiField(
      safeDeckName
    )}]</b><br><br>${sanitizeAnkiField(c.front)}`;
    const backHtml = sanitizeAnkiField(c.back);
    const rawTags = [
      safeDeckName.replace(/\s+/g, '_'),
      c.articleRef.replace(/\s+/g, '_').replace(/[º°]/g, ''),
      ...(c.tags || []).map((t) => t.replace(/\s+/g, '_')),
    ];
    const tagsField = Array.from(new Set(rawTags)).join(' ');
    return `${frontHtml}\t${backHtml}\t${tagsField}`;
  });

  return [...headerLines, ...dataLines].join('\n');
}

/**
 * Exports flashcards directly to the native Anki .apkg package format (SQLite + ZIP).
 */
export async function exportFlashcardsToAnkiApkg(
  cards: FlashcardItem[],
  lawTitle: string
): Promise<void> {
  const safeDeckName = lawTitle.replace(/[:\t\r\n]/g, ' ').trim();
  const deckFullName = `Planalto Plus::${safeDeckName}`;

  const { AnkiExport } = await import('anki-apkg-export');

  const locateFile = (file: string) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        return chrome.runtime.getURL(file);
      }
      if (
        typeof (globalThis as any).browser !== 'undefined' &&
        (globalThis as any).browser?.runtime?.getURL
      ) {
        return (globalThis as any).browser.runtime.getURL(file);
      }
    } catch {
      // ignore
    }
    return `/${file}`;
  };

  const exporter = await AnkiExport.create(deckFullName, { locateFile });

  for (const c of cards) {
    const frontHtml = `<b>[${c.articleRef} — ${safeDeckName}]</b><br><br>${c.front.replace(
      /\r?\n/g,
      '<br>'
    )}`;
    const backHtml = c.back.replace(/\r?\n/g, '<br>');
    const tags = [
      'PlanaltoModerno',
      safeDeckName.replace(/\s+/g, '_'),
      c.articleRef.replace(/\s+/g, '_').replace(/[º°]/g, ''),
      ...(c.tags || []).map((t) => t.replace(/\s+/g, '_')),
    ];

    exporter.addCard(frontHtml, backHtml, {
      tags: Array.from(new Set(tags)),
    });
  }

  const blob = await exporter.save({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeDeckName.replace(/\s+/g, '_')}_flashcards.apkg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


const AI_SESSION_BACKUP_KEY = 'planalto_ai_session_backup:';

export interface AISessionBackup {
  chatMessages: any[];
  quizQuestions: any[];
  editalMatches: any[];
  savedAt: string;
}

export async function saveAISessionBackup(
  lawId: string,
  backup: AISessionBackup
): Promise<void> {
  await setRaw(`${AI_SESSION_BACKUP_KEY}${lawId}`, backup);
}

export async function loadAISessionBackup(
  lawId: string
): Promise<AISessionBackup | null> {
  return await getRaw<AISessionBackup | null>(
    `${AI_SESSION_BACKUP_KEY}${lawId}`,
    null
  );
}

export async function clearAISessionBackup(lawId: string): Promise<void> {
  const storage = getExtensionStorage();
  const key = `${AI_SESSION_BACKUP_KEY}${lawId}`;
  if (storage) {
    await new Promise<void>((resolve) => {
      try {
        storage.remove([key], () => resolve());
      } catch {
        resolve();
      }
    });
  } else {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
