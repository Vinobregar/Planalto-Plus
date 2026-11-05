import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  Highlighter,
  History,
  Network,
  Palette,
  Scale,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  AppearanceSettings,
  ArticleAnnotation,
  ArticleBlock,
  HighlightColor,
  HighlightTag,
  ThemeMode,
  TextHighlight,
} from '../types/legislation';
import { resolveHighlightTag } from '../storage/storageService';
import { buildJurisprudenceUrls } from '../services/aiService';
import {
  CrossReferenceGraph,
  normalizeArticleNumberKey,
} from '../utils/crossReferenceGraph';

interface ArticleItemProps {
  article: ArticleBlock;
  previousArticle?: ArticleBlock | null;
  lawEpigraph: string;
  annotation?: ArticleAnnotation;
  highlightTags: HighlightTag[];
  appearance: AppearanceSettings;
  searchHighlightWords?: string[];
  crossRefGraph: CrossReferenceGraph;
  isFocused: boolean;
  onFocus: () => void;
  onJumpToArticle: (articleId: string) => void;
  onOpenCrossRefGraphForArticle: (targetArticle: ArticleBlock) => void;
  onUpdateAnnotation: (next: ArticleAnnotation) => void;
  onOpenCustomizeTags: () => void;
  onExplainWithAI: (article: ArticleBlock) => void;
  onSummarizeJurisprudenceWithAI: (article: ArticleBlock) => void;
  onQuizWithAI: (article: ArticleBlock) => void;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(245, 158, 11, ${alpha})`;
}

export const ModificationNoteBadge: React.FC<{
  note?: string;
  url?: string;
  compiledMode: boolean;
  theme: ThemeMode;
}> = ({ note, url, compiledMode, theme }) => {
  if (!note) return null;

  const tooltipBg =
    theme === 'dark'
      ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
      : theme === 'sepia'
      ? 'bg-[#faf8f4] border-[#dcd6ca] text-[#2c2825]'
      : 'bg-slate-900 border-slate-700 text-white';

  // In Texto Compilado mode, minimize "(Redação dada / Incluído pela / Vide Lei nº X)" into a compact tooltip link
  if (compiledMode) {
    const badgeContent = (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/10 opacity-55 group-hover/mod:opacity-100 hover:text-indigo-500 transition-all cursor-pointer">
        <History className="w-2.5 h-2.5" />
        {url && <ExternalLink className="w-2 h-2" />}
      </span>
    );

    return (
      <span className="relative inline-flex items-center ml-1.5 group/mod align-middle select-none">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {badgeContent}
          </a>
        ) : (
          badgeContent
        )}
        <span
          className={`pointer-events-none opacity-0 group-hover/mod:opacity-100 transition-opacity duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-xs px-2.5 py-1.5 rounded-lg border shadow-xl text-[11px] font-sans leading-snug z-40 ${tooltipBg}`}
        >
          ({note})
          {url && (
            <span className="block text-[10px] opacity-75 underline mt-0.5">
              Clique para abrir a norma alteradora ↗
            </span>
          )}
        </span>
      </span>
    );
  }

  // Full inline pill when Texto Compilado is OFF
  return (
    <span className="ml-2 inline-flex items-center">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 opacity-75 hover:opacity-100 hover:text-indigo-500 transition-opacity"
        >
          <span>({note})</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-black/5 dark:bg-white/10 opacity-70">
          ({note})
        </span>
      )}
    </span>
  );
};

interface ArticleMentionLinkProps {
  label: string;
  targetArticle: ArticleBlock;
  crossRefGraph: CrossReferenceGraph;
  theme: ThemeMode;
  onJumpToArticle: (articleId: string) => void;
  onOpenCrossRefGraphForArticle: (targetArticle: ArticleBlock) => void;
}

const ArticleMentionLink: React.FC<ArticleMentionLinkProps> = ({
  label,
  targetArticle,
  crossRefGraph,
  theme,
  onJumpToArticle,
  onOpenCrossRefGraphForArticle,
}) => {
  const node = crossRefGraph.nodes[targetArticle.id];
  const refCount =
    (node?.incomingIds.length || 0) + (node?.outgoingIds.length || 0);

  const popoverBg =
    theme === 'dark'
      ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
      : theme === 'sepia'
      ? 'bg-[#faf8f4] border-[#dcd6ca] text-[#2c2825]'
      : 'bg-white border-slate-200 text-slate-800';

  return (
    <span className="relative inline-block group/artref z-20 group-hover/artref:z-[60]">
      <a
        href={`#${targetArticle.id}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onJumpToArticle(targetArticle.id);
        }}
        className="text-indigo-600 dark:text-indigo-400 font-medium underline decoration-indigo-500/40 hover:decoration-indigo-500 underline-offset-2 transition-colors cursor-pointer"
      >
        {label}
      </a>

      {/* Hover Popover Card with Bridge Padding so mouse can enter buttons */}
      <span className="pointer-events-none opacity-0 group-hover/artref:opacity-100 group-hover/artref:pointer-events-auto transition-opacity duration-150 absolute bottom-full left-1/2 -translate-x-1/2 pb-2 w-80 sm:w-96 z-[70] select-none text-left font-normal not-italic">
        <span
          onClick={(e) => e.stopPropagation()}
          className={`block p-3.5 rounded-2xl border shadow-2xl space-y-2.5 text-xs leading-relaxed ${popoverBg}`}
        >
          <span className="flex items-center justify-between gap-2 border-b border-current/10 pb-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <span>{targetArticle.label}</span>
              {targetArticle.sectionPath.length > 0 && (
                <span className="text-[10px] font-normal opacity-65 truncate max-w-[160px]">
                  • {targetArticle.sectionPath.slice(-1)[0]}
                </span>
              )}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold shrink-0">
              {refCount} remissões
            </span>
          </span>

          <span className="block line-clamp-4 opacity-90 text-[11.5px]">
            {targetArticle.caputText}
          </span>

          {targetArticle.subClauses.length > 0 && (
            <span className="block pl-2.5 border-l-2 border-current/15 space-y-1 text-[11px] opacity-80">
              {targetArticle.subClauses
                .filter((sc) => sc.type !== 'rubrica')
                .slice(0, 2)
                .map((sc) => (
                  <span key={sc.id} className="block line-clamp-2">
                    <strong>{sc.label}</strong> {sc.text}
                  </span>
                ))}
            </span>
          )}

          <span className="pt-1.5 border-t border-current/10 flex items-center justify-between gap-2 relative z-[80] pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCrossRefGraphForArticle(targetArticle);
              }}
              className="flex-1 py-1.5 px-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold text-[11px] inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Network className="w-3.5 h-3.5 shrink-0" />
              <span>Ver Remissões & Grafo</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJumpToArticle(targetArticle.id);
              }}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] inline-flex items-center justify-center gap-1 transition-colors shrink-0"
            >
              <span>Ir para artigo</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </span>
        </span>
      </span>
    </span>
  );
};

