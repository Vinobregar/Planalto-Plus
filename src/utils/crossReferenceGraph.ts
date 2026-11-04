import { ArticleAnnotation, ArticleBlock } from '../types/legislation';

export interface CrossRefLink {
  sourceId: string;
  targetId: string;
  contextSnippet?: string;
  isFromUserNote?: boolean;
}

export interface ArticleCrossRefNode {
  articleId: string;
  articleLabel: string;
  outgoingIds: string[]; // Articles this article cites
  incomingIds: string[]; // Articles that cite this article
}

export interface CrossReferenceGraph {
  nodes: Record<string, ArticleCrossRefNode>;
  edges: CrossRefLink[];
  byNumberMap: Record<string, ArticleBlock>;
}

export function normalizeArticleNumberKey(numStr: string): string {
  return numStr
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[º°]/g, '')
    .trim();
}

/**
 * Extracts all article numbers referenced inside a piece of text.
 * Handles:
 * - "art. 186", "Art. 5º", "artigo 12", "art. 14-A"
 * - "arts. 186 e 187", "arts. 1º, 2º e 3º"
 * - "arts. 1º a 4º"
 * - "artigo anterior"
 */
export function extractReferencedArticleKeys(
  text: string,
  currentArticleIndex: number,
  allArticles: ArticleBlock[]
): string[] {
  const foundKeys = new Set<string>();

  // 1. Check "artigo anterior" / "art. anterior"
  if (/\bart(?:igo|\.)?\s+anterior\b/i.test(text) && currentArticleIndex > 0) {
    const prev = allArticles[currentArticleIndex - 1];
    if (prev) {
      foundKeys.add(normalizeArticleNumberKey(prev.number));
    }
  }

  // 2. Check ranges like "arts. 1º a 4º" or "arts. 186 a 188"
  const rangeRegex =
    /\barts?\.?\s*(\d+(?:\.\d+)*)[º°]?\s*(?:a|até)\s*(\d+(?:\.\d+)*)[º°]?/gi;
  let rangeMatch: RegExpExecArray | null;
  while ((rangeMatch = rangeRegex.exec(text)) !== null) {
    const start = parseInt(rangeMatch[1].replace(/\./g, ''), 10);
    const end = parseInt(rangeMatch[2].replace(/\./g, ''), 10);
    if (!isNaN(start) && !isNaN(end) && end >= start && end - start <= 25) {
      for (let n = start; n <= end; n++) {
        foundKeys.add(String(n));
      }
    }
  }

  // 3. Check lists and single references like "arts. 186 e 187", "art. 5º, § 1º", "arts. 1º, 2º e 3º"
  const refBlockRegex =
    /\bart(?:igo)?s?\.?\s*(\d+(?:\.\d+)*(?:º|°)?(?:-[A-Z])?(?:\s*(?:,|e|ou)\s*\d+(?:\.\d+)*(?:º|°)?(?:-[A-Z])?)*)/gi;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = refBlockRegex.exec(text)) !== null) {
    const numListStr = blockMatch[1];
    const individualNums = numListStr.match(
      /\d+(?:\.\d+)*(?:º|°)?(?:-[A-Z])?/gi
    );
    if (individualNums) {
      for (const rawNum of individualNums) {
        // Avoid matching laws like "Lei nº 13.146" because refBlockRegex requires "art." or "arts." prefix
        foundKeys.add(normalizeArticleNumberKey(rawNum));
      }
    }
  }

  return Array.from(foundKeys);
}

export function buildCrossReferenceGraph(
  articles: ArticleBlock[],
  annotations: Record<string, ArticleAnnotation> = {}
): CrossReferenceGraph {
  const byNumberMap: Record<string, ArticleBlock> = {};
  const nodes: Record<string, ArticleCrossRefNode> = {};
  const edges: CrossRefLink[] = [];

  for (const art of articles) {
    const key = normalizeArticleNumberKey(art.number);
    // Prefer non-revoked article if duplicate exists
    if (!byNumberMap[key] || (byNumberMap[key].isRevoked && !art.isRevoked)) {
      byNumberMap[key] = art;
    }
    nodes[art.id] = {
      articleId: art.id,
      articleLabel: art.label,
      outgoingIds: [],
      incomingIds: [],
    };
  }

  articles.forEach((art, idx) => {
    const fullArticleText = [
      art.caputText,
      ...art.subClauses.map((sc) => sc.text),
    ].join(' ');

    const referencedKeys = extractReferencedArticleKeys(
      fullArticleText,
      idx,
      articles
    );

    const userNote = annotations[art.id]?.note || '';
    const noteKeys = userNote
      ? extractReferencedArticleKeys(userNote, idx, articles)
      : [];

    const allTargetKeys = new Set([...referencedKeys, ...noteKeys]);

    for (const targetKey of allTargetKeys) {
      const targetArt = byNumberMap[targetKey];
      if (!targetArt || targetArt.id === art.id) continue;

      if (!nodes[art.id].outgoingIds.includes(targetArt.id)) {
        nodes[art.id].outgoingIds.push(targetArt.id);
      }
      if (!nodes[targetArt.id].incomingIds.includes(art.id)) {
        nodes[targetArt.id].incomingIds.push(art.id);
      }

      edges.push({
        sourceId: art.id,
        targetId: targetArt.id,
        isFromUserNote:
          !referencedKeys.includes(targetKey) && noteKeys.includes(targetKey),
      });
    }
  });

  return { nodes, edges, byNumberMap };
}
