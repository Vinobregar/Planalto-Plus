import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  CornerDownRight,
  GitBranch,
  Network,
  Sparkles,
  X,
} from 'lucide-react';
import { ArticleBlock, ThemeMode } from '../types/legislation';
import { CrossReferenceGraph } from '../utils/crossReferenceGraph';

interface ArticleCrossRefPanelProps {
  article: ArticleBlock;
  graph: CrossReferenceGraph;
  articlesById: Record<string, ArticleBlock>;
  theme: ThemeMode;
  accentColor: string;
  onJumpToArticle: (articleId: string) => void;
  onClose: () => void;
}

export const ArticleCrossRefPanel: React.FC<ArticleCrossRefPanelProps> = ({
  article,
  graph,
  articlesById,
  theme,
  accentColor,
  onJumpToArticle,
  onClose,
}) => {
  const node = graph.nodes[article.id];
  const outgoing = useMemo(
    () =>
      (node?.outgoingIds || [])
        .map((id) => articlesById[id])
        .filter((a): a is ArticleBlock => Boolean(a)),
    [node, articlesById]
  );
  const incoming = useMemo(
    () =>
      (node?.incomingIds || [])
        .map((id) => articlesById[id])
        .filter((a): a is ArticleBlock => Boolean(a)),
    [node, articlesById]
  );

  const [previewArticle, setPreviewArticle] = useState<ArticleBlock | null>(
    outgoing[0] || incoming[0] || null
  );

  const panelBg =
    theme === 'dark'
      ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
      : theme === 'sepia'
      ? 'bg-[#faf8f4] border-[#dcd6ca] text-[#2c2825]'
      : 'bg-slate-50 border-slate-200 text-slate-800';

  const cardBg =
    theme === 'dark'
      ? 'bg-zinc-900 border-zinc-800'
      : theme === 'sepia'
      ? 'bg-[#f4f1ea] border-[#e4dfd5]'
      : 'bg-white border-slate-200';

  // Compute SVG layout positions for center node, left (incoming) nodes, and right (outgoing) nodes
  const svgWidth = 540;
  const svgHeight = Math.max(
    170,
    Math.max(incoming.length, outgoing.length, 1) * 46 + 40
  );
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`mt-3 p-4 rounded-2xl border shadow-md space-y-3.5 text-xs select-none ${panelBg}`}
    >
      <div className="flex items-center justify-between border-b border-current/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-indigo-500" />
          <span className="font-bold">
            Grafo de Remissões Cruzadas — {article.label}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
            {outgoing.length} citada(s) • {incoming.length} reversa(s)
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive SVG Node-Link Diagram */}
      <div
        className={`w-full overflow-x-auto rounded-xl border p-2 flex justify-center ${cardBg}`}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="max-w-full h-auto"
        >
          <defs>
            <marker
              id={`arrow-${article.id}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill={accentColor} opacity="0.7" />
            </marker>
          </defs>

          {/* Incoming Edges & Nodes (Left -> Center) */}
          {incoming.map((inc, idx) => {
            const step = svgHeight / (incoming.length + 1);
            const y = step * (idx + 1);
            const x = 85;
            const isSelected = previewArticle?.id === inc.id;
            return (
              <g
                key={`inc-${inc.id}`}
                onClick={() => setPreviewArticle(inc)}
                className="cursor-pointer"
              >
                <path
                  d={`M ${x + 48} ${y} C ${centerX - 60} ${y}, ${
                    centerX - 70
                  } ${centerY}, ${centerX - 56} ${centerY}`}
                  fill="none"
                  stroke={isSelected ? accentColor : 'currentColor'}
                  strokeOpacity={isSelected ? 0.9 : 0.25}
                  strokeWidth={isSelected ? 2.2 : 1.5}
                  strokeDasharray="4 2"
                  markerEnd={`url(#arrow-${article.id})`}
                />
                <rect
                  x={x - 48}
                  y={y - 14}
                  width={96}
                  height={28}
                  rx={8}
                  fill={isSelected ? accentColor : 'transparent'}
                  stroke={accentColor}
                  strokeOpacity={isSelected ? 1 : 0.45}
                  strokeWidth={1.5}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : 'currentColor'}
                  fontSize="11"
                  fontWeight="600"
                >
                  {inc.label}
                </text>
              </g>
            );
          })}

          {/* Outgoing Edges & Nodes (Center -> Right) */}
          {outgoing.map((out, idx) => {
            const step = svgHeight / (outgoing.length + 1);
            const y = step * (idx + 1);
            const x = svgWidth - 85;
            const isSelected = previewArticle?.id === out.id;
            return (
              <g
                key={`out-${out.id}`}
                onClick={() => setPreviewArticle(out)}
                className="cursor-pointer"
              >
                <path
                  d={`M ${centerX + 56} ${centerY} C ${
                    centerX + 70
                  } ${centerY}, ${centerX + 60} ${y}, ${x - 52} ${y}`}
                  fill="none"
                  stroke={isSelected ? accentColor : 'currentColor'}
                  strokeOpacity={isSelected ? 0.9 : 0.3}
                  strokeWidth={isSelected ? 2.2 : 1.5}
                  markerEnd={`url(#arrow-${article.id})`}
                />
                <rect
                  x={x - 48}
                  y={y - 14}
                  width={96}
                  height={28}
                  rx={8}
                  fill={isSelected ? accentColor : 'transparent'}
                  stroke={accentColor}
                  strokeOpacity={isSelected ? 1 : 0.55}
                  strokeWidth={1.5}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : 'currentColor'}
                  fontSize="11"
                  fontWeight="600"
                >
                  {out.label}
                </text>
              </g>
            );
          })}

          {/* Center Current Article Node */}
          <g>
            <rect
              x={centerX - 54}
              y={centerY - 18}
              width={108}
              height={36}
              rx={10}
              fill={accentColor}
            />
            <text
              x={centerX}
              y={centerY + 4}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="12"
              fontWeight="700"
            >
              {article.label}
            </text>
          </g>
        </svg>
      </div>

      {/* Lists of Direct & Reverse References */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-65 flex items-center gap-1">
            <CornerDownRight className="w-3 h-3 text-indigo-500" />
            Remete a ({outgoing.length})
          </span>
          {outgoing.length === 0 ? (
            <p className="text-[11px] opacity-50 italic">
              Nenhuma remissão direta encontrada neste artigo.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {outgoing.map((out) => (
                <button
                  key={out.id}
                  type="button"
                  onClick={() => setPreviewArticle(out)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    previewArticle?.id === out.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-current/15 hover:border-indigo-500'
                  }`}
                >
                  {out.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-65 flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3 text-emerald-500" />
            Citado por ({incoming.length})
          </span>
          {incoming.length === 0 ? (
            <p className="text-[11px] opacity-50 italic">
              Nenhum outro artigo cita este dispositivo diretamente.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {incoming.map((inc) => (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => setPreviewArticle(inc)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    previewArticle?.id === inc.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-current/15 hover:border-indigo-500'
                  }`}
                >
                  {inc.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Connected Article Live Preview Card */}
      {previewArticle && (
        <div
          className={`p-3.5 rounded-xl border space-y-2 select-text ${cardBg}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">
                Prévia: {previewArticle.label}
              </span>
              {previewArticle.sectionPath.length > 0 && (
                <span className="text-[10px] opacity-60">
                  {previewArticle.sectionPath.slice(-1)[0]}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onJumpToArticle(previewArticle.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors"
            >
              <span>Ir para {previewArticle.label}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="leading-relaxed opacity-90 text-xs">
            {previewArticle.caputText}
          </p>
          {previewArticle.subClauses.length > 0 && (
            <div className="pl-3 border-l-2 border-current/15 space-y-1 text-[11px] opacity-80">
              {previewArticle.subClauses.slice(0, 3).map((sc) => (
                <p key={sc.id}>
                  <strong>{sc.label}</strong> {sc.text}
                </p>
              ))}
              {previewArticle.subClauses.length > 3 && (
                <p className="italic opacity-65">
                  + {previewArticle.subClauses.length - 3} dispositivo(s)
                  interno(s)...
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CrossReferenceGraphModalProps {
  lawEpigraph: string;
  articles: ArticleBlock[];
  graph: CrossReferenceGraph;
  initialArticle?: ArticleBlock | null;
  theme: ThemeMode;
  accentColor: string;
  onJumpToArticle: (articleId: string) => void;
  onClose: () => void;
}

export const CrossReferenceGraphModal: React.FC<
  CrossReferenceGraphModalProps
> = ({
  lawEpigraph,
  articles,
  graph,
  initialArticle,
  theme,
  accentColor,
  onJumpToArticle,
  onClose,
}) => {
  const articlesById = useMemo(() => {
    const map: Record<string, ArticleBlock> = {};
    for (const a of articles) map[a.id] = a;
    return map;
  }, [articles]);

  // Rank articles with at least 1 incoming or outgoing reference
  const connectedArticles = useMemo(() => {
    return articles
      .filter((a) => {
        const n = graph.nodes[a.id];
        return n && (n.outgoingIds.length > 0 || n.incomingIds.length > 0);
      })
      .sort((a, b) => {
        const na = graph.nodes[a.id];
        const nb = graph.nodes[b.id];
        const scoreA =
          (na?.incomingIds.length || 0) * 2 + (na?.outgoingIds.length || 0);
        const scoreB =
          (nb?.incomingIds.length || 0) * 2 + (nb?.outgoingIds.length || 0);
        return scoreB - scoreA;
      });
  }, [articles, graph]);

  const [selectedHub, setSelectedHub] = useState<ArticleBlock | null>(
    initialArticle || connectedArticles[0] || articles[0] || null
  );

  const modalBg =
    theme === 'dark'
      ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
      : theme === 'sepia'
      ? 'bg-[#faf8f4] border-[#dcd6ca] text-[#2c2825]'
      : 'bg-white border-slate-200 text-slate-800';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${modalBg}`}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-current/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">
                Grafo Global de Remissões Cruzadas
              </h2>
              <p className="text-[11px] opacity-65 truncate max-w-lg">
                {lawEpigraph} • {graph.edges.length} conexões identificadas entre{' '}
                {connectedArticles.length} artigos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Connected Hubs List */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-current/10 overflow-y-auto p-3 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-65 px-2 pb-1">
              Artigos Conectados ({connectedArticles.length})
            </div>
            {connectedArticles.length === 0 ? (
              <div className="p-4 text-xs opacity-60 text-center">
                Nenhuma remissão interna explícita encontrada nesta lei. Dica:
                você também pode citar outros artigos nas suas Notas (ex: "Ver
                art. 5º") para criar conexões no grafo!
              </div>
            ) : (
              connectedArticles.map((art) => {
                const n = graph.nodes[art.id];
                const isSelected = selectedHub?.id === art.id;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => setSelectedHub(art)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm'
                        : 'border-current/10 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate">{art.label}</div>
                      <div
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-white/80' : 'opacity-65'
                        }`}
                      >
                        {art.caputText.slice(0, 50)}...
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {(n?.incomingIds.length || 0) +
                        (n?.outgoingIds.length || 0)}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Interactive Node Graph for Selected Article */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedHub ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                      Artigo Central em Inspeção
                    </span>
                    <h3 className="text-base font-extrabold">
                      {selectedHub.label}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToArticle(selectedHub.id);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
                  >
                    <span>Ir para {selectedHub.label} na Lei</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs leading-relaxed opacity-85 p-3 rounded-xl border border-current/10 bg-black/[0.02] dark:bg-white/[0.02]">
                  {selectedHub.caputText}
                </p>

                <ArticleCrossRefPanel
                  article={selectedHub}
                  graph={graph}
                  articlesById={articlesById}
                  theme={theme}
                  accentColor={accentColor}
                  onJumpToArticle={(targetId) => {
                    onJumpToArticle(targetId);
                    onClose();
                  }}
                  onClose={onClose}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs opacity-60">
                Selecione um artigo à esquerda para visualizar o grafo de
                remissões.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
