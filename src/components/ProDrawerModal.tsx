import React, { useState } from 'react';
import {
  Check,
  Cloud,
  ExternalLink,
  Headphones,
  LogOut,
  Mail,
  PanelRightClose,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Volume2,
} from 'lucide-react';
import { AppearanceSettings, AuthSession } from '../types/legislation';
import { computeThemeColors } from './AppearancePopover';
import {
  PRO_PLANS,
  getFeaturePreview,
} from '../ui/proDrawer.js';
import {
  loginWithGoogle,
  loginWithMagicLink,
  logout,
  setPcdUserStatus,
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

  if (!isOpen) return null;

  const surface = computeThemeColors(appearance);
  const preview = getFeaturePreview(featureKey);
  const textClass =
    appearance.theme === 'dark'
      ? 'text-zinc-100'
      : appearance.theme === 'sepia'
      ? 'text-[#2c2825]'
      : 'text-slate-800';

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
        aria-label="Fechar prévia"
      />
      <aside
        style={{
          backgroundColor: surface.panelBg,
          borderColor: surface.borderColor,
        }}
        className={`w-[420px] max-w-[94vw] h-full border-l shadow-2xl flex flex-col overflow-hidden select-none z-[96] ${textClass}`}
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
          {/* Peeking Contextual Feature Preview */}
          <div
            style={{
              backgroundColor: surface.cardBg,
              borderColor: surface.borderColor,
            }}
            className="p-4 rounded-2xl border space-y-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Headphones className="w-3.5 h-3.5" />
                <span>{preview.tag}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-medium opacity-75">
                Prévia Contextual
              </span>
            </div>
            <h3 className="font-bold text-sm leading-snug">{preview.title}</h3>
            <p className="text-[11.5px] opacity-85 leading-relaxed">
              {preview.description}
            </p>
            <ul className="space-y-1.5 pt-1">
              {preview.previewPoints.map((pt: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="opacity-90">{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3 Planos Comerciais Atualizados (Asaas Checkout) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                Planos Transparentes (Liberação via PIX ou Cartão)
              </span>
            </div>

            {PRO_PLANS.map((plan) => (
              <div
                key={plan.id}
                style={{
                  backgroundColor: surface.cardBg,
                  borderColor: plan.featured ? '#6366f1' : surface.borderColor,
                }}
                className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                  plan.featured ? 'ring-1 ring-indigo-500/40 shadow-md' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm">{plan.name}</span>
                      {plan.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-75 mt-0.5">
                      {plan.subtitle}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-base text-indigo-600 dark:text-indigo-400">
                      {plan.priceDisplay}
                    </div>
                    <div className="text-[10px] opacity-65">
                      {plan.periodDisplay}
                    </div>
                  </div>
                </div>

                <a
                  href={plan.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    plan.featured
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                      : 'border border-current/20 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{plan.ctaLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>

          {/* Ativação Direta e Gratuita de Acessibilidade PcD (Lei Federal nº 13.146/2015) */}
          <div
            style={{
              backgroundColor: surface.cardBg,
              borderColor: surface.borderColor,
            }}
            className="p-3.5 rounded-2xl border border-l-4 border-l-emerald-500 space-y-2"
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Volume2 className="w-4 h-4 shrink-0" />
              <span>Acessibilidade Gratuita — Lei Federal nº 13.146/2015</span>
            </div>
            <p className="text-[11px] opacity-85 leading-relaxed">
              Pessoas com deficiência visual têm acesso gratuito e ilimitado à
              leitura por áudio de qualquer artigo utilizando a síntese nativa
              de latência zero.
            </p>
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPcd}
                onChange={(e) => handleTogglePcd(e.target.checked)}
                className="mt-0.5 rounded accent-emerald-600 w-4 h-4 shrink-0"
              />
              <span className="text-xs font-semibold">
                Sou pessoa com deficiência visual e necessito de leitura por
                áudio
              </span>
            </label>
          </div>

          {/* Autenticação Supabase (Google OAuth 1-Click + Magic Link) */}
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
                <span>Conta & Sincronização em Nuvem (Supabase)</span>
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
