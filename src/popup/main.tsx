import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  Check,
  ExternalLink,
  KeyRound,
  Moon,
  Scale,
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
  loadAIConfig,
  loadAppearanceSettings,
  saveAIConfig,
  saveAppearanceSettings,
} from '../storage/storageService';

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
  const [appearance, setAppearance] =
    useState<AppearanceSettings>(DEFAULT_APPEARANCE);
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
            <h1 className="font-bold text-sm leading-tight">Planalto Moderno</h1>
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
          <span className="font-semibold flex items-center gap-1.5 text-indigo-400">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Chave de API de IA</span>
          </span>
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
