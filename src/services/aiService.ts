import {
  AIConfig,
  ArticleBlock,
  ChatMessage,
  EditalArticleMatch,
  FlashcardGenerationParams,
  FlashcardItem,
  LegislationDocument,
  QuizGenerationParams,
  QuizQuestion,
} from '../types/legislation';
import { getLawSearchKeywords } from '../storage/storageService';

export interface AIRequestPayload {
  config: AIConfig;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  pdfBase64?: string;
}

export async function callProviderDirectly(
  payload: AIRequestPayload
): Promise<string> {
  const { config, systemPrompt, userPrompt, jsonMode, pdfBase64 } = payload;
  const provider = config.provider;
  const apiKey = config.apiKeys[provider]?.trim();
  const model = config.models[provider]?.trim();

  if (!apiKey) {
    throw new Error(
      `Chave de API (${provider.toUpperCase()}) não configurada. Abra a aba de Configurações de IA para inserir sua chave.`
    );
  }

  if (provider === 'gemini') {
    let geminiModel = model || 'gemini-3.8-flash';
    if (geminiModel === 'gemini-2.5-flash') {
      geminiModel = 'gemini-3.8-flash';
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      geminiModel
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const userParts: Array<Record<string, unknown>> = [{ text: userPrompt }];
    if (pdfBase64) {
      userParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    }

    const body: Record<string, unknown> = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: 0.35,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro Gemini (${res.status}): ${errText.slice(0, 220)}`);
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || '')
        .join('') || '';
    if (!text) {
      throw new Error('Resposta vazia retornada pelo modelo Gemini.');
    }
    return text;
  }

  if (provider === 'anthropic') {
    const anthropicModel = model || 'claude-3-5-sonnet-latest';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro Anthropic (${res.status}): ${errText.slice(0, 220)}`);
    }

    const data = await res.json();
    return data?.content?.[0]?.text || '';
  }

  // OpenAI or OpenRouter / Custom OpenAI-compatible
  const baseUrl =
    provider === 'openai'
      ? 'https://api.openai.com/v1'
      : (config.customBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  const targetModel =
    model || (provider === 'openai' ? 'gpt-4o-mini' : 'google/gemini-2.5-flash');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: targetModel,
      temperature: 0.35,
      ...(jsonMode && provider === 'openai'
        ? { response_format: { type: 'json_object' } }
        : {}),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ${provider.toUpperCase()} (${res.status}): ${errText.slice(0, 220)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

export async function runAICompletion(payload: AIRequestPayload): Promise<string> {
  const hasChromeSendMessage =
    typeof chrome !== 'undefined' &&
    Boolean(chrome.runtime && typeof chrome.runtime.sendMessage === 'function');
  const hasBrowserSendMessage =
    typeof (globalThis as any).browser !== 'undefined' &&
    Boolean(
      (globalThis as any).browser?.runtime &&
        typeof (globalThis as any).browser.runtime.sendMessage === 'function'
    );

  const browserAPI = hasChromeSendMessage
    ? chrome
    : hasBrowserSendMessage
    ? (globalThis as any).browser
    : null;

  if (browserAPI && browserAPI.runtime && typeof browserAPI.runtime.sendMessage === 'function') {
    try {
      let resPromise: Promise<{ ok: boolean; text?: string; error?: string }>;

      // If Firefox native browser.runtime.sendMessage returning Promise
      if (hasBrowserSendMessage && typeof (globalThis as any).browser?.runtime?.sendMessage === 'function') {
        resPromise = (globalThis as any).browser.runtime.sendMessage({
          type: 'PLANALTO_AI_COMPLETION',
          payload,
        });
      } else {
        resPromise = new Promise<{ ok: boolean; text?: string; error?: string }>(
          (resolve, reject) => {
            browserAPI.runtime.sendMessage(
              { type: 'PLANALTO_AI_COMPLETION', payload },
              (res: any) => {
                if (browserAPI.runtime.lastError) {
                  reject(new Error(browserAPI.runtime.lastError.message));
                } else {
                  resolve(res);
                }
              }
            );
          }
        );
      }

      const response = await resPromise;
      if (response && response.ok && response.text) {
        return response.text;
      }
      if (response && !response.ok) {
        throw new Error(response.error || 'Erro desconhecido na chamada de IA');
      }
    } catch (err) {
      // If background worker is unavailable (e.g. dev preview), fall through to direct call
      if (err instanceof Error && err.message.includes('Chave de API')) {
        throw err;
      }
    }
  }

  return callProviderDirectly(payload);
}

export function formatArticleFullText(article: ArticleBlock): string {
  const parts = [`${article.label} ${article.caputText}`];
  for (const sc of article.subClauses) {
    parts.push(`  ${sc.label} ${sc.text}`);
  }
  return parts.join('\n');
}

export async function explainArticleWithAI(
  config: AIConfig,
  lawEpigraph: string,
  article: ArticleBlock
): Promise<string> {
  const systemPrompt =
    'Você é um professor especialista em Direito Brasileiro, preparação para OAB (FGV) e Concursos Públicos de alto nível (Magistratura, MP, Defensoria, Tribunais). Responda em português claro, didático e bem estruturado em Markdown.';
  const userPrompt = `Analise e explique detalhadamente o seguinte dispositivo legal da norma "${lawEpigraph}":

\`\`\`
${formatArticleFullText(article)}
\`\`\`

Estruture sua resposta exatamente com os seguintes tópicos:
1. **Resumo Direto (O que diz o artigo)**: Explicação clara e objetiva do comando normativo.
2. **Conceitos-Chave & Doutrina**: Termos técnicos, natureza jurídica, exceções e entendimento doutrinário majoritário.
3. **Como Cai na OAB e Concursos (Pontos Críticos & Exceções)**: Principais inversões de palavras (ex.: prazos, "salvo", "vedado", competência) cobradas por FGV, Cebraspe e FCC.
4. **Exemplo Prático**: Um caso concreto curto ilustrando a aplicação do dispositivo.`;

  return runAICompletion({ config, systemPrompt, userPrompt });
}

export async function summarizeArticleJurisprudenceWithAI(
  config: AIConfig,
  lawEpigraph: string,
  article: ArticleBlock
): Promise<string> {
  const systemPrompt =
    'Você é um pesquisador jurídico especialista em jurisprudência dos Tribunais Superiores brasileiros (STF e STJ). Seja rigoroso, cite apenas Súmulas, Temas de Repercussão Geral, Recursos Repetitivos ou Informativos reais e consolidados.';
  const userPrompt = `Apresente o panorama jurisprudencial (STF e STJ) aplicável ao seguinte artigo da norma "${lawEpigraph}":

\`\`\`
${formatArticleFullText(article)}
\`\`\`

Inclua:
1. **Súmulas Relacionadas (STF / STJ / Vinculantes)** se houver.
2. **Teses e Entendimentos Consolidados (STF / STJ)** sobre a interpretação deste artigo.
3. **Termos de Busca Recomendados** para pesquisa avançada no STF/STJ/Jusbrasil.`;

  return runAICompletion({ config, systemPrompt, userPrompt });
}

export const DEFAULT_QUIZ_PARAMS: QuizGenerationParams = {
  count: 1,
  difficulty: 'medio',
  style: 'multipla_abcd',
  focus: 'caso_pratico',
  customInstructions: '',
};

export const DEFAULT_FLASHCARD_PARAMS: FlashcardGenerationParams = {
  count: 3,
  cardType: 'frente_verso',
  difficulty: 'medio',
  scope: 'focused_article',
  customInstructions: '',
};

export async function generateArticleQuizWithAI(
  config: AIConfig,
  lawEpigraph: string,
  articleOrScope: ArticleBlock | null,
  customTopic?: string,
  previousStatements: string[] = [],
  params: QuizGenerationParams = DEFAULT_QUIZ_PARAMS
): Promise<QuizQuestion[]> {
  const count = Math.max(1, Math.min(10, params.count || 1));

  const difficultyGuide: Record<QuizGenerationParams['difficulty'], string> = {
    facil:
      'Nível FÁCIL (Fixação): Cobre diretamente a literalidade da lei seca, conceitos essenciais e regras diretas do dispositivo.',
    medio:
      'Nível MÉDIO (Padrão Concurso / OAB): Cobre situações hipotéticas contextualizadas, aplicação prática da regra e distinção entre incisos/parágrafos.',
    dificil:
      'Nível DIFÍCIL (Avançado / Magistratura / MP): Cobre exceções legais ("salvo", "exceto", prazos), interpretação sistemática, pegadinhas sutis e entendimento consolidado dos Tribunais Superiores (STF/STJ/TST).',
    misto:
      'Nível MISTO: Equilibre literalidade da lei seca, casos práticos e jurisprudência.',
  };

  const styleGuide: Record<QuizGenerationParams['style'], string> = {
    multipla_abcd:
      'Formato MÚLTIPLA ESCOLHA com 4 alternativas (letras A, B, C, D), sendo apenas uma correta.',
    multipla_abcde:
      'Formato MÚLTIPLA ESCOLHA com 5 alternativas (letras A, B, C, D, E), sendo apenas uma correta.',
    certo_errado:
      'Formato CERTO OU ERRADO (estilo julgue o item): o enunciado deve ser uma afirmação jurídica assertiva ou caso prático curto, com exatamente 2 opções: {"letter": "C", "text": "Certo"} e {"letter": "E", "text": "Errado"}.',
  };

  const focusGuide: Record<QuizGenerationParams['focus'], string> = {
    letra_lei: 'Foco principal: Literalidade estrita da Lei Seca (termos exatos, prazos, vedações).',
    caso_pratico: 'Foco principal: Situação hipotética / Caso prático aplicado ao artigo.',
    jurisprudencia: 'Foco principal: Súmulas e Jurisprudência dominante (STF, STJ, TST) relacionadas ao artigo.',
    pegadinhas: 'Foco principal: Pegadinhas clássicas de prova (inversão de "salvo/vedado", prazos, competências e exceções).',
  };

  const systemPrompt = `Você é um professor especialista em Direito Brasileiro.
Elabore EXATAMENTE ${count} questão(ões) inédita(s) de alto nível técnico cobrando o dispositivo legal fornecido.
- ${difficultyGuide[params.difficulty]}
- ${styleGuide[params.style]}
- ${focusGuide[params.focus]}
NÃO mencione nome de banca examinadora nem ano de aplicação da prova em nenhum lugar.
Retorne EXCLUSIVAMENTE um objeto JSON válido com a propriedade "questions" contendo exatamente ${count} questão(ões).`;

  const contextBlock = articleOrScope
    ? `Artigo em foco (${articleOrScope.label} — ${lawEpigraph}):\n${formatArticleFullText(
        articleOrScope
      )}`
    : `Norma em foco: ${lawEpigraph}\nTema específico: ${
        customTopic || 'Dispositivos centrais da lei'
      }`;

  const extraInstructions =
    (params.customInstructions || customTopic)?.trim()
      ? `\nInstruções ou recorte temático adicional do estudante: ${
          params.customInstructions || customTopic
        }\n`
      : '';

  const avoidRepeatNote =
    previousStatements.length > 0
      ? `\nCrie abordagens ou casos diferentes das questões anteriores:\n${previousStatements
          .slice(-4)
          .map((s, i) => `${i + 1}) ${s.slice(0, 120)}...`)
          .join('\n')}\n`
      : '';

  const optionsTemplate =
    params.style === 'certo_errado'
      ? `[
        { "letter": "C", "text": "Certo" },
        { "letter": "E", "text": "Errado" }
      ]`
      : params.style === 'multipla_abcde'
      ? `[
        { "letter": "A", "text": "Texto da alternativa A" },
        { "letter": "B", "text": "Texto da alternativa B" },
        { "letter": "C", "text": "Texto da alternativa C" },
        { "letter": "D", "text": "Texto da alternativa D" },
        { "letter": "E", "text": "Texto da alternativa E" }
      ]`
      : `[
        { "letter": "A", "text": "Texto da alternativa A" },
        { "letter": "B", "text": "Texto da alternativa B" },
        { "letter": "C", "text": "Texto da alternativa C" },
        { "letter": "D", "text": "Texto da alternativa D" }
      ]`;

  const userPrompt = `Elabore ${count} questão(ões) jurídica(s) cobrando o conteúdo abaixo (sem citar banca ou ano):

${contextBlock}
${extraInstructions}${avoidRepeatNote}
Retorne APENAS um JSON válido neste formato exato:
{
  "questions": [
    {
      "id": "q1",
      "articleRef": "${articleOrScope ? articleOrScope.label : 'Legislação'}",
      "statement": "Enunciado da questão...",
      "options": ${optionsTemplate},
      "correctLetter": "${params.style === 'certo_errado' ? 'C' : 'B'}",
      "explanation": "Fundamentação jurídica detalhada explicando por que a resposta está correta à luz da literalidade da lei e da jurisprudência, e apontando os erros das demais."
    }
  ]
}`;

  const rawText = await runAICompletion({
    config,
    systemPrompt,
    userPrompt,
    jsonMode: true,
  });

  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonSlice =
    firstBrace !== -1 && lastBrace !== -1
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  const parsed = JSON.parse(jsonSlice);
  const list = Array.isArray(parsed) ? parsed : parsed.questions || [];

  return list.slice(0, count).map((q: Partial<QuizQuestion>, idx: number) => ({
    id: `quiz-${Date.now()}-${idx}`,
    articleRef: q.articleRef || (articleOrScope?.label ?? 'Lei'),
    statement: q.statement || '',
    options: Array.isArray(q.options) ? q.options : [],
    correctLetter: String(q.correctLetter || 'A').toUpperCase(),
    explanation: q.explanation || '',
    difficulty: params.difficulty,
  }));
}

/**
 * Generates flashcards automatically (with AI when key is present) for active recall & spaced repetition (Anki, RemNote, CSV).
 */
export async function generateFlashcardsWithAI(
  config: AIConfig,
  doc: LegislationDocument,
  focusedArticle: ArticleBlock | null,
  highlightedArticles: ArticleBlock[],
  params: FlashcardGenerationParams = DEFAULT_FLASHCARD_PARAMS
): Promise<FlashcardItem[]> {
  const count = Math.max(1, Math.min(15, params.count || 3));

  const targetArticles =
    params.scope === 'highlighted_articles' && highlightedArticles.length > 0
      ? highlightedArticles.slice(0, 12)
      : focusedArticle
      ? [focusedArticle]
      : doc.articles.slice(0, 3);

  const articlesContext = targetArticles
    .map((a) => `[${a.label}]\n${formatArticleFullText(a)}`)
    .join('\n\n---\n\n');

  const cardTypeInstruction =
    params.cardType === 'cloze'
      ? 'Estilo CLOZE (Omissão de Palavras): Na propriedade "front", escreva a frase da lei ocultando o termo-chave, prazo ou exceção com a sintaxe {{c1::termo oculto}}. Na propriedade "back", coloque a resposta direta e a fundamentação do artigo.'
      : params.cardType === 'caso_pratico'
      ? 'Estilo CASO PRÁTICO CURTO: Na propriedade "front", apresente uma pergunta de situação prática rápida sobre o artigo. Na propriedade "back", apresente a resposta objetiva seguida do dispositivo legal.'
      : 'Estilo FRENTE E VERSO TRADICIONAL: Na propriedade "front", faça uma pergunta direta, clara e ativa sobre a regra, exceção, prazo ou conceito do artigo. Na propriedade "back", dê a resposta enxuta e precisa com base na lei.';

  const systemPrompt = `Você é um especialista em memorização jurídica (Active Recall, Anki e RemNote) para Concursos Públicos e OAB.
Elabore EXATAMENTE ${count} flashcard(s) de alta retenção baseados nos dispositivos legais fornecidos da norma "${doc.epigraph}".
- ${cardTypeInstruction}
- Dificuldade: ${params.difficulty.toUpperCase()}
Retorne EXCLUSIVAMENTE um objeto JSON válido com a propriedade "flashcards".`;

  const userPrompt = `Gere ${count} flashcard(s) de estudo sobre os dispositivos abaixo:

${articlesContext}
${
  params.customInstructions
    ? `\nFoco adicional solicitado pelo aluno: ${params.customInstructions}\n`
    : ''
}
Retorne APENAS um JSON válido neste formato exato:
{
  "flashcards": [
    {
      "articleRef": "${targetArticles[0]?.label || 'Art. 1º'}",
      "front": "Pergunta direta ou frase com {{c1::omissão}}...",
      "back": "Resposta objetiva + fundamentação legal...",
      "tags": ["LeiSeca", "Importante"]
    }
  ]
}`;

  const rawText = await runAICompletion({
    config,
    systemPrompt,
    userPrompt,
    jsonMode: true,
  });

  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonSlice =
    firstBrace !== -1 && lastBrace !== -1
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  const parsed = JSON.parse(jsonSlice);
  const rawCards = Array.isArray(parsed) ? parsed : parsed.flashcards || [];

  return rawCards.slice(0, count).map((c: Partial<FlashcardItem>, idx: number) => ({
    id: `fc-${Date.now()}-${idx}`,
    articleRef: c.articleRef || targetArticles[0]?.label || 'Artigo',
    front: c.front || '',
    back: c.back || '',
    tags: Array.isArray(c.tags) ? c.tags : [c.articleRef || 'Legislacao'],
  }));
}

/**
 * Instant local fallback flashcard generator (works even without an AI API key)
 * by turning the focused/highlighted articles and their sub-clauses into Cloze or Q&A cards.
 */
export function buildFallbackFlashcards(
  doc: LegislationDocument,
  focusedArticle: ArticleBlock | null,
  highlightedArticles: ArticleBlock[],
  params: FlashcardGenerationParams = DEFAULT_FLASHCARD_PARAMS
): FlashcardItem[] {
  const count = Math.max(1, Math.min(15, params.count || 3));
  const pool =
    params.scope === 'highlighted_articles' && highlightedArticles.length > 0
      ? highlightedArticles
      : focusedArticle
      ? [focusedArticle, ...doc.articles.filter((a) => a.id !== focusedArticle.id).slice(0, 5)]
      : doc.articles.slice(0, 6);

  const cards: FlashcardItem[] = [];
  for (const art of pool) {
    if (cards.length >= count) break;
    const caput = art.caputText.trim();
    if (params.cardType === 'cloze') {
      // Create a cloze deletion around key legal exceptions/deadlines or the middle phrase
      const clozeMatch = caput.match(
        /\b(salvo\s+[^.,;]+|exceto\s+[^.,;]+|vedad[oa]\s+[^.,;]+|independentemente\s+de\s+[^.,;]+|\d+\s*\([^)]+\)\s*(?:dias|meses|anos)|não\s+[^.,;]{10,45})/i
      );
      const frontText = clozeMatch
        ? caput.replace(clozeMatch[0], `{{c1::${clozeMatch[0]}}}`)
        : caput.replace(
            /^((?:\S+\s+){3,6})((?:\S+\s+){2,5})/,
            '$1{{c1::$2}}'
          );
      cards.push({
        id: `fc-local-${Date.now()}-${cards.length}`,
        articleRef: art.label,
        front: `${art.label}: ${frontText}`,
        back: `Texto integral (${art.label}): ${caput}`,
        tags: ['LeiSeca', 'Cloze'],
      });
    } else {
      cards.push({
        id: `fc-local-${Date.now()}-${cards.length}`,
        articleRef: art.label,
        front:
          params.cardType === 'caso_pratico'
            ? `Qual é a regra aplicável na hipótese disciplinada pelo ${art.label} (${doc.epigraph})?`
            : `O que dispõe o caput do ${art.label} (${doc.epigraph})?`,
        back: `${caput}${
          art.subClauses.length > 0
            ? `\n\nDispositivos complementares: ${art.subClauses
                .slice(0, 2)
                .map((s) => `${s.label} ${s.text}`)
                .join(' | ')}`
            : ''
        }`,
        tags: ['LeiSeca', 'Fixacao'],
      });
    }

    // Also use subClauses if we need more cards from the same focused article
    for (const sc of art.subClauses) {
      if (cards.length >= count) break;
      if (sc.type === 'rubrica' || sc.isRevoked || sc.text.length < 20) continue;
      cards.push({
        id: `fc-local-${Date.now()}-${cards.length}`,
        articleRef: `${art.label}, ${sc.label}`,
        front:
          params.cardType === 'cloze'
            ? `${art.label}, ${sc.label}: ${sc.text.replace(
                /^((?:\S+\s+){2,4})((?:\S+\s+){2,4})/,
                '$1{{c1::$2}}'
              )}`
            : `Segundo o ${art.label}, ${sc.label}, qual é a regra ou consequência prevista?`,
        back: `${sc.label} — ${sc.text}`,
        tags: ['LeiSeca', sc.type],
      });
    }
  }

  return cards.slice(0, count);
}

