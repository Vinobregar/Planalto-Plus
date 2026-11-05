import { getSynonymsForQuery } from './legalSynonyms';

export function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Generates Portuguese morphological variations (singular/plural, masculine/feminine)
 * e.g. "brasileiro" -> ["brasileiro", "brasileiros", "brasileira", "brasileiras"]
 */
export function getWordVariations(word: string): string[] {
  const w = word.trim().toLowerCase();
  if (w.length < 3) return [w];
  const set = new Set<string>();
  set.add(w);

  // Plural/singular rules
  if (w.endsWith('s')) {
    set.add(w.slice(0, -1)); // brasileiros -> brasileiro
    if (w.endsWith('es')) {
      set.add(w.slice(0, -2)); // juizes -> juiz
    }
    if (w.endsWith('is')) {
      set.add(w.slice(0, -2) + 'l'); // nacionais -> nacional
    }
  } else {
    set.add(w + 's'); // brasileiro -> brasileiros
    if (w.endsWith('r') || w.endsWith('z')) {
      set.add(w + 'es');
    }
    if (w.endsWith('l')) {
      set.add(w.slice(0, -1) + 'is'); // nacional -> nacionais
    }
  }

  // Gender variations
  if (w.endsWith('o')) {
    set.add(w.slice(0, -1) + 'a');
    set.add(w.slice(0, -1) + 'as');
    set.add(w.slice(0, -1) + 'os');
  } else if (w.endsWith('a')) {
    set.add(w.slice(0, -1) + 'o');
    set.add(w.slice(0, -1) + 'os');
    set.add(w.slice(0, -1) + 'as');
  }

  return Array.from(set);
}

export interface SearchConjunctionGroup {
  must: string[];
  mustNot: string[];
}

export interface ParsedBooleanQuery {
  groups: SearchConjunctionGroup[];
  highlightTerms: string[];
}

/**
 * Tokenizes a query string taking into account quotes ("...") and boolean operators
 */
function tokenizeQuery(raw: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match[1]) {
      // Quoted phrase
      tokens.push(`"${match[1].trim()}"`);
    } else if (match[2]) {
      tokens.push(match[2].trim());
    }
  }

  return tokens;
}

/**
 * Parses queries with quotes, OU / OR, E / AND, NÃO / NAO / NOT
 */
export function parseBooleanQuery(
  rawQuery: string,
  withSynonyms: boolean
): ParsedBooleanQuery {
  const q = rawQuery.trim();
  if (!q) {
    return { groups: [], highlightTerms: [] };
  }

  const rawTokens = tokenizeQuery(q);
  const groups: SearchConjunctionGroup[] = [];
  let currentMust: string[] = [];
  let currentMustNot: string[] = [];
  let nextIsNegated = false;

  const flushGroup = () => {
    if (currentMust.length > 0 || currentMustNot.length > 0) {
      groups.push({ must: [...currentMust], mustNot: [...currentMustNot] });
    }
    currentMust = [];
    currentMustNot = [];
    nextIsNegated = false;
  };

  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    const upper = removeAccents(tok).toUpperCase();

    if (upper === 'OU' || upper === 'OR') {
      flushGroup();
      continue;
    }

    if (upper === 'E' || upper === 'AND') {
      continue;
    }

    if (upper === 'NAO' || upper === 'NOT' || tok === '-') {
      nextIsNegated = true;
      continue;
    }

    // Term or quoted phrase
    const cleanTerm = tok.startsWith('"') && tok.endsWith('"')
      ? tok.slice(1, -1).trim()
      : tok.trim();

    if (!cleanTerm) continue;

    if (nextIsNegated) {
      currentMustNot.push(cleanTerm);
      nextIsNegated = false;
    } else {
      currentMust.push(cleanTerm);
    }
  }

  flushGroup();

  // Extract highlight terms from all positive terms
  const highlightSet = new Set<string>();

  for (const grp of groups) {
    for (const term of grp.must) {
      highlightSet.add(term.toLowerCase());
      // Add morphological variations (plurals/genders)
      const variations = getWordVariations(term);
      for (const v of variations) {
        highlightSet.add(v.toLowerCase());
      }
      // Add synonyms if enabled
      if (withSynonyms) {
        const syns = getSynonymsForQuery(term);
        for (const s of syns) {
          if (s.length >= 2) {
            highlightSet.add(s.toLowerCase());
            for (const sv of getWordVariations(s)) {
              highlightSet.add(sv.toLowerCase());
            }
          }
        }
      }
    }
  }

  const highlightTerms = Array.from(highlightSet).sort((a, b) => b.length - a.length);

  return { groups, highlightTerms };
}

/**
 * Checks if a haystack matches a single term (supporting variations and synonyms)
 */
function termMatches(
  haystackNorm: string,
  term: string,
  withSynonyms: boolean
): boolean {
  const normTerm = removeAccents(term).trim();
  if (!normTerm) return true;

  // Exact phrase or substring
  if (haystackNorm.includes(normTerm)) {
    return true;
  }

  // Morphological variations (e.g. brasileiro / brasileiros)
  const variations = getWordVariations(term);
  for (const v of variations) {
    if (haystackNorm.includes(removeAccents(v))) {
      return true;
    }
  }

  // Synonyms if enabled
  if (withSynonyms) {
    const syns = getSynonymsForQuery(term);
    for (const s of syns) {
      if (haystackNorm.includes(removeAccents(s))) {
        return true;
      }
      for (const sv of getWordVariations(s)) {
        if (haystackNorm.includes(removeAccents(sv))) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Evaluates whether an article matches the boolean query
 */
export function evaluateBooleanSearch(
  text: string,
  parsed: ParsedBooleanQuery,
  withSynonyms: boolean
): boolean {
  if (parsed.groups.length === 0) return true;
  const haystackNorm = removeAccents(text);

  // At least one group must be completely satisfied (OR between groups)
  for (const grp of parsed.groups) {
    // 1. All must terms must match
    const mustSatisfied = grp.must.every((m) =>
      termMatches(haystackNorm, m, withSynonyms)
    );
    if (!mustSatisfied) continue;

    // 2. No mustNot term can match
    const notTriggered = grp.mustNot.some((mn) =>
      termMatches(haystackNorm, mn, false)
    );
    if (notTriggered) continue;

    return true;
  }

  return false;
}