/**
 * Turns inline mentions of articles (e.g., "art. 5º", "arts. 186 e 187", "artigo anterior")
 * into interactive ArticleMentionLink hyperlinks.
 */

function toAccentInsensitiveRegexPattern(str: string): string {
  return str
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[aáàãâä]/gi, '[aáàãâä]')
    .replace(/[eéèêë]/gi, '[eéèêë]')
    .replace(/[iíìîï]/gi, '[iíìîï]')
    .replace(/[oóòõôö]/gi, '[oóòõôö]')
    .replace(/[uúùûü]/gi, '[uúùûü]')
    .replace(/[cç]/gi, '[cç]');
}

function highlightSearchWords(
  text: string,
  words?: string[],
  theme: ThemeMode = 'light'
): React.ReactNode {
  if (!words || words.length === 0 || !text) return text;
  const validWords = words
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
  if (validWords.length === 0) return text;

  const sorted = [...new Set(validWords)].sort((a, b) => b.length - a.length);
  const patterns = sorted.map(toAccentInsensitiveRegexPattern);

  const regex = new RegExp('(' + patterns.join('|') + ')', 'gi');
  const tokens = text.split(regex);
  if (tokens.length <= 1) return text;

  const highlightStyle =
    theme === 'dark'
      ? {
          backgroundColor: 'rgba(245, 158, 11, 0.28)',
          color: '#fef3c7',
          borderBottom: '2px solid #fbbf24',
        }
      : theme === 'sepia'
      ? {
          backgroundColor: 'rgba(217, 119, 6, 0.22)',
          color: '#2e2a25',
          borderBottom: '2px solid #b45309',
        }
      : {
          backgroundColor: 'rgba(254, 240, 138, 0.65)',
          color: '#0f172a',
          borderBottom: '2px solid #d97706',
        };

  return tokens.map((tok, i) => {
    const isMatch = sorted.some((w) => {
      const p = new RegExp('^' + toAccentInsensitiveRegexPattern(w) + '$', 'i');
      return p.test(tok);
    });
    if (isMatch) {
      return (
        <mark
          key={i}
          style={highlightStyle}
          className="font-bold px-1 py-0.5 rounded shadow-sm"
        >
          {tok}
        </mark>
      );
    }
    return tok;
  });
}