export async function sendLegalChatWithAI(
  config: AIConfig,
  lawEpigraph: string,
  focusedArticle: ArticleBlock | null,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const systemPrompt = `Você é um assistente jurídico especializado em Legislação Brasileira (${lawEpigraph}), preparação para OAB e Concursos Públicos.
${
  focusedArticle
    ? `O usuário está atualmente com foco no ${focusedArticle.label}:\n"""\n${formatArticleFullText(
        focusedArticle
      )}\n"""`
    : ''
}
Responda de forma precisa, citando os dispositivos pertinentes (artigos, parágrafos, incisos) e formatando em Markdown claro.`;

  const recentTranscript = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
    .join('\n\n');

  const userPrompt = recentTranscript
    ? `Histórico recente da conversa:\n${recentTranscript}\n\nNova pergunta do usuário:\n${userMessage}`
    : userMessage;

  return runAICompletion({ config, systemPrompt, userPrompt });
}

/**
 * Builds high-precision external search URLs for QConcursos, TEC Concursos, and Gran Questões.
 * Supports two search strategies:
 * 1. 'article_acronym': Searches by Article number + Popular Law Acronym/Name (e.g. "Art. 4º" "CLT" OR "Consolidação das Leis do Trabalho")
 * 2. 'literal_snippet': Searches by a distinctive literal phrase from the article's caput (which matches questions that transcribe the article text without citing its number!)
 */
