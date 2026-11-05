import {
  ArticleBlock,
  ArticleRubric,
  ArticleSummary,
  DocumentBlock,
  HeaderLink,
  HeadingLevel,
  LegislationDocument,
  SubClause,
  TocNode,
} from '../types/legislation';

const LEVEL_RANK: Record<HeadingLevel, number> = {
  parte: 1,
  livro: 2,
  titulo: 3,
  capitulo: 4,
  secao: 5,
  subsecao: 6,
};

function cleanWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes Planalto's quirky ordinal formatting like "Art. 1 o", "Art. 1o", "§ 2 o", "§ 1o"
 * without merging hyphenated words after the article number.
 */
export function normalizeLegalOrdinals(text: string): string {
  return cleanWhitespace(text)
    .replace(
      /\b(Art(?:igo|\.)?\s*\d+)\.?\s*(?:o|º|°)(?![a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ])/gi,
      '$1º'
    )
    .replace(
      /(§\s*\d+)\.?\s*(?:o|º|°)(?![a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ])/gi,
      '$1º'
    )
    .replace(/\b(Art(?:igo|\.)?\s*\d+)\s*-\s*([A-Z])\b/gi, '$1-$2');
}

/**
 * Extracts text from a Planalto DOM element while converting HTML superscript ordinals
 * like `§ 2<sup><u>o</u></sup>Por` into `§ 2º Por` so they never glue to the next word.
 */
function extractElementNormalizedText(el: HTMLElement): string {
  if (el.querySelector('sup')) {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('sup').forEach((sup) => {
      const supTxt = (sup.textContent || '').trim();
      if (/^[oº°ª]$/i.test(supTxt)) {
        const replacement = /^a$/i.test(supTxt) ? 'ª ' : 'º ';
        sup.replaceWith(replacement);
      }
    });
    return normalizeLegalOrdinals(clone.textContent || '');
  }
  return normalizeLegalOrdinals(el.textContent || '');
}

function isElementRevoked(el: HTMLElement, text: string): boolean {
  if (el.closest('strike, s, del')) return true;
  const strikeNodes = el.querySelectorAll('strike, s, del');
  if (strikeNodes.length > 0) {
    const strikeTextLen = Array.from(strikeNodes).reduce(
      (acc, n) => acc + cleanWhitespace(n.textContent || '').length,
      0
    );
    if (strikeTextLen >= text.length * 0.65) {
      return true;
    }
  }
  const style = el.getAttribute('style') || '';
  if (/line-through/i.test(style)) return true;
  if (
    /\b(?:revogad[oa]s?|vetad[oa]s?)\b/i.test(text) ||
    /^\(vetado\)$/i.test(text)
  ) {
    return true;
  }
  return false;
}

export function extractModificationNote(
  el: HTMLElement,
  rawText: string
): { cleanText: string; note?: string; url?: string } {
  let workingText = rawText.trim();
  const collectedNotes: string[] = [];

  // Matches trailing parenthetical legislative notes, including 1-word notes like "(Vigência)", "(Regulamento)", "(Vetado)"
  // and chained notes like "(Incluído pela Lei nº 13.467, de 2017) (Vigência)"
  const singleModRegex =
    /\(\s*((?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]s?|Acrescentad[oa]s?|Acrescid[oa]s?|Alterad[oa]s?|Revogad[oa]s?|Suprimid[oa]s?|Renumerad[oa]s?|Vide\b|Vig[êe]ncia|Regulamento|Produ[çc][ãa]o\s+de\s+efeitos?|Promulga[çc][ãa]o|Vetad[oa]s?|Execu[çc][ãa]o\s+suspensa|Express[ãa]o\s+suprimida|Partes?\s+mantidas?)[^()]{0,260})\s*\)[.;,]?\s*$/i;

  let match = workingText.match(singleModRegex);
  while (match && match.index !== undefined) {
    collectedNotes.unshift(cleanWhitespace(match[1]));
    workingText = cleanWhitespace(workingText.slice(0, match.index));
    match = workingText.match(singleModRegex);
  }

  if (collectedNotes.length === 0) {
    return { cleanText: rawText };
  }

  let url: string | undefined;
  const links = Array.from(el.querySelectorAll('a[href]')) as HTMLAnchorElement[];
  for (let i = links.length - 1; i >= 0; i--) {
    const linkText = cleanWhitespace(links[i].textContent || '');
    if (
      /reda[çc][ãa]o|inclu[íi]d|acrescentad|acrescid|alterad|revogad|vide|vig[êe]ncia|regulamento|lei|decreto|emenda/i.test(
        linkText
      )
    ) {
      url = links[i].href;
      break;
    }
  }

  return {
    cleanText: workingText,
    note: collectedNotes.join(' • '),
    url,
  };
}