function linkifyArticleMentionsInSegment(
  segmentText: string,
  currentArticle: ArticleBlock,
  previousArticle: ArticleBlock | null | undefined,
  crossRefGraph: CrossReferenceGraph,
  theme: ThemeMode,
  onJumpToArticle: (articleId: string) => void,
  onOpenCrossRefGraphForArticle: (targetArticle: ArticleBlock) => void,
  searchHighlightWords?: string[]
): React.ReactNode {
  if (!segmentText) return segmentText;

  // Combined regex for "artigo anterior" / "art. anterior" OR "art(s). 123, 124 e 125"
  const mentionRegex =
    /(\bart(?:igo)?s?\.?\s+anterior\b|\bart(?:igo)?s?\.?\s*\d+(?:\.\d+)*(?:º|°)?(?:-[A-Z])?(?:\s*(?:,|e|ou|a|até)\s*\d+(?:\.\d+)*(?:º|°)?(?:-[A-Z])?)*)/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(segmentText)) !== null) {
    const matchStart = match.index;
    const matchedStr = match[0];

    if (matchStart > lastIndex) {
      parts.push(highlightSearchWords(segmentText.slice(lastIndex, matchStart), searchHighlightWords, theme));
    }

    // Case 1: "artigo anterior" / "art. anterior"
    if (/anterior$/i.test(matchedStr.trim())) {
      if (previousArticle && previousArticle.id !== currentArticle.id) {
        parts.push(
          <ArticleMentionLink
            key={`ref-${matchStart}`}
            label={matchedStr}
            targetArticle={previousArticle}
            crossRefGraph={crossRefGraph}
            theme={theme}
            onJumpToArticle={onJumpToArticle}
            onOpenCrossRefGraphForArticle={onOpenCrossRefGraphForArticle}
          />
        );
      } else {
        parts.push(matchedStr);
      }
      lastIndex = matchStart + matchedStr.length;
      continue;
    }

    // Case 2: Single or multiple article numbers after "art." / "arts."
    const numMatches = Array.from(
      matchedStr.matchAll(/\d+(?:\.\d+)*(?:º|°)?(?:-[A-Z])?/gi)
    );

    if (numMatches.length === 1) {
      const rawNum = numMatches[0][0];
      const key = normalizeArticleNumberKey(rawNum);
      const targetArt = crossRefGraph.byNumberMap[key];
      if (targetArt && targetArt.id !== currentArticle.id) {
        parts.push(
          <ArticleMentionLink
            key={`ref-${matchStart}`}
            label={matchedStr}
            targetArticle={targetArt}
            crossRefGraph={crossRefGraph}
            theme={theme}
            onJumpToArticle={onJumpToArticle}
            onOpenCrossRefGraphForArticle={onOpenCrossRefGraphForArticle}
          />
        );
      } else {
        parts.push(matchedStr);
      }
    } else if (numMatches.length > 1) {
      let innerLast = 0;
      const subNodes: React.ReactNode[] = [];
      numMatches.forEach((nm, idx) => {
        const nmIndex = nm.index ?? 0;
        const rawNum = nm[0];
        if (nmIndex > innerLast) {
          subNodes.push(matchedStr.slice(innerLast, nmIndex));
        }
        const key = normalizeArticleNumberKey(rawNum);
        const targetArt = crossRefGraph.byNumberMap[key];
        if (targetArt && targetArt.id !== currentArticle.id) {
          subNodes.push(
            <ArticleMentionLink
              key={`ref-${matchStart}-${idx}`}
              label={rawNum}
              targetArticle={targetArt}
              crossRefGraph={crossRefGraph}
              theme={theme}
              onJumpToArticle={onJumpToArticle}
              onOpenCrossRefGraphForArticle={onOpenCrossRefGraphForArticle}
            />
          );
        } else {
          subNodes.push(rawNum);
        }
        innerLast = nmIndex + rawNum.length;
      });
      if (innerLast < matchedStr.length) {
        subNodes.push(matchedStr.slice(innerLast));
      }
      parts.push(
        <React.Fragment key={`ref-group-${matchStart}`}>
          {subNodes}
        </React.Fragment>
      );
    } else {
      parts.push(matchedStr);
    }

    lastIndex = matchStart + matchedStr.length;
  }

  if (parts.length === 0) return highlightSearchWords(segmentText, searchHighlightWords, theme);
  if (lastIndex < segmentText.length) {
    parts.push(highlightSearchWords(segmentText.slice(lastIndex), searchHighlightWords, theme));
  }
  return parts;
}

