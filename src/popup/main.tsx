import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  Check,
  Contrast,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Keyboard,
  KeyRound,
  Moon,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunset,
  Volume2,
} from 'lucide-react';
import '../styles/tailwind.css';
import {
  AIConfig,
  AIProviderId,
  AppearanceSettings,
  ThemeMode,
} from '../types/legislation';
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_APPEARANCE,
  computeProportionalAppearance,
  loadAIConfig,
  loadAppearanceSettings,
  saveAIConfig,
  saveAppearanceSettings,
} from '../storage/storageService';
import { setPcdUserStatus } from '../services/auth.js';

const QUICK_LAWS = [
  {
    name: 'Constituição Federal (CF/88)',
    url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
  },
  {
    name: 'Código Civil (Lei 10.406/02)',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
  },
  {
    name: 'Código de Processo Civil (CPC/15)',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm',
  },
  {
    name: 'Código Penal (Dec.-Lei 2.848/40)',
    url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm',
  },
  {
    name: 'CLT (Dec.-Lei 5.452/43)',
    url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm',
  },
  {
    name: 'Código de Defesa do Consumidor',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
  },
];

const PopupApp: React.FC = () => {
  const [appearance, setAppearance] = useState<AppearanceSettings>(() =>
    computeProportionalAppearance()
  );
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [saved, setSaved] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    loadAppearanceSettings().then(setAppearance);
    loadAIConfig().then(setAiConfig);
  }, []);

  const updateTheme = (theme: ThemeMode) => {
    const next = { ...appearance, theme };
    setAppearance(next);
    saveAppearanceSettings(next);
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    saveAIConfig(aiConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openProPage = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      window.open(chrome.runtime.getURL('docs/pro.html'), '_blank');
    } else {
      window.open('https://github.com/Vinobregar/Planalto-Plus', '_blank');
    }
  };

  return (
    <div className="w-full max-w-[380px] p-4 bg-slate-900 text-slate-100 font-sans space-y-4 select-none">
      {/* Extension Header with Version Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm leading-tight text-white">Planalto Plus</h1>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v1.2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Leitura Jurídica, Acessibilidade & IA
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openProPage}
          className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Conhecer planos PRO e recursos avançados"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>PRO</span>
        </button>
      </div>

      {/* Theme Quick Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Tema Padrão
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'light', label: 'Claro', icon: <Sun className="w-3.5 h-3.5" /> },
              { id: 'sepia', label: 'Sépia', icon: <Sunset className="w-3.5 h-3.5" /> },
              { id: 'dark', label: 'Escuro', icon: <Moon className="w-3.5 h-3.5" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => updateTheme(t.id)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                appearance.theme === t.id
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-semibold shadow-sm'
                  : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick AI Key Setup */}
      <form
        onSubmit={handleSaveKey}
        className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 space-y-2.5 text-xs shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold flex items-center gap-1.5 text-indigo-400">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Chave de API de IA</span>
            </span>
            <span className="relative group/popuptip inline-flex items-center">
              <HelpCircle className="w-3.5 h-3.5 opacity-60 hover:opacity-100 cursor-pointer text-indigo-400" />
              <div className="invisible opacity-0 group-hover/popuptip:visible group-hover/popuptip:opacity-100 transition-all duration-150 absolute left-0 top-full mt-1.5 w-72 p-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl text-[11px] font-normal leading-relaxed z-50 pointer-events-auto select-text before:absolute before:-top-2 before:left-0 before:right-0 before:h-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-400 mb-1.5 border-b border-slate-700 pb-1">
                  <KeyRound className="w-3 h-3" />
                  <span>Sobre a Chave de API</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <strong className="block text-indigo-300 font-semibold mb-0.5">O que é?</strong>
                    <p className="opacity-90">Permite conectar a extensão à IA (Google Gemini, OpenAI, Claude) para tirar dúvidas, resumir artigos e criar questões.</p>
                  </div>
                  <div>
                    <strong className="block text-emerald-400 font-semibold mb-0.5">Como obter?</strong>
                    <p className="opacity-90 mb-1">Crie gratuitamente no Google AI Studio (recomendado, sem custo):</p>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-400 hover:underline">
                      <span>Google AI Studio</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="pt-1.5 border-t border-slate-700 flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-400 font-semibold mb-0.5">Segura e 100% Local</strong>
                      <p className="opacity-90">Sua chave é salva exclusivamente no seu navegador (chrome.storage) e nunca é enviada a terceiros.</p>
                    </div>
                  </div>
                </div>
              </div>
            </span>
          </div>
          <select
            value={aiConfig.provider}
            onChange={(e) =>
              setAiConfig({
                ...aiConfig,
                provider: e.target.value as AIProviderId,
              })
            }
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <input
          type="password"
          value={aiConfig.apiKeys[aiConfig.provider] || ''}
          onChange={(e) =>
            setAiConfig({
              ...aiConfig,
              apiKeys: {
                ...aiConfig.apiKeys,
                [aiConfig.provider]: e.target.value,
              },
            })
          }
          placeholder={`Insira sua API Key (${aiConfig.provider.toUpperCase()})...`}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500 shadow-inner"
        />

        <button
          type="submit"
          className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Chave Salva com Sucesso!</span>
            </>
          ) : (
            <span>Salvar Chave Localmente</span>
          )}
        </button>
      </form>

      {/* Acessibilidade & Inclusão (Universal - Fonte Maior e Alto Contraste) */}
      <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-3.5 shadow-md">
        <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center justify-between border-b border-slate-700/80 pb-2">
          <span>Acessibilidade & Inclusão</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Gratuito
          </span>
        </div>

        {/* 1. Botão do VLibras (Tradução 3D) */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl select-none shrink-0" role="img" aria-label="Libras">🤟</span>
            <div className="min-w-0">
              <div className="font-bold text-slate-100 text-[14px] leading-tight">
                Botão do VLibras
              </div>
              <div className="text-[12px] text-slate-300 leading-snug">
                Tradução em Libras 3D oficial na lateral
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = { ...appearance, enableVlibras: !appearance.enableVlibras };
              setAppearance(next);
              saveAppearanceSettings(next);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 cursor-pointer ${
              appearance.enableVlibras !== false
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
            }`}
          >
            {appearance.enableVlibras !== false ? 'Exibido' : 'Desocultar'}
          </button>
        </div>

        {/* 2. Leitura por Áudio PcD (Deficiência Visual) */}
        <label className="flex items-start gap-3 pt-2.5 border-t border-slate-700/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(appearance.isPcdAudioAccess)}
            onChange={(e) => {
              const flag = e.target.checked;
              const next = { ...appearance, isPcdAudioAccess: flag };
              setAppearance(next);
              saveAppearanceSettings(next);
              setPcdUserStatus(flag);
            }}
            className="mt-1 w-5 h-5 rounded accent-indigo-500 cursor-pointer shrink-0"
          />
          <div className="space-y-1 min-w-0">
            <span className="text-slate-100 font-bold text-[14px] leading-snug block">
              Sou pessoa com deficiência visual e necessito de leitura por áudio
            </span>
            <span className="text-[12px] text-slate-300 leading-normal block">
              Ativa síntese de voz nativa ilimitada e gratuita em todos os artigos
            </span>
          </div>
        </label>

        {/* 3. Modo Alto Contraste (WCAG AAA) */}
        <label className="flex items-start gap-3 pt-2.5 border-t border-slate-700/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(appearance.highContrast)}
            onChange={(e) => {
              const flag = e.target.checked;
              const next = { ...appearance, highContrast: flag };
              setAppearance(next);
              saveAppearanceSettings(next);
            }}
            className="mt-1 w-5 h-5 rounded accent-indigo-500 cursor-pointer shrink-0"
          />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Contrast className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-100 font-bold text-[14px] leading-snug block">
                Modo Alto Contraste (WCAG AAA)
              </span>
            </div>
            <span className="text-[12px] text-slate-300 leading-normal block">
              Preto e branco puros com bordas reforçadas para máxima legibilidade
            </span>
          </div>
        </label>
      </div>

      {/* Preferências Rápidas de Leitura */}
      <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-800 space-y-2 text-xs">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Preferências Rápidas
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-200 font-medium">Texto Compilado por padrão</span>
          <button
            type="button"
            onClick={() => {
              const next = { ...appearance, compiledMode: !appearance.compiledMode };
              setAppearance(next);
              saveAppearanceSettings(next);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              appearance.compiledMode
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700'
            }`}
          >
            {appearance.compiledMode ? 'Ativado' : 'Desativado'}
          </button>
        </div>
      </div>

      {/* Atalhos de Teclado (Cheat Sheet) */}
      <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-2">
        <button
          type="button"
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="w-full flex items-center justify-between text-slate-300 font-semibold cursor-pointer hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
            <span>Atalhos de Leitura no Teclado</span>
          </span>
          <span className="text-[10px] font-mono opacity-70">
            {showShortcuts ? 'Recolher' : 'Ver Todos'}
          </span>
        </button>

        {showShortcuts && (
          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-300">Imprimir limpo</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-indigo-300">Ctrl+P</kbd>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-300">Pesquisar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-indigo-300">Ctrl+K</kbd>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-300">Compilado</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-indigo-300">C</kbd>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-300">Navegar Artigos</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-indigo-300">J / K</kbd>
            </div>
          </div>
        )}
      </div>

      {/* Quick Planalto Links */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>Acesso Rápido — Planalto.gov.br</span>
        </label>
        <div className="grid grid-cols-1 gap-1">
          {QUICK_LAWS.map((law) => (
            <a
              key={law.url}
              href={law.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors"
            >
              <span className="truncate">{law.name}</span>
              <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<PopupApp />);
