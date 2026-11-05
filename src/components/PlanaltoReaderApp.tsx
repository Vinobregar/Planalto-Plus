import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  HelpCircle,
  Library,
  MessageSquare,
  PanelLeftOpen,
  PanelRightOpen,
  Quote,
  Scale,
  Search,
  Type,
  X,
} from 'lucide-react';
import {
  AIConfig,
  AppearanceSettings,
  ArticleAnnotation,
  ArticleBlock,
  ChatMessage,
  EditalArticleMatch,
  FlashcardGenerationParams,
  FlashcardItem,
  HighlightTag,
  LegislationDocument,
  QuizGenerationParams,
  QuizQuestion,
} from '../types/legislation';
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_APPEARANCE,
  DEFAULT_HIGHLIGHT_TAGS,
  RELEVANT_BRAZILIAN_LAWS,
  computeProportionalAppearance,
  formatLawAbntCitation,
  getCommonLawName,
  loadAIConfig,
  loadAppearanceSettings,
  loadHighlightTags,
  loadLawAnnotations,
  resolveHighlightTag,
  saveAIConfig,
  saveAppearanceSettings,
  saveHighlightTags,
  saveLawAnnotations,
} from '../storage/storageService';
import {
  DEFAULT_FLASHCARD_PARAMS,
  DEFAULT_QUIZ_PARAMS,
  analyzeEditalAndSelectArticles,
  explainArticleWithAI,
  generateArticleQuizWithAI,
  generateFlashcardsWithAI,
  sendLegalChatWithAI,
  summarizeArticleJurisprudenceWithAI,
} from '../services/aiService';
import { TocSidebar } from './TocSidebar';
import { normalizeArticleNumberKey } from '../utils/crossReferenceGraph';
import {
  AppearancePopover,
  FONT_FAMILY_CSS,
  computeThemeColors,
} from './AppearancePopover';
import {
  ArticleItem,
  ModificationNoteBadge,
  hexToRgba,
} from './ArticleItem';
import { CadernoSubTab, RightDrawer, RightDrawerTab } from './RightDrawer';
import { buildCrossReferenceGraph } from '../utils/crossReferenceGraph';
import { CrossReferenceGraphModal } from './CrossReferenceGraphModal';

interface PlanaltoReaderAppProps {
  doc: LegislationDocument;
  onToggleOriginalView: () => void;
}