function renderHighlightedAndLinkedText(
  text: string,
  highlights: TextHighlight[],
  tags: HighlightTag[],
  isDark: boolean,
  currentArticle: ArticleBlock,
  previousArticle: ArticleBlock | null | undefined,
  crossRefGraph: CrossReferenceGraph,
  theme: ThemeMode,
  onJumpToArticle: (articleId: string) => void,
  onOpenCrossRefGraphForArticle: (targetArticle: ArticleBlock) => void,
  searchHighlightWords?: string[]
): React.ReactNode {
  let segments: Array<{ text: string; highlight?: TextHighlight }> = [{ text }];

  if (highlights && highlights.length > 0) {
    for (const hl of highlights) {
      const quote = hl.quote.trim();
      if (!quote || quote.length < 2) continue;

      const nextSegments: Array<{ text: string; highlight?: TextHighlight }> =
        [];
      for (const seg of segments) {
        if (seg.highlight) {
          nextSegments.push(seg);
          continue;
        }
        const idx = seg.text.toLowerCase().indexOf(quote.toLowerCase());
        if (idx === -1) {
          nextSegments.push(seg);
        } else {
          if (idx > 0) {
            nextSegments.push({ text: seg.text.slice(0, idx) });
          }
          nextSegments.push({
            text: seg.text.slice(idx, idx + quote.length),
            highlight: hl,
          });
          if (idx + quote.length < seg.text.length) {
            nextSegments.push({ text: seg.text.slice(idx + quote.length) });
          }
        }
      }
      segments = nextSegments;
    }
  }

  return segments.map((seg, i) => {
    const linkedContent = linkifyArticleMentionsInSegment(
      seg.text,
      currentArticle,
      previousArticle,
      crossRefGraph,
      theme,
      onJumpToArticle,
      onOpenCrossRefGraphForArticle,
      searchHighlightWords
    );

    if (!seg.highlight) {
      return <React.Fragment key={i}>{linkedContent}</React.Fragment>;
    }
    const tag = resolveHighlightTag(seg.highlight.color, tags);
    const hex = tag?.color || '#f59e0b';
    const tagName = tag?.name || seg.highlight.tagName || '';
    return (
      <mark
        key={i}
        style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 140px',
          backgroundColor: hexToRgba(hex, isDark ? 0.35 : 0.42),
          borderBottom: `2px solid ${hex}`,
        }}
        className="text-current px-1 rounded-sm"
        title={tagName ? `Tag: ${tagName}` : undefined}
      >
        {linkedContent}
      </mark>
    );
  });
}

