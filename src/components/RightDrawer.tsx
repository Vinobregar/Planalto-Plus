import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileUp,
  GraduationCap,
  HelpCircle,
  Highlighter,
  KeyRound,
  Layers,
  Loader2,
  MessageSquare,
  Palette,
  PanelRightClose,
  Plus,
  PlusCircle,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import {
  AIConfig,
  AIProviderId,
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
  DEFAULT_HIGHLIGHT_TAGS,
  PRESET_TAG_SUGGESTIONS,
  exportAnnotationsToMarkdown,
  exportFlashcardsToAnkiApkg,
  exportFlashcardsToAnkiTxt,
  exportFlashcardsToCsv,
  exportFlashcardsToRemNote,
  exportHighlightsByTagMarkdown,
  exportLawAnnotationsJson,
  getCommonLawName,
  getHighlightTagDisplayName,
  resolveHighlightTag,
} from '../storage/storageService';
import { getAICacheStats, clearAllAICache } from '../storage/indexedDBService';
import {
  extractTextFromPdfFile,
  fileToBase64,
} from '../utils/pdfExtractor';
import { buildExternalQuestionSearchUrls } from '../services/aiService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { hexToRgba } from './ArticleItem';
import { computeThemeColors } from './AppearancePopover';
import { extractCitedArticlesFromAnswer } from '../features/askLaw.js';
import {
  OabIncidenceItem,
  StudyProgressEntry,
} from '../types/legislation';
import {
  calculateStudyTrailStats,
  updateStudyTrailTargetDays,
  resetStudyTrailProgress,
} from '../features/studyTrail.js';

export type RightDrawerTab = 'chat' | 'quiz' | 'notes';
export type CadernoSubTab = 'grifos' | 'anotacoes' | 'trilha';
export type AIChatSection = 'conversation' | 'edital' | 'apikey';
export type QuizSubMode = 'questions' | 'flashcards';

const EXTRA_COLOR_SWATCHES = [
  '#eab308',
  '#10b981',
  '#3b82f6',
  '#ec4899',
  '#a855f7',
  '#f97316',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
  '#6366f1',
];

interface RightDrawerProps {
  activeTab: RightDrawerTab;
  onTabChange: (tab: RightDrawerTab) => void;
  cadernoSubTab: CadernoSubTab;
  onCadernoSubTabChange: (subTab: CadernoSubTab) => void;
  hideAITools: boolean;
  onToggleHideAI: (hide: boolean) => void;
  onClose: () => void;
  appearance: AppearanceSettings;
  doc: LegislationDocument;
  focusedArticle: ArticleBlock | null;
  annotations: Record<string, ArticleAnnotation>;
  highlightTags: HighlightTag[];
  onChangeHighlightTags: (next: HighlightTag[]) => void;
  onImportAnnotations: (
    imported: Record<string, ArticleAnnotation>,
    importedTags?: HighlightTag[]
  ) => void;
  onJumpToArticle: (articleId: string) => void;
  aiConfig: AIConfig;
  onSaveAIConfig: (config: AIConfig) => void;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  onClearChat: () => void;
  onTriggerExplainArticle: (article: ArticleBlock) => void;
  onTriggerJurisprudenceAI: (article: ArticleBlock) => void;
  quizQuestions: QuizQuestion[];
  quizParams: QuizGenerationParams;
  onQuizParamsChange: (next: QuizGenerationParams) => void;
  onGenerateQuiz: (
    article: ArticleBlock | null,
    customTopic?: string,
    customParams?: QuizGenerationParams
  ) => void;
  onSelectQuizAnswer: (questionId: string, letter: string) => void;
  flashcards: FlashcardItem[];
  onChangeFlashcards: (next: FlashcardItem[]) => void;
  flashcardParams: FlashcardGenerationParams;
  onFlashcardParamsChange: (next: FlashcardGenerationParams) => void;
  onGenerateFlashcards: (customParams?: FlashcardGenerationParams) => void;
  editalMatches: EditalArticleMatch[];
  onAnalyzeEdital: (
    fileName: string,
    extractedText: string,
    pdfBase64: string | undefined,
    targetTagId: string,
    addReasonToNotes: boolean
  ) => Promise<void>;
  isLoadingAI: boolean;
  aiError: string | null;
  isPro?: boolean;
  studyProgress?: StudyProgressEntry | null;
  onUpdateStudyProgress?: (next: StudyProgressEntry) => void;
  oabItems?: OabIncidenceItem[];
  onOpenProDrawer?: (featureKey: string) => void;
}

const PROVIDER_META: Record<
  AIProviderId,
  {
    name: string;
    placeholderKey: string;
    keyUrl: string;
    presetModels: string[];
  }
> = {
  gemini: {
    name: 'Google Gemini',
    placeholderKey: 'AIzaSy...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    presetModels: ['gemini-3.8-flash', 'gemini-3.8-pro', 'gemini-2.5-flash'],
  },
  openai: {
    name: 'OpenAI',
    placeholderKey: 'sk-proj-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    presetModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
  },
  anthropic: {
    name: 'Anthropic Claude',
    placeholderKey: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    presetModels: [
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-3-7-sonnet-latest',
    ],
  },
  openrouter: {
    name: 'OpenRouter / Groq / Compatível',
    placeholderKey: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
    presetModels: [
      'google/gemini-3.8-flash',
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-r1',
      'llama-3.3-70b-versatile',
    ],
  },
};

