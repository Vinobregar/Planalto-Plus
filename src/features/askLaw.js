/**
 * Módulo E: "Pergunte à Lei" / Busca Semântica (src/features/askLaw.js)
 * Drawer lateral minimalista de perguntas em linguagem natural sobre a legislação aberta:
 * - Respostas estritamente ancoradas na lei, citando artigos, parágrafos e incisos exatos,
 *   com botões para rolar a página automaticamente até o artigo citado.
 * - Usuários gratuitos: disponível via BYOK (chave própria Gemini/OpenAI/Claude/OpenRouter).
 * - Usuários PRO: IA nativa integrada via Supabase Edge Function sem necessidade de configurar chaves.
 */

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  getAuthSession,
  isProUser,
} from '../services/auth.js';
import { runAICompletion } from '../services/aiService';

/**
 * Seleciona os artigos mais semanticamente pertinentes da lei aberta para compor o contexto ancorado
 */
export function selectRelevantArticlesForQuery(doc, question, maxArticles = 25) {
  const active = (doc?.articles || []).filter((a) => !a.isRevoked);
  const terms = String(question || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\W+/)
    .filter((w) => w.length >= 3);

  if (terms.length === 0) {
    return active.slice(0, maxArticles);
  }

  const scored = active.map((art) => {
    const rawText = `${art.label} ${art.caputText} ${(art.subClauses || [])
      .map((s) => `${s.label} ${s.text}`)
      .join(' ')}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    let score = 0;
    for (const t of terms) {
      if (rawText.includes(t)) {
        score += 3;
      }
    }
    return { art, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, maxArticles);
  if (top.length > 0) {
    return top.map((s) => s.art);
  }
  return active.slice(0, Math.min(15, maxArticles));
}

/**
 * Extrai todas as citações de artigos da resposta (ex: "Art. 5º", "Art. 121") e vincula ao `articleId` real da página
 * para que a interface exiba botões de rolagem automática até o artigo citado.
 */
export function extractCitedArticlesFromAnswer(answerText, doc) {
  if (!answerText || !doc || !Array.isArray(doc.articles)) return [];
  const citations = [];
  const seenIds = new Set();

  const regex = /\bArt(?:igo)?\.?\s*(\d+(?:\.\d+)*(?:-[A-Z])?)[º°]?/gi;
  let match;
  while ((match = regex.exec(answerText)) !== null) {
    const rawNum = match[1].replace(/\./g, '').toLowerCase();
    const found = doc.articles.find((a) => {
      const cleanA = String(a.number || '')
        .replace(/[º°.\s]/g, '')
        .toLowerCase();
      return cleanA === rawNum;
    });

    if (found && !seenIds.has(found.id)) {
      seenIds.add(found.id);
      citations.push({
        articleId: found.id,
        articleLabel: found.label,
        preview: found.caputText.slice(0, 120),
      });
    }
  }

  return citations;
}

/**
 * Executa uma pergunta em linguagem natural ancorada estritamente na legislação aberta ("Pergunte à Lei")
 */
export async function askLawQuestion({ question, doc, aiConfig }) {
  const cleanQuestion = String(question || '').trim();
  if (!cleanQuestion) {
    throw new Error('Digite uma pergunta sobre a legislação aberta.');
  }

  const pro = await isProUser();
  const hasOwnKey = Boolean(
    aiConfig &&
      aiConfig.provider &&
      aiConfig.apiKeys &&
      aiConfig.apiKeys[aiConfig.provider]?.trim()
  );

  if (!pro && !hasOwnKey) {
    return {
      requiresKeyOrPro: true,
      message:
        'Para usar o "Pergunte à Lei", configure sua própria chave gratuita (BYOK) na aba Chave API ou assine o Planalto Plus PRO para IA integrada sem configuração.',
    };
  }

  const relevantArticles = selectRelevantArticlesForQuery(doc, cleanQuestion, 25);
  const contextText = relevantArticles
    .map((a) => {
      const subs = (a.subClauses || [])
        .filter((s) => !s.isRevoked)
        .map((s) => `  ${s.label} ${s.text}`)
        .join('\n');
      return `[ID: ${a.id}] ${a.label} ${a.caputText}${subs ? `\n${subs}` : ''}`;
    })
    .join('\n\n');

  const systemPrompt = `Você é o módulo "Pergunte à Lei" do Planalto Plus.
Responda à pergunta do estudante ESTRITAMENTE ancorado no texto da norma "${doc.epigraph}".
REGRAS OBRIGATÓRIAS:
1. Cite expressamente os artigos, parágrafos (§), incisos (I, II, III...) e alíneas exatos da lei aberta (ex: "Conforme o Art. 5º, inciso LV...").
2. Se a resposta não constar na lei aberta, informe claramente que o tema não é disciplinado diretamente por este diploma legal.
3. Seja objetivo, claro e didático.`;

  const userPrompt = `Pergunta sobre a norma "${doc.epigraph}":
"${cleanQuestion}"

Dispositivos pertinentes da lei aberta para fundamentação estrita:
\`\`\`
${contextText}
\`\`\``;

  // 1. Se o usuário tem chave própria configurada (BYOK) ou se é PRO usando modelo direto
  if (hasOwnKey) {
    const answer = await runAICompletion({
      config: aiConfig,
      systemPrompt,
      userPrompt,
    });
    const citedArticles = extractCitedArticlesFromAnswer(answer, doc);
    return {
      requiresKeyOrPro: false,
      engine: 'byok',
      answer,
      citedArticles,
    };
  }

  // 2. Usuário PRO sem precisar configurar chaves: chama Supabase Edge Function `/ask-law`
  if (pro && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const session = await getAuthSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ask-law`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.accessToken || SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lawId: doc.lawId,
          epigraph: doc.epigraph,
          question: cleanQuestion,
          contextText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const answer = data.answer || data.text || '';
        if (answer) {
          return {
            requiresKeyOrPro: false,
            engine: 'pro-supabase-edge',
            answer,
            citedArticles: extractCitedArticlesFromAnswer(answer, doc),
          };
        }
      }
    } catch {
      // Fallback semântico local estruturado abaixo caso a Edge Function esteja inacessível
    }
  }

  // Fallback Semântico Local Ancorado (quando PRO está offline ou sem conexão à Edge Function)
  const top3 = relevantArticles.slice(0, 3);
  const fallbackLines = [
    `### Fundamentação Encontrada na Norma (${doc.epigraph})`,
    '',
    ...top3.map(
      (a) =>
        `- **${a.label}**: "${a.caputText}"${
          a.subClauses && a.subClauses.length > 0
            ? `\n  - *${a.subClauses[0].label}*: ${a.subClauses[0].text}`
            : ''
        }`
    ),
  ];
  const answer = fallbackLines.join('\n');

  return {
    requiresKeyOrPro: false,
    engine: 'pro-local-semantic',
    answer,
    citedArticles: top3.map((a) => ({
      articleId: a.id,
      articleLabel: a.label,
      preview: a.caputText.slice(0, 120),
    })),
  };
}
