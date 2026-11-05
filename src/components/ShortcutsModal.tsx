import React from 'react';
import { Command, Keyboard, X } from 'lucide-react';
import { computeThemeColors } from './AppearancePopover';
import { AppearanceSettings } from '../types/legislation';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appearance: AppearanceSettings;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    keys: ['J'],
    description: 'Avançar para o próximo artigo (salto rápido)',
    category: 'Navegação',
  },
  {
    keys: ['K'],
    description: 'Voltar para o artigo anterior (salto rápido)',
    category: 'Navegação',
  },
  {
    keys: ['/'],
    description: 'Focar na barra de pesquisa superior',
    category: 'Busca & Leitura',
  },
  {
    keys: ['C'],
    description: 'Alternar modo Texto Compilado (ocultar revogados)',
    category: 'Busca & Leitura',
  },
  {
    keys: ['['],
    description: 'Abrir ou recolher o Sumário lateral esquerdo',
    category: 'Painéis & Telas',
  },
  {
    keys: [']'],
    description: 'Abrir ou recolher o painel Caderno & IA',
    category: 'Painéis & Telas',
  },
  {
    keys: ['?'],
    description: 'Abrir ou fechar este guia de atalhos',
    category: 'Geral',
  },
  {
    keys: ['Esc'],
    description: 'Fechar modais, menus suspensos ou pesquisa',
    category: 'Geral',
  },
  {
    keys: ['Ctrl', 'P'],
    description: 'Imprimir ou salvar PDF limpo e formatado',
    category: 'Impressão & PDF',
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  appearance,
}) => {
  if (!isOpen) return null;

  const surface = computeThemeColors(appearance);
  const isDark = appearance.theme === 'dark';

  const categories = Array.from(new Set(SHORTCUTS.map((s) => s.category)));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: surface.cardBg,
          borderColor: surface.borderColor,
        }}
        className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-5 relative ${
          isDark ? 'text-zinc-100' : 'text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-current/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="shortcuts-modal-title"
                className="font-bold text-sm tracking-tight"
              >
                Atalhos de Teclado
              </h3>
              <p className="text-[11px] opacity-65">
                Navegue e estude com rapidez máxima pelo teclado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list grouped by category */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {categories.map((category) => (
            <div key={category} className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-1">
                {category}
              </h4>
              <div
                style={{
                  backgroundColor: surface.panelBg,
                  borderColor: surface.borderColor,
                }}
                className="rounded-xl border divide-y divide-current/10 overflow-hidden"
              >
                {SHORTCUTS.filter((s) => s.category === category).map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <span className="opacity-90">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      {item.keys.map((k, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span className="opacity-40 text-[10px]">+</span>}
                          <kbd
                            style={{
                              borderColor: surface.borderColor,
                            }}
                            className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-md border bg-black/5 dark:bg-white/10 font-mono text-[11px] font-bold shadow-sm"
                          >
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[11px] opacity-65">
          <span>Os atalhos são pausados automaticamente ao digitar em notas ou campos de texto.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shrink-0"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
