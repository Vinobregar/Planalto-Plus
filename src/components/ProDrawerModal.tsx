import React, { useState, useRef } from 'react';
import {
  Check,
  Cloud,
  ExternalLink,
  GraduationCap,
  Headphones,
  LogOut,
  Mail,
  MessageSquare,
  PanelRightClose,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AppearanceSettings, AuthSession } from '../types/legislation';
import { computeThemeColors } from './AppearancePopover';
import {
  loginWithGoogle,
  loginWithMagicLink,
  logout,
  setPcdUserStatus,
  setDebugProOverride,
  activateProSubscription,
} from '../services/auth.js';

interface ProDrawerModalProps {
  isOpen: boolean;
  featureKey: string;
  appearance: AppearanceSettings;
  authSession: AuthSession | null;
  isPro: boolean;
  isPcd: boolean;
  onClose: () => void;
  onAuthChange: () => void;
  onPcdChange: (enabled: boolean) => void;
}

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const ProDrawerModal: React.FC<ProDrawerModalProps> = ({
  isOpen,
  featureKey,
  appearance,
  authSession,
  isPro,
  isPcd,
  onClose,
  onAuthChange,
  onPcdChange,
}) => {
  const [magicEmail, setMagicEmail] = useState('');
  const [magicStatus, setMagicStatus] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Audio Demo State (Voz Neural Realista do Art. 1º)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudioDemo, setIsPlayingAudioDemo] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(31);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1);
  const [audioVolume, setAudioVolume] = useState<number>(1);

  const audioDemoUrl =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('assets/audio/demo-art1-neural.m4a')
      : 'assets/audio/demo-art1-neural.m4a';

  const handleTogglePlayAudioDemo = () => {
    if (!audioRef.current) return;
    if (isPlayingAudioDemo) {
      audioRef.current.pause();
      setIsPlayingAudioDemo(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlayingAudioDemo(true))
        .catch((err) => console.warn('Erro ao reproduzir demo áudio:', err));
    }
  };

  const handleTogglePlaybackRate = () => {
    const rates = [0.8, 1, 1.25, 1.5];
    const nextRate = rates[(rates.indexOf(audioPlaybackRate) + 1) % rates.length];
    setAudioPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
      try {
        (audioRef.current as any).preservesPitch = true;
      } catch {
        // ignore
      }
    }
  };

  const handleVolumeChange = (vol: number) => {
    setAudioVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  if (!isOpen) return null;

  const surface = computeThemeColors(appearance);
  const textClass =
    appearance.theme === 'dark'
      ? 'text-zinc-100'
      : appearance.theme === 'sepia'
      ? 'text-[#2c2825]'
      : 'text-slate-800';

  const handleOpenProLandingPage = () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'OPEN_PRO_PAGE' }, (res) => {
          if (chrome.runtime.lastError || !res?.ok) {
            const url = chrome.runtime.getURL('docs/pro.html');
            window.open(url, '_blank');
          }
        });
        return;
      }
      if (typeof (globalThis as any).browser?.runtime?.sendMessage === 'function') {
        (globalThis as any).browser.runtime.sendMessage({ type: 'OPEN_PRO_PAGE' });
        return;
      }
    } catch {
      // Fallback
    }
    try {
      const getUrl =
        typeof chrome !== 'undefined' && chrome.runtime?.getURL
          ? chrome.runtime.getURL.bind(chrome.runtime)
          : null;
      if (getUrl) {
        window.open(getUrl('docs/pro.html'), '_blank');
        return;
      }
    } catch {
      // Fallback
    }
    window.open('https://planalto-plus.com.br/pro', '_blank');
  };

  const handleGoogleLogin = async () => {
    setIsLoadingAuth(true);
    setMagicStatus(null);
    try {
      await loginWithGoogle();
      onAuthChange();
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail.trim()) return;
    setIsLoadingAuth(true);
    setMagicStatus(null);
    try {
      const res = await loginWithMagicLink(magicEmail);
      setMagicStatus(res.message);
      onAuthChange();
    } catch (err) {
      setMagicStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onAuthChange();
  };

  const handleTogglePcd = async (checked: boolean) => {
    await setPcdUserStatus(checked);
    onPcdChange(checked);
  };

  const handleToggleDemoPro = async () => {
    await activateProSubscription(isPro ? 'free' : 'pro');
    onAuthChange();
  };

  return (
    <div className="fixed inset-0 z-[95] flex justify-end bg-black/30 backdrop-blur-[1px] transition-opacity">
      <div
        onClick={onClose}
        className="flex-1 h-full cursor-pointer"
        aria-label="Fechar painel PRO"
      />
      <aside
        style={{
          backgroundColor: surface.panelBg,
          borderColor: surface.borderColor,
        }}
        className={`w-[410px] max-w-[94vw] h-full border-l shadow-2xl flex flex-col overflow-hidden select-none z-[96] ${textClass}`}
      >
        {/* Top Bar Minimalista */}
        <div
          style={{ borderColor: surface.borderColor }}
          className="px-4 py-3 border-b flex items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              PRO
            </span>
            <span className="font-bold text-xs tracking-tight">
              Planalto Plus • Recursos Avançados & Conta
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-current/15 hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            title="Fechar painel"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Convite PRO com Redirecionamento para a Página Explicativa dos Planos */}
          <div
            style={{
              backgroundColor: surface.cardBg,
              borderColor: surface.borderColor,
            }}
            className="p-4 rounded-2xl border space-y-3 shadow-sm text-center"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-sm">Planalto Plus PRO</h3>
              <p className="text-[11.5px] opacity-80 leading-relaxed max-w-xs mx-auto">
                Conheça todos os recursos avançados na página oficial de planos.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenProLandingPage}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <span>Conhecer Planos</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SEÇÃO DE DEMONSTRAÇÕES INTERATIVAS DAS FUNÇÕES PRO */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-75 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Demonstrações das Funções PRO</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
                Interativo
              </span>
            </div>

            {/* DEMO 1: LEITURA COM VOZ REALISTA NEURAL (ÁUDIO OFICIAL) */}
            <div
              style={{
                backgroundColor: surface.cardBg,
                borderColor: surface.borderColor,
              }}
              className="p-3.5 rounded-2xl border space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Headphones className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Voz Neural Realista • Demonstração</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Áudio HD
                </span>
              </div>

              <p className="text-[11px] opacity-80 leading-relaxed">
                Ouça abaixo a leitura do <strong>Art. 1º da Constituição Federal</strong> sintetizada com tecnologia neural realista:
              </p>

              {/* Player Interativo com Áudio */}
              <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-current/10 space-y-2.5">
                <div className="flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={handleTogglePlayAudioDemo}
                    className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md transition-all hover:scale-105 cursor-pointer"
                    title={isPlayingAudioDemo ? 'Pausar demonstração' : 'Ouvir demonstração com voz neural'}
                  >
                    {isPlayingAudioDemo ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between text-[10.5px] font-semibold">
                      <span className="truncate">Art. 1º (CF/88) • Narração Neural</span>
                      <span className="font-mono text-[10px] opacity-70">
                        {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                      </span>
                    </div>

                    {/* Seekbar Interativo */}
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 1}
                      step={0.1}
                      value={audioCurrentTime}
                      onChange={(e) => {
                        const time = Number(e.target.value);
                        setAudioCurrentTime(time);
                        if (audioRef.current) audioRef.current.currentTime = time;
                      }}
                      style={{ accentColor: '#8b5cf6' }}
                      className="w-full h-1.5 rounded-full cursor-pointer accent-indigo-600 block"
                      title="Arrastar para avançar / retroceder"
                    />
                  </div>

                  {/* Controle de Volume */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(audioVolume === 0 ? 1 : 0)}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
                      title={audioVolume === 0 ? 'Desmutar' : 'Mutar'}
                    >
                      {audioVolume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={audioVolume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      style={{ accentColor: '#8b5cf6' }}
                      className="w-12 h-1.5 rounded-full cursor-pointer accent-indigo-600"
                      title={`Volume: ${Math.round(audioVolume * 100)}%`}
                    />
                  </div>

                  {/* Seletor de Velocidade */}
                  <button
                    type="button"
                    onClick={handleTogglePlaybackRate}
                    className="px-2 py-1 rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 font-mono text-[10px] font-bold shrink-0 cursor-pointer"
                    title="Alterar velocidade de reprodução (preserva tom de voz)"
                  >
                    {audioPlaybackRate}x
                  </button>
                </div>

                <audio
                  ref={audioRef}
                  src={audioDemoUrl}
                  preload="metadata"
                  onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration || 31)}
                  onPlay={() => {
                    if (audioRef.current) {
                      audioRef.current.playbackRate = audioPlaybackRate;
                      try {
                        (audioRef.current as any).preservesPitch = true;
                      } catch {
                        // ignore
                      }
                      audioRef.current.volume = audioVolume;
                    }
                  }}
                  onEnded={() => {
                    setIsPlayingAudioDemo(false);
                    setAudioCurrentTime(0);
                  }}
                />

                <div className="text-[10px] opacity-75 italic border-t border-current/10 pt-1.5 leading-snug">
                  “Art. 1º A República Federativa do Brasil, formada pela união indissolúvel dos Estados e Municípios e do Distrito Federal, constitui-se em Estado Democrático de Direito e tem como fundamentos: I - a soberania; II - a cidadania; III - a dignidade da pessoa humana; IV - os valores sociais do trabalho e da livre iniciativa; V - o pluralismo político.”
                </div>
              </div>
            </div>

            {/* DEMO 2: "PERGUNTE À LEI" (CONSULTA GLOBAL DA NORMA) */}
            <div
              style={{
                backgroundColor: surface.cardBg,
                borderColor: surface.borderColor,
              }}
              className="p-3.5 rounded-2xl border space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>"Pergunte à Lei" • Consulta Panorâmica</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  Norma Inteira
                </span>
              </div>

              {/* Caixa Simplificada de Exemplo Direto */}
              <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-[11px] space-y-2 leading-relaxed">
                <div className="flex items-start gap-2 text-indigo-600 dark:text-indigo-300 font-medium">
                  <span className="font-bold shrink-0">💬</span>
                  <span className="italic">"Quais são os prazos de sanção e veto presidencial?"</span>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-indigo-500/15 opacity-90">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Art. 66:</strong> Veto em <strong>15 dias úteis</strong> (comunicação em 48h). Sanção tácita após 15 dias de silêncio. Apreciação legislativa em <strong>30 dias</strong>.
                  </div>
                </div>
              </div>
            </div>

            {/* DEMO 3: TRILHA DO EDITAL & MAPEADOR DE INCIDÊNCIA OAB */}
            <div
              style={{
                backgroundColor: surface.cardBg,
                borderColor: surface.borderColor,
              }}
              className="p-3.5 rounded-2xl border space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Trilha do Edital & Mapeador OAB</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  FGV
                </span>
              </div>

              <p className="text-[11px] opacity-80 leading-relaxed">
                Ajuste seus dias de estudo na semana (ex: Seg a Sex) para receber uma meta diária automática de leitura com auto-scroll e veja quais artigos têm recorrência comprovada na OAB.
              </p>
            </div>
          </div>

          {/* Modo Desenvolvedor / Debug PRO */}
          <div
            style={{
              backgroundColor: surface.cardBg,
              borderColor: surface.borderColor,
            }}
            className="p-3.5 rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-500/5 space-y-2 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <span>🛠️ Modo de Teste PRO (Debug)</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isPro
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-black/10 dark:bg-white/10 opacity-70'
              }`}>
                {isPro ? 'PRO ATIVO' : 'DESATIVADO'}
              </span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">
              Ativação local para testes e conferência imediata de todos os recursos PRO sem necessidade de login.
            </p>
            <button
              type="button"
              onClick={async () => {
                await setDebugProOverride(!isPro);
                onAuthChange();
              }}
              className={`w-full py-2 px-3 rounded-xl border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isPro
                  ? 'border-rose-600 bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                  : 'border-indigo-600 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isPro ? 'Desativar Modo de Teste PRO' : 'Ativar Modo PRO (Debug / Teste)'}</span>
            </button>
          </div>

          {/* Autenticação (Google OAuth 1-Click + Magic Link) */}
          <div
            style={{
              backgroundColor: surface.cardBg,
              borderColor: surface.borderColor,
            }}
            className="p-4 rounded-2xl border space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-indigo-500" />
                <span>Conta & Sincronização em Nuvem</span>
              </span>
              {authSession && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    isPro
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-black/5 dark:bg-white/10 opacity-75'
                  }`}
                >
                  {isPro ? 'Plano PRO Ativo' : 'Conta Gratuita'}
                </span>
              )}
            </div>

            {authSession ? (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-current/10 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{authSession.profile.email}</span>
                    </div>
                    <p className="text-[10px] opacity-65 mt-0.5">
                      Sessão offline garantida por 24h (TTL ativo)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-2.5 py-1 rounded-lg border border-current/15 hover:bg-rose-500/10 hover:text-rose-500 text-[11px] font-medium flex items-center gap-1 shrink-0"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sair</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleToggleDemoPro}
                  className="w-full py-1.5 px-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isPro
                      ? 'Alternar para Modo Gratuito'
                      : 'Já sou Assinante — Sincronizar / Ativar PRO'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isLoadingAuth}
                  onClick={handleGoogleLogin}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Entrar com Google (1 Clique — OAuth)</span>
                </button>

                <form onSubmit={handleMagicLinkSubmit} className="space-y-1.5">
                  <label className="text-[10.5px] opacity-75 block">
                    Ou receba um Magic Link por e-mail (sem senha):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="email"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com.br"
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-current/20 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                    <button
                      type="submit"
                      disabled={isLoadingAuth || !magicEmail.trim()}
                      className="px-3 py-1.5 rounded-xl border border-current/20 hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1 shrink-0"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Enviar</span>
                    </button>
                  </div>
                </form>

                {magicStatus && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {magicStatus}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
