/**
 * Módulo C (Parte 1): Motor Dual de Áudio / Leitura Ativa (src/features/audioPlayer.js)
 * Duas modalidades de execução para leitura em áudio de artigos:
 * 1. PcD (Lei Federal nº 13.146/2015) / Fallback Offline:
 *    - Utiliza a Web Speech API nativa (`SpeechSynthesisUtterance` pt-BR),
 *      execução 100% local, latência zero e custo zero de infraestrutura.
 * 2. Usuários PRO:
 *    - Chama a Edge Function do Supabase (`/tts`), que verifica o Cache Global (Supabase Storage).
 *    - Se for inédito, sintetiza com Google Cloud TTS (WaveNet `pt-BR-Wavenet-B`) e salva no Storage.
 *    - Caso offline ou sem rede no momento, realiza fallback transparente para Web Speech API nativa.
 */

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  getAuthSession,
  isProUser,
  isPcdUser,
} from '../services/auth.js';

let currentUtterance = null;
let currentHtmlAudio = null;
let activeArticleId = null;
let currentPlaybackRate = 1.0;
const listeners = new Set();

function notifyListeners(state) {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch {
      // ignore
    }
  }
}

export function subscribeAudioPlayer(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Formata o texto completo do artigo para leitura fluida em voz alta (expandindo abreviações jurídicas)
 */
export function formatArticleForSpeech(article) {
  if (!article) return '';
  const parts = [];

  if (article.rubrics && article.rubrics.length > 0) {
    for (const r of article.rubrics) {
      if (!r.isRevoked) parts.push(r.text);
    }
  }

  parts.push(`${article.label}. ${article.caputText}`);

  if (Array.isArray(article.subClauses)) {
    for (const sc of article.subClauses) {
      if (sc.isRevoked) continue;
      parts.push(`${sc.label}. ${sc.text}`);
    }
  }

  return parts
    .join(' ')
    .replace(/\bArt\.\s*(\d+)/gi, 'Artigo $1')
    .replace(/§\s*(\d+)[º°]?/g, 'Parágrafo $1')
    .replace(/§§/g, 'Parágrafos')
    .replace(/\binc\.\s*/gi, 'inciso ');
}

/**
 * Interrompe qualquer reprodução de áudio de artigo ativa
 */
export function stopArticleAudio() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentHtmlAudio = null;
  }
  currentUtterance = null;
  const stoppedId = activeArticleId;
  activeArticleId = null;
  notifyListeners({
    isPlaying: false,
    articleId: null,
    stoppedArticleId: stoppedId,
    engine: null,
    rate: currentPlaybackRate,
  });
}

/**
 * Altera a velocidade de reprodução (0.75x a 2x)
 */
export function setAudioPlaybackRate(rate) {
  const cleanRate = Math.max(0.75, Math.min(2.0, Number(rate) || 1.0));
  currentPlaybackRate = cleanRate;
  if (currentHtmlAudio) {
    currentHtmlAudio.playbackRate = cleanRate;
  }
  notifyListeners({
    isPlaying: Boolean(activeArticleId),
    articleId: activeArticleId,
    rate: cleanRate,
  });
}

/**
 * Executa leitura via Web Speech API nativa (SpeechSynthesisUtterance pt-BR)
 * 100% gratuito e ilimitado para PcD (Lei 13.146/2015) e fallback offline.
 */
