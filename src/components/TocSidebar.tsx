import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileText,
  Highlighter,
  PanelLeftClose,
  Search,
  StickyNote,
  X,
} from 'lucide-react';
import {
  AppearanceSettings,
  ArticleAnnotation,
  ArticleBlock,
  ArticleSummary,
  TocNode,
} from '../types/legislation';
import { computeThemeColors } from './AppearancePopover';
import { normalizeArticleNumberKey } from '../utils/crossReferenceGraph';

interface TocSidebarProps {
  toc: TocNode[];
  articles: ArticleBlock[];
  annotations: Record<string, ArticleAnnotation>;
  activeArticleId: string | null;
  compiledMode: boolean;
  appearance: AppearanceSettings;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSelectHeading: (headingId: string) => void;
  onSelectArticle: (articleId: string) => void;
  onCollapse: () => void;
}

export const TocSidebar: React.FC<TocSidebarProps> = ({
  toc,
  articles,
  annotations,
  activeArticleId,
  compiledMode,
  appearance,
  searchQuery,
  onSearchQueryChange,
  onSelectHeading,
  onSelectArticle,
  onCollapse,
}) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>(
    {}
  );
  const [showArticlesInTree, setShowArticlesInTree] = useState(true);

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setAllCollapsed = (collapsed: boolean) => {
    const next: Record<string, boolean> = {};
    const walk = (nodes: TocNode[]) => {
      for (const n of nodes) {
        next[n.id] = collapsed;
        walk(n.children);
      }
    };
    walk(toc);
    setCollapsedNodes(next);
  };

  const hasNote = (articleId: string) =>
    Boolean(annotations[articleId]?.note?.trim());

  const hasHighlight = (articleId: string) =>
    Boolean(
      annotations[articleId]?.wholeHighlightColor ||
        (annotations[articleId]?.textHighlights?.length ?? 0) > 0
    );

  // Filtered flat articles with useDeferredValue for 60fps typing
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredArticles = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    if (!q) return [];

    // Check if query is targeting an article number (e.g. "155", "art 155", "art. 155", "artigo 155", "155º", "155-A", "155a")
    const cleanQuery = q.replace(/[º°.]/g, '').trim();
    const articleNumPattern = /^(?:art(?:igo)?\s*)?(\d+[\w-]*)$/i;
    const numMatch = articleNumPattern.exec(cleanQuery);

    if (numMatch) {
      const target = normalizeArticleNumberKey(numMatch[1]);
      const cleanTarget = target.replace(/-/g, '');
      return articles.filter((art) => {
        if (compiledMode && art.isRevoked) return false;
        const artKey = normalizeArticleNumberKey(art.number);
        const cleanArtKey = artKey.replace(/-/g, '');
        return artKey === target || cleanArtKey === cleanTarget;
      });
    }

    // Otherwise, perform full-text search across article label, text and user notes
    return articles.filter((art) => {
      if (compiledMode && art.isRevoked) return false;
      const numMatch =
        art.number.toLowerCase().includes(q) ||
        art.label.toLowerCase().includes(q);
      const textMatch =
        art.caputText.toLowerCase().includes(q) ||
        art.subClauses.some((sc) => sc.text.toLowerCase().includes(q));
      const noteMatch =
        annotations[art.id]?.note?.toLowerCase().includes(q) ?? false;
      return numMatch || textMatch || noteMatch;
    });
  }, [articles, annotations, compiledMode, deferredSearchQuery]);

  const surface = computeThemeColors(appearance);
  const theme = appearance.theme;

  const textClass =
    theme === 'dark'
      ? 'text-zinc-200'
      : theme === 'sepia'
      ? 'text-[#2c2825]'
      : 'text-slate-800';

  const renderArticleRow = (art: ArticleSummary) => {
    if (compiledMode && art.isRevoked) return null;
    const isActive = activeArticleId === art.id;
    const noted = hasNote(art.id);
    const highlighted = hasHighlight(art.id);

    return (
      <button
        key={art.id}
        onClick={() => onSelectArticle(art.id)}
        className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors group ${
          isActive
            ? 'bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
        }`}
        title={`${art.label} — ${art.preview}`}
      >
        <FileText className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
        <span className="font-medium shrink-0">{art.label}</span>
        <span className="truncate opacity-65 text-[11px] flex-1">
          {art.preview}
        </span>
        {highlighted && (
          <Highlighter className="w-3 h-3 shrink-0 text-amber-500" />
        )}
        {noted && <StickyNote className="w-3 h-3 shrink-0 text-indigo-500" />}
      </button>
    );
  };

  const renderTreeNode = (node: TocNode, depth = 0) => {
    const isCollapsed = Boolean(collapsedNodes[node.id]);
    const visibleArticles = compiledMode
      ? node.articles.filter((a) => !a.isRevoked)
      : node.articles;
    const hasExpandableContent =
      node.children.length > 0 ||
      (showArticlesInTree && visibleArticles.length > 0);

    return (
      <div key={node.id} className="select-none">
        {depth === 0 && node.isAdct && (
          <div className="my-2.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Transição • Ato das Disposições Constitucionais Transitórias (ADCT)
          </div>
        )}
        <div
          onClick={() => onSelectHeading(node.id)}
          style={{ paddingLeft: `${Math.min(depth * 12 + 8, 56)}px` }}
          className="flex items-start gap-1.5 py-1.5 pr-2 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
        >
          {hasExpandableContent ? (
            <button
              type="button"
              onClick={(e) => toggleNode(node.id, e)}
              className="p-0.5 mt-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
              title={isCollapsed ? 'Expandir seção' : 'Recolher seção'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold tracking-tight truncate">
                {node.title}
              </span>
              {visibleArticles.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 opacity-70 shrink-0">
                  {visibleArticles.length}
                </span>
              )}
            </div>
            {/* Parte Geral and Parte Especial never display subtitles in the Sumário */}
            {node.subtitle && node.level !== 'parte' && (
              <p className="text-[11px] opacity-70 truncate leading-snug">
                {node.subtitle}
              </p>
            )}
          </div>
        </div>

        {!isCollapsed && (
          <div className="mt-0.5 space-y-0.5">
            {showArticlesInTree && visibleArticles.length > 0 && (
              <div
                style={{
                  paddingLeft: `${Math.min((depth + 1) * 12 + 12, 64)}px`,
                }}
                className="space-y-0.5 border-l border-current/10 ml-3 pl-1.5 my-1"
              >
                {visibleArticles.map(renderArticleRow)}
              </div>
            )}
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      style={{
        backgroundColor: surface.panelBg,
        borderColor: surface.borderColor,
      }}
      className={`w-80 shrink-0 h-full border-r flex flex-col select-none ${textClass}`}
    >
      {/* Header renamed to "Sumário" */}
      <div
        style={{ borderColor: surface.borderColor }}
        className="px-3.5 py-3 border-b flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="font-semibold text-xs uppercase tracking-wider truncate">
            Sumário
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowArticlesInTree((v) => !v)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              showArticlesInTree
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
            }`}
            title="Mostrar/ocultar artigos dentro da árvore"
          >
            Artigos
          </button>
          <button
            type="button"
            onClick={() => setAllCollapsed(false)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100"
            title="Expandir tudo"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAllCollapsed(true)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100"
            title="Recolher tudo"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100"
            title="Esconder barra lateral"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Control (synchronized with top centered search bar; Notas & Grifos tabs removed) */}
      <div
        style={{ borderColor: surface.borderColor }}
        className="p-3 border-b"
      >
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Ir para Art. (ex: 5, 186) ou buscar..."
            style={{
              backgroundColor: surface.cardBg,
              borderColor: surface.borderColor,
            }}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tree or Search Results */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {searchQuery.trim() !== '' ? (
          filteredArticles.length === 0 ? (
            <div className="py-10 px-4 text-center text-xs opacity-60">
              Nenhum artigo encontrado para "{searchQuery}".
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[11px] opacity-60 font-medium">
                {filteredArticles.length} artigo(s) encontrado(s)
              </div>
              {filteredArticles.map((art) =>
                renderArticleRow({
                  id: art.id,
                  number: art.number,
                  label: art.label,
                  preview: art.caputText.slice(0, 90),
                  isRevoked: art.isRevoked,
                  isAdct: art.isAdct,
                })
              )}
            </div>
          )
        ) : (
          toc.map((node) => renderTreeNode(node, 0))
        )}
      </div>
    </aside>
  );
};