export const PlanaltoReaderApp: React.FC<PlanaltoReaderAppProps> = ({
  doc,
  onToggleOriginalView,
}) => {
  const [appearance, setAppearance] = useState<AppearanceSettings>(() =>
    computeProportionalAppearance()
  );
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [highlightTags, setHighlightTags] = useState<HighlightTag[]>(
    DEFAULT_HIGHLIGHT_TAGS
  );
  const [annotations, setAnnotations] = useState<
    Record<string, ArticleAnnotation>
  >({});

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [rightDrawerTab, setRightDrawerTab] = useState<RightDrawerTab>('notes');
  const [cadernoSubTab, setCadernoSubTab] = useState<CadernoSubTab>('grifos');

  // Shared search query between Sumário (left sidebar) and Centered Top Search Bar
  const [searchQuery, setSearchQuery] = useState('');
  const [showTopSearchDropdown, setShowTopSearchDropdown] = useState(false);

  // Floating menu states
  const [showAppearancePopover, setShowAppearancePopover] = useState(false);
  const [showLawsMenu, setShowLawsMenu] = useState(false);
  const [showCrossRefModal, setShowCrossRefModal] = useState(false);
  const [crossRefModalArticle, setCrossRefModalArticle] =
    useState<ArticleBlock | null>(null);
  const [lawSearchQuery, setLawSearchQuery] = useState('');
  const [copiedAbnt, setCopiedAbnt] = useState(false);

  const [focusedArticleId, setFocusedArticleId] = useState<string | null>(
    doc.articles[0]?.id || null
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizParams, setQuizParams] =
    useState<QuizGenerationParams>(DEFAULT_QUIZ_PARAMS);
  const [previousQuizStatements, setPreviousQuizStatements] = useState<
    string[]
  >([]);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [flashcardParams, setFlashcardParams] =
    useState<FlashcardGenerationParams>(DEFAULT_FLASHCARD_PARAMS);
  const [editalMatches, setEditalMatches] = useState<EditalArticleMatch[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const readerScrollRef = useRef<HTMLDivElement | null>(null);
  const lawsMenuRef = useRef<HTMLDivElement | null>(null);
  const appearanceMenuRef = useRef<HTMLDivElement | null>(null);
  const topSearchRef = useRef<HTMLDivElement | null>(null);

  const crossRefGraph = useMemo(
    () => buildCrossReferenceGraph(doc.articles, annotations),
    [doc.articles, annotations]
  );

  const commonLawName = useMemo(() => getCommonLawName(doc), [doc]);
  const abntCitation = useMemo(() => formatLawAbntCitation(doc), [doc]);

  // Map each article ID to its preceding article for "artigo anterior" links
  const previousArticleById = useMemo(() => {
    const map: Record<string, ArticleBlock | null> = {};
    for (let i = 0; i < doc.articles.length; i++) {
      map[doc.articles[i].id] = i > 0 ? doc.articles[i - 1] : null;
    }
    return map;
  }, [doc.articles]);

  // Top search bar matching articles
  const topSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    // Check if query is targeting an article number (e.g. "155", "art 155", "art. 155", "artigo 155", "155º", "155-A", "155a")
    const cleanQuery = q.replace(/[º°.]/g, '').trim();
    const articleNumPattern = /^(?:art(?:igo)?\s*)?(\d+[\w-]*)$/i;
    const numMatch = articleNumPattern.exec(cleanQuery);

    if (numMatch) {
      const target = normalizeArticleNumberKey(numMatch[1]);
      const cleanTarget = target.replace(/-/g, '');
      return doc.articles
        .filter((art) => {
          if (appearance.compiledMode && art.isRevoked) return false;
          const artKey = normalizeArticleNumberKey(art.number);
          const cleanArtKey = artKey.replace(/-/g, '');
          return artKey === target || cleanArtKey === cleanTarget;
        })
        .slice(0, 20);
    }

    return doc.articles
      .filter((art) => {
        if (appearance.compiledMode && art.isRevoked) return false;
        const noteText = annotations[art.id]?.note?.toLowerCase() || '';
        return (
          art.label.toLowerCase().includes(q) ||
          art.number.toLowerCase().includes(q) ||
          art.caputText.toLowerCase().includes(q) ||
          art.subClauses.some((sub) => sub.text.toLowerCase().includes(q)) ||
          noteText.includes(q)
        );
      })
      .slice(0, 20);
  }, [searchQuery, doc.articles, appearance.compiledMode, annotations]);

  // Load saved state on mount
  useEffect(() => {
    loadAppearanceSettings().then((loaded) => {
      setAppearance(loaded);
      if (loaded.hideAITools) {
        setRightDrawerTab('notes');
      }
    });
    loadAIConfig().then(setAiConfig);
    loadHighlightTags().then(setHighlightTags);
    loadLawAnnotations(doc.lawId).then(setAnnotations);
  }, [doc.lawId]);

  // Close floating menus when clicking outside (Shadow DOM aware via composedPath)
  useEffect(() => {
    if (!showAppearancePopover && !showLawsMenu && !showTopSearchDropdown) {
      return;
    }

    const handlePointerDownOutside = (event: MouseEvent) => {
      const path = event.composedPath ? event.composedPath() : [];
      const isInside = (ref: React.RefObject<HTMLElement | null>) => {
        if (!ref.current) return false;
        return (
          path.includes(ref.current) ||
          ref.current.contains(event.target as Node)
        );
      };

      if (showLawsMenu && !isInside(lawsMenuRef)) {
        setShowLawsMenu(false);
      }
      if (showAppearancePopover && !isInside(appearanceMenuRef)) {
        setShowAppearancePopover(false);
      }
      if (showTopSearchDropdown && !isInside(topSearchRef)) {
        setShowTopSearchDropdown(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDownOutside, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDownOutside, true);
    };
  }, [showAppearancePopover, showLawsMenu, showTopSearchDropdown]);

  const handleUpdateAppearance = (next: AppearanceSettings) => {
    setAppearance(next);
    saveAppearanceSettings(next);
  };

  const handleToggleHideAI = (hide: boolean) => {
    const next = { ...appearance, hideAITools: hide };
    setAppearance(next);
    saveAppearanceSettings(next);
    if (hide && rightDrawerTab !== 'notes') {
      setRightDrawerTab('notes');
    }
  };

  const handleUpdateAIConfig = (next: AIConfig) => {
    setAiConfig(next);
    saveAIConfig(next);
    setAiError(null);
  };

  const handleUpdateHighlightTags = (next: HighlightTag[]) => {
    setHighlightTags(next);
    saveHighlightTags(next);
  };

  const handleUpdateAnnotation = (next: ArticleAnnotation) => {
    setAnnotations((prev) => {
      const updated = { ...prev, [next.articleId]: next };
      saveLawAnnotations(doc.lawId, updated);
      return updated;
    });
  };

  const handleImportAnnotations = (
    imported: Record<string, ArticleAnnotation>,
    importedTags?: HighlightTag[]
  ) => {
    setAnnotations(imported);
    saveLawAnnotations(doc.lawId, imported);
    if (importedTags && Array.isArray(importedTags) && importedTags.length > 0) {
      setHighlightTags(importedTags);
      saveHighlightTags(importedTags);
    }
  };

  const handleCopyAbntCitation = () => {
    navigator.clipboard?.writeText(abntCitation);
    setCopiedAbnt(true);
    setTimeout(() => setCopiedAbnt(false), 2200);
  };

  const focusedArticle: ArticleBlock | null =
    doc.articles.find((a) => a.id === focusedArticleId) ||
    doc.articles[0] ||
    null;

  const scrollToElementId = (elementId: string) => {
    const container = readerScrollRef.current;
    if (!container) return;
    const rootNode = container.getRootNode() as Document | ShadowRoot;
    const target = rootNode.getElementById(elementId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectArticleFromToc = (articleId: string) => {
    setFocusedArticleId(articleId);
    scrollToElementId(articleId);
  };

  const handleSelectHeadingFromToc = (headingId: string) => {
    scrollToElementId(headingId);
  };

  // AI Actions
  const handleExplainArticle = async (article: ArticleBlock) => {
    setFocusedArticleId(article.id);
    setRightDrawerOpen(true);
    setRightDrawerTab('chat');
    setAiError(null);

    const hasKey = Boolean(aiConfig.apiKeys[aiConfig.provider]?.trim());
    if (!hasKey) {
      setAiError(
        `Chave de API (${aiConfig.provider.toUpperCase()}) não configurada. Acesse o menu IA Chat > Chave API para inserir sua chave gratuita e utilizar a IA.`
      );
      return;
    }

    setIsLoadingAI(true);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: `Explique detalhadamente o ${article.label} com foco em doutrina e provas da OAB / Concursos.`,
      articleContext: article.label,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await explainArticleWithAI(
        aiConfig,
        doc.epigraph,
        article
      );
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: reply,
        articleContext: article.label,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSummarizeJurisprudence = async (article: ArticleBlock) => {
    setFocusedArticleId(article.id);
    setRightDrawerOpen(true);
    setRightDrawerTab('chat');
    setAiError(null);

    const hasKey = Boolean(aiConfig.apiKeys[aiConfig.provider]?.trim());
    if (!hasKey) {
      setAiError(
        `Chave de API (${aiConfig.provider.toUpperCase()}) não configurada. Acesse o menu IA Chat > Chave API para inserir sua chave gratuita e utilizar a IA.`
      );
      return;
    }

    setIsLoadingAI(true);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: `Sintetize as súmulas e a jurisprudência dominante do STF e STJ sobre o ${article.label}.`,
      articleContext: article.label,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await summarizeArticleJurisprudenceWithAI(
        aiConfig,
        doc.epigraph,
        article
      );
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: reply,
        articleContext: article.label,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleGenerateQuiz = async (
    article: ArticleBlock | null,
    customTopic?: string,
    customParams?: QuizGenerationParams
  ) => {
    const activeParams = customParams || quizParams;
    if (article) setFocusedArticleId(article.id);
    setRightDrawerOpen(true);
    setRightDrawerTab('quiz');
    setAiError(null);

    const hasKey = Boolean(aiConfig.apiKeys[aiConfig.provider]?.trim());
    if (!hasKey) {
      setAiError(
        `Chave de API (${aiConfig.provider.toUpperCase()}) não configurada. Configure sua chave no menu IA Chat > Chave API para gerar questões personalizadas.`
      );
      return;
    }

    setIsLoadingAI(true);
    try {
      const questions = await generateArticleQuizWithAI(
        aiConfig,
        doc.epigraph,
        article,
        customTopic,
        previousQuizStatements,
        activeParams
      );
      setQuizQuestions(questions);
      if (questions.length > 0) {
        setPreviousQuizStatements((prev) => [
          ...prev,
          ...questions.map((q) => q.statement).filter(Boolean),
        ]);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleGenerateFlashcards = async (
    customParams?: FlashcardGenerationParams
  ) => {
    const activeParams = customParams || flashcardParams;
    setRightDrawerOpen(true);
    setRightDrawerTab('quiz');
    setAiError(null);

    const highlightedArticleIds = new Set(
      Object.values(annotations)
        .filter(
          (a) => Boolean(a.wholeHighlightColor) || a.textHighlights.length > 0
        )
        .map((a) => a.articleId)
    );
    const highlightedArticles = doc.articles.filter((a) =>
      highlightedArticleIds.has(a.id)
    );

    const hasKey = Boolean(aiConfig.apiKeys[aiConfig.provider]?.trim());
    if (!hasKey) {
      setAiError(
        `Chave de API (${aiConfig.provider.toUpperCase()}) não configurada. Configure sua chave no menu IA Chat > Chave API para gerar flashcards.`
      );
      return;
    }

    setIsLoadingAI(true);
    try {
      const generated = await generateFlashcardsWithAI(
        aiConfig,
        doc,
        focusedArticle,
        highlightedArticles,
        activeParams
      );
      setFlashcards(generated);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleAnalyzeEdital = async (
    fileName: string,
    extractedText: string,
    pdfBase64: string | undefined,
    targetTagId: string,
    addReasonToNotes: boolean
  ) => {
    setAiError(null);
    setIsLoadingAI(true);

    try {
      const matches = await analyzeEditalAndSelectArticles(
        aiConfig,
        doc,
        fileName,
        extractedText,
        pdfBase64
      );

      setEditalMatches(matches);

      if (matches.length > 0) {
        const tagObj = resolveHighlightTag(targetTagId, highlightTags);
        const tagLabel = tagObj?.name || 'Edital';

        setAnnotations((prev) => {
          const next = { ...prev };
          for (const m of matches) {
            const existing = next[m.articleId] || {
              articleId: m.articleId,
              articleLabel: m.articleLabel,
              textHighlights: [],
              note: '',
              collapsed: false,
              updatedAt: new Date().toISOString(),
            };
            const editalNoteLine = `[Edital — ${m.editalTopic}]: ${m.reason}`;
            const updatedNote = addReasonToNotes
              ? existing.note.includes(editalNoteLine)
                ? existing.note
                : existing.note.trim()
                ? `${existing.note.trim()}\n\n${editalNoteLine}`
                : editalNoteLine
              : existing.note;

            next[m.articleId] = {
              ...existing,
              wholeHighlightColor: targetTagId,
              note: updatedNote,
              updatedAt: new Date().toISOString(),
            };
          }
          saveLawAnnotations(doc.lawId, next);
          return next;
        });

        handleSelectArticleFromToc(matches[0].articleId);
        void tagLabel;
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSendChat = async (text: string) => {
    setAiError(null);

    const hasKey = Boolean(aiConfig.apiKeys[aiConfig.provider]?.trim());
    if (!hasKey) {
      setAiError(
        `Chave de API (${aiConfig.provider.toUpperCase()}) não configurada. Acesse o menu IA Chat > Chave API para inserir sua chave gratuita e enviar mensagens à IA.`
      );
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: text,
      articleContext: focusedArticle?.label,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setIsLoadingAI(true);

    try {
      const reply = await sendLegalChatWithAI(
        aiConfig,
        doc.epigraph,
        focusedArticle,
        nextHistory,
        text
      );
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: reply,
        articleContext: focusedArticle?.label,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSelectQuizAnswer = (questionId: string, letter: string) => {
    setQuizQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, userAnswer: letter } : q))
    );
  };

  const themeColors = computeThemeColors(appearance);

  const rootThemeClass =
    appearance.theme === 'dark'
      ? 'dark text-zinc-100'
      : appearance.theme === 'sepia'
      ? 'text-[#2c2825]'
      : 'text-slate-900';

  const dropdownThemeClass =
    appearance.theme === 'dark'
      ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
      : appearance.theme === 'sepia'
      ? 'bg-[#faf8f4] border-[#e2ddd3] text-[#2c2825]'
      : 'bg-white border-slate-200 text-slate-800';

  const annotationCount = Object.values(annotations).filter(
    (a) =>
      a.note.trim().length > 0 ||
      Boolean(a.wholeHighlightColor) ||
      a.textHighlights.length > 0
  ).length;

  const filteredLaws = RELEVANT_BRAZILIAN_LAWS.filter((law) => {
    const q = lawSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      law.shortName.toLowerCase().includes(q) ||
      law.fullName.toLowerCase().includes(q) ||
      law.category.toLowerCase().includes(q)
    );
  });

  const activeFontCss =
    FONT_FAMILY_CSS[appearance.fontFamily] || FONT_FAMILY_CSS.sans;
  const currentAccent = appearance.accentColor || '#6366f1';

  const isConstitution = useMemo(() => {
    return (
      doc.lawId.includes('constituicao') ||
      /constitui[çc][ãa]o/i.test(doc.epigraph) ||
      /constitui[çc][ãa]o/i.test(commonLawName)
    );
  }, [doc.lawId, doc.epigraph, commonLawName]);

  const openCadernoSubTab = (subTab: CadernoSubTab) => {
    setRightDrawerTab('notes');
    setCadernoSubTab(subTab);
    setRightDrawerOpen(true);
  };

  return (
    <div
      style={
        {
          fontFamily: activeFontCss,
          backgroundColor: themeColors.mainBg,
          '--app-font-family': activeFontCss,
          '--app-accent': currentAccent,
          '--app-accent-soft': hexToRgba(currentAccent, 0.14),
        } as React.CSSProperties
      }
      className={`planalto-app-root fixed inset-0 w-screen h-screen flex flex-col overflow-hidden transition-colors duration-150 ${rootThemeClass}`}
    >
      {/* Top Minimal Uncluttered Header Bar - Strictly Single-Row & Non-Wrapping */}
      <header
        style={{
          backgroundColor: themeColors.panelBg,
          borderColor: themeColors.borderColor,
        }}
        className="h-12 px-2.5 sm:px-4 border-b backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-2.5 shrink-0 z-30 select-none whitespace-nowrap overflow-x-clip"
      >
        {/* Left: Sumário Toggle, Common Law Title & Relevant Laws Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
          {!leftSidebarOpen && (
            <button
              type="button"
              onClick={() => setLeftSidebarOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium shrink-0 whitespace-nowrap"
              title="Abrir Sumário"
            >
              <PanelLeftOpen className="w-4 h-4 text-indigo-500" />
              <span className="hidden md:inline">Sumário</span>
            </button>
          )}

          {/* Common Law Title as Relevant Laws Dropdown Button */}
          <div ref={lawsMenuRef} className="relative min-w-0">
            <button
              type="button"
              onClick={() => {
                setShowLawsMenu((v) => !v);
                setShowAppearancePopover(false);
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border transition-colors min-w-0 ${
                showLawsMenu
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent hover:border-current/15 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title={`${commonLawName} (${doc.epigraph}) — Clique para alternar para outras leis relevantes`}
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Scale className="w-3.5 h-3.5" />
              </div>
              <h1 className="font-bold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[200px] md:max-w-[260px] lg:max-w-[320px]">
                {commonLawName}
              </h1>
              <ChevronDown
                className={`w-3.5 h-3.5 opacity-75 shrink-0 transition-transform duration-150 ${
                  showLawsMenu ? 'rotate-180 text-indigo-500 opacity-100' : ''
                }`}
              />
            </button>

            {showLawsMenu && (
              <div
                style={{
                  backgroundColor: themeColors.cardBg,
                  borderColor: themeColors.borderColor,
                }}
                className={`absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl p-3 space-y-2.5 z-50 ${dropdownThemeClass}`}
              >
                <div className="flex items-center justify-between border-b border-current/10 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Library className="w-3.5 h-3.5 text-indigo-500" />
                    Legislações & Códigos Relevantes
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    value={lawSearchQuery}
                    onChange={(e) => setLawSearchQuery(e.target.value)}
                    placeholder="Buscar lei (ex: CLT, Penal, Civil, OAB)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-current/15 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                  {filteredLaws.map((law) => (
                    <a
                      key={law.id}
                      href={law.url}
                      onClick={() => setShowLawsMenu(false)}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-indigo-500/10 transition-colors group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs group-hover:text-indigo-500">
                            {law.shortName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 opacity-70">
                            {law.category}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-70 truncate">
                          {law.fullName}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-indigo-500 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Search Bar Centered in Top Header (Flexibly shrinks to guarantee no row wrapping) */}
        <div
          ref={topSearchRef}
          className="relative flex-1 min-w-[90px] max-w-[160px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[360px] mx-1 sm:mx-2"
        >
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setShowTopSearchDropdown(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowTopSearchDropdown(true);
            }}
            placeholder="Buscar..."
            className="w-full pl-7 pr-7 py-1.5 rounded-xl border border-current/15 bg-black/[0.03] dark:bg-white/[0.04] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:truncate"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowTopSearchDropdown(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100"
              title="Limpar busca"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Live Search Results Dropdown for Centered Top Search Bar */}
          {showTopSearchDropdown && searchQuery.trim().length > 0 && (
            <div
              style={{
                backgroundColor: themeColors.cardBg,
                borderColor: themeColors.borderColor,
              }}
              className={`absolute left-0 right-0 mt-2 rounded-2xl border shadow-2xl p-2 max-h-80 overflow-y-auto z-50 ${dropdownThemeClass}`}
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center justify-between">
                <span>Resultados na Lei</span>
                <span>{topSearchResults.length} encontrados</span>
              </div>
              {topSearchResults.length === 0 ? (
                <div className="p-4 text-center text-xs opacity-60">
                  Nenhum artigo encontrado para "{searchQuery}".
                </div>
              ) : (
                <div className="space-y-1 mt-1">
                  {topSearchResults.map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => {
                        handleSelectArticleFromToc(art.id);
                        setShowTopSearchDropdown(false);
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-indigo-500/10 transition-colors flex flex-col gap-0.5"
                    >
                      <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {art.label}
                      </span>
                      <p className="text-[11px] opacity-80 line-clamp-2 leading-snug">
                        {art.caputText}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick Controls (Texto Compilado, Appearance, Caderno, IA Chat, Original View) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 relative justify-end whitespace-nowrap">
          {/* Texto Compilado Toggle with Rich Custom Tooltip */}
          <div className="relative group/compilado shrink-0">
            <button
              type="button"
              onClick={() =>
                handleUpdateAppearance({
                  ...appearance,
                  compiledMode: !appearance.compiledMode,
                })
              }
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 whitespace-nowrap ${
                appearance.compiledMode
                  ? appearance.theme === 'dark'
                    ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300 shadow-sm font-semibold'
                    : appearance.theme === 'sepia'
                    ? 'border-emerald-800/40 bg-emerald-800/15 text-emerald-950 shadow-sm font-semibold'
                    : 'border-emerald-700/50 bg-emerald-700/15 text-emerald-800 shadow-sm font-semibold'
                  : 'border-current/15 opacity-75 hover:opacity-100'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Texto Compilado</span>
              <HelpCircle className="w-3 h-3 opacity-60" />
            </button>

            {/* Explanatory Tooltip on Hover */}
            <div
              style={{
                backgroundColor: themeColors.cardBg,
                borderColor: themeColors.borderColor,
              }}
              className={`pointer-events-none opacity-0 group-hover/compilado:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-2 w-80 sm:w-96 p-3 rounded-xl border shadow-xl text-[11px] leading-relaxed whitespace-normal break-words z-50 ${dropdownThemeClass}`}
            >
              <div
                className={`font-bold mb-1 flex items-center gap-1 ${
                  appearance.theme === 'dark'
                    ? 'text-emerald-400'
                    : appearance.theme === 'sepia'
                    ? 'text-emerald-900'
                    : 'text-emerald-700'
                }`}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>O que é o Texto Compilado?</span>
              </div>
              <p className="opacity-85 whitespace-normal break-words">
                Quando ativado, oculta automaticamente os dispositivos revogados
                (textos riscados) e minimiza anotações legislativas como{' '}
                <em>"(Redação dada / Incluído pela Lei nº X)"</em> em pequenos
                ícones com tooltip para uma leitura limpa.
              </p>
            </div>
          </div>

          {/* Appearance Popover Button */}
          <div ref={appearanceMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowAppearancePopover((v) => !v);
                setShowLawsMenu(false);
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 whitespace-nowrap ${
                showAppearancePopover
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'border-current/15 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title="Tema (Claro/Sépia/Escuro), Cor de Destaque, Fonte e Espaçamento"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Aparência</span>
            </button>

            {showAppearancePopover && (
              <div className="absolute right-0 mt-2 z-50">
                <AppearancePopover
                  settings={appearance}
                  onChange={handleUpdateAppearance}
                  onClose={() => setShowAppearancePopover(false)}
                />
              </div>
            )}
          </div>

          {/* Caderno Button (Contains Grifos & Tags and Anotações sub-tabs) */}
          <button
            type="button"
            onClick={() => {
              setRightDrawerTab('notes');
              setRightDrawerOpen((open) =>
                rightDrawerTab === 'notes' ? !open : true
              );
            }}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 whitespace-nowrap ${
              rightDrawerOpen && rightDrawerTab === 'notes'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-current/15 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Caderno (Grifos & Tags e Anotações)"
          >
            <BookMarked className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden lg:inline">Caderno</span>
            {annotationCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                {annotationCount}
              </span>
            )}
          </button>

          {/* IA Chat Button (contains Chat, Importar Edital, Chave API, and Ocultar IA) */}
          {!appearance.hideAITools && (
            <button
              type="button"
              onClick={() => {
                setRightDrawerTab('chat');
                setRightDrawerOpen((open) =>
                  rightDrawerTab === 'chat' ? !open : true
                );
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 whitespace-nowrap ${
                rightDrawerOpen && rightDrawerTab === 'chat'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-current/15 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title="Abrir IA Chat (Conversa, Importar Edital, Chave API e Ocultar IA)"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden lg:inline">IA Chat</span>
            </button>
          )}

          {/* Switch back to Original Planalto View */}
          <button
            type="button"
            onClick={onToggleOriginalView}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 text-xs opacity-75 hover:opacity-100 shrink-0 whitespace-nowrap"
            title="Alternar para o layout original do Planalto"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Original</span>
          </button>

          {!rightDrawerOpen && (
            <button
              type="button"
              onClick={() => setRightDrawerOpen(true)}
              className="p-1.5 rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
              title="Expandir painel lateral direito"
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main 3-Zone Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Zone 1: Left Collapsible Hierarchical Sumário Sidebar */}
        {leftSidebarOpen && (
          <TocSidebar
            toc={doc.toc}
            articles={doc.articles}
            annotations={annotations}
            activeArticleId={focusedArticleId}
            compiledMode={appearance.compiledMode}
            appearance={appearance}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSelectHeading={handleSelectHeadingFromToc}
            onSelectArticle={handleSelectArticleFromToc}
            onCollapse={() => setLeftSidebarOpen(false)}
          />
        )}

        {/* Zone 2: Center Legislation Reader */}
        <main
          ref={readerScrollRef}
          style={{ fontFamily: activeFontCss }}
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 scroll-smooth"
        >
          <div
            style={{
              maxWidth: `${appearance.maxWidth}px`,
              fontSize: `${appearance.fontSize}px`,
              lineHeight: appearance.lineHeight,
              fontFamily: activeFontCss,
            }}
            className="mx-auto pb-28"
          >
            {/* Law Epigraph, Article Count Above Ementa & Serif Quote Boxes (Ementa + Preâmbulo) */}
            <div
              style={{
                backgroundColor: themeColors.panelBg,
                borderColor: themeColors.borderColor,
              }}
              className="mb-8 p-6 rounded-2xl border transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Presidência da República • Legislação Federal
                </div>

                {/* Article Count Badge Moved Above Ementa */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <FileText className="w-3.5 h-3.5" />
                  {doc.articles.length} artigos nesta norma
                </span>
              </div>

              {/* Official Epigraph Title Preserved in the Body of the Law */}
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-4">
                {doc.epigraph}
              </h2>

              {/* Top cross-reference hyperlinks / remissões at the beginning of the law */}
              {doc.headerLinks && doc.headerLinks.length > 0 && (
                <div
                  style={{
                    backgroundColor: themeColors.cardBg,
                    borderColor: themeColors.borderColor,
                  }}
                  className="my-3 p-3 rounded-xl border shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    <ExternalLink className="w-3 h-3" />
                    <span>Atos Vinculados & Remissões</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {doc.headerLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-current/15 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-colors"
                        title={link.text}
                      >
                        <span>{link.text}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Ementa in a dedicated Quote Box with Explicit Serif font + ABNT Citation Copy Icon at the bottom (Leis comuns) */}
              {!isConstitution && doc.ementa && (
                <blockquote
                  style={{
                    fontFamily: FONT_FAMILY_CSS.serif,
                    backgroundColor: themeColors.cardBg,
                    borderColor: themeColors.borderColor,
                  }}
                  className="font-serif relative p-4 sm:p-5 rounded-xl border border-l-4 border-l-indigo-500 shadow-sm my-3"
                >
                  <div className="flex items-start gap-3">
                    <Quote className="w-5 h-5 text-indigo-500/70 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <span
                        style={{ fontFamily: FONT_FAMILY_CSS.sans }}
                        className="block text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400"
                      >
                        Ementa Oficial
                      </span>
                      <p className="text-sm sm:text-base italic leading-relaxed">
                        “{doc.ementa}”
                      </p>
                    </div>
                  </div>

                  {/* Bottom of Ementa: Copy Law as ABNT Citation */}
                  <div
                    style={{ fontFamily: FONT_FAMILY_CSS.sans }}
                    className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-end"
                  >
                    <button
                      type="button"
                      onClick={handleCopyAbntCitation}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-current/15 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title={`Copiar citação ABNT: ${abntCitation}`}
                    >
                      {copiedAbnt ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Citação ABNT copiada!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 opacity-75" />
                          <span>Copiar citação ABNT</span>
                        </>
                      )}
                    </button>
                  </div>
                </blockquote>
              )}

              {/* Preâmbulo destacado como se ementa fosse (Apenas na Constituição Federal) */}
              {isConstitution && doc.preambulo.length > 0 && (
                <blockquote
                  style={{
                    fontFamily: FONT_FAMILY_CSS.serif,
                    backgroundColor: themeColors.cardBg,
                    borderColor: themeColors.borderColor,
                  }}
                  className="font-serif relative p-4 sm:p-5 rounded-xl border border-l-4 border-l-indigo-500 shadow-sm my-3"
                >
                  <div className="flex items-start gap-3">
                    <Quote className="w-5 h-5 text-indigo-500/70 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <span
                        style={{ fontFamily: FONT_FAMILY_CSS.sans }}
                        className="block text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400"
                      >
                        Preâmbulo
                      </span>
                      {doc.preambulo
                        .filter((p) => !/^PRE[ÂA]MBULO$/i.test(p.trim()))
                        .map((p, idx) => (
                          <p
                            key={idx}
                            className="text-sm sm:text-base italic leading-relaxed"
                          >
                            “{p}”
                          </p>
                        ))}
                    </div>
                  </div>

                  {/* Bottom of Preâmbulo: Copy Law as ABNT Citation */}
                  <div
                    style={{ fontFamily: FONT_FAMILY_CSS.sans }}
                    className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-end"
                  >
                    <button
                      type="button"
                      onClick={handleCopyAbntCitation}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-current/15 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title={`Copiar citação ABNT: ${abntCitation}`}
                    >
                      {copiedAbnt ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Citação ABNT copiada!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 opacity-75" />
                          <span>Copiar citação ABNT</span>
                        </>
                      )}
                    </button>
                  </div>
                </blockquote>
              )}

              {/* Preâmbulo em leis ordinárias / códigos (Texto introdutório não destacado como ementa) */}
              {!isConstitution && doc.preambulo.length > 0 && (
                <div className="text-xs sm:text-sm opacity-80 font-sans my-3 px-1 leading-relaxed italic">
                  {doc.preambulo
                    .filter((p) => !/^PRE[ÂA]MBULO$/i.test(p.trim()))
                    .map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                </div>
              )}
            </div>

            {/* Structured Blocks (Headings + Articles + Text) */}
            {doc.blocks.map((block) => {
              if (block.kind === 'heading') {
                const { node } = block;
                const isMajor =
                  node.level === 'parte' ||
                  node.level === 'livro' ||
                  node.level === 'titulo';
                const isAdctRoot =
                  node.isAdct &&
                  /^ATO\s+DAS\s+DISPOSI[ÇC][ÕO]ES/i.test(node.title);

                return (
                  <React.Fragment key={node.id}>
                    {isAdctRoot && (
                      <div
                        id={node.id}
                        className="my-12 p-6 rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 text-center space-y-2"
                      >
                        <span className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-widest">
                          Transição Constitucional • ADCT
                        </span>
                        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                          {node.title}
                        </h3>
                        <p className="text-xs sm:text-sm opacity-75">
                          Início do Ato das Disposições Constitucionais
                          Transitórias.
                        </p>
                      </div>
                    )}

                    {!isAdctRoot && (
                      <div
                        id={node.id}
                        className={`my-8 pt-4 text-center ${
                          isMajor ? 'border-t border-current/10 pt-8' : ''
                        }`}
                      >
                        <div
                          className={`font-bold tracking-wide uppercase ${
                            isMajor
                              ? 'text-lg sm:text-xl text-indigo-600 dark:text-indigo-400'
                              : 'text-base sm:text-lg opacity-90'
                          }`}
                        >
                          {node.title}
                        </div>
                        {node.subtitle && node.level !== 'parte' && (
                          <div className="text-sm sm:text-base font-medium opacity-75 mt-1">
                            {node.subtitle}
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              }

              if (block.kind === 'article') {
                const { article } = block;
                return (
                  <ArticleItem
                    key={article.id}
                    article={article}
                    previousArticle={previousArticleById[article.id]}
                    lawEpigraph={doc.epigraph}
                    annotation={annotations[article.id]}
                    highlightTags={highlightTags}
                    appearance={appearance}
                    crossRefGraph={crossRefGraph}
                    isFocused={focusedArticleId === article.id}
                    onFocus={() => setFocusedArticleId(article.id)}
                    onJumpToArticle={handleSelectArticleFromToc}
                    onOpenCrossRefGraphForArticle={(targetArt) => {
                      setCrossRefModalArticle(targetArt);
                      setShowCrossRefModal(true);
                    }}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    onOpenCustomizeTags={() => openCadernoSubTab('grifos')}
                    onExplainWithAI={handleExplainArticle}
                    onSummarizeJurisprudenceWithAI={
                      handleSummarizeJurisprudence
                    }
                    onQuizWithAI={(art) => {
                      setFocusedArticleId(art.id);
                      setRightDrawerOpen(true);
                      setRightDrawerTab('quiz');
                    }}
                  />
                );
              }

              if (appearance.compiledMode && block.isRevoked) {
                return null;
              }

              return (
                <div
                  key={block.id}
                  style={{ marginBottom: `${appearance.paragraphSpacing}px` }}
                  className={`px-4 opacity-85 font-medium ${
                    block.isRevoked ? 'line-through opacity-45' : ''
                  }`}
                >
                  <span>{block.text}</span>
                  <ModificationNoteBadge
                    note={block.modificationNote}
                    url={block.modificationUrl}
                    compiledMode={appearance.compiledMode}
                    theme={appearance.theme}
                  />
                </div>
              );
            })}
          </div>
        </main>

        {/* Zone 3: Right Collapsible Drawer */}
        {rightDrawerOpen && (
          <RightDrawer
            activeTab={rightDrawerTab}
            onTabChange={setRightDrawerTab}
            cadernoSubTab={cadernoSubTab}
            onCadernoSubTabChange={setCadernoSubTab}
            hideAITools={Boolean(appearance.hideAITools)}
            onToggleHideAI={handleToggleHideAI}
            onClose={() => setRightDrawerOpen(false)}
            appearance={appearance}
            doc={doc}
            focusedArticle={focusedArticle}
            annotations={annotations}
            highlightTags={highlightTags}
            onChangeHighlightTags={handleUpdateHighlightTags}
            onImportAnnotations={handleImportAnnotations}
            onJumpToArticle={handleSelectArticleFromToc}
            aiConfig={aiConfig}
            onSaveAIConfig={handleUpdateAIConfig}
            chatMessages={chatMessages}
            onSendChat={handleSendChat}
            onClearChat={() => setChatMessages([])}
            onTriggerExplainArticle={handleExplainArticle}
            onTriggerJurisprudenceAI={handleSummarizeJurisprudence}
            quizQuestions={quizQuestions}
            quizParams={quizParams}
            onQuizParamsChange={setQuizParams}
            onGenerateQuiz={handleGenerateQuiz}
            onSelectQuizAnswer={handleSelectQuizAnswer}
            flashcards={flashcards}
            onChangeFlashcards={setFlashcards}
            flashcardParams={flashcardParams}
            onFlashcardParamsChange={setFlashcardParams}
            onGenerateFlashcards={handleGenerateFlashcards}
            editalMatches={editalMatches}
            onAnalyzeEdital={handleAnalyzeEdital}
            isLoadingAI={isLoadingAI}
            aiError={aiError}
          />
        )}
      </div>

      {/* Law Cross-Reference Graph Modal (Opened via Hover Card on Inline Article Mentions) */}
      {showCrossRefModal && (
        <CrossReferenceGraphModal
          lawEpigraph={doc.epigraph}
          articles={doc.articles}
          graph={crossRefGraph}
          theme={appearance.theme}
          accentColor={currentAccent}
          initialArticle={crossRefModalArticle}
          onJumpToArticle={handleSelectArticleFromToc}
          onClose={() => setShowCrossRefModal(false)}
        />
      )}
    </div>
  );
};