export function speakWithNativeWebSpeech(text, articleId, rate = currentPlaybackRate) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      reject(new Error('Web Speech API não suportada neste navegador.'));
      return;
    }

    stopArticleAudio();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = rate;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice =
      voices.find(
        (v) =>
          v.lang.toLowerCase().includes('pt-br') &&
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Luciana'))
      ) || voices.find((v) => v.lang.toLowerCase().startsWith('pt'));

    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    currentUtterance = utterance;
    activeArticleId = articleId;

    notifyListeners({
      isPlaying: true,
      articleId,
      engine: 'web-speech-native',
      voice: ptVoice ? ptVoice.name : 'pt-BR Nativo',
      rate,
    });

    utterance.onend = () => {
      activeArticleId = null;
      currentUtterance = null;
      notifyListeners({
        isPlaying: false,
        articleId: null,
        engine: 'web-speech-native',
        rate,
      });
      resolve({ engine: 'web-speech-native' });
    };

    utterance.onerror = (err) => {
      activeArticleId = null;
      currentUtterance = null;
      notifyListeners({
        isPlaying: false,
        articleId: null,
        engine: 'web-speech-native',
        rate,
      });
      resolve({ engine: 'web-speech-native', interrupted: true, err });
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Reproduz o áudio do artigo:
 * - Verifica se o usuário é PRO ou PcD.
 * - Se não for nem PRO nem PcD, retorna `{ allowed: false, reason: 'requires_pro_or_pcd' }`
 *   para que a interface abra o Peeking Drawer sutilmente.
 * - Se for PRO online, consulta a Edge Function `/tts` (Cache Global Supabase Storage + WaveNet `pt-BR-Wavenet-B`).
 * - Se for PcD ou fallback offline, executa imediatamente via Web Speech API nativa.
 */
export async function playArticleAudio(article, lawId = 'lei-federal') {
  if (!article) return { allowed: false, reason: 'invalid_article' };

  // Se o mesmo artigo já estiver tocando, funciona como botão toggle (parar)
  if (activeArticleId === article.id) {
    stopArticleAudio();
    return { allowed: true, stopped: true };
  }

  const [pro, pcd] = await Promise.all([isProUser(), isPcdUser()]);

  if (!pro && !pcd) {
    return {
      allowed: false,
      reason: 'requires_pro_or_pcd',
    };
  }

  const speechText = formatArticleForSpeech(article);

  // Usuários PRO tentam primeiro a Edge Function (/tts) com Cache Global e voz Google Cloud TTS WaveNet (pt-BR-Wavenet-B)
  if (pro && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const session = await getAuthSession();
      const cachePath = `tts/${lawId}/${article.id}-pt-BR-Wavenet-B.mp3`;
      const publicCacheUrl = `${SUPABASE_URL}/storage/v1/object/public/audio-cache/${cachePath}`;

      // 1. Verifica se já existe no Cache Global do Supabase Storage (0 custo de síntese)
      let audioUrl = null;
      const headRes = await fetch(publicCacheUrl, { method: 'HEAD' });
      if (headRes.ok) {
        audioUrl = publicCacheUrl;
      } else {
        // 2. Se for inédito, aciona a Edge Function (/tts) para sintetizar com WaveNet pt-BR-Wavenet-B e salvar no Storage
        const ttsRes = await fetch(`${SUPABASE_URL}/functions/v1/tts`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session?.accessToken || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lawId,
            articleId: article.id,
            text: speechText,
            voice: 'pt-BR-Wavenet-B',
            cachePath,
          }),
        });

        if (ttsRes.ok) {
          const data = await ttsRes.json();
          audioUrl = data.audioUrl || data.url || null;
        }
      }

      if (audioUrl) {
        stopArticleAudio();
        const audio = new Audio(audioUrl);
        audio.playbackRate = currentPlaybackRate;
        currentHtmlAudio = audio;
        activeArticleId = article.id;

        notifyListeners({
          isPlaying: true,
          articleId: article.id,
          engine: 'cloud-wavenet',
          voice: 'pt-BR-Wavenet-B',
          rate: currentPlaybackRate,
        });

        audio.onended = () => {
          activeArticleId = null;
          currentHtmlAudio = null;
          notifyListeners({
            isPlaying: false,
            articleId: null,
            engine: 'cloud-wavenet',
            rate: currentPlaybackRate,
          });
        };

        await audio.play();
        return {
          allowed: true,
          engine: 'cloud-wavenet',
          voice: 'pt-BR-Wavenet-B',
          audioUrl,
        };
      }
    } catch {
      // Fallback transparente para Web Speech API nativa
    }
  }

  // Modalidade PcD (Lei 13.146/2015) ou Fallback Local Imediato
  await speakWithNativeWebSpeech(speechText, article.id, currentPlaybackRate);
  return {
    allowed: true,
    engine: 'web-speech-native',
    voice: 'SpeechSynthesisUtterance (pt-BR)',
  };
}

export function getAudioPlayerState() {
  return {
    isPlaying: Boolean(activeArticleId),
    articleId: activeArticleId,
    rate: currentPlaybackRate,
  };
}