export function buildExternalQuestionSearchUrls(
  doc: LegislationDocument,
  article: ArticleBlock | null
) {
  const { acronym, commonName, lawNumber } = getLawSearchKeywords(doc);
  const artLabel = article ? article.label : 'Art. 1º';
  const artNumPlain = article
    ? article.number.replace(/[º°]/g, '')
    : '1';

  // Extract a clean 7-word literal snippet from the article's caputText
  const cleanWords = (article?.caputText || '')
    .replace(/["“”()[\]]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const literalPhrase = cleanWords.slice(0, 8).join(' ');

  // Flexible article + law query that actually matches how exam boards write questions
  const lawFilter =
    acronym !== commonName
      ? `("${acronym}" OR "${commonName}"${lawNumber ? ` OR "${lawNumber}"` : ''})`
      : `"${commonName}"`;
  const artFilter = `("${artLabel}" OR "Art. ${artNumPlain}" OR "artigo ${artNumPlain}")`;

  const byArticleQuery = `${artFilter} ${lawFilter}`;
  const byLiteralQuery = literalPhrase
    ? `"${literalPhrase}" ${acronym}`
    : byArticleQuery;

  const directPlatformText = literalPhrase
    ? `${artLabel} ${acronym} ${cleanWords.slice(0, 5).join(' ')}`
    : `${artLabel} ${acronym}`;

  return {
    acronym,
    commonName,
    artLabel,
    literalPhrase,
    byArticle: {
      qconcursosDirect: `https://www.qconcursos.com/questoes-de-concursos/questoes?q=${encodeURIComponent(
        `${artLabel} ${acronym}`
      )}`,
      qconcursosGoogle: `https://www.google.com/search?q=${encodeURIComponent(
        `site:qconcursos.com/questoes-de-concursos/questoes ${byArticleQuery}`
      )}`,
      tecGoogle: `https://www.google.com/search?q=${encodeURIComponent(
        `site:tecconcursos.com.br/questoes ${byArticleQuery}`
      )}`,
      granGoogle: `https://www.google.com/search?q=${encodeURIComponent(
        `site:questoes.grancursosonline.com.br ${byArticleQuery}`
      )}`,
      openWebQuestions: `https://www.google.com/search?q=${encodeURIComponent(
        `questão concurso ${artFilter} ${lawFilter} gabarito`
      )}`,
    },
    byLiteral: {
      qconcursosDirect: `https://www.qconcursos.com/questoes-de-concursos/questoes?q=${encodeURIComponent(
        literalPhrase || directPlatformText
      )}`,
      qconcursosGoogle: `https://www.google.com/search?q=${encodeURIComponent(
        `site:qconcursos.com/questoes-de-concursos/questoes ${byLiteralQuery}`
      )}`,
      tecGoogle: `https://www.google.com/search?q=${encodeURIComponent(
        `site:tecconcursos.com.br/questoes ${byLiteralQuery}`
      )}`,
      granGoogle: `https://www.google.com/search?q=${encodeURIComponent(
        `site:questoes.grancursosonline.com.br ${byLiteralQuery}`
      )}`,
      openWebQuestions: `https://www.google.com/search?q=${encodeURIComponent(
        `"${literalPhrase}" questão concurso`
      )}`,
    },
  };
}

export function buildJurisprudenceUrls(lawEpigraph: string, article: ArticleBlock) {
  const lawNumberMatch = lawEpigraph.match(
    /(?:LEI\s+(?:COMPLEMENTAR\s+)?N[º°o]?\s*|DECRETO(?:-LEI)?\s+N[º°o]?\s*)([\d.]+)/i
  );
  const isConstituicao = /CONSTITUI[ÇC][ÃA]O/i.test(lawEpigraph);
  const isClt = /5\.?452/.test(lawEpigraph);
  const isCp = /2\.?848/.test(lawEpigraph);
  const isCc = /10\.?406/.test(lawEpigraph);
  const isCpc = /13\.?105/.test(lawEpigraph);
  const isCpp = /3\.?689/.test(lawEpigraph);

  const shortLawName = isConstituicao
    ? 'Constituição Federal'
    : isClt
    ? 'CLT'
    : isCp
    ? 'Código Penal'
    : isCc
    ? 'Código Civil'
    : isCpc
    ? 'CPC'
    : isCpp
    ? 'CPP'
    : lawNumberMatch
    ? `Lei ${lawNumberMatch[1]}`
    : lawEpigraph.slice(0, 45);

  const query = `"${article.label}" "${shortLawName}"`;
  const encodedQuery = encodeURIComponent(query);
  const plainQuery = encodeURIComponent(`${article.label} ${shortLawName} jurisprudencia`);

  return {
    query,
    shortLawName,
    links: [
      {
        id: 'jusbrasil',
        name: 'Jusbrasil Jurisprudência',
        description: 'Acórdãos e decisões citando o dispositivo',
        url: `https://www.jusbrasil.com.br/jurisprudencia/busca?q=${encodedQuery}`,
      },
      {
        id: 'stf',
        name: 'STF Jurisprudência',
        description: 'Supremo Tribunal Federal — Acórdãos e Repercussão Geral',
        url: `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&queryString=${encodedQuery}`,
      },
      {
        id: 'stj',
        name: 'STJ SCON / Pesquisa',
        description: 'Superior Tribunal de Justiça — Súmulas e Acórdãos',
        url: `https://www.google.com/search?q=${encodeURIComponent(
          `site:stj.jus.br "${article.label}" "${shortLawName}"`
        )}`,
      },
      {
        id: 'scholar',
        name: 'Google Acadêmico / Doutrina',
        description: 'Artigos científicos e análises doutrinárias',
        url: `https://scholar.google.com.br/scholar?q=${encodedQuery}`,
      },
      {
        id: 'qconcursos',
        name: 'Questões (QConcursos)',
        description: 'Buscar questões na plataforma QConcursos',
        url: `https://www.qconcursos.com/questoes-de-concursos/questoes?q=${encodeURIComponent(
          `${article.label} ${shortLawName}`
        )}`,
      },
      {
        id: 'google',
        name: 'Busca Geral Jurídica',
        description: 'Pesquisa aberta de jurisprudência comentada',
        url: `https://www.google.com/search?q=${plainQuery}`,
      },
    ],
  };
}

export async function analyzeEditalAndSelectArticles(
  config: AIConfig,
  doc: LegislationDocument,
  editalName: string,
  extractedText: string,
  pdfBase64?: string
): Promise<EditalArticleMatch[]> {
  // Build a compact index of active (non-revoked) articles in the current law
  const activeArticles = doc.articles.filter((a) => !a.isRevoked);
  const catalogSample = activeArticles
    .slice(0, 250)
    .map(
      (a) =>
        `${a.id} | ${a.label} (${a.sectionPath.slice(-1)[0] || ''}): ${a.caputText.slice(0, 110)}`
    )
    .join('\n');

  const systemPrompt = `Você é um especialista em editais de Concursos Públicos e Exame da OAB.
Sua tarefa é analisar o edital anexado/extraído e selecionar os artigos mais importantes e cobrados da norma "${doc.epigraph}" que correspondem ao conteúdo programático do edital.
Retorne EXCLUSIVAMENTE um objeto JSON válido com a propriedade "matches".`;

  const userPrompt = `Analise o edital "${editalName}" e identifique os artigos mais relevantes desta lei ("${doc.epigraph}") para o candidato estudar e grifar.

${
  extractedText.trim()
    ? `Texto extraído do Edital / Conteúdo Programático:\n"""\n${extractedText.slice(0, 28000)}\n"""\n`
    : 'Consulte o documento PDF anexado para verificar o conteúdo programático.'
}

Catálogo de artigos disponíveis nesta página (formato: articleId | Rótulo: resumo):
\`\`\`
${catalogSample}
\`\`\`

Retorne APENAS um JSON válido neste formato exato:
{
  "matches": [
    {
      "articleId": "art-1",
      "articleLabel": "Art. 1º",
      "editalTopic": "Tópico do edital relacionado (ex: Da Personalidade e da Capacidade / Atos Ilícitos)",
      "reason": "Justificativa curta de por que este artigo é altamente cobrado neste edital."
    }
  ]
}`;

  const rawText = await runAICompletion({
    config,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    pdfBase64: config.provider === 'gemini' ? pdfBase64 : undefined,
  });

  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonSlice =
    firstBrace !== -1 && lastBrace !== -1
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  const parsed = JSON.parse(jsonSlice);
  const rawList = Array.isArray(parsed) ? parsed : parsed.matches || [];

  const validMatches: EditalArticleMatch[] = [];
  for (const item of rawList) {
    // Match by exact articleId or by article number/label
    const matchedArticle =
      doc.articles.find((a) => a.id === item.articleId) ||
      doc.articles.find(
        (a) =>
          a.label.toLowerCase() === String(item.articleLabel || '').toLowerCase() ||
          `art-${a.number}` === String(item.articleId || '').toLowerCase()
      );

    if (matchedArticle) {
      validMatches.push({
        articleId: matchedArticle.id,
        articleLabel: matchedArticle.label,
        editalTopic: item.editalTopic || 'Conteúdo Programático do Edital',
        reason:
          item.reason ||
          'Artigo de alta incidência selecionado pela análise do edital.',
      });
    }
  }

  return validMatches;
}

