export type HeadingLevel =
  | 'parte'
  | 'livro'
  | 'titulo'
  | 'capitulo'
  | 'secao'
  | 'subsecao';

export interface ArticleSummary {
  id: string;
  number: string;
  label: string;
  preview: string;
  isRevoked: boolean;
  isAdct?: boolean;
}

export interface TocNode {
  id: string;
  level: HeadingLevel;
  title: string;
  subtitle?: string;
  isAdct?: boolean;
  children: TocNode[];
  articles: ArticleSummary[];
}

export interface ArticleRubric {
  id: string;
  text: string;
  html: string;
  isRevoked: boolean;
  modificationNote?: string;
  modificationUrl?: string;
}

export interface SubClause {
  id: string;
  type:
    | 'paragrafo'
    | 'inciso'
    | 'alinea'
    | 'item'
    | 'pena'
    | 'rubrica'
    | 'anotacao';
  label: string;
  text: string;
  html: string;
  isRevoked: boolean;
  modificationNote?: string;
  modificationUrl?: string;
}

export interface ArticleBlock {
  id: string;
  number: string;
  label: string;
  caputText: string;
  caputHtml: string;
  isRevoked: boolean;
  isAdct?: boolean;
  modificationNote?: string;
  modificationUrl?: string;
  rubrics?: ArticleRubric[];
  subClauses: SubClause[];
  sectionPath: string[];
  headingId?: string;
}

export type DocumentBlock =
  | { kind: 'heading'; node: TocNode }
  | { kind: 'article'; article: ArticleBlock }
  | {
      kind: 'text';
      id: string;
      text: string;
      html: string;
      isRevoked: boolean;
      isAdct?: boolean;
      modificationNote?: string;
      modificationUrl?: string;
    };

export interface HeaderLink {
  id: string;
  text: string;
  url: string;
}

export interface LegislationDocument {
  lawId: string;
  url: string;
  epigraph: string;
  ementa: string;
  preambulo: string[];
  headerLinks?: HeaderLink[];
  blocks: DocumentBlock[];
  toc: TocNode[];
  articles: ArticleBlock[];
  hasAdct: boolean;
}

export type HighlightColor = string;

export interface HighlightTag {
  id: string;
  name: string; // Empty string '' when no tag is assigned to this color yet
  colorLabel?: string; // Display name of the color itself (e.g. "Amarelo", "Verde")
  color: string; // Hex color code, e.g. "#f59e0b"
  isDefault?: boolean;
}

export interface TextHighlight {
  id: string;
  articleId: string;
  color: HighlightColor; // Matches HighlightTag.id
  tagName?: string;
  quote: string;
  createdAt: string;
}

export interface ArticleAnnotation {
  articleId: string;
  articleLabel: string;
  wholeHighlightColor?: HighlightColor; // Matches HighlightTag.id
  textHighlights: TextHighlight[];
  note: string;
  collapsed?: boolean;
  updatedAt: string;
}

export interface EditalArticleMatch {
  articleId: string;
  articleLabel: string;
  editalTopic: string;
  reason: string;
}

export type ThemeMode = 'light' | 'sepia' | 'dark';
export type FontFamilyOption =
  | 'sans'
  | 'serif'
  | 'opendyslexic'
  | 'dyslexic'
  | 'mono';

export interface AppearanceSettings {
  theme: ThemeMode;
  fontFamily: FontFamilyOption;
  fontSize: number; // px, e.g. 14 - 24
  lineHeight: number; // e.g. 1.4 - 2.1
  paragraphSpacing: number; // px, e.g. 8 - 28
  maxWidth: number; // px, e.g. 640 - 1100
  compiledMode: boolean; // hide/collapse revoked provisions & minimize legislative notes
  accentColor: string; // Hex color for app accent, default '#6366f1'
  hideAITools?: boolean; // Hide AI buttons and tabs when enabled
  sepiaIntensity?: number; // 0 - 100 (default 50)
  darkIntensity?: number; // 0 - 100 (default 100 for OLED black)
  enableVlibras?: boolean; // Exibir botão do VLibras na página (default true)
  isPcdAudioAccess?: boolean; // Sou pessoa com deficiência visual e necessito de leitura por áudio
  highContrast?: boolean; // Modo Alto Contraste (preto/branco puro com máxima taxa de contraste)
  lockColumnWidth?: boolean; // Fixar largura da coluna manualmente (desativa expansão adaptativa)
  textAlign?: 'justify' | 'left'; // Alinhamento do texto da norma (substitui altura de linha)
}

export type SubscriptionTier = 'free' | 'pro';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  subscription_tier: SubscriptionTier;
  is_pcd: boolean;
  updated_at: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp ms
  cachedAt: number; // timestamp ms for 24h offline TTL
  profile: UserProfile;
}

export interface StudyProgressEntry {
  lawId: string;
  readArticleIds: string[];
  targetDays: number;
  dailyGoalArticles: number;
  studyDaysOfWeek?: number[]; // [1, 2, 3, 4, 5] (1 = Seg, ..., 7 = Dom)
  showReadBadges?: boolean; // Exibir indicador de "Lido" nos artigos
  showOabBadges?: boolean; // Exibir indicador de "Incidência da OAB" nos artigos
  startedAt: string;
  updatedAt: string;
}

export interface OabIncidenceItem {
  articleId?: string;
  articleNumber: string;
  articleLabel: string;
  recurrenceCount: number;
  exams: string[];
  summary: string;
  priority: 'altissima' | 'alta' | 'media';
  tooltipText?: string;
}


export type AIProviderId = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export interface AIConfig {
  provider: AIProviderId;
  apiKeys: Record<AIProviderId, string>;
  models: Record<AIProviderId, string>;
  customBaseUrl?: string;
}

export type QuizDifficulty = 'facil' | 'medio' | 'dificil' | 'misto';
export type QuizQuestionStyle =
  | 'multipla_abcd'
  | 'multipla_abcde'
  | 'certo_errado';
export type QuizFocusMode =
  | 'letra_lei'
  | 'caso_pratico'
  | 'jurisprudencia'
  | 'pegadinhas';

export interface QuizGenerationParams {
  count: number; // 1 to 10
  difficulty: QuizDifficulty;
  style: QuizQuestionStyle;
  focus: QuizFocusMode;
  customInstructions?: string;
}

export type FlashcardType = 'frente_verso' | 'cloze' | 'caso_pratico';

export interface FlashcardItem {
  id: string;
  articleRef: string;
  front: string;
  back: string;
  tags?: string[];
}

export interface FlashcardGenerationParams {
  count: number; // 1 to 15
  cardType: FlashcardType;
  difficulty: QuizDifficulty;
  scope: 'focused_article' | 'highlighted_articles';
  customInstructions?: string;
}

export interface QuizOption {
  letter: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  articleRef: string;
  statement: string;
  options: QuizOption[];
  correctLetter: string;
  explanation: string;
  difficulty?: QuizDifficulty;
  userAnswer?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  articleContext?: string;
  citedArticles?: Array<{
    articleId: string;
    articleLabel: string;
    preview?: string;
  }>;
  timestamp: string;
}

