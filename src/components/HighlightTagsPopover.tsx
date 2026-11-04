import React, { useState } from 'react';
import {
  Download,
  Palette,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { HighlightTag, ThemeMode } from '../types/legislation';
import { DEFAULT_HIGHLIGHT_TAGS } from '../storage/storageService';

interface HighlightTagsPopoverProps {
  tags: HighlightTag[];
  theme: ThemeMode;
  onChangeTags: (next: HighlightTag[]) => void;
  onExportHighlightsMarkdown: () => void;
  onExportHighlightsJson: () => void;
  onClose: () => void;
}

const PRESET_SWATCHES = [
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
  '#f43f5e',
  '#8b5cf6',
  '#f97316',
  '#ec4899',
  '#14b8a6',
  '#84cc16',
  '#6366f1',
];

export const HighlightTagsPopover: React.FC<HighlightTagsPopoverProps> = ({
  tags,
  theme,
  onChangeTags,
  onExportHighlightsMarkdown,
  onExportHighlightsJson,
  onClose,
}) => {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#ec4899');

  const cardTheme =
    theme === 'dark'
      ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
      : theme === 'sepia'
      ? 'bg-[#faf8f4] border-[#e2ddd3] text-[#2e2a25]'
      : 'bg-white border-slate-200 text-slate-800';

  const handleUpdateTag = (id: string, patch: Partial<HighlightTag>) => {
    onChangeTags(tags.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const handleDeleteTag = (id: string) => {
    if (tags.length <= 1) return;
    onChangeTags(tags.filter((t) => t.id !== id));
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    const newTag: HighlightTag = {
      id: `tag-${Date.now()}`,
      name: trimmed,
      color: newTagColor,
      isDefault: false,
    };
    onChangeTags([...tags, newTag]);
    setNewTagName('');
  };

  return (
    <div
      className={`w-80 sm:w-96 rounded-2xl border shadow-2xl p-4 space-y-4 z-50 select-none ${cardTheme}`}
    >
      <div className="flex items-center justify-between border-b border-current/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-xs uppercase tracking-wider">
            Personalizar Grifos & Tags
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChangeTags(DEFAULT_HIGHLIGHT_TAGS)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
            title="Restaurar cores e tags padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Existing Tags List */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        <label className="text-[11px] font-medium opacity-75 uppercase tracking-wider block">
          Cores & Etiquetas Ativas
        </label>
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 p-1.5 rounded-xl border border-current/10 bg-black/[0.02] dark:bg-white/[0.02]"
          >
            <label
              className="relative w-6 h-6 rounded-full shrink-0 cursor-pointer border border-black/15 shadow-sm overflow-hidden"
              style={{ backgroundColor: tag.color }}
              title="Clique para escolher qualquer cor personalizada"
            >
              <input
                type="color"
                value={tag.color}
                onChange={(e) =>
                  handleUpdateTag(tag.id, { color: e.target.value })
                }
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </label>

            <input
              type="text"
              value={tag.name}
              onChange={(e) =>
                handleUpdateTag(tag.id, { name: e.target.value })
              }
              className="flex-1 px-2 py-1 rounded-lg bg-transparent border border-transparent hover:border-current/15 focus:border-indigo-500 text-xs font-medium focus:outline-none"
              placeholder="Nome da tag (ex: OAB, Concursos...)"
            />

            {tags.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteTag(tag.id)}
                className="p-1 rounded hover:bg-rose-500/10 text-rose-500 opacity-60 hover:opacity-100"
                title="Remover tag"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Custom Tag Form */}
      <form
        onSubmit={handleAddTag}
        className="pt-2 border-t border-current/10 space-y-2"
      >
        <label className="text-[11px] font-medium opacity-75 uppercase tracking-wider flex items-center gap-1">
          <Tag className="w-3 h-3" />
          <span>Adicionar Nova Cor / Tag Personalizada</span>
        </label>

        <div className="flex items-center gap-2">
          <label
            className="relative w-7 h-7 rounded-xl shrink-0 cursor-pointer border border-black/20 shadow-sm"
            style={{ backgroundColor: newTagColor }}
            title="Escolher cor personalizada"
          >
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </label>
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Ex: Magistratura, Prazo, Súmula..."
            className="flex-1 px-2.5 py-1.5 rounded-xl border border-current/15 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            type="submit"
            disabled={!newTagName.trim()}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar</span>
          </button>
        </div>

        {/* Quick color swatches */}
        <div className="flex items-center gap-1.5 pt-1">
          {PRESET_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setNewTagColor(hex)}
              style={{ backgroundColor: hex }}
              className={`w-4 h-4 rounded-full transition-transform ${
                newTagColor.toLowerCase() === hex.toLowerCase()
                  ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1'
                  : 'opacity-80 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      </form>

      {/* Export Highlights Section */}
      <div className="pt-2.5 border-t border-current/10 space-y-2">
        <label className="text-[11px] font-medium opacity-75 uppercase tracking-wider block">
          Exportar Grifos por Tag
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportHighlightsMarkdown}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Grifos (.md)</span>
          </button>
          <button
            type="button"
            onClick={onExportHighlightsJson}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Grifos (.json)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