function sanitizeInlineHtml(el: HTMLElement, baseUrl: string): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, style').forEach((n) => n.remove());
  clone.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        a.setAttribute('href', new URL(href, baseUrl).href);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      } catch {
        // ignore malformed URL
      }
    }
  });
  return clone.innerHTML
    .replace(/<\/?(font|span|center)[^>]*>/gi, '')
    .trim();
}

function isAdctHeading(text: string, parsedArticlesCount = 0): boolean {
  // ADCT never precedes the main body of the Constitution!
  // Any reference before articles are parsed is just a top index/navigation link in Planalto HTML.
  if (parsedArticlesCount === 0) return false;
  const t = cleanWhitespace(text);
  return /^ATO\s+DAS\s+DISPOSI[ÇC][ÕO]ES\s+(CONSTITUCIONAIS\s+)?TRANSIT[ÓO]RIAS\b/i.test(
    t
  );
}

function detectHeadingLevel(
  text: string,
  parsedArticlesCount = 0
): HeadingLevel | null {
  const t = text.trim();
  if (isAdctHeading(t, parsedArticlesCount)) return 'parte';
  if (/^PARTE\s+(GERAL|ESPECIAL|[IVXLCDM]+|PRIMEIRA|SEGUNDA|ÚNICA)\b/i.test(t))
    return 'parte';
  if (/^LIVRO\s+([IVXLCDM]+|COMPLEMENTAR|ÚNICO|\d+)\b/i.test(t)) return 'livro';
  if (/^T[ÍI]TULO\s+([IVXLCDM]+|ÚNICO|\d+)\b/i.test(t)) return 'titulo';
  if (/^CAP[ÍI]TULO\s+([IVXLCDM]+|ÚNICO|\d+(?:-[A-Z])?)\b/i.test(t))
    return 'capitulo';
  if (/^SE[ÇC][ÃA]O\s+([IVXLCDM]+|ÚNICA|\d+)\b/i.test(t)) return 'secao';
  if (/^SUBSE[ÇC][ÃA]O\s+([IVXLCDM]+|ÚNICA|\d+)\b/i.test(t)) return 'subsecao';
  return null;
}

export function normalizeLawId(url: string): string {
  try {
    const parsed = new URL(url);
    return (parsed.pathname || '/demo-lei')
      .toLowerCase()
      .replace(/\/+/g, '/')
      .replace(/\.htm(l)?$/i, '');
  } catch {
    return 'planalto-law-default';
  }
}

