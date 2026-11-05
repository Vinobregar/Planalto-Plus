import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  BookOpen,
  Keyboard,
  ChevronDown,
  ChevronUp,
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
import { parseBooleanQuery, evaluateBooleanSearch } from '../utils/booleanSearch';

interface TocSidebarProps {
  toc: TocNode[];
  articles: ArticleBlock[];
  annotations: Record<string, ArticleAnnotation>;
  activeArticleId: string | null;
  compiledMode: boolean;
  appearance: AppearanceSettings;
  searchQuery: string;
  searchWithSynonyms?: boolean;
  onSearchQueryChange: (q: string) => void;
  onSelectHeading: (headingId: string) => void;
  onSelectArticle: (articleId: string) => void;
  onCollapse: () => void;
  onOpenShortcuts?: () => void;
}

export const TocSidebar: React.FC<TocSidebarProps> = ({
  toc,
  articles,
  annotations,
  activeArticleId,
  compiledMode,
  appearance,
  searchQuery,
  searchWithSynonyms = false,
  onSearchQueryChange,
  onSelectHeading,
  onSelectArticle,
  onCollapse,
  onOpenShortcuts,
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
    const q = deferredSearchQuery.trim();
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

    // Otherwise, perform full boolean search (AND/OR/NOT/quotes/synonyms)
    const parsed = parseBooleanQuery(q, searchWithSynonyms);
    return articles.filter((art) => {
      if (compiledMode && art.isRevoked) return false;
      const fullText = `${art.number} ${art.label} ${art.caputText} ${art.subClauses.map((sc) => sc.text).join(' ')} ${annotations[art.id]?.note || ''}`;
      return evaluateBooleanSearch(fullText, parsed, searchWithSynonyms);
    });
  }, [articles, annotations, compiledMode, deferredSearchQuery, searchWithSynonyms]);

  // Stepper navigation within search results
  const currentMatchIndex = useMemo(() => {
    if (filteredArticles.length === 0 || !activeArticleId) return 0;
    const idx = filteredArticles.findIndex((a) => a.id === activeArticleId);
    return idx >= 0 ? idx : 0;
  }, [filteredArticles, activeArticleId]);

  const handlePrevMatch = () => {
    if (filteredArticles.length === 0) return;
    const nextIdx =
      currentMatchIndex > 0 ? currentMatchIndex - 1 : filteredArticles.length - 1;
    const target = filteredArticles[nextIdx];
    if (target) {
      onSelectArticle(target.id);
    }
  };

  const handleNextMatch = () => {
    if (filteredArticles.length === 0) return;
    const nextIdx =
      currentMatchIndex < filteredArticles.length - 1 ? currentMatchIndex + 1 : 0;
    const target = filteredArticles[nextIdx];
    if (target) {
      onSelectArticle(target.id);
    }
  };

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
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${
            depth === 0 ? 'font-bold' : depth === 1 ? 'font-semibold' : 'font-medium'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
          onClick={() => onSelectHeading(node.id)}
        >
          {hasExpandableContent ? (
            <button
              type="button"
              onClick={(e) => toggleNode(node.id, e)}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0 opacity-70 hover:opacity-100"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <span className="truncate flex-1" title={node.title}>
            {node.title}
          </span>

          
        </div>

        {!isCollapsed && (
          <div>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
            {showArticlesInTree && visibleArticles.length > 0 && (
              <div
                className="space-y-0.5 border-l border-current/10 ml-4 my-0.5 pl-1.5"
                style={{ marginLeft: `${depth * 14 + 18}px` }}
              >
                {visibleArticles.map((art) => renderArticleRow(art))}
              </div>
            )}
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
      className={`w-72 sm:w-80 border-r flex flex-col shrink-0 transition-all select-none ${textClass}`}
    >
      {/* Sidebar Header */}
      <div
        style={{ borderColor: surface.borderColor }}
        className="p-3 border-b flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <h2 className="font-bold text-xs uppercase tracking-wider">
            Sumário da Lei
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAllCollapsed(true)}
            title="Recolher toda a árvore"
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAllCollapsed(false)}
            title="Expandir toda a árvore"
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowArticlesInTree((v) => !v)}
            title={
              showArticlesInTree
                ? 'Ocultar artigos na árvore (apenas títulos)'
                : 'Mostrar artigos na árvore'
            }
            className={`px-1.5 py-0.5 text-[10px] rounded border ${
              showArticlesInTree
                ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                : 'opacity-60 border-current/20'
            }`}
          >
            Artigos
          </button>
          <button
            type="button"
            onClick={onCollapse}
            title="Fechar sumário ([)"
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 ml-1"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Control (synchronized with top centered search bar) */}
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
              {/* Stepper Header for cycling between matching articles */}
              <div
                style={{
                  backgroundColor: surface.cardBg,
                  borderColor: surface.borderColor,
                }}
                className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-[11px] font-medium shadow-sm mb-1.5"
              >
                <span className="opacity-80 font-semibold">
                  {filteredArticles.length} artigo{filteredArticles.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="opacity-60 text-[10px] tabular-nums font-mono">
                    {currentMatchIndex + 1} de {filteredArticles.length}
                  </span>
                  <div className="flex items-center gap-0.5 border-l border-current/15 pl-1.5">
                    <button
                      type="button"
                      onClick={handlePrevMatch}
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
                      title="Artigo anterior nos resultados (↑)"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMatch}
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
                      title="Próximo artigo nos resultados (↓)"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
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

      {/* Footer com botão discreto de Atalhos */}
      {onOpenShortcuts && (
        <div
          style={{ borderColor: surface.borderColor }}
          className="p-2 border-t flex items-center justify-between text-xs"
        >
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="w-full py-1.5 px-2.5 rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100 flex items-center justify-between transition-colors text-[11px] cursor-pointer"
            title="Ver todos os atalhos de teclado (?)"
          >
            <span className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Atalhos de Teclado</span>
            </span>
            <kbd className="px-1.5 py-0.2 rounded border border-current/20 bg-black/5 dark:bg-white/10 font-mono text-[10px] font-bold">
              ?
            </kbd>
          </button>
        </div>
      )}
    </aside>
  );
};