export const RightDrawer: React.FC<RightDrawerProps> = ({
  activeTab,
  onTabChange,
  cadernoSubTab,
  onCadernoSubTabChange,
  hideAITools,
  onToggleHideAI,
  onClose,
  appearance,
  doc,
  focusedArticle,
  annotations,
  highlightTags,
  onChangeHighlightTags,
  onImportAnnotations,
  onJumpToArticle,
  aiConfig,
  onSaveAIConfig,
  chatMessages,
  onSendChat,
  onClearChat,
  onTriggerExplainArticle,
  onTriggerJurisprudenceAI,
  quizQuestions,
  quizParams,
  onQuizParamsChange,
  onGenerateQuiz,
  onSelectQuizAnswer,
  flashcards,
  onChangeFlashcards,
  flashcardParams,
  onFlashcardParamsChange,
  onGenerateFlashcards,
  editalMatches,
  onAnalyzeEdital,
  isLoadingAI,
  aiError,
  isPro = false,
  studyProgress,
  onUpdateStudyProgress,
  oabItems = [],
  onOpenProDrawer,
}) => {
  const [aiSection, setAiSection] = useState<AIChatSection>('conversation');
  const [quizSubMode, setQuizSubMode] = useState<QuizSubMode>('questions');
  const [showQuizCustomizer, setShowQuizCustomizer] = useState(false);
  const [externalSearchByLiteral, setExternalSearchByLiteral] = useState(false);
  const [flippedCardIds, setFlippedCardIds] = useState<Record<string, boolean>>(
    {}
  );
  const [showAddManualCard, setShowAddManualCard] = useState(false);
  const [manualCardFront, setManualCardFront] = useState('');
  const [manualCardBack, setManualCardBack] = useState('');

  const [chatInput, setChatInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [configSavedBanner, setConfigSavedBanner] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; estimatedSizeKb: number }>({ count: 0, estimatedSizeKb: 0 });

  useEffect(() => {
    if (aiSection === 'apikey') {
      getAICacheStats().then(setCacheStats);
    }
  }, [aiSection]);

  const handleClearCache = async () => {
    await clearAllAICache();
    const stats = await getAICacheStats();
    setCacheStats(stats);
  };
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [notesSearchQuery, setNotesSearchQuery] = useState('');

  // Tag & Color Customization state inside Caderno -> Grifos
  const [activeColorIdForTag, setActiveColorIdForTag] = useState<string>(
    highlightTags[0]?.id || 'yellow'
  );
  const [showColorCustomizer, setShowColorCustomizer] = useState(true);
  const [newCustomTagName, setNewCustomTagName] = useState('');
  const [newCustomTagColor, setNewCustomTagColor] = useState('#ef4444');

  // Edital state
  const [editalFile, setEditalFile] = useState<File | null>(null);
  const [editalExtraText, setEditalExtraText] = useState('');
  const [editalTagId, setEditalTagId] = useState<string>(
    highlightTags.find((t) => t.id === 'orange')?.id ||
      highlightTags.find((t) => t.id === 'blue')?.id ||
      highlightTags[0]?.id ||
      'orange'
  );
  const [addEditalNote, setAddEditalNote] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editalPdfInputRef = useRef<HTMLInputElement | null>(null);

  const theme = appearance.theme;
  const isDark = theme === 'dark';
  const surface = computeThemeColors(appearance);

  const textClass =
    theme === 'dark'
      ? 'text-zinc-100'
      : theme === 'sepia'
      ? 'text-[#2c2825]'
      : 'text-slate-800';

  const tooltipClass =
    theme === 'dark'
      ? 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl'
      : theme === 'sepia'
      ? 'bg-[#faf8f4] border-[#dcd6ca] text-[#2c2825] shadow-xl'
      : 'bg-white border-slate-200 text-slate-800 shadow-xl';

  const hasConfiguredKey = Boolean(
    aiConfig.apiKeys[aiConfig.provider]?.trim()
  );

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoadingAI) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const md = exportAnnotationsToMarkdown(doc, annotations, highlightTags);
    downloadFile(
      `caderno-${doc.lawId.replace(/[^a-z0-9]/gi, '-')}.md`,
      md,
      'text/markdown;charset=utf-8'
    );
  };

  const handleExportHighlightsByTag = () => {
    const md = exportHighlightsByTagMarkdown(doc, annotations, highlightTags);
    downloadFile(
      `grifos-por-tag-${doc.lawId.replace(/[^a-z0-9]/gi, '-')}.md`,
      md,
      'text/markdown;charset=utf-8'
    );
  };

  const handleExportJson = () => {
    const json = exportLawAnnotationsJson(
      doc.lawId,
      doc.epigraph,
      annotations,
      highlightTags
    );
    downloadFile(
      `backup-notas-grifos-${doc.lawId.replace(/[^a-z0-9]/gi, '-')}.json`,
      json,
      'application/json;charset=utf-8'
    );
  };

  // Flashcard Export Handlers (.csv, .rem, Anki .txt)
  const commonLawTitle = getCommonLawName(doc);
  const safeLawSlug = doc.lawId.replace(/[^a-z0-9]/gi, '-');

  const handleExportFlashcardsCsv = () => {
    if (flashcards.length === 0) return;
    const csv = exportFlashcardsToCsv(flashcards, commonLawTitle);
    downloadFile(
      `flashcards-${safeLawSlug}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
  };

  const handleExportFlashcardsRem = () => {
    if (flashcards.length === 0) return;
    const rem = exportFlashcardsToRemNote(flashcards, commonLawTitle);
    downloadFile(
      `flashcards-${safeLawSlug}.rem`,
      rem,
      'text/plain;charset=utf-8'
    );
  };

  const [isExportingApkg, setIsExportingApkg] = useState(false);

  const handleExportFlashcardsApkg = async () => {
    if (flashcards.length === 0 || isExportingApkg) return;
    setIsExportingApkg(true);
    try {
      await exportFlashcardsToAnkiApkg(flashcards, commonLawTitle);
    } catch (err) {
      console.warn('Erro ao gerar .apkg, utilizando fallback .txt', err);
      handleExportFlashcardsAnki();
    } finally {
      setIsExportingApkg(false);
    }
  };

  const handleExportFlashcardsAnki = () => {
    if (flashcards.length === 0) return;
    const ankiTxt = exportFlashcardsToAnkiTxt(flashcards, commonLawTitle);
    downloadFile(
      `anki-deck-${safeLawSlug}.txt`,
      ankiTxt,
      'text/plain;charset=utf-8'
    );
  };

  const handleAddManualFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCardFront.trim() || !manualCardBack.trim()) return;
    const newCard: FlashcardItem = {
      id: `fc-manual-${Date.now()}`,
      articleRef: focusedArticle?.label || 'Artigo',
      front: manualCardFront.trim(),
      back: manualCardBack.trim(),
      tags: ['Manual', focusedArticle?.label || 'LeiSeca'],
    };
    onChangeFlashcards([newCard, ...flashcards]);
    setManualCardFront('');
    setManualCardBack('');
    setShowAddManualCard(false);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && parsed.annotations) {
          onImportAnnotations(parsed.annotations, parsed.tags);
        }
      } catch {
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleRunEditalImport = async () => {
    if (!editalFile && !editalExtraText.trim()) return;
    let extracted = editalExtraText.trim();
    let base64: string | undefined;

    if (editalFile) {
      try {
        const pdfText = await extractTextFromPdfFile(editalFile);
        if (pdfText) {
          extracted = extracted ? `${extracted}\n\n${pdfText}` : pdfText;
        }
        if (editalFile.size <= 15 * 1024 * 1024) {
          base64 = await fileToBase64(editalFile);
        }
      } catch {
        // Fallback to base64 or manual text
      }
    }

    await onAnalyzeEdital(
      editalFile ? editalFile.name : 'Edital Informado',
      extracted,
      base64,
      editalTagId,
      addEditalNote
    );
  };

  // Tag & Color management helpers
  const handleUpdateTagName = (id: string, name: string) => {
    onChangeHighlightTags(
      highlightTags.map((t) => (t.id === id ? { ...t, name } : t))
    );
  };

  const handleUpdateTagColor = (id: string, color: string) => {
    onChangeHighlightTags(
      highlightTags.map((t) => (t.id === id ? { ...t, color } : t))
    );
  };

  const handleDeleteCustomTag = (id: string) => {
    if (highlightTags.length <= 1) return;
    const next = highlightTags.filter((t) => t.id !== id);
    onChangeHighlightTags(next);
    if (activeColorIdForTag === id && next[0]) {
      setActiveColorIdForTag(next[0].id);
    }
  };

  const handleAddCustomColor = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `custom-${Date.now()}`;
    const trimmed = newCustomTagName.trim();
    const nextTag: HighlightTag = {
      id,
      name: trimmed,
      colorLabel: trimmed || 'Personalizada',
      color: newCustomTagColor,
      isDefault: false,
    };
    onChangeHighlightTags([...highlightTags, nextTag]);
    setActiveColorIdForTag(id);
    setNewCustomTagName('');
  };

  const handleRestoreDefaultColors = () => {
    onChangeHighlightTags(DEFAULT_HIGHLIGHT_TAGS);
    setActiveColorIdForTag(DEFAULT_HIGHLIGHT_TAGS[0].id);
  };

  // Lists for Grifos sub-tab and Anotações sub-tab
  const highlightedEntries = Object.values(annotations).filter((a) => {
    const hasHighlight =
      Boolean(a.wholeHighlightColor) || a.textHighlights.length > 0;
    if (!hasHighlight) return false;
    if (selectedTagFilter === 'all') return true;
    return (
      a.wholeHighlightColor === selectedTagFilter ||
      a.textHighlights.some((h) => h.color === selectedTagFilter)
    );
  });

  const notesEntries = Object.values(annotations).filter((a) => {
    if (!a.note.trim()) return false;
    const q = notesSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      a.articleLabel.toLowerCase().includes(q) ||
      a.note.toLowerCase().includes(q)
    );
  });

  const totalHighlightsCount = Object.values(annotations).filter(
    (a) => Boolean(a.wholeHighlightColor) || a.textHighlights.length > 0
  ).length;

  const totalNotesCount = Object.values(annotations).filter((a) =>
    Boolean(a.note.trim())
  ).length;

  const externalSearchInfo = buildExternalQuestionSearchUrls(
    doc,
    focusedArticle
  );
  const activeExternalLinks = externalSearchByLiteral
    ? externalSearchInfo.byLiteral
    : externalSearchInfo.byArticle;

  const activeColorTarget =
    highlightTags.find((t) => t.id === activeColorIdForTag) ||
    highlightTags[0];

  const cardStyle: React.CSSProperties = {
    backgroundColor: surface.cardBg,
    borderColor: surface.borderColor,
  };

  return (
    <aside
      style={{
        backgroundColor: surface.panelBg,
        borderColor: surface.borderColor,
      }}
      className={`w-[410px] max-w-full shrink-0 h-full border-l flex flex-col select-none relative z-20 ${textClass}`}
    >
      {/* TAB 1: IA CHAT MENU (Contains Conversation, Importar Edital, Chave API, and Ocultar Opções de IA) */}
      {activeTab === 'chat' && !hideAITools && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-Navigation Inside IA Chat */}
          <div
            style={{ borderColor: surface.borderColor }}
            className="px-3 py-2 border-b flex items-center justify-between gap-1 bg-black/[0.02] dark:bg-white/[0.02]"
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAiSection('conversation')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  aiSection === 'conversation'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setAiSection('edital')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  aiSection === 'edital'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100'
                }`}
              >
                <FileUp className="w-3 h-3" />
                <span>Importar Edital</span>
              </button>

              <div className="relative inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setAiSection('apikey')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                    aiSection === 'apikey'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100'
                  }`}
                  title="Configurar Chave API e Modelo"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Chave API</span>
                  {!hasConfiguredKey && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>

                {/* Tooltip explicativo ao lado do botão de Chave API */}
                <span className="relative group/apikeytip inline-flex items-center ml-0.5">
                  <button
                    type="button"
                    aria-label="Informações sobre a Chave API e Segurança"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAiSection('apikey');
                    }}
                    className="p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 text-indigo-500 dark:text-indigo-400 transition-colors cursor-pointer"
                    title="Ajuda sobre a Chave API e Segurança"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>

                  <div
                    className={`invisible opacity-0 group-hover/apikeytip:visible group-hover/apikeytip:opacity-100 transition-all duration-150 absolute right-[-60px] top-full mt-1.5 w-76 sm:w-80 p-3.5 rounded-xl border shadow-2xl text-[11px] font-normal leading-relaxed z-50 pointer-events-auto select-text before:absolute before:-top-2 before:left-0 before:right-0 before:h-2.5 ${tooltipClass}`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-500 dark:text-indigo-400 mb-2 border-b border-current/10 pb-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Guia da Chave de API</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <strong className="block text-indigo-600 dark:text-indigo-400 font-semibold mb-0.5">
                          O que é?
                        </strong>
                        <p className="opacity-90">
                          É o seu código pessoal de acesso que conecta a extensão diretamente à inteligência artificial (Google Gemini, OpenAI, Claude ou OpenRouter) para explicar dispositivos, tirar dúvidas jurídicas, analisar editais e criar questões.
                        </p>
                      </div>

                      <div>
                        <strong className="block text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">
                          Como obter a chave?
                        </strong>
                        <p className="opacity-90 mb-1">
                          É gratuita e rápida! Recomendamos o <strong>Google Gemini</strong> por ter cota gratuita para uso pessoal:
                        </p>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-indigo-500 hover:underline"
                        >
                          <span>Obter chave gratuita no Google AI Studio</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>

                      <div className="pt-1.5 border-t border-current/10">
                        <div className="flex items-start gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">
                              100% Segura e Local
                            </strong>
                            <p className="opacity-90">
                              Sua chave fica salva <strong>exclusivamente na memória local do seu navegador</strong> (<code>chrome.storage.local</code>) e <strong>nunca é enviada para nenhum servidor intermediário</strong>. As requisições vão direto do seu navegador para a API oficial do provedor escolhido.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Close / Collapse Drawer Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg border border-current/15 hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors ml-0.5"
                title="Recolher painel lateral direito"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Focused Article Context Banner inside IA Chat */}
          {focusedArticle && aiSection === 'conversation' && (
            <div
              style={{ borderColor: surface.borderColor }}
              className="px-3.5 py-2 border-b bg-indigo-500/5 flex items-center justify-between gap-2 text-xs"
            >
              <div className="truncate">
                <span className="opacity-65 mr-1.5">Em foco:</span>
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {focusedArticle.label}
                </strong>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onTriggerExplainArticle(focusedArticle)}
                  disabled={isLoadingAI}
                  className="px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 font-medium text-[11px]"
                >
                  Explicar
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerJurisprudenceAI(focusedArticle)}
                  disabled={isLoadingAI}
                  className="px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 font-medium text-[11px]"
                >
                  Jurisprudência com IA
                </button>
              </div>
            </div>
          )}

          {/* Error or Missing Key Prompt */}
          {aiError && (
            <div className="m-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs space-y-1.5">
              <div className="font-semibold flex items-center justify-between">
                <span>Atenção na chamada de IA</span>
                <button
                  type="button"
                  onClick={() => setAiSection('apikey')}
                  className="underline font-bold"
                >
                  Configurar Chave API
                </button>
              </div>
              <p className="opacity-90 leading-relaxed">{aiError}</p>
            </div>
          )}

          {/* SECTION 1A: CONVERSATION */}
          {aiSection === 'conversation' && (
            <div className="flex-1 flex flex-col min-h-0 select-text">
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {chatMessages.length === 0 ? (
                  <div
                    style={cardStyle}
                    className="p-4 rounded-2xl border text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-indigo-500 font-semibold">
                        <Sparkles className="w-4 h-4" />
                        <span>Assistente Jurídico IA</span>
                        <span className="relative group/aitip inline-flex items-center">
                          <HelpCircle className="w-3.5 h-3.5 opacity-60 hover:opacity-100 cursor-pointer" />
                          <span
                            className={`pointer-events-none opacity-0 group-hover/aitip:opacity-100 transition-opacity duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 max-w-[280px] p-2.5 rounded-xl border shadow-2xl text-[11px] font-normal leading-relaxed z-50 ${tooltipClass}`}
                          >
                            Selecione qualquer artigo na lei e clique em{' '}
                            <strong>Explicar IA</strong>, importe o PDF de um{' '}
                            <strong>Edital de Concurso</strong> para grifar
                            automaticamente os artigos mais importantes, ou envie
                            sua dúvida jurídica abaixo.
                            <span className="block mt-1.5 pt-1.5 border-t border-current/15 text-amber-500/90 dark:text-amber-400">
                              <strong>Nota sobre Sínteses Automatizadas:</strong> As explicações e análises deste assistente são geradas por inteligência artificial como recurso complementar de estudo e podem apresentar nuances interpretativas ou imprecisões pontuais. Conteúdo gerado por IA para apoio didático; confira sempre a literalidade da norma e a jurisprudência oficial dos tribunais.
                            </span>
                          </span>
                        </span>
                      </div>
                    </div>

                    {focusedArticle && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => onTriggerExplainArticle(focusedArticle)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
                        >
                          Explicar {focusedArticle.label}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSendChat(
                              `Crie um resumo esquematizado e um mnemônico para memorizar o ${focusedArticle.label}.`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 font-medium"
                        >
                          Criar Mnemônico
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      style={msg.role === 'assistant' ? cardStyle : undefined}
                      className={`p-3 rounded-2xl text-xs ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white ml-6 shadow-sm'
                          : 'border mr-2'
                      }`}
                    >
                      {msg.articleContext && (
                        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75 mb-1">
                          Ref: {msg.articleContext}
                        </div>
                      )}
                      {msg.role === 'assistant' ? (
                        <div className="space-y-2">
                          <MarkdownRenderer content={msg.content} />
                          {(() => {
                            const cited = extractCitedArticlesFromAnswer(
                              msg.content,
                              doc
                            );
                            if (!cited || cited.length === 0) return null;
                            return (
                              <div className="pt-2 border-t border-current/10 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-65">
                                  Ir para artigo citado:
                                </span>
                                {cited.map((c: { articleId: string; articleLabel: string; preview: string }) => (
                                  <button
                                    key={c.articleId}
                                    type="button"
                                    onClick={() => onJumpToArticle(c.articleId)}
                                    className="px-2 py-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 font-semibold text-[10.5px] transition-colors"
                                    title={c.preview}
                                  >
                                    {c.articleLabel} ↗
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  ))
                )}

                {isLoadingAI && (
                  <div
                    style={cardStyle}
                    className="p-3 rounded-2xl border flex items-center gap-2 text-xs"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>
                      Consultando modelo ({aiConfig.models[aiConfig.provider]})...
                    </span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleChatSubmit}
                style={{ borderColor: surface.borderColor }}
                className="p-3 border-t space-y-2"
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      focusedArticle
                        ? `Perguntar sobre ${focusedArticle.label} ou sobre a lei...`
                        : 'Perguntar sobre a legislação...'
                    }
                    style={cardStyle}
                    className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <button
                    type="submit"
                    disabled={isLoadingAI || !chatInput.trim()}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                    title="Enviar pergunta"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  {chatMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearChat}
                      className="p-2 rounded-xl border border-current/15 hover:bg-rose-500/10 hover:text-rose-500 opacity-70 hover:opacity-100"
                      title="Limpar conversa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* SECTION 1B: IMPORTAR EDITAL (PDF) INSIDE IA CHAT */}
          {aiSection === 'edital' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 select-text">
              <div
                style={cardStyle}
                className="p-4 rounded-2xl border space-y-3.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-500 font-semibold">
                    <FileUp className="w-4 h-4" />
                    <span>Importar Edital (PDF) & Grifar com IA</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                      {isPro ? 'PRO Multi-Leis Ativo' : 'BYOK Lei Atual'}
                    </span>
                    <span className="relative group/edtip inline-flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 opacity-60 hover:opacity-100 cursor-pointer" />
                      <span
                        className={`pointer-events-none opacity-0 group-hover/edtip:opacity-100 transition-opacity duration-150 absolute right-0 top-full mt-1.5 w-64 max-w-[280px] p-2.5 rounded-xl border shadow-2xl text-[11px] font-normal leading-relaxed z-50 ${tooltipClass}`}
                      >
                        Envie o PDF do edital do seu concurso ou cole os tópicos do
                        conteúdo programático. A IA analisará a norma atual,
                        selecionará os artigos de maior incidência e aplicará o
                        grifo escolhido.
                      </span>
                    </span>
                  </div>
                </div>

                {/* File Drop / Picker */}
                <div>
                  <input
                    ref={editalPdfInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setEditalFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editalPdfInputRef.current?.click()}
                    className="w-full p-3.5 rounded-xl border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all flex flex-col items-center justify-center gap-1.5 text-center"
                  >
                    <FileUp className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {editalFile
                        ? `Arquivo: ${editalFile.name}`
                        : 'Clique para selecionar o PDF do Edital (.pdf)'}
                    </span>
                    <span className="text-[10px] opacity-65">
                      {editalFile
                        ? `${(editalFile.size / 1024).toFixed(1)} KB • Clique para trocar`
                        : 'Suporta editais em PDF ou texto (.txt)'}
                    </span>
                  </button>
                </div>

                {/* Optional Syllabus Text Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium opacity-75">
                    Ou cole/complemente os tópicos do edital (opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={editalExtraText}
                    onChange={(e) => setEditalExtraText(e.target.value)}
                    placeholder="Ex: 1. Das Pessoas Naturais. 2. Atos Ilícitos e Responsabilidade Civil..."
                    className="w-full p-2 rounded-xl border border-current/15 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                {/* Choose Highlight Tag to assign */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider opacity-75 flex items-center gap-1">
                      <Highlighter className="w-3 h-3" />
                      <span>Cor / Tag para atribuir:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        onTabChange('notes');
                        onCadernoSubTabChange('grifos');
                      }}
                      className="text-[11px] text-indigo-500 hover:underline flex items-center gap-0.5"
                    >
                      <Palette className="w-3 h-3" />
                      <span>Personalizar Tags</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {highlightTags.map((tag) => {
                      const selected = editalTagId === tag.id;
                      const label = getHighlightTagDisplayName(tag);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => setEditalTagId(tag.id)}
                          style={{
                            backgroundColor: hexToRgba(
                              tag.color,
                              isDark ? 0.22 : 0.16
                            ),
                            borderColor: tag.color,
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${
                            selected
                              ? 'ring-2 ring-indigo-500 scale-105'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Checkbox to also add edital note */}
                <label className="flex items-center gap-2 text-xs cursor-pointer opacity-85 hover:opacity-100">
                  <input
                    type="checkbox"
                    checked={addEditalNote}
                    onChange={(e) => setAddEditalNote(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  <span>
                    Adicionar nota explicativa em cada artigo indicando o tópico
                    do edital
                  </span>
                </label>

                <button
                  type="button"
                  disabled={
                    isLoadingAI || (!editalFile && !editalExtraText.trim())
                  }
                  onClick={handleRunEditalImport}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  {isLoadingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analisando Edital & Grifando Artigos...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analisar Edital & Grifar Automaticamente</span>
                    </>
                  )}
                </button>
              </div>

              {/* Results of Edital Analysis */}
              {editalMatches.length > 0 && (
                <div
                  style={cardStyle}
                  className="p-3.5 rounded-2xl border space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>
                      ✓ {editalMatches.length} artigo(s) grifado(s) pelo Edital
                    </span>
                  </div>
                  <div className="space-y-2">
                    {editalMatches.map((m) => (
                      <div
                        key={m.articleId}
                        onClick={() => onJumpToArticle(m.articleId)}
                        className="p-2.5 rounded-xl border border-current/10 hover:border-indigo-500/50 cursor-pointer transition-all space-y-1 bg-black/[0.02] dark:bg-white/[0.02]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {m.articleLabel}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-medium">
                            {m.editalTopic}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-85 leading-relaxed">
                          {m.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 1C: API KEY CONFIGURATION INSIDE IA CHAT */}
          {aiSection === 'apikey' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
              <div style={cardStyle} className="p-4 rounded-2xl border space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-500 font-semibold">
                    <KeyRound className="w-4 h-4" />
                    <span>Configuração da Chave de API</span>
                    <span className="relative group/keytip inline-flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 opacity-60 hover:opacity-100 cursor-pointer" />
                      <div
                        className={`invisible opacity-0 group-hover/keytip:visible group-hover/keytip:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-76 sm:w-80 p-3 rounded-xl border shadow-2xl text-[11px] font-normal leading-relaxed z-50 pointer-events-auto select-text before:absolute before:-top-2 before:left-0 before:right-0 before:h-2.5 ${tooltipClass}`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-500 dark:text-indigo-400 mb-2 border-b border-current/10 pb-1.5">
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Segurança e Privacidade da Chave</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <strong className="block text-indigo-600 dark:text-indigo-400 font-semibold mb-0.5">
                              O que é?
                            </strong>
                            <p className="opacity-90">
                              O token pessoal que autoriza as chamadas diretas ao modelo de IA escolhido.
                            </p>
                          </div>
                          <div>
                            <strong className="block text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">
                              Como obter?
                            </strong>
                            <p className="opacity-90">
                              Gere sua chave gratuitamente no painel oficial do provedor (ex: Google AI Studio) usando o link abaixo.
                            </p>
                          </div>
                          <div className="pt-1.5 border-t border-current/10 flex items-start gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">
                                Armazenamento 100% Local
                              </strong>
                              <p className="opacity-90">
                                Sua chave é salva exclusivamente no seu navegador (<code>chrome.storage.local</code>) e nunca transita por servidores intermediários.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </span>
                  </div>
                </div>

                {/* Provider Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider opacity-75">
                    Provedor de IA
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(PROVIDER_META) as AIProviderId[]).map((pid) => {
                      const active = aiConfig.provider === pid;
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() =>
                            onSaveAIConfig({ ...aiConfig, provider: pid })
                          }
                          className={`p-2 rounded-xl border text-left transition-all ${
                            active
                              ? 'border-indigo-500 bg-indigo-500/10 font-semibold text-indigo-600 dark:text-indigo-400'
                              : 'border-current/15 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="truncate">{PROVIDER_META[pid].name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* API Key Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider opacity-75">
                      Chave de API ({PROVIDER_META[aiConfig.provider].name})
                    </label>
                    <a
                      href={PROVIDER_META[aiConfig.provider].keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-500 hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Obter chave</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={aiConfig.apiKeys[aiConfig.provider] || ''}
                      onChange={(e) =>
                        onSaveAIConfig({
                          ...aiConfig,
                          apiKeys: {
                            ...aiConfig.apiKeys,
                            [aiConfig.provider]: e.target.value,
                          },
                        })
                      }
                      placeholder={PROVIDER_META[aiConfig.provider].placeholderKey}
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-current/20 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Model Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider opacity-75">
                    Modelo ({PROVIDER_META[aiConfig.provider].name})
                  </label>
                  <input
                    type="text"
                    value={aiConfig.models[aiConfig.provider] || ''}
                    onChange={(e) =>
                      onSaveAIConfig({
                        ...aiConfig,
                        models: {
                          ...aiConfig.models,
                          [aiConfig.provider]: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {PROVIDER_META[aiConfig.provider].presetModels.map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            onSaveAIConfig({
                              ...aiConfig,
                              models: {
                                ...aiConfig.models,
                                [aiConfig.provider]: preset,
                              },
                            })
                          }
                          className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 hover:bg-indigo-500/15 hover:text-indigo-500 text-[10px]"
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Custom Base URL for OpenRouter / Groq / Local */}
                {aiConfig.provider === 'openrouter' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider opacity-75">
                      Endpoint Base URL (OpenAI-Compatible)
                    </label>
                    <input
                      type="text"
                      value={aiConfig.customBaseUrl || ''}
                      onChange={(e) =>
                        onSaveAIConfig({
                          ...aiConfig,
                          customBaseUrl: e.target.value,
                        })
                      }
                      placeholder="https://openrouter.ai/api/v1"
                      className="w-full px-3 py-2 rounded-xl border border-current/20 bg-transparent text-xs"
                    />
                  </div>
                )}

                {/* IndexedDB Cache Status & Actions */}
                <div className="pt-3 border-t border-current/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider opacity-75 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Cache Local IndexedDB</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Ativo (0 tokens)
                    </span>
                  </div>
                  <p className="text-[11px] opacity-70 leading-relaxed">
                    Respostas doutrinárias e análises de jurisprudência já consultadas ficam salvas localmente no navegador para carregamento instantâneo sem gastar tokens da sua cota.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] opacity-65 font-mono">
                      {cacheStats.count} {cacheStats.count === 1 ? 'análise salva' : 'análises salvas'} (~{cacheStats.estimatedSizeKb} KB)
                    </span>
                    {cacheStats.count > 0 && (
                      <button
                        type="button"
                        onClick={handleClearCache}
                        className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Esvaziar cache</span>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setConfigSavedBanner(true);
                    setTimeout(() => setConfigSavedBanner(false), 2500);
                  }}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm transition-colors"
                >
                  Salvar Configurações de IA
                </button>

                {configSavedBanner && (
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-center font-medium">
                    Configurações salvas localmente com sucesso!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUESTÕES & FLASHCARDS MENU */}
      {activeTab === 'quiz' && !hideAITools && (
        <div className="flex-1 flex flex-col min-h-0 select-text">
          {/* Sub-Navigation Inside Questões: Questões Inéditas vs Flashcards */}
          <div
            style={{ borderColor: surface.borderColor }}
            className="px-3.5 pt-2.5 pb-2 border-b bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between gap-2"
          >
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-current/10 flex-1">
              <button
                type="button"
                onClick={() => setQuizSubMode('questions')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  quizSubMode === 'questions'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Questões ({quizQuestions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setQuizSubMode('flashcards')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  quizSubMode === 'flashcards'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Flashcards ({flashcards.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-current/15 hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors shrink-0"
              title="Recolher painel lateral direito"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Error or Missing Key Prompt in Quiz */}
          {aiError && (
            <div className="m-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs space-y-1.5 shrink-0">
              <div className="font-semibold flex items-center justify-between">
                <span>Chave de API Necessária</span>
                <button
                  type="button"
                  onClick={() => {
                    onTabChange('chat');
                    setAiSection('apikey');
                  }}
                  className="text-[11px] underline hover:no-underline font-bold"
                >
                  Configurar Chave API
                </button>
              </div>
              <p className="opacity-90 leading-relaxed">{aiError}</p>
            </div>
          )}

          {/* SUB-MODE 2A: QUESTÕES INÉDITAS & BANCOS EXTERNOS */}
          {quizSubMode === 'questions' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {/* Header + Parameter Customizer Card */}
              <div
                style={cardStyle}
                className="p-3.5 rounded-2xl border space-y-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <span>
                      Treino de Questões (
                      {focusedArticle ? focusedArticle.label : 'Lei'})
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowQuizCustomizer((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
                      showQuizCustomizer
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'border-current/15 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    title="Personalizar quantidade de questões, dificuldade, formato e foco"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Parâmetros</span>
                  </button>
                </div>

                {/* Quick Summary Pills when Customizer is collapsed */}
                {!showQuizCustomizer && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                      {quizParams.count}{' '}
                      {quizParams.count === 1 ? 'questão' : 'questões'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-80">
                      Nível:{' '}
                      {quizParams.difficulty === 'facil'
                        ? 'Fácil'
                        : quizParams.difficulty === 'medio'
                        ? 'Médio'
                        : quizParams.difficulty === 'dificil'
                        ? 'Difícil'
                        : 'Misto'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-80">
                      {quizParams.style === 'certo_errado'
                        ? 'Certo / Errado'
                        : quizParams.style === 'multipla_abcde'
                        ? 'Múltipla (A–E)'
                        : 'Múltipla (A–D)'}
                    </span>
                  </div>
                )}

                {/* Collapsible Quiz Customization Panel */}
                {showQuizCustomizer && (
                  <div className="pt-2 border-t border-current/10 space-y-2.5">
                    {/* Quantity Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        Quantidade de Questões por Geração
                      </label>
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 5, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              onQuizParamsChange({ ...quizParams, count: num })
                            }
                            className={`py-1 rounded-lg border text-xs font-bold transition-colors ${
                              quizParams.count === num
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-current/15 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        Nível de Dificuldade
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {(
                          [
                            ['facil', 'Fácil (Fixação)'],
                            ['medio', 'Médio (Concurso)'],
                            ['dificil', 'Difícil (Avançado)'],
                            ['misto', 'Misto'],
                          ] as const
                        ).map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              onQuizParamsChange({
                                ...quizParams,
                                difficulty: val,
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-colors ${
                              quizParams.difficulty === val
                                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-semibold'
                                : 'border-current/15 opacity-80 hover:opacity-100'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question Style Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        Formato da Questão
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            ['multipla_abcd', 'A – D'],
                            ['multipla_abcde', 'A – E'],
                            ['certo_errado', 'Certo / Errado'],
                          ] as const
                        ).map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              onQuizParamsChange({
                                ...quizParams,
                                style: val,
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-colors ${
                              quizParams.style === val
                                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-semibold'
                                : 'border-current/15 opacity-80 hover:opacity-100'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Focus Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        Foco de Cobrança
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {(
                          [
                            ['letra_lei', 'Letra da Lei (Lei Seca)'],
                            ['caso_pratico', 'Casos Práticos'],
                            ['jurisprudencia', 'Jurisprudência / Súmulas'],
                            ['pegadinhas', 'Exceções & Prazos'],
                          ] as const
                        ).map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              onQuizParamsChange({
                                ...quizParams,
                                focus: val,
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-colors ${
                              quizParams.focus === val
                                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-semibold'
                                : 'border-current/15 opacity-80 hover:opacity-100'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Instructions Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        Instrução ou Recorte Específico (Opcional)
                      </label>
                      <input
                        type="text"
                        value={quizParams.customInstructions || ''}
                        onChange={(e) =>
                          onQuizParamsChange({
                            ...quizParams,
                            customInstructions: e.target.value,
                          })
                        }
                        placeholder="Ex: Focar nos parágrafos e nas exceções de jornada..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-current/15 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  type="button"
                  disabled={isLoadingAI}
                  onClick={() =>
                    onGenerateQuiz(
                      focusedArticle,
                      quizParams.customInstructions,
                      quizParams
                    )
                  }
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  {isLoadingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        Elaborando {quizParams.count} questão(ões) sobre{' '}
                        {focusedArticle?.label}...
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        Gerar {quizParams.count}{' '}
                        {quizParams.count === 1 ? 'Questão' : 'Questões'} (
                        {focusedArticle ? focusedArticle.label : 'Artigo'})
                      </span>
                    </>
                  )}
                </button>

                {/* Upgraded External Question Banks Search (By Article+Acronym vs By Literal Phrase) */}
                <div className="pt-2 border-t border-current/10 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="opacity-70 font-medium flex items-center gap-1">
                      <span>Bancos externos ({externalSearchInfo.acronym}):</span>
                      <span className="relative group/exttip inline-flex items-center">
                        <HelpCircle className="w-3 h-3 opacity-60 hover:opacity-100 cursor-pointer" />
                        <span
                          className={`pointer-events-none opacity-0 group-hover/exttip:opacity-100 transition-opacity duration-150 absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-64 max-w-[280px] p-2.5 rounded-xl border shadow-2xl text-[10.5px] font-normal leading-relaxed z-50 ${tooltipClass}`}
                        >
                          Use <strong>Artigo + Sigla</strong> para buscar citações
                          diretas ao dispositivo (ex.:{' '}
                          <code>
                            {externalSearchInfo.artLabel}{' '}
                            {externalSearchInfo.acronym}
                          </code>
                          ) ou <strong>Trecho Literal</strong> para achar questões
                          que copiam a letra da lei sem citar o número do artigo!
                        </span>
                      </span>
                    </span>

                    <div className="inline-flex rounded-lg border border-current/15 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setExternalSearchByLiteral(false)}
                        className={`px-1.5 py-0.5 rounded-md font-semibold transition-colors ${
                          !externalSearchByLiteral
                            ? 'bg-indigo-600 text-white'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title="Buscar pelo número do artigo + sigla popular da lei"
                      >
                        Artigo + Sigla
                      </button>
                      <button
                        type="button"
                        onClick={() => setExternalSearchByLiteral(true)}
                        className={`px-1.5 py-0.5 rounded-md font-semibold transition-colors ${
                          externalSearchByLiteral
                            ? 'bg-indigo-600 text-white'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title="Buscar pelo trecho exato do caput (ideal quando a banca transcreve o artigo sem citar o número)"
                      >
                        Trecho Literal
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <a
                      href={activeExternalLinks.qconcursosDirect}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold"
                      title="Abrir busca direta na plataforma QConcursos"
                    >
                      <span>QConcursos (Direto)</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={activeExternalLinks.tecGoogle}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-current/15 hover:border-indigo-500/40 text-indigo-500 font-medium"
                      title="Buscar questões indexadas no TEC Concursos"
                    >
                      <span>TEC</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={activeExternalLinks.granGoogle}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-current/15 hover:border-indigo-500/40 text-indigo-500 font-medium"
                      title="Buscar questões indexadas no Gran Questões"
                    >
                      <span>Gran</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={activeExternalLinks.openWebQuestions}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-current/15 hover:border-indigo-500/40 opacity-80 hover:opacity-100 font-medium"
                      title="Buscar provas e questões comentadas na web"
                    >
                      <span>Web Geral</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Score Summary Bar when multiple questions are loaded */}
              {quizQuestions.length > 1 && (
                <div
                  style={cardStyle}
                  className="px-3.5 py-2 rounded-xl border flex items-center justify-between text-xs"
                >
                  <span className="font-semibold">
                    Caderno Atual: {quizQuestions.length} questões
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Acertos:{' '}
                    {
                      quizQuestions.filter(
                        (q) => q.userAnswer && q.userAnswer === q.correctLetter
                      ).length
                    }{' '}
                    /{' '}
                    {quizQuestions.filter((q) => Boolean(q.userAnswer)).length}{' '}
                    respondidas
                  </span>
                </div>
              )}

              {/* Empty state when no questions generated yet */}
              {quizQuestions.length === 0 && !isLoadingAI && (
                <div
                  style={cardStyle}
                  className="p-6 rounded-2xl border text-center text-xs space-y-2 opacity-85"
                >
                  <GraduationCap className="w-7 h-7 mx-auto text-indigo-500 opacity-80" />
                  <p className="font-semibold text-sm">Pronto para treinar</p>
                  <p className="text-[11px] opacity-75 max-w-xs mx-auto leading-relaxed">
                    Personalize a quantidade e a dificuldade acima e clique em{' '}
                    <strong>Gerar Questões</strong> para criar seus exercícios sobre{' '}
                    {focusedArticle?.label || 'o artigo'}.
                  </p>
                </div>
              )}

              {/* Question Cards List */}
              {quizQuestions.map((q, qIdx) => {
                const isAnswered = Boolean(q.userAnswer);
                const isCorrect = q.userAnswer === q.correctLetter;

                return (
                  <div
                    key={q.id}
                    style={cardStyle}
                    className="p-4 rounded-2xl border space-y-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-current/10 pb-2">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        Questão {quizQuestions.length > 1 ? `#${qIdx + 1}` : ''} •{' '}
                        {q.articleRef}
                      </span>
                      {q.difficulty && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 uppercase font-semibold opacity-75">
                          {q.difficulty}
                        </span>
                      )}
                    </div>

                    <p className="leading-relaxed font-medium text-[13px]">
                      {q.statement}
                    </p>

                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const selected = q.userAnswer === opt.letter;
                        const isRightOption = opt.letter === q.correctLetter;

                        let btnStyle =
                          'border-current/15 hover:bg-black/5 dark:hover:bg-white/5';
                        if (isAnswered) {
                          if (isRightOption) {
                            btnStyle =
                              'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold';
                          } else if (selected && !isRightOption) {
                            btnStyle =
                              'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300';
                          } else {
                            btnStyle = 'border-current/10 opacity-55';
                          }
                        }

                        return (
                          <button
                            key={opt.letter}
                            type="button"
                            disabled={isAnswered}
                            onClick={() => onSelectQuizAnswer(q.id, opt.letter)}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${btnStyle}`}
                          >
                            <span className="w-5 h-5 rounded-full border border-current/30 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                              {opt.letter}
                            </span>
                            <span className="flex-1 leading-relaxed">
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-amber-500/10 border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 font-bold">
                          <div className="flex items-center gap-1.5">
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  Resposta Correta! ({q.correctLetter})
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-rose-500" />
                                <span className="text-rose-600 dark:text-rose-400">
                                  Incorreta — Gabarito: {q.correctLetter}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Convert Question to Flashcard with 1 click */}
                          <button
                            type="button"
                            onClick={() => {
                              const rightOpt = q.options.find(
                                (o) => o.letter === q.correctLetter
                              );
                              const card: FlashcardItem = {
                                id: `fc-from-q-${Date.now()}`,
                                articleRef: q.articleRef,
                                front: q.statement,
                                back: `${
                                  rightOpt
                                    ? `Gabarito (${rightOpt.letter}): ${rightOpt.text}\n\n`
                                    : ''
                                }${q.explanation}`,
                                tags: ['Questao', q.articleRef],
                              };
                              onChangeFlashcards([card, ...flashcards]);
                              setQuizSubMode('flashcards');
                            }}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 text-[10px] font-semibold"
                            title="Salvar esta questão e seu comentário como Flashcard para exportar ao Anki / RemNote / CSV"
                          >
                            + Virar Flashcard
                          </button>
                        </div>
                        <p className="leading-relaxed opacity-90">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {quizQuestions.length > 0 && (
                <button
                  type="button"
                  disabled={isLoadingAI}
                  onClick={() =>
                    onGenerateQuiz(
                      focusedArticle,
                      quizParams.customInstructions,
                      quizParams
                    )
                  }
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors text-xs"
                >
                  {isLoadingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando novas questões...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>
                        Criar Mais {quizParams.count}{' '}
                        {quizParams.count === 1 ? 'Questão' : 'Questões'} (
                        {focusedArticle ? focusedArticle.label : 'Artigo'})
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* SUB-MODE 2B: FLASHCARDS GENERATOR & EXPORTER (.CSV, .REM, ANKI) */}
          {quizSubMode === 'flashcards' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {/* Flashcard Generator Configuration Card */}
              <div
                style={cardStyle}
                className="p-3.5 rounded-2xl border space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5 text-indigo-500">
                    <Layers className="w-4 h-4" />
                    <span>Gerador de Flashcards (Anki / .rem / .csv)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddManualCard((v) => !v)}
                    className="px-2 py-0.5 rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Criar Manual</span>
                  </button>
                </div>

                {/* Quantity & Scope */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      Quantidade
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 3, 5, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() =>
                            onFlashcardParamsChange({
                              ...flashcardParams,
                              count: num,
                            })
                          }
                          className={`py-1 rounded-lg border text-xs font-bold transition-colors ${
                            flashcardParams.count === num
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-current/15 hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      Origem dos Cards
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onFlashcardParamsChange({
                            ...flashcardParams,
                            scope: 'focused_article',
                          })
                        }
                        className={`py-1 px-1.5 rounded-lg border text-[10.5px] font-semibold truncate ${
                          flashcardParams.scope === 'focused_article'
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                            : 'border-current/15 opacity-75'
                        }`}
                      >
                        {focusedArticle ? focusedArticle.label : 'Artigo Atual'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onFlashcardParamsChange({
                            ...flashcardParams,
                            scope: 'highlighted_articles',
                          })
                        }
                        className={`py-1 px-1.5 rounded-lg border text-[10.5px] font-semibold truncate ${
                          flashcardParams.scope === 'highlighted_articles'
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                            : 'border-current/15 opacity-75'
                        }`}
                        title="Gerar flashcards a partir dos artigos que você grifou nesta lei"
                      >
                        Grifados ({totalHighlightsCount})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Format Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    Estilo do Flashcard
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        ['frente_verso', 'Frente / Verso'],
                        ['cloze', 'Cloze {{c1::...}}'],
                        ['caso_pratico', 'Caso Prático'],
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          onFlashcardParamsChange({
                            ...flashcardParams,
                            cardType: val,
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-colors ${
                          flashcardParams.cardType === val
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-semibold'
                            : 'border-current/15 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isLoadingAI}
                  onClick={() => onGenerateFlashcards(flashcardParams)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  {isLoadingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando flashcards...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        Gerar {flashcardParams.count}{' '}
                        {flashcardParams.count === 1
                          ? 'Flashcard'
                          : 'Flashcards'}
                      </span>
                    </>
                  )}
                </button>

                {/* Manual Flashcard Creator Form */}
                {showAddManualCard && (
                  <form
                    onSubmit={handleAddManualFlashcard}
                    className="pt-2.5 border-t border-current/10 space-y-2"
                  >
                    <input
                      type="text"
                      value={manualCardFront}
                      onChange={(e) => setManualCardFront(e.target.value)}
                      placeholder="Frente (Pergunta ou frase com {{c1::termo}})..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-current/15 bg-transparent text-xs"
                    />
                    <textarea
                      rows={2}
                      value={manualCardBack}
                      onChange={(e) => setManualCardBack(e.target.value)}
                      placeholder="Verso (Resposta e fundamentação legal)..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-current/15 bg-transparent text-xs"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddManualCard(false)}
                        className="px-2.5 py-1 rounded-lg border border-current/15 text-[11px]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-[11px]"
                      >
                        Adicionar Card
                      </button>
                    </div>
                  </form>
                )}

                {/* Export Buttons (.CSV, .REM, ANKI) */}
                {flashcards.length > 0 && (
                  <div className="pt-2.5 border-t border-current/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider opacity-70">
                      <span>Exportar {flashcards.length} Flashcard(s)</span>
                      <button
                        type="button"
                        onClick={() => onChangeFlashcards([])}
                        className="text-rose-500 hover:underline font-normal normal-case"
                      >
                        Limpar lista
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        disabled={isExportingApkg}
                        onClick={handleExportFlashcardsApkg}
                        className="py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-colors disabled:opacity-50"
                        title="Exportar pacote completo de baralho Anki (.apkg) para importação com 1 clique"
                      >
                        {isExportingApkg ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        <span>Anki (.apkg)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportFlashcardsAnki}
                        className="py-1.5 px-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 font-semibold text-[11px] flex items-center justify-center gap-1"
                        title="Exportar texto formatado Anki (.txt)"
                      >
                        <Download className="w-3 h-3" />
                        <span>Anki (.txt)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportFlashcardsRem}
                        className="py-1.5 px-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-semibold text-[11px] flex items-center justify-center gap-1"
                        title="Exportar em formato .rem para RemNote"
                      >
                        <Download className="w-3 h-3" />
                        <span>.rem</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportFlashcardsCsv}
                        className="py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] flex items-center justify-center gap-1"
                        title="Exportar planilha .csv para Quizlet, Notion ou Excel"
                      >
                        <Download className="w-3 h-3" />
                        <span>.csv</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Flashcards List */}
              {flashcards.length === 0 ? (
                <div
                  style={cardStyle}
                  className="p-6 rounded-2xl border text-center text-xs opacity-70 space-y-1.5"
                >
                  <Layers className="w-6 h-6 mx-auto text-indigo-500 opacity-75" />
                  <p className="font-semibold">
                    Nenhum flashcard gerado nesta sessão
                  </p>
                  <p className="text-[11px]">
                    Escolha a quantidade acima e clique em{' '}
                    <strong>Gerar Flashcards</strong> para criar cartões de
                    memorização e exportá-los para Anki, RemNote (<code>.rem</code>)
                    ou <code>.csv</code>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {flashcards.map((card, idx) => {
                    const isFlipped = Boolean(flippedCardIds[card.id]);
                    return (
                      <div
                        key={card.id}
                        style={cardStyle}
                        onClick={() =>
                          setFlippedCardIds((prev) => ({
                            ...prev,
                            [card.id]: !prev[card.id],
                          }))
                        }
                        className="p-3.5 rounded-2xl border space-y-2 text-xs cursor-pointer hover:border-indigo-500/50 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-current/10 pb-1.5">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                            Card #{idx + 1} • {card.articleRef}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-semibold">
                              {isFlipped ? 'Verso (Resposta)' : 'Frente (Clique p/ virar)'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onChangeFlashcards(
                                  flashcards.filter((c) => c.id !== card.id)
                                );
                              }}
                              className="p-1 rounded hover:bg-rose-500/10 text-rose-500 opacity-65 hover:opacity-100"
                              title="Remover este flashcard"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <p className="font-medium leading-relaxed text-[12.5px]">
                            {card.front}
                          </p>
                          {isFlipped && (
                            <div className="pt-2 mt-2 border-t border-dashed border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 p-2.5 rounded-xl leading-relaxed">
                              <strong className="block text-[10px] uppercase tracking-wider mb-0.5">
                                Resposta / Verso:
                              </strong>
                              {card.back}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CADERNO (SPLIT INTO 2 SUB-TABS: GRIFOS & ANOTAÇÕES) */}
      {activeTab === 'notes' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-Tabs Header: Grifos vs Anotações vs Trilha & OAB */}
          <div
            style={{ borderColor: surface.borderColor }}
            className="px-3.5 pt-2.5 pb-2 border-b flex items-center justify-between gap-2"
          >
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-current/10 flex-1">
              <button
                type="button"
                onClick={() => onCadernoSubTabChange('grifos')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                  cadernoSubTab === 'grifos'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Highlighter className="w-3 h-3 shrink-0" />
                <span className="truncate">Grifos</span>
                {totalHighlightsCount > 0 && (
                  <span
                    className={`px-1 py-0.1 rounded-full text-[9px] font-bold ${
                      cadernoSubTab === 'grifos'
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {totalHighlightsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onCadernoSubTabChange('anotacoes')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                  cadernoSubTab === 'anotacoes'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <StickyNote className="w-3 h-3 shrink-0" />
                <span className="truncate">Notas</span>
                {totalNotesCount > 0 && (
                  <span
                    className={`px-1 py-0.1 rounded-full text-[9px] font-bold ${
                      cadernoSubTab === 'anotacoes'
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {totalNotesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onCadernoSubTabChange('trilha');
                  if (!isPro && onOpenProDrawer) {
                    onOpenProDrawer('oab_trail');
                  }
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                  cadernoSubTab === 'trilha'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <GraduationCap className="w-3 h-3 shrink-0" />
                <span className="truncate">Trilha & OAB</span>
                <span className="px-1 py-0.1 rounded text-[8px] font-bold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  PRO
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-current/15 hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors shrink-0"
              title="Recolher painel lateral direito"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SUB-TAB 1: GRIFOS & PERSONALIZAÇÃO DE CORES / TAGS */}
          {cadernoSubTab === 'grifos' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {/* Collapsible Color & Tag Customizer Card (Explanation reduced to Tooltip!) */}
              <div
                style={cardStyle}
                className="p-3.5 rounded-2xl border space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowColorCustomizer((v) => !v)}
                      className="font-semibold flex items-center gap-1.5 text-left"
                    >
                      <Palette className="w-4 h-4 text-amber-500" />
                      <span>Cores de Grifo & Atribuição de Tags</span>
                    </button>

                    {/* Tooltip replacing the inline explanation paragraph */}
                    <span className="relative group/tagtip inline-flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 opacity-55 hover:opacity-100 cursor-pointer" />
                      <span
                        className={`pointer-events-none opacity-0 group-hover/tagtip:opacity-100 transition-opacity duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 max-w-[280px] p-2.5 rounded-xl border shadow-2xl text-[11px] font-normal leading-relaxed z-50 ${tooltipClass}`}
                      >
                        As cores padrões vêm inicialmente livres. Clique em uma cor
                        abaixo para digitar uma tag personalizada ou clique em uma
                        das <strong>sugestões padrões</strong> para vinculá-la à
                        cor.
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRestoreDefaultColors}
                      className="text-[10px] opacity-65 hover:opacity-100 inline-flex items-center gap-1"
                      title="Restaurar as 6 cores padrões sem tags atribuídas"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Padrão</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowColorCustomizer((v) => !v)}
                      className="text-[11px] text-indigo-500 hover:underline font-medium"
                    >
                      {showColorCustomizer ? 'Recolher' : 'Expandir'}
                    </button>
                  </div>
                </div>

                {showColorCustomizer && (
                  <div className="space-y-2.5 pt-2 border-t border-current/10">
                    {/* List of Colors & their optional Tag input */}
                    <div className="space-y-1.5">
                      {highlightTags.map((tag) => {
                        const isSelected = activeColorTarget?.id === tag.id;
                        const colorLabel = tag.colorLabel || 'Cor';
                        return (
                          <div
                            key={tag.id}
                            onClick={() => setActiveColorIdForTag(tag.id)}
                            className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30'
                                : 'border-current/10 bg-black/[0.02] dark:bg-white/[0.02] hover:border-current/25'
                            }`}
                          >
                            {/* Native color input */}
                            <label
                              className="relative w-6 h-6 rounded-lg shrink-0 cursor-pointer border border-black/20 dark:border-white/20 overflow-hidden shadow-inner"
                              style={{ backgroundColor: tag.color }}
                              title="Clique para alterar a tonalidade da cor"
                            >
                              <input
                                type="color"
                                value={tag.color}
                                onChange={(e) =>
                                  handleUpdateTagColor(tag.id, e.target.value)
                                }
                                className="opacity-0 w-full h-full cursor-pointer"
                              />
                            </label>

                            <span className="text-[11px] font-semibold opacity-75 w-16 truncate shrink-0">
                              {colorLabel}
                            </span>

                            <input
                              type="text"
                              value={tag.name}
                              onFocus={() => setActiveColorIdForTag(tag.id)}
                              onChange={(e) =>
                                handleUpdateTagName(tag.id, e.target.value)
                              }
                              placeholder="Sem tag (atribuir tag...)"
                              className="flex-1 min-w-0 bg-transparent text-xs font-medium px-2 py-1 rounded-lg border border-current/10 focus:border-indigo-500 focus:outline-none"
                            />

                            {tag.name.trim() !== '' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateTagName(tag.id, '');
                                }}
                                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100"
                                title="Remover tag desta cor (manter apenas a cor)"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}

                            {!tag.isDefault && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomTag(tag.id);
                                }}
                                className="p-1 rounded hover:bg-rose-500/10 text-rose-500 opacity-70 hover:opacity-100"
                                title="Excluir cor personalizada"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Preset Tag Suggestions for the currently selected color */}
                    {activeColorTarget && (
                      <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-current/10 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider opacity-75">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: activeColorTarget.color }}
                            />
                            <span>
                              Sugestões de Tag para{' '}
                              {activeColorTarget.colorLabel || 'Cor Selecionada'}:
                            </span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {PRESET_TAG_SUGGESTIONS.map((preset) => {
                            const isAssigned =
                              activeColorTarget.name.trim().toLowerCase() ===
                              preset.toLowerCase();
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() =>
                                  handleUpdateTagName(
                                    activeColorTarget.id,
                                    isAssigned ? '' : preset
                                  )
                                }
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                                  isAssigned
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'border-current/15 hover:border-indigo-500/50 hover:bg-indigo-500/10 opacity-85 hover:opacity-100'
                                }`}
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add New Custom Color */}
                    <form
                      onSubmit={handleAddCustomColor}
                      className="pt-2 border-t border-current/10 space-y-2"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-65 block">
                        Adicionar Nova Cor Personalizada
                      </span>
                      <div className="flex items-center gap-1.5">
                        <label
                          className="w-7 h-7 rounded-lg shrink-0 cursor-pointer border border-black/20 dark:border-white/20 overflow-hidden"
                          style={{ backgroundColor: newCustomTagColor }}
                          title="Escolher cor"
                        >
                          <input
                            type="color"
                            value={newCustomTagColor}
                            onChange={(e) => setNewCustomTagColor(e.target.value)}
                            className="opacity-0 w-full h-full cursor-pointer"
                          />
                        </label>
                        <input
                          type="text"
                          value={newCustomTagName}
                          onChange={(e) => setNewCustomTagName(e.target.value)}
                          placeholder="Tag opcional (ex: Prazo, STF...)"
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-current/15 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {EXTRA_COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            onClick={() => setNewCustomTagColor(swatch)}
                            style={{ backgroundColor: swatch }}
                            className={`w-4 h-4 rounded-full border border-black/20 transition-transform ${
                              newCustomTagColor.toLowerCase() === swatch
                                ? 'scale-125 ring-2 ring-indigo-500'
                                : 'opacity-75 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Filter & Export Highlights Card */}
              <div
                style={cardStyle}
                className="p-3.5 rounded-2xl border space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Filtrar & Exportar Grifos</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTagFilter('all')}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      selectedTagFilter === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-current/15 opacity-70'
                    }`}
                  >
                    Todos ({totalHighlightsCount})
                  </button>
                  {highlightTags.map((t) => {
                    const label = getHighlightTagDisplayName(t);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTagFilter(t.id)}
                        style={{
                          borderColor: t.color,
                          backgroundColor:
                            selectedTagFilter === t.id
                              ? hexToRgba(t.color, 0.28)
                              : 'transparent',
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportHighlightsByTag}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-[11px] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Grifos (.md)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 font-medium text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar (.json)</span>
                  </button>
                </div>
              </div>

              {/* Highlighted Articles List */}
              {highlightedEntries.length === 0 ? (
                <div className="py-10 px-4 text-center text-xs opacity-60">
                  Nenhum grifo encontrado para este filtro.
                </div>
              ) : (
                highlightedEntries.map((entry) => {
                  const wholeTag = resolveHighlightTag(
                    entry.wholeHighlightColor,
                    highlightTags
                  );
                  const wholeHasCustomName = Boolean(wholeTag?.name?.trim());
                  return (
                    <div
                      key={entry.articleId}
                      onClick={() => onJumpToArticle(entry.articleId)}
                      style={{
                        ...cardStyle,
                        ...(wholeTag
                          ? {
                              borderLeftWidth: '4px',
                              borderLeftColor: wholeTag.color,
                            }
                          : {}),
                      }}
                      className="p-3 rounded-xl border cursor-pointer hover:border-indigo-500/50 transition-all space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {entry.articleLabel}
                          </span>
                          {wholeTag && (
                            <span
                              style={{
                                backgroundColor: hexToRgba(wholeTag.color, 0.2),
                                borderColor: wholeTag.color,
                              }}
                              className="px-2 py-0.2 rounded-full border text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: wholeTag.color }}
                              />
                              <span>
                                {wholeHasCustomName
                                  ? wholeTag.name
                                  : wholeTag.colorLabel || 'Grifado'}
                              </span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] opacity-55">
                          Ir para o artigo →
                        </span>
                      </div>

                      {entry.textHighlights.length > 0 && (
                        <div className="space-y-1">
                          {entry.textHighlights.map((hl) => {
                            const hlTag = resolveHighlightTag(
                              hl.color,
                              highlightTags
                            );
                            const hlHasName = Boolean(hlTag?.name?.trim());
                            return (
                              <div
                                key={hl.id}
                                style={{
                                  borderLeftColor: hlTag?.color || '#f59e0b',
                                }}
                                className="text-[11px] italic opacity-90 border-l-2 pl-2 flex items-start justify-between gap-2"
                              >
                                <span>"{hl.quote}"</span>
                                {hlTag && hlHasName && (
                                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 shrink-0 not-italic">
                                    {hlTag.name}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SUB-TAB 2: ANOTAÇÕES PESSOAIS */}
          {cadernoSubTab === 'anotacoes' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              <div
                style={cardStyle}
                className="p-3.5 rounded-2xl border space-y-2.5 text-xs"
              >
                <div className="font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Suas Anotações na Lei</span>
                  </span>
                </div>

                {/* Search Notes */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    value={notesSearchQuery}
                    onChange={(e) => setNotesSearchQuery(e.target.value)}
                    placeholder="Buscar nas suas anotações..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-current/15 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  {notesSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setNotesSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Export / Import Caderno */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Caderno (.md)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 font-medium text-[11px]"
                  >
                    <Download className="w-3 h-3" />
                    <span>Backup (.json)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-dashed border-current/20 hover:border-indigo-500 text-[11px] opacity-85 hover:opacity-100"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Importar</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJsonFile}
                  className="hidden"
                />
              </div>

              {notesEntries.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs opacity-60">
                  Nenhuma anotação encontrada. Clique em <strong>Nota</strong> em
                  qualquer artigo para adicionar comentários ou resumos.
                </div>
              ) : (
                notesEntries.map((entry) => (
                  <div
                    key={entry.articleId}
                    onClick={() => onJumpToArticle(entry.articleId)}
                    style={cardStyle}
                    className="p-3 rounded-xl border cursor-pointer hover:border-indigo-500/50 transition-all space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {entry.articleLabel}
                      </span>
                      <span className="text-[10px] opacity-55">
                        Ir para o artigo →
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed opacity-90">
                      {entry.note}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUB-TAB 3: TRILHA DO EDITAL & MAPEADOR DE INCIDÊNCIA OAB (FGV) - EXCLUSIVO PRO */}
          {cadernoSubTab === 'trilha' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
              {!isPro ? (
                <div
                  style={cardStyle}
                  className="p-5 rounded-2xl border text-center space-y-3 my-2"
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-bold text-sm">
                        Trilha do Edital & Mapeador OAB
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        PRO
                      </span>
                    </div>
                    <p className="text-[11.5px] opacity-75 max-w-xs mx-auto leading-relaxed">
                      Acompanhe sua meta diária de artigos lidos com auto-scroll,
                      tempo estimado de estudo e consulte a recorrência exata da FGV
                      nos artigos cobrados na 1ª fase da OAB.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenProDrawer && onOpenProDrawer('oab_trail')}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Conhecer Recursos PRO</span>
                  </button>
                </div>
              ) : (
                <>
                  {(() => {
                    const stats = calculateStudyTrailStats(doc, studyProgress);
                    return (
                      <div
                        style={cardStyle}
                        className="p-3.5 rounded-2xl border space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1.5 text-indigo-500">
                            <GraduationCap className="w-4 h-4" />
                            <span>Trilha do Edital & Meta Diária</span>
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.percentage}% concluído
                          </span>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-current/10 text-center">
                            <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                              {stats.readCount} / {stats.totalArticles}
                            </div>
                            <div className="text-[10px] opacity-70">
                              Artigos Lidos (Auto-scroll)
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-current/10 text-center">
                            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                              {stats.dailyGoalArticles} art/dia
                            </div>
                            <div className="text-[10px] opacity-70">
                              ~{stats.estimatedDailyMinutes} min/dia ({stats.targetDays}d)
                            </div>
                          </div>
                        </div>

                        {/* Seletor de Prazo (Meta de Dias) */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-current/10">
                          <span className="text-[11px] opacity-75">
                            Prazo da meta:
                          </span>
                          <div className="flex items-center gap-1">
                            {[7, 15, 30, 60].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={async () => {
                                  const next = await updateStudyTrailTargetDays(
                                    doc,
                                    studyProgress,
                                    d
                                  );
                                  onUpdateStudyProgress?.(next);
                                }}
                                className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-semibold ${
                                  stats.targetDays === d
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-current/15 opacity-75 hover:opacity-100'
                                }`}
                              >
                                {d}d
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={async () => {
                                const reset = await resetStudyTrailProgress(
                                  doc,
                                  studyProgress
                                );
                                onUpdateStudyProgress?.(reset);
                              }}
                              className="p-1 rounded hover:bg-rose-500/10 text-rose-500 opacity-70 hover:opacity-100 ml-1"
                              title="Zerar leitura desta lei"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Mapeador de Incidência OAB (FGV) */}
                  <div
                    style={cardStyle}
                    className="p-3.5 rounded-2xl border space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span>🎯 Mapeador de Incidência OAB / FGV</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                        {oabItems.length} artigos mapeados
                      </span>
                    </div>

                    {oabItems.length === 0 ? (
                      <p className="text-[11px] opacity-70 leading-relaxed">
                        Esta norma não possui artigos listados no preset principal de
                        alta recorrência da FGV/OAB ou é uma legislação complementar
                        específica.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {oabItems.map((item) => (
                          <div
                            key={item.articleNumber}
                            onClick={() => {
                              const targetArt = doc.articles.find(
                                (a) =>
                                  a.number.replace(/[º°.\s]/g, '').toLowerCase() ===
                                  item.articleNumber.toLowerCase()
                              );
                              if (targetArt) onJumpToArticle(targetArt.id);
                            }}
                            className="p-2.5 rounded-xl border border-current/10 hover:border-amber-500/50 bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer transition-all space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {item.articleLabel}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                Cobrado {item.recurrenceCount}x na FGV
                              </span>
                            </div>
                            <p className="text-[11px] opacity-85 leading-snug">
                              {item.summary}
                            </p>
                            <div className="text-[10px] opacity-65">
                              Exames: {item.exams.join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
