import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  Check,
  ExternalLink,
  HelpCircle,
  KeyRound,
  Moon,
  Scale,
  ShieldCheck,
  Sun,
  Sunset,
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

  return (
    <div className="w-[360px] p-4 bg-slate-900 text-slate-100 font-sans space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">Planalto Plus</h1>
            <p className="text-[11px] text-slate-400">
              Leitura Jurídica, Notas & IA
            </p>
          </div>
        </div>
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
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                appearance.theme === t.id
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-semibold'
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
        className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 space-y-2.5 text-xs"
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
                      <p className="opacity-90">Sua chave é armazenada exclusivamente no seu navegador local e nunca é enviada a servidores intermediários.</p>
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
            className="bg-slate-900 border border-slate-700 rounded-md px-2 py-0.5 text-[11px] text-slate-200"
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
          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
        />

        <button
          type="submit"
          className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Chave Salva!</span>
            </>
          ) : (
            <span>Salvar Chave Localmente</span>
          )}
        </button>
      </form>

      {/* Acessibilidade Universal: VLibras & Leitura PcD */}
      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 space-y-2.5 text-xs">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Acessibilidade Universal
        </div>
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-slate-200 font-medium">
            Exibir botão do VLibras na página
          </span>
          <input
            type="checkbox"
            checked={appearance.enableVlibras !== false}
            onChange={(e) => {
              const next = { ...appearance, enableVlibras: e.target.checked };
              setAppearance(next);
              saveAppearanceSettings(next);
            }}
            className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
          />
        </label>
        <label className="flex items-start gap-2 pt-1.5 border-t border-slate-700/70 cursor-pointer">
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
            className="mt-0.5 w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0"
          />
          <span className="text-emerald-300 font-medium leading-snug">
            Sou pessoa com deficiência visual e necessito de leitura por áudio (Gratuito — Lei 13.146/2015)
          </span>
        </label>
      </div>

      {/* Quick Planalto Links */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Acesso Rápido — Planalto.gov.br</span>
        </label>
        <div className="grid grid-cols-1 gap-1">
          {QUICK_LAWS.map((law) => (
            <a
              key={law.url}
              href={law.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 text-xs text-slate-200 transition-colors"
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