export function parsePlanaltoDom(
  root: HTMLElement | Document = document,
  pageUrl = window.location.href
): LegislationDocument {
  const container =
    'body' in root && root.body ? root.body : (root as HTMLElement);
  const rawParagraphs = Array.from(
    container.querySelectorAll(
      'p, div, blockquote, td, center, h1, h2, h3, li'
    )
  ) as HTMLElement[];

  const elements = rawParagraphs.filter((el) => {
    if (el.closest('#planalto-moderno-host')) return false;
    // Skip wrapper containers that contain other block elements to process only leaf content blocks
    if (
      el.querySelector(
        'p, div, td, blockquote, table, center, h1, h2, h3, li'
      )
    ) {
      return false;
    }
    return true;
  });

  let epigraph = '';
  let ementa = '';
  const preambulo: string[] = [];
  const blocks: DocumentBlock[] = [];
  const articles: ArticleBlock[] = [];
  const flatHeadings: TocNode[] = [];

  let currentArticle: ArticleBlock | null = null;
  let pendingRubrics: ArticleRubric[] = [];
  const activeHeadingByLevel: Partial<Record<HeadingLevel, TocNode>> = {};
  let lastHeadingNode: TocNode | null = null;
  let expectingSubtitleFor: TocNode | null = null;
  let inAdct = false;
  let hasAdct = false;
  let firstArticleEl: HTMLElement | null = null;

  const flushPendingRubricsToBlocks = () => {
    if (pendingRubrics.length === 0) return;
    for (const r of pendingRubrics) {
      blocks.push({
        kind: 'text',
        id: r.id,
        text: r.text,
        html: r.html,
        isRevoked: r.isRevoked,
        isAdct: inAdct,
        modificationNote: r.modificationNote,
        modificationUrl: r.modificationUrl,
      });
    }
    pendingRubrics = [];
  };

  const flushPendingRubricsToSubClauses = (targetArticle: ArticleBlock) => {
    if (pendingRubrics.length === 0) return;
    for (const r of pendingRubrics) {
      targetArticle.subClauses.push({
        id: `${targetArticle.id}-sc-${targetArticle.subClauses.length + 1}`,
        type: 'rubrica',
        label: '',
        text: r.text,
        html: r.html,
        isRevoked: r.isRevoked,
        modificationNote: r.modificationNote,
        modificationUrl: r.modificationUrl,
      });
    }
    pendingRubrics = [];
  };

  const getActiveSectionPath = (): string[] => {
    const orderedLevels: HeadingLevel[] = [
      'parte',
      'livro',
      'titulo',
      'capitulo',
      'secao',
      'subsecao',
    ];
    const path: string[] = [];
    for (const lvl of orderedLevels) {
      const node = activeHeadingByLevel[lvl];
      if (node) {
        path.push(
          node.subtitle ? `${node.title} — ${node.subtitle}` : node.title
        );
      }
    }
    return path;
  };

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const rawText = extractElementNormalizedText(el);
    if (!rawText) continue;

    // Skip standard Planalto top header text
    if (
      /^(Presid[êe]ncia da Rep[úu]blica|Casa Civil|Subchefia para Assuntos Jur[íi]dicos|Secretaria-Geral|Texto compilado|Mensagem de veto|Vig[êe]ncia|Bras[ãa]o)/i.test(
        rawText
      ) &&
      rawText.length < 120
    ) {
      continue;
    }

    // Skip top index / navigation links in Planalto (e.g. navigation table / links at the top of CF/88)
    if (articles.length === 0) {
      if (
        /^(ATO\s+DAS\s+DISPOSI[ÇC][ÕO]ES\s+(CONSTITUCIONAIS\s+)?TRANSIT[ÓO]RIAS|ATOS\s+DECORRENTES\s+DO\s+DISPOSTO|ÍNDICE\s+TEM[ÁA]TICO)/i.test(
          rawText.trim()
        )
      ) {
        continue;
      }
    }

    const revoked = isElementRevoked(el, rawText);

    // Detect Epigraph
    if (
      !epigraph &&
      articles.length === 0 &&
      /^(LEI\s+(COMPLEMENTAR\s+|DELEGADA\s+)?N[º°o]?|DECRETO(-LEI)?\s+N[º°o]?|CONSTITUI[ÇC][ÃA]O|EMENDA\s+CONSTITUCIONAL|MEDIDA\s+PROVIS[ÓO]RIA|C[ÓO]DIGO)/i.test(
        rawText
      )
    ) {
      epigraph = rawText;
      continue;
    }

    // Skip standalone "PREÂMBULO" title before articles so its body goes into preambulo
    if (
      articles.length === 0 &&
      flatHeadings.length === 0 &&
      /^PRE[ÂA]MBULO\.?$/i.test(rawText)
    ) {
      continue;
    }

    // Detect Ementa (excluding "Nós, representantes..." which is the Constitutional Preâmbulo)
    if (
      !ementa &&
      articles.length === 0 &&
      flatHeadings.length === 0 &&
      /^(Institui|Disp[õo]e|Altera|Regulamenta|Estabelece|Aprova|Define|Cria|Consolida)/i.test(
        rawText
      )
    ) {
      ementa = rawText;
      continue;
    }

    // 1. Check if this element is a Structural Heading (including ADCT)
    const headingLevel = detectHeadingLevel(rawText, articles.length);
    if (headingLevel && !revoked) {
      flushPendingRubricsToBlocks();
      currentArticle = null;
      if (isAdctHeading(rawText, articles.length)) {
        inAdct = true;
        hasAdct = true;
      }

      const innerLines = (el.innerText || rawText)
        .split(/\r?\n/)
        .map((l) => cleanWhitespace(l))
        .filter(Boolean);

      // Group innerLines into separate headings if a nested heading (e.g. TÍTULO I) is inside the same <p> as PARTE GERAL
      const headingGroups: Array<{ level: HeadingLevel; lines: string[] }> = [];
      for (const line of innerLines.length > 0 ? innerLines : [rawText]) {
        const lineLevel = detectHeadingLevel(line, articles.length);
        if (lineLevel) {
          headingGroups.push({ level: lineLevel, lines: [line] });
        } else if (headingGroups.length > 0) {
          headingGroups[headingGroups.length - 1].lines.push(line);
        } else {
          headingGroups.push({ level: headingLevel, lines: [line] });
        }
      }

      for (const group of headingGroups) {
        const grpLevel = group.level;
        const rawTitleLine = group.lines[0];
        if (isAdctHeading(rawTitleLine, articles.length)) {
          inAdct = true;
          hasAdct = true;
        }
        const { cleanText: cleanTitle } = extractModificationNote(
          el,
          rawTitleLine
        );
        const rawSubtitleLines = group.lines
          .slice(1)
          .filter((l) => !/^\(.*\)$/.test(l.trim()));
        const rawSubtitle =
          rawSubtitleLines.length > 0
            ? rawSubtitleLines.join(' — ')
            : undefined;
        const cleanSub = rawSubtitle
          ? extractModificationNote(el, rawSubtitle).cleanText
          : undefined;

        // Parte Geral and Parte Especial of codes must not have subtitles in the TOC
        const finalSubtitle =
          grpLevel === 'parte' ? undefined : cleanSub || undefined;

        const node: TocNode = {
          id: `heading-${flatHeadings.length + 1}`,
          level: grpLevel,
          title: cleanTitle,
          subtitle: finalSubtitle,
          isAdct: inAdct,
          children: [],
          articles: [],
        };

        const rank = LEVEL_RANK[grpLevel];
        (Object.keys(LEVEL_RANK) as HeadingLevel[]).forEach((lvl) => {
          if (LEVEL_RANK[lvl] >= rank) {
            delete activeHeadingByLevel[lvl];
          }
        });
        activeHeadingByLevel[grpLevel] = node;
        lastHeadingNode = node;
        expectingSubtitleFor =
          grpLevel === 'parte' || node.subtitle ? null : node;

        flatHeadings.push(node);
        blocks.push({ kind: 'heading', node });
      }
      continue;
    }

    // Check if the paragraph immediately after a non-parte heading is its centered subtitle
    if (
      expectingSubtitleFor &&
      expectingSubtitleFor.level !== 'parte' &&
      !revoked &&
      rawText.length < 160 &&
      !rawText.startsWith('(') &&
      !detectHeadingLevel(rawText) &&
      !/^(Art\.|Par[áa]grafo|§|[IVXLCDM]+\s*[-–—])/i.test(rawText) &&
      (el.getAttribute('align')?.toLowerCase() === 'center' ||
        /^(D[AOE]S?\s+|DISPOSI[ÇC][ÕO]ES\s+|DOS?\s+)/i.test(rawText) ||
        rawText === rawText.toUpperCase())
    ) {
      const { cleanText: subClean } = extractModificationNote(el, rawText);
      if (subClean && !subClean.startsWith('(')) {
        expectingSubtitleFor.subtitle = subClean;
      }
      expectingSubtitleFor = null;
      continue;
    }
    expectingSubtitleFor = null;

    // 2. Check if this element starts an Article (Art. 1º, Art. 2º, Art. 100, Art. 14-A, Artigo 1º)
    // Only match -[A-Z] as part of the article number if there is NO space before '-' AND the letter is NOT followed by another letter!
    const artMatch = rawText.match(
      /^Art(?:igo|\.)?\s*(\d+(?:\.\d+)*(?:\.?[º°o])?(?:-[A-Z](?![a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]))?)\.?\s*(?:[-–—.]\s*)?(.*)$/i
    );
    if (artMatch) {
      if (!firstArticleEl) {
        firstArticleEl = el;
      }
      const rawNumber = artMatch[1].replace(/\./g, '');
      const formattedLabel = `Art. ${artMatch[1]}`;
      const bodyRaw = (artMatch[2] || '').replace(/^[-–—.]\s*/, '');
      const { cleanText, note, url } = extractModificationNote(el, bodyRaw);

      const prefix = inAdct ? 'adct-art-' : 'art-';
      const baseId = `${prefix}${rawNumber
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')}`;
      const duplicateCount = articles.filter(
        (a) => a.id === baseId || a.id.startsWith(`${baseId}--`)
      ).length;
      const articleId =
        duplicateCount === 0 ? baseId : `${baseId}--${duplicateCount + 1}`;

      const attachedRubrics =
        pendingRubrics.length > 0 ? [...pendingRubrics] : undefined;
      pendingRubrics = [];

      const article: ArticleBlock = {
        id: articleId,
        number: rawNumber,
        label: formattedLabel,
        caputText: cleanText || bodyRaw || rawText,
        caputHtml: sanitizeInlineHtml(el, pageUrl),
        isRevoked: revoked,
        isAdct: inAdct,
        modificationNote: note,
        modificationUrl: url,
        rubrics: attachedRubrics,
        subClauses: [],
        sectionPath: getActiveSectionPath(),
        headingId: lastHeadingNode?.id,
      };

      currentArticle = article;
      articles.push(article);
      blocks.push({ kind: 'article', article });

      if (lastHeadingNode) {
        const summary: ArticleSummary = {
          id: article.id,
          number: article.number,
          label: article.label,
          preview: article.caputText.slice(0, 90),
          isRevoked: article.isRevoked,
          isAdct: inAdct,
        };
        lastHeadingNode.articles.push(summary);
      }
      continue;
    }

    // 3. Check if this element is a Sub-clause inside the current Article
    if (currentArticle) {
      // Parágrafo único or § 1º
      const paraMatch = rawText.match(
        /^(Par[áa]grafo\s+[úu]nico\.?|§\s*\d+(?:º|°)?(?:-[A-Z](?![a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]))?\.?)\s*(?:[-–—.]\s*)?(.*)$/i
      );
      if (paraMatch) {
        flushPendingRubricsToSubClauses(currentArticle);
        const { cleanText, note, url } = extractModificationNote(
          el,
          paraMatch[2] || ''
        );
        const isSubRevoked =
          revoked ||
          Boolean(note && /revogad/i.test(note)) ||
          /\brevogad[oa]/i.test(rawText);
        const finalText = cleanText || (isSubRevoked ? '(Revogado)' : '');
        const sub: SubClause = {
          id: `${currentArticle.id}-sc-${currentArticle.subClauses.length + 1}`,
          type: 'paragrafo',
          label: paraMatch[1].replace(/\.$/, ''),
          text: finalText,
          html: sanitizeInlineHtml(el, pageUrl),
          isRevoked: isSubRevoked,
          modificationNote: note,
          modificationUrl: url,
        };
        currentArticle.subClauses.push(sub);
        continue;
      }

      // Inciso (Roman numerals: I - , II - , IV – )
      const incisoMatch = rawText.match(
        /^([IVXLCDM]{1,7}(?:-\d+|-[A-Z](?![a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]))?)\s*[-–—.]\s*(.*)$/
      );
      if (incisoMatch) {
        flushPendingRubricsToSubClauses(currentArticle);
        const { cleanText, note, url } = extractModificationNote(
          el,
          incisoMatch[2] || ''
        );
        const isSubRevoked =
          revoked ||
          Boolean(note && /revogad/i.test(note)) ||
          /\brevogad[oa]/i.test(rawText);
        const finalText = cleanText || (isSubRevoked ? '(Revogado)' : '');
        const sub: SubClause = {
          id: `${currentArticle.id}-sc-${currentArticle.subClauses.length + 1}`,
          type: 'inciso',
          label: incisoMatch[1],
          text: finalText,
          html: sanitizeInlineHtml(el, pageUrl),
          isRevoked: isSubRevoked,
          modificationNote: note,
          modificationUrl: url,
        };
        currentArticle.subClauses.push(sub);
        continue;
      }

      // Item (Arabic numerals in older laws: 1º - , 2º - , 1 - , 2 - )
      const itemMatch = rawText.match(
        /^(\d{1,3}(?:º|°)?)\s*[-–—.]\s+(.*)$/
      );
      if (itemMatch) {
        flushPendingRubricsToSubClauses(currentArticle);
        const { cleanText, note, url } = extractModificationNote(
          el,
          itemMatch[2] || ''
        );
        const isSubRevoked =
          revoked ||
          Boolean(note && /revogad/i.test(note)) ||
          /\brevogad[oa]/i.test(rawText);
        const finalText = cleanText || (isSubRevoked ? '(Revogado)' : '');
        const sub: SubClause = {
          id: `${currentArticle.id}-sc-${currentArticle.subClauses.length + 1}`,
          type: 'item',
          label: itemMatch[1],
          text: finalText,
          html: sanitizeInlineHtml(el, pageUrl),
          isRevoked: isSubRevoked,
          modificationNote: note,
          modificationUrl: url,
        };
        currentArticle.subClauses.push(sub);
        continue;
      }

      // Alínea (a), b), c) or a - , b - )
      const alineaMatch = rawText.match(/^([a-z])\)\s*(.*)$/);
      if (alineaMatch) {
        flushPendingRubricsToSubClauses(currentArticle);
        const { cleanText, note, url } = extractModificationNote(
          el,
          alineaMatch[2] || ''
        );
        const isSubRevoked =
          revoked ||
          Boolean(note && /revogad/i.test(note)) ||
          /\brevogad[oa]/i.test(rawText);
        const finalText = cleanText || (isSubRevoked ? '(Revogado)' : '');
        const sub: SubClause = {
          id: `${currentArticle.id}-sc-${currentArticle.subClauses.length + 1}`,
          type: 'alinea',
          label: `${alineaMatch[1]})`,
          text: finalText,
          html: sanitizeInlineHtml(el, pageUrl),
          isRevoked: isSubRevoked,
          modificationNote: note,
          modificationUrl: url,
        };
        currentArticle.subClauses.push(sub);
        continue;
      }

      // Pena / Penas - reclusão / detenção / multa
      const penaMatch = rawText.match(/^(Penas?)\s*[-–—:]\s*(.*)$/i);
      if (penaMatch) {
        flushPendingRubricsToSubClauses(currentArticle);
        const { cleanText, note, url } = extractModificationNote(
          el,
          penaMatch[2] || ''
        );
        const isSubRevoked =
          revoked ||
          Boolean(note && /revogad/i.test(note)) ||
          /\brevogad[oa]/i.test(rawText);
        const finalText = cleanText || (isSubRevoked ? '(Revogado)' : '');
        const sub: SubClause = {
          id: `${currentArticle.id}-sc-${currentArticle.subClauses.length + 1}`,
          type: 'pena',
          label: penaMatch[1],
          text: finalText,
          html: sanitizeInlineHtml(el, pageUrl),
          isRevoked: isSubRevoked,
          modificationNote: note,
          modificationUrl: url,
        };
        currentArticle.subClauses.push(sub);
        continue;
      }

      // Short standalone legislative note or continuation (including chained notes like "(Incluído...) (Vigência)")
      if (
        rawText.startsWith('(') &&
        /\)[.;,]?\s*$/.test(rawText) &&
        rawText.length < 280
      ) {
        const { cleanText, note, url } = extractModificationNote(el, rawText);
        if (!cleanText || note) {
          const noteToAttach = note || rawText.replace(/^\(|\)[.;,]?$/g, '');
          if (pendingRubrics.length > 0) {
            const lastRubric = pendingRubrics[pendingRubrics.length - 1];
            lastRubric.modificationNote = lastRubric.modificationNote
              ? `${lastRubric.modificationNote} • ${noteToAttach}`
              : noteToAttach;
            if (url) lastRubric.modificationUrl = url;
            continue;
          } else if (currentArticle.subClauses.length > 0) {
            const lastSub =
              currentArticle.subClauses[currentArticle.subClauses.length - 1];
            lastSub.modificationNote = lastSub.modificationNote
              ? `${lastSub.modificationNote} • ${noteToAttach}`
              : noteToAttach;
            if (url) lastSub.modificationUrl = url;
            continue;
          } else {
            currentArticle.modificationNote = currentArticle.modificationNote
              ? `${currentArticle.modificationNote} • ${noteToAttach}`
              : noteToAttach;
            if (url) currentArticle.modificationUrl = url;
            continue;
          }
        }
      }
    }

    // 4. Preâmbulo or rubrics / general text blocks (e.g. "Crime impossível", "Crime doloso", "Crime culposo")
    if (
      articles.length === 0 &&
      flatHeadings.length === 0 &&
      (rawText.length > 90 ||
        /^(O\s+PRESIDENTE|FA[ÇC]O\s+SABER|O\s+CONGRESSO|A\s+PRESIDENTA|DECRET[AO]|N[ÓO]S,\s+REPRESENTANTES)/i.test(
          rawText
        ))
    ) {
      if (rawText.length > 15) {
        preambulo.push(rawText);
      }
    } else {
      const { cleanText, note, url } = extractModificationNote(el, rawText);
      if (!cleanText) {
        continue;
      }
      // If the preceding article only had a label/number line without caput body, adopt this block as its caput
      if (
        currentArticle &&
        !currentArticle.caputText &&
        currentArticle.subClauses.length === 0
      ) {
        currentArticle.caputText = cleanText;
        currentArticle.caputHtml = sanitizeInlineHtml(el, pageUrl);
        if (note && !currentArticle.modificationNote) {
          currentArticle.modificationNote = note;
          if (url) currentArticle.modificationUrl = url;
        }
        continue;
      }
      // Buffer short rubric lines so they attach to the exact next Article or SubClause
      if (cleanText.length <= 220) {
        pendingRubrics.push({
          id: `rub-${blocks.length + pendingRubrics.length + 1}`,
          text: cleanText,
          html: sanitizeInlineHtml(el, pageUrl),
          isRevoked: revoked,
          modificationNote: note,
          modificationUrl: url,
        });
      } else {
        flushPendingRubricsToBlocks();
        blocks.push({
          kind: 'text',
          id: `txt-${blocks.length + 1}`,
          text: cleanText,
          html: sanitizeInlineHtml(el, pageUrl),
          isRevoked: revoked,
          isAdct: inAdct,
          modificationNote: note,
          modificationUrl: url,
        });
      }
    }
  }

  // Flush any trailing text/closing lines at the end of the document
  flushPendingRubricsToBlocks();

  // Build hierarchical tree from flatHeadings using LEVEL_RANK, keeping ADCT separated at root
  const rootToc: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const node of flatHeadings) {
    const rank = LEVEL_RANK[node.level];
    while (
      stack.length > 0 &&
      (LEVEL_RANK[stack[stack.length - 1].level] >= rank ||
        (node.isAdct && !stack[stack.length - 1].isAdct))
    ) {
      stack.pop();
    }
    if (stack.length === 0) {
      rootToc.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  if (rootToc.length === 0 && articles.length > 0) {
    rootToc.push({
      id: 'heading-virtual-root',
      level: 'capitulo',
      title: 'Dispositivos da Lei',
      subtitle: `${articles.length} artigos`,
      children: [],
      articles: articles.map((a) => ({
        id: a.id,
        number: a.number,
        label: a.label,
        preview: a.caputText.slice(0, 90),
        isRevoked: a.isRevoked,
        isAdct: a.isAdct,
      })),
    });
  }

  // Extract initial header hyperlinks (remissões, atos vinculados, etc.)
  const headerLinks: HeaderLink[] = [];
  const seenHeaderLinks = new Set<string>();
  const allAnchors = Array.from(
    container.querySelectorAll<HTMLAnchorElement>('a[href]')
  );
  for (const a of allAnchors) {
    if (firstArticleEl) {
      if (
        firstArticleEl === a ||
        firstArticleEl.contains(a) ||
        Boolean(
          firstArticleEl.compareDocumentPosition(a) &
            Node.DOCUMENT_POSITION_FOLLOWING
        )
      ) {
        break;
      }
    }

    const anchorText = cleanWhitespace(a.textContent || '');
    if (!anchorText || anchorText.length < 2) continue;

    const parentBlock = a.closest('p, div, blockquote, tr, td, li');
    const parentText = parentBlock
      ? cleanWhitespace(parentBlock.textContent || '')
      : '';
    if (
      /^Art\.?\s*\d+/i.test(parentText) ||
      /^Art\.?\s*\d+/i.test(anchorText)
    ) {
      break;
    }

    if (epigraph && anchorText.toLowerCase() === epigraph.toLowerCase()) {
      continue;
    }
    if (
      /^(Presid[êe]ncia da Rep[úu]blica|Casa Civil|Subchefia|Secretaria-Geral|Bras[ãa]o|Texto\s+compilado)/i.test(
        anchorText
      )
    ) {
      continue;
    }

    const rawHref = a.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('javascript:')) continue;

    let fullUrl = rawHref;
    try {
      fullUrl = new URL(rawHref, pageUrl).href;
    } catch {
      // Fallback to rawHref
    }

    const key = `${anchorText}:::${fullUrl}`;
    if (!seenHeaderLinks.has(key)) {
      seenHeaderLinks.add(key);
      headerLinks.push({
        id: `hlink-${headerLinks.length + 1}`,
        text: anchorText,
        url: fullUrl,
      });
    }
  }

  return {
    lawId: normalizeLawId(pageUrl),
    url: pageUrl,
    epigraph: epigraph || document.title || 'Legislação Federal — Planalto',
    ementa,
    preambulo,
    headerLinks,
    blocks,
    toc: rootToc,
    articles,
    hasAdct,
  };
}