export const ArticleItem: React.FC<ArticleItemProps> = ({
  article,
  previousArticle,
  lawEpigraph,
  annotation,
  highlightTags,
  appearance,
  searchHighlightWords,
  crossRefGraph,
  isFocused,
  onFocus,
  onJumpToArticle,
  onOpenCrossRefGraphForArticle,
  onUpdateAnnotation,
  onOpenCustomizeTags,
  onExplainWithAI,
  onSummarizeJurisprudenceWithAI,
  onQuizWithAI,
}) => {
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showJurisprudence, setShowJurisprudence] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(annotation?.note || '');
  const [selectedQuote, setSelectedQuote] = useState<string>('');
  const [expandRevoked, setExpandRevoked] = useState(false);
  const [copiedArticle, setCopiedArticle] = useState(false);

  const handleCopyArticleFull = (e: React.MouseEvent) => {
    e.stopPropagation();
    const parts: string[] = [];
    if (article.rubrics && article.rubrics.length > 0) {
      parts.push(article.rubrics.map((r) => r.text).join('\n'));
    }
    parts.push(`${article.label} ${article.caputText}`);
    for (const sc of article.subClauses) {
      if (sc.type === 'rubrica') {
        parts.push(sc.text);
      } else {
        parts.push(`${sc.label} ${sc.text}`);
      }
    }
    const fullText = parts.join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedArticle(true);
      setTimeout(() => setCopiedArticle(false), 2000);
    });
  };

  const articleRef = useRef<HTMLElement | null>(null);

  // Close popovers and clear selection when another article is focused
  useEffect(() => {
    if (!isFocused) {
      setShowHighlightPicker(false);
      setShowJurisprudence(false);
      setSelectedQuote('');
    }
  }, [isFocused]);

  // Close popovers when clicking outside this article
  useEffect(() => {
    if (!showHighlightPicker && !showJurisprudence) return;

    const handlePointerDownOutside = (event: MouseEvent) => {
      const el = articleRef.current;
      if (!el) return;
      const path = event.composedPath ? event.composedPath() : [];
      if (!path.includes(el) && !el.contains(event.target as Node)) {
        setShowHighlightPicker(false);
        setShowJurisprudence(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDownOutside, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDownOutside, true);
    };
  }, [showHighlightPicker, showJurisprudence]);

  const currentAnnotation: ArticleAnnotation = annotation || {
    articleId: article.id,
    articleLabel: article.label,
    textHighlights: [],
    note: '',
    collapsed: false,
    updatedAt: new Date().toISOString(),
  };

  const hasSavedNote = Boolean(currentAnnotation.note.trim());
  const textHighlights = currentAnnotation.textHighlights || [];

  // If compiledMode is ON and entire article is revoked, show a minimal 1-line collapsed pill
  if (appearance.compiledMode && article.isRevoked && !expandRevoked) {
    return (
      <div
        id={article.id}
        className="my-1 px-3 py-1 rounded-lg border border-dashed border-current/15 flex items-center justify-between text-xs opacity-50 hover:opacity-85 transition-opacity"
      >
        <span>
          <strong className="line-through mr-2">{article.label}</strong>
          <span>(Dispositivo revogado oculto no modo Texto Compilado)</span>
        </span>
        <button
          type="button"
          onClick={() => setExpandRevoked(true)}
          className="underline font-medium ml-3 shrink-0"
        >
          Ver texto revogado
        </button>
      </div>
    );
  }

  const handleMouseUpSelection = () => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (text.length >= 3 && text.length <= 600) {
      setSelectedQuote(text);
      onFocus();
    } else {
      setSelectedQuote('');
    }
  };

  const applyColorHighlight = (tagId: HighlightColor) => {
    const tagObj = resolveHighlightTag(tagId, highlightTags);
    if (selectedQuote) {
      const newHl: TextHighlight = {
        id: `hl-${Date.now()}`,
        articleId: article.id,
        color: tagId,
        tagName: tagObj?.name || undefined,
        quote: selectedQuote,
        createdAt: new Date().toISOString(),
      };
      onUpdateAnnotation({
        ...currentAnnotation,
        textHighlights: [...textHighlights, newHl],
        updatedAt: new Date().toISOString(),
      });
      setSelectedQuote('');
      window.getSelection()?.removeAllRanges();
    } else {
      const nextWhole =
        currentAnnotation.wholeHighlightColor === tagId ? undefined : tagId;
      onUpdateAnnotation({
        ...currentAnnotation,
        wholeHighlightColor: nextWhole,
        updatedAt: new Date().toISOString(),
      });
    }
    setShowHighlightPicker(false);
  };

  const clearAllHighlights = () => {
    onUpdateAnnotation({
      ...currentAnnotation,
      wholeHighlightColor: undefined,
      textHighlights: [],
      updatedAt: new Date().toISOString(),
    });
    setShowHighlightPicker(false);
  };

  const handleSaveNote = () => {
    onUpdateAnnotation({
      ...currentAnnotation,
      note: noteDraft,
      collapsed: false,
      updatedAt: new Date().toISOString(),
    });
    setIsEditingNote(false);
  };

  const toggleNoteCollapse = () => {
    onUpdateAnnotation({
      ...currentAnnotation,
      collapsed: !currentAnnotation.collapsed,
    });
  };

  const wholeColorId = currentAnnotation.wholeHighlightColor;
  const wholeTag = resolveHighlightTag(wholeColorId, highlightTags);
  const wholeTagHasName = Boolean(wholeTag?.name?.trim());
  const isDark = appearance.theme === 'dark';

  const distinctInlineTags = Array.from(
    new Set(textHighlights.map((h) => h.color))
  )
    .map((cid) => resolveHighlightTag(cid, highlightTags))
    .filter((t): t is HighlightTag => Boolean(t && t.name?.trim()));

  const jurisprudenceData = showJurisprudence
    ? buildJurisprudenceUrls(lawEpigraph, article)
    : null;

  const visibleRubrics = (article.rubrics || []).filter(
    (r) => !(appearance.compiledMode && r.isRevoked && !expandRevoked)
  );

  // Check if caput is in force, but some or all incisos/items are revoked
  const revokedIncisos = (article.subClauses || []).filter(
    (sc) => (sc.type === 'inciso' || sc.type === 'item') && sc.isRevoked
  );
  const totalIncisos = (article.subClauses || []).filter(
    (sc) => sc.type === 'inciso' || sc.type === 'item'
  );
  const hasRevokedIncisos = !article.isRevoked && revokedIncisos.length > 0;
  const allIncisosRevoked =
    totalIncisos.length > 0 && revokedIncisos.length === totalIncisos.length;

  return (
    <article
      ref={articleRef}
      id={article.id}
      onClick={onFocus}
      onMouseUp={handleMouseUpSelection}
      style={{
        marginBottom: `${appearance.paragraphSpacing}px`,
        ...(wholeTag
          ? {
              backgroundColor: hexToRgba(
                wholeTag.color,
                isDark ? 0.14 : 0.12
              ),
              borderLeftWidth: '4px',
              borderLeftColor: wholeTag.color,
            }
          : {}),
      }}
      className={`group relative rounded-xl px-4 py-3 transition-all border border-transparent ${
        isFocused
          ? 'ring-1 ring-indigo-500/30 bg-indigo-500/[0.03]'
          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
      }`}
    >
      {/* Floating Action Toolbar (visible on hover, focus, or when popovers are open) */}
      <div
        className={`flex items-center gap-1 absolute -top-3 right-3 px-2 py-1 rounded-full border shadow-md text-xs transition-all z-20 ${
          appearance.theme === 'dark'
            ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
            : appearance.theme === 'sepia'
            ? 'bg-[#faf8f4] border-[#dcd6ca] text-[#2c2825]'
            : 'bg-white border-slate-200 text-slate-700'
        } ${
          isFocused ||
          showHighlightPicker ||
          showJurisprudence ||
          selectedQuote
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
        }`}
      >
        {/* Highlight Button (Opens picker ONLY when clicked) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFocus();
            setShowHighlightPicker((v) => !v);
            setShowJurisprudence(false);
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
            wholeTag || textHighlights.length > 0 || selectedQuote
              ? 'text-amber-500 font-semibold'
              : ''
          }`}
          title="Grifar com Cor ou Tag"
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {selectedQuote ? 'Grifar Seleção' : 'Grifar'}
          </span>
        </button>

        {/* Note Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFocus();
            setNoteDraft(currentAnnotation.note);
            setIsEditingNote((v) => !v);
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
            hasSavedNote ? 'text-indigo-500 font-semibold' : ''
          }`}
          title="Adicionar ou editar anotação neste artigo"
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nota</span>
        </button>

        {/* Jurisprudence Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFocus();
            setShowJurisprudence((v) => !v);
            setShowHighlightPicker(false);
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
            showJurisprudence ? 'text-indigo-500 font-semibold' : ''
          }`}
          title="Pesquisar jurisprudência deste artigo (STF, STJ, Jusbrasil)"
        >
          <Scale className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Jurisprudência</span>
        </button>

        {/* AI Explain Button (Hidden when appearance.hideAITools is true) */}
        {!appearance.hideAITools && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExplainWithAI(article);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
            title="Explicar artigo com Inteligência Artificial"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explicar IA</span>
          </button>
        )}

        {/* Questions Button (Exclusive to Articles, hidden when appearance.hideAITools is true) */}
        {!appearance.hideAITools && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuizWithAI(article);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium transition-colors"
            title="Criar questão sobre este artigo"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Questões</span>
          </button>
        )}

        {expandRevoked && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandRevoked(false);
            }}
            className="px-2 py-0.5 rounded-full text-rose-500 hover:bg-rose-500/10"
          >
            Ocultar revogado
          </button>
        )}
      </div>

      {/* Color & Tag Highlight Picker Popover (Opens ONLY when showHighlightPicker is true) */}
      {showHighlightPicker && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`mb-2.5 p-2.5 rounded-xl border shadow-lg space-y-2 text-xs ${
            appearance.theme === 'dark'
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] opacity-80 font-semibold flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              {selectedQuote
                ? `Grifar trecho: "${selectedQuote.slice(0, 38)}${
                    selectedQuote.length > 38 ? '...' : ''
                  }"`
                : 'Escolha uma cor de grifo:'}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setShowHighlightPicker(false);
                  onOpenCustomizeTags();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium"
                title="Atribuir tags às cores ou adicionar cores personalizadas no Caderno"
              >
                <Palette className="w-3 h-3" />
                <span>Atribuir Tags / Cores</span>
              </button>
              {(wholeTag || textHighlights.length > 0) && (
                <button
                  type="button"
                  onClick={clearAllHighlights}
                  className="p-1 rounded hover:bg-rose-500/10 text-rose-500"
                  title="Limpar todos os grifos deste artigo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowHighlightPicker(false);
                }}
                className="p-1 rounded opacity-60 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {highlightTags.map((tag) => {
              const isSelectedWhole = wholeColorId === tag.id && !selectedQuote;
              const hasAssignedTag = Boolean(tag.name.trim());
              const labelText = hasAssignedTag
                ? tag.name
                : tag.colorLabel || 'Cor';
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => applyColorHighlight(tag.id)}
                  style={{
                    backgroundColor: hexToRgba(tag.color, isDark ? 0.22 : 0.16),
                    borderColor: tag.color,
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-transform hover:scale-105 ${
                    hasAssignedTag ? 'font-semibold' : 'font-medium opacity-90'
                  } ${isSelectedWhole ? 'ring-2 ring-indigo-500' : ''}`}
                  title={
                    hasAssignedTag
                      ? `Tag: ${tag.name}`
                      : `${labelText} (sem tag atribuída)`
                  }
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{labelText}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Tag Badges Row (only shown when a highlight has an assigned tag name!) */}
      {(wholeTagHasName || distinctInlineTags.length > 0) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {wholeTag && wholeTagHasName && (
            <span
              style={{
                backgroundColor: hexToRgba(wholeTag.color, isDark ? 0.25 : 0.2),
                borderColor: wholeTag.color,
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: wholeTag.color }}
              />
              <span>{wholeTag.name}</span>
            </span>
          )}
          {distinctInlineTags
            .filter((t) => t.id !== wholeTag?.id)
            .map((t) => (
              <span
                key={t.id}
                style={{
                  backgroundColor: hexToRgba(t.color, isDark ? 0.2 : 0.15),
                  borderColor: t.color,
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span>{t.name}</span>
              </span>
            ))}
        </div>
      )}

      {/* Article-Level Rubrics / Nomen Iuris (e.g., "Crime impossível", "Agravação pelo resultado") */}
      {visibleRubrics.length > 0 && (
        <div className="mb-1.5 space-y-0.5">
          {visibleRubrics.map((rub) => (
            <div
              key={rub.id}
              className={`font-bold text-[0.95em] tracking-tight ${
                rub.isRevoked ? 'line-through opacity-50' : 'opacity-95'
              }`}
            >
              <span>{rub.text}</span>
              <ModificationNoteBadge
                note={rub.modificationNote}
                url={rub.modificationUrl}
                compiledMode={appearance.compiledMode}
                theme={appearance.theme}
              />
            </div>
          ))}
        </div>
      )}

      {/* Article Caput */}
      <div
        className={`leading-relaxed ${
          article.isRevoked ? 'line-through opacity-55' : ''
        }`}
      >
        <span className="inline-flex items-center gap-1 px-2 py-0.5 mr-2 rounded-md text-[0.88em] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 select-all align-middle">
          <span>{article.label}</span>
          <button
            type="button"
            onClick={handleCopyArticleFull}
            className="p-0.5 -mr-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity text-current cursor-pointer"
            title={
              copiedArticle
                ? 'Artigo copiado para a área de transferência!'
                : `Copiar ${article.label} na íntegra`
            }
            aria-label={`Copiar ${article.label} na íntegra`}
          >
            {copiedArticle ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </span>

        {/* Explicit Revoked Incisos Notice Badge on Caput */}
        {hasRevokedIncisos && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 mr-2 rounded-md text-[10px] font-bold uppercase tracking-wide bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
            title={
              allIncisosRevoked
                ? 'Atenção: O caput deste artigo está vigente, mas todos os seus incisos foram revogados.'
                : `Atenção: O caput está vigente, mas os seguintes incisos foram revogados: ${revokedIncisos
                    .map((i) => i.label)
                    .join(', ')}.`
            }
          >
            <span>
              {allIncisosRevoked
                ? 'Caput Vigente • Incisos Revogados'
                : `Inciso${revokedIncisos.length > 1 ? 's' : ''} ${revokedIncisos
                    .map((i) => i.label)
                    .join(', ')} Revogado${revokedIncisos.length > 1 ? 's' : ''}`}
            </span>
          </span>
        )}

        <span>
          {renderHighlightedAndLinkedText(
            article.caputText,
            textHighlights,
            highlightTags,
            isDark,
            article,
            previousArticle,
            crossRefGraph,
            appearance.theme,
            onJumpToArticle,
            onOpenCrossRefGraphForArticle,
            searchHighlightWords
          )}</span>
          <ModificationNoteBadge
          note={article.modificationNote}
          url={article.modificationUrl}
          compiledMode={appearance.compiledMode}
          theme={appearance.theme}
        />
      </div>

      {/* Sub-clauses (Parágrafos, Incisos, Alíneas, Penas, e Rubricas internas) */}
      {article.subClauses.length > 0 && (
        <div className="mt-2.5 space-y-2 pl-4 sm:pl-6 border-l-2 border-current/10">
          {/* Explicit Notice when all incisos are revoked in Compiled Mode */}
          {appearance.compiledMode && hasRevokedIncisos && !expandRevoked && (
            <div className="py-1 px-2.5 my-1.5 rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 text-[11px] text-rose-600 dark:text-rose-400 flex items-center justify-between">
              <span>
                <strong>
                  {allIncisosRevoked
                    ? 'Todos os incisos deste artigo foram revogados'
                    : `Inciso${revokedIncisos.length > 1 ? 's' : ''} ${revokedIncisos
                        .map((i) => i.label)
                        .join(', ')} revogado${revokedIncisos.length > 1 ? 's' : ''}`}
                </strong>{' '}
                (oculto{revokedIncisos.length > 1 ? 's' : ''} no modo Texto Compilado)
              </span>
              <button
                type="button"
                onClick={() => setExpandRevoked(true)}
                className="underline font-semibold ml-2 text-[10.5px] hover:opacity-80"
              >
                Exibir revogados
              </button>
            </div>
          )}

          {article.subClauses.map((sc) => {
            if (appearance.compiledMode && sc.isRevoked && !expandRevoked) {
              return null;
            }

            if (sc.type === 'rubrica') {
              return (
                <div
                  key={sc.id}
                  className={`pt-1.5 font-bold text-[0.94em] tracking-tight ${
                    sc.isRevoked ? 'line-through opacity-50' : 'opacity-95'
                  }`}
                >
                  <span>
                    {renderHighlightedAndLinkedText(
                      sc.text,
                      textHighlights,
                      highlightTags,
                      isDark,
                      article,
                      previousArticle,
                      crossRefGraph,
                      appearance.theme,
                      onJumpToArticle,
                      onOpenCrossRefGraphForArticle,
            searchHighlightWords
          )}</span>
          <ModificationNoteBadge
                    note={sc.modificationNote}
                    url={sc.modificationUrl}
                    compiledMode={appearance.compiledMode}
                    theme={appearance.theme}
                  />
                </div>
              );
            }

            const indentClass =
              sc.type === 'alinea'
                ? 'pl-4'
                : sc.type === 'pena'
                ? 'italic opacity-90'
                : '';

            return (
              <div
                key={sc.id}
                className={`leading-relaxed ${indentClass} ${
                  sc.isRevoked ? 'line-through opacity-55' : ''
                }`}
              >
                <span className="font-semibold mr-2 opacity-90">
                  {sc.label}
                  {sc.type === 'inciso' || sc.type === 'item'
                    ? ' —'
                    : sc.type === 'pena'
                    ? ' —'
                    : ''}
                </span>
                <span>
                  {renderHighlightedAndLinkedText(
                    sc.text || (sc.isRevoked ? '(Revogado)' : ''),
                    textHighlights,
                    highlightTags,
                    isDark,
                    article,
                    previousArticle,
                    crossRefGraph,
                    appearance.theme,
                    onJumpToArticle,
                    onOpenCrossRefGraphForArticle,
                    searchHighlightWords
                  )}
                </span>
                {sc.isRevoked && (
                  <span className="ml-2 not-italic text-[10px] font-bold text-rose-500 uppercase tracking-wider inline-block">
                    [Revogado]
                  </span>
                )}
                <ModificationNoteBadge
                  note={sc.modificationNote}
                  url={sc.modificationUrl}
                  compiledMode={appearance.compiledMode}
                  theme={appearance.theme}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Jurisprudence Search Panel (collapsible inline popover) */}
      {showJurisprudence && jurisprudenceData && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`mt-3 p-3.5 rounded-xl border shadow-sm space-y-3 text-xs ${
            appearance.theme === 'dark'
              ? 'bg-zinc-900/90 border-zinc-800'
              : appearance.theme === 'sepia'
              ? 'bg-[#faf8f4] border-[#dcd6ca]'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold">
                Pesquisa de Jurisprudência — {article.label} (
                {jurisprudenceData.shortLawName})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowJurisprudence(false)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {jurisprudenceData.links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col justify-between p-2.5 rounded-lg border border-current/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group/link"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{link.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover/link:opacity-100 group-hover/link:text-indigo-500" />
                </div>
                <span className="text-[11px] opacity-65 mt-0.5">
                  {link.description}
                </span>
              </a>
            ))}
          </div>

          <div className="pt-1 flex items-center justify-between border-t border-current/10">
            <span className="text-[11px] opacity-65">
              Termo exato: <code>{jurisprudenceData.query}</code>
            </span>
            {!appearance.hideAITools && (
              <button
                type="button"
                onClick={() => onSummarizeJurisprudenceWithAI(article)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Jurisprudência com IA</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Note Editor or Saved Collapsible Note Card */}
      {isEditingNote ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`mt-3 p-3 rounded-xl border space-y-2 text-xs ${
            appearance.theme === 'dark'
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-indigo-50/60 border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" />
              Anotação no {article.label}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingNote(false)}
              className="opacity-60 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            placeholder="Escreva seus comentários, remissões, jurisprudência ou dicas de prova..."
            className="w-full p-2.5 rounded-lg border border-current/15 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-xs leading-relaxed"
          />
          <div className="flex items-center justify-end gap-2">
            {hasSavedNote && (
              <button
                type="button"
                onClick={() => {
                  setNoteDraft('');
                  onUpdateAnnotation({
                    ...currentAnnotation,
                    note: '',
                    updatedAt: new Date().toISOString(),
                  });
                  setIsEditingNote(false);
                }}
                className="px-2.5 py-1 rounded-md text-rose-500 hover:bg-rose-500/10"
              >
                Excluir nota
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsEditingNote(false)}
              className="px-2.5 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm"
            >
              Salvar Nota
            </button>
          </div>
        </div>
      ) : (
        hasSavedNote && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`mt-2.5 rounded-xl border text-xs transition-all ${
              appearance.theme === 'dark'
                ? 'bg-indigo-950/25 border-indigo-800/50 text-zinc-200'
                : 'bg-indigo-50/70 border-indigo-200/80 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-current/10">
              <button
                type="button"
                onClick={toggleNoteCollapse}
                className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400"
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span>Sua Nota ({article.label})</span>
                {currentAnnotation.collapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraft(currentAnnotation.note);
                    setIsEditingNote(true);
                  }}
                  className="text-[11px] opacity-70 hover:opacity-100 underline"
                >
                  Editar
                </button>
              </div>
            </div>
            {!currentAnnotation.collapsed && (
              <div className="px-3 py-2 whitespace-pre-wrap leading-relaxed">
                {currentAnnotation.note}
              </div>
            )}
          </div>
        )
      )}

      {/* Inline Text Highlights Summary Chips (removable) */}
      {textHighlights.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex flex-wrap items-center gap-1.5"
        >
          {textHighlights.map((hl) => {
            const hlTag = resolveHighlightTag(hl.color, highlightTags);
            const hex = hlTag?.color || '#f59e0b';
            const hasTagName = Boolean(hlTag?.name?.trim());
            return (
              <span
                key={hl.id}
                style={{
                  backgroundColor: hexToRgba(hex, isDark ? 0.2 : 0.14),
                  borderColor: hex,
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px]"
              >
                {hasTagName && (
                  <strong
                    style={{ color: hex }}
                    className="uppercase text-[9px] tracking-wider mr-0.5"
                  >
                    [{hlTag?.name}]
                  </strong>
                )}
                <span className="truncate max-w-[200px]">"{hl.quote}"</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAnnotation({
                      ...currentAnnotation,
                      textHighlights: textHighlights.filter(
                        (item) => item.id !== hl.id
                      ),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="opacity-60 hover:opacity-100 hover:text-rose-500"
                  title="Remover este grifo"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </article>
  );
};
