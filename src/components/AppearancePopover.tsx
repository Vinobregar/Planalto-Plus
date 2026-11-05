import React, { useState } from 'react';
import {
  AlignJustify,
  Eye,
  Minus,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Sunset,
  Type,
  X,
} from 'lucide-react';
import {
  AppearanceSettings,
  FontFamilyOption,
  ThemeMode,
} from '../types/legislation';
import {
  DEFAULT_APPEARANCE,
  computeProportionalAppearance,
} from '../storage/storageService';

interface AppearancePopoverProps {
  settings: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
  onClose: () => void;
}

export const FONT_FAMILY_CSS: Record<FontFamilyOption, string> = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "'Merriweather', Georgia, Cambria, 'Times New Roman', serif",
  opendyslexic: "'OpenDyslexic', 'Atkinson Hyperlegible', Verdana, sans-serif",
  dyslexic: "'Atkinson Hyperlegible', Verdana, Tahoma, sans-serif",
  mono: "'OpenDyslexic', Verdana, sans-serif",
};

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Computes dynamic surface colors based on sepiaIntensity (0..100) and darkIntensity (0..100).
 */
export function computeThemeColors(settings: AppearanceSettings): {
  mainBg: string;
  panelBg: string;
  cardBg: string;
  borderColor: string;
} {
  if (settings.theme === 'sepia') {
    const t = (settings.sepiaIntensity ?? 50) / 100;
    // Interpolate from very light warm ivory (0%) to deep warm parchment (100%)
    const mainBg = rgbToHex(
      lerpChannel(253, 236, t),
      lerpChannel(252, 223, t),
      lerpChannel(249, 198, t)
    );
    const panelBg = rgbToHex(
      lerpChannel(248, 226, t),
      lerpChannel(246, 212, t),
      lerpChannel(241, 185, t)
    );
    const cardBg = rgbToHex(
      lerpChannel(254, 241, t),
      lerpChannel(253, 230, t),
      lerpChannel(251, 208, t)
    );
    const borderColor = rgbToHex(
      lerpChannel(234, 206, t),
      lerpChannel(230, 191, t),
      lerpChannel(222, 164, t)
    );
    return { mainBg, panelBg, cardBg, borderColor };
  }

  if (settings.theme === 'dark') {
    const t = (settings.darkIntensity ?? 100) / 100;
    // Interpolate from soft slate dark (0%) to pure OLED black (100%)
    const mainBg = rgbToHex(
      lerpChannel(34, 0, t),
      lerpChannel(37, 0, t),
      lerpChannel(46, 0, t)
    );
    const panelBg = rgbToHex(
      lerpChannel(27, 0, t),
      lerpChannel(30, 0, t),
      lerpChannel(38, 0, t)
    );
    const cardBg = rgbToHex(
      lerpChannel(43, 12, t),
      lerpChannel(47, 12, t),
      lerpChannel(58, 14, t)
    );
    const borderColor = rgbToHex(
      lerpChannel(62, 34, t),
      lerpChannel(67, 34, t),
      lerpChannel(82, 38, t)
    );
    return { mainBg, panelBg, cardBg, borderColor };
  }

  return {
    mainBg: '#ffffff',
    panelBg: '#f8fafc',
    cardBg: '#ffffff',
    borderColor: '#e2e8f0',
  };
}

const FONT_OPTIONS: Array<{
  id: FontFamilyOption;
  label: string;
  sample: string;
}> = [
  { id: 'sans', label: 'Inter Sans', sample: 'Moderna & Limpa' },
  { id: 'serif', label: 'Merriweather', sample: 'Editorial Clássica' },
  { id: 'opendyslexic', label: 'OpenDyslexic', sample: 'Foco & Dislexia' },
  { id: 'dyslexic', label: 'Atkinson', sample: 'Alta Legibilidade' },
];

const THEME_OPTIONS: Array<{
  id: ThemeMode;
  label: string;
  icon: React.ReactNode;
  bgPreview: string;
}> = [
  {
    id: 'light',
    label: 'Claro',
    icon: <Sun className="w-4 h-4" />,
    bgPreview: 'bg-white text-slate-900 border-slate-300',
  },
  {
    id: 'sepia',
    label: 'Sépia',
    icon: <Sunset className="w-4 h-4" />,
    bgPreview: 'bg-[#f6f3ec] text-[#2e2a25] border-[#ded8cc]',
  },
  {
    id: 'dark',
    label: 'Escuro',
    icon: <Moon className="w-4 h-4" />,
    bgPreview: 'bg-black text-zinc-100 border-zinc-800',
  },
];

const ACCENT_PRESETS = [
  { color: '#6366f1', label: 'Índigo' },
  { color: '#10b981', label: 'Esmeralda' },
  { color: '#0ea5e9', label: 'Azul' },
  { color: '#f59e0b', label: 'Âmbar' },
  { color: '#f43f5e', label: 'Rubi' },
  { color: '#8b5cf6', label: 'Violeta' },
];

export const AppearancePopover: React.FC<AppearancePopoverProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  const [customColorDraft, setCustomColorDraft] = useState<string>(
    settings.accentColor || '#8b5cf6'
  );
  const [isCustomizingColor, setIsCustomizingColor] = useState<boolean>(false);

  const update = (patch: Partial<AppearanceSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const surface = computeThemeColors(settings);
  const currentAccent = settings.accentColor || '#8b5cf6';
  const activeFontCss =
    FONT_FAMILY_CSS[settings.fontFamily] || FONT_FAMILY_CSS.sans;

  const sepiaIntensity = settings.sepiaIntensity ?? 50;
  const darkIntensity = settings.darkIntensity ?? 100;

  return (
    <div
      style={{
        fontFamily: activeFontCss,
        backgroundColor: surface.cardBg,
        borderColor: surface.borderColor,
      }}
      className={`w-80 rounded-2xl border shadow-2xl p-4 space-y-4 z-50 select-none ${
        settings.theme === 'dark'
          ? 'text-zinc-100'
          : settings.theme === 'sepia'
          ? 'text-[#2e2a25]'
          : 'text-slate-800'
      }`}
    >
      <div className="flex items-center justify-between border-b border-current/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-xs uppercase tracking-wider">
            Aparência & Tipografia
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(computeProportionalAppearance())}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
            title="Restaurar padrão proporcional à tela"
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

      {/* Theme Mode */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium opacity-75 uppercase tracking-wider">
          Tema de Leitura
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {THEME_OPTIONS.map((t) => {
            const active = settings.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ theme: t.id })}
                style={active ? { borderColor: currentAccent } : undefined}
                className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl border text-[11px] font-medium transition-all ${
                  t.bgPreview
                } ${
                  active
                    ? 'ring-2 ring-indigo-500 shadow-sm font-semibold'
                    : 'opacity-80 hover:opacity-100'
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sepia Filter Intensity Slider */}
        {settings.theme === 'sepia' && (
          <div className="pt-1.5 px-2.5 py-2 rounded-xl bg-black/[0.03] border border-current/10 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium flex items-center gap-1 opacity-85">
                <Sliders className="w-3 h-3 text-amber-600" />
                <span>Intensidade do Filtro Sépia</span>
              </span>
              <span className="font-semibold">{sepiaIntensity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sepiaIntensity}
              onChange={(e) =>
                update({ sepiaIntensity: Number(e.target.value) })
              }
              style={{ accentColor: currentAccent }}
              className="w-full"
            />
          </div>
        )}

        {/* Dark Blackness Intensity Slider */}
        {settings.theme === 'dark' && (
          <div className="pt-1.5 px-2.5 py-2 rounded-xl bg-white/[0.04] border border-current/10 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium flex items-center gap-1 opacity-85">
                <Sliders className="w-3 h-3 text-indigo-400" />
                <span>Intensidade do modo escuro</span>
              </span>
              <span className="font-semibold">
                {darkIntensity === 100 ? '100% (OLED)' : `${darkIntensity}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={darkIntensity}
              onChange={(e) =>
                update({ darkIntensity: Number(e.target.value) })
              }
              style={{ accentColor: currentAccent }}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* App Accent Color */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium opacity-75 uppercase tracking-wider flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cor de Destaque do App</span>
          </label>
          <span className="text-[10px] font-semibold opacity-65">
            {currentAccent}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          {ACCENT_PRESETS.map((preset) => {
            const isSelected =
              currentAccent.toLowerCase() === preset.color.toLowerCase();
            return (
              <button
                key={preset.color}
                type="button"
                onClick={() => {
                  update({ accentColor: preset.color });
                  setCustomColorDraft(preset.color);
                  setIsCustomizingColor(false);
                }}
                style={{ backgroundColor: preset.color }}
                className={`w-6 h-6 rounded-full transition-transform ${
                  isSelected
                    ? 'scale-125 ring-2 ring-offset-2 ring-current'
                    : 'opacity-85 hover:opacity-100 hover:scale-110'
                }`}
                title={preset.label}
              />
            );
          })}
          <button
            type="button"
            onClick={() => setIsCustomizingColor((v) => !v)}
            className={`relative w-7 h-7 rounded-lg cursor-pointer border border-current/25 flex items-center justify-center overflow-hidden shadow-sm transition-transform ${
              isCustomizingColor ? 'ring-2 ring-indigo-500 scale-105' : 'hover:scale-105'
            }`}
            style={{ backgroundColor: isCustomizingColor ? customColorDraft : currentAccent }}
            title="Escolher cor personalizada (confirmação com Ok)"
          >
            <Palette className="w-3.5 h-3.5 text-white drop-shadow" />
          </button>
        </div>

        {/* Menu de Personalização de Cor com Confirmação Ok */}
        {isCustomizingColor && (
          <div className="mt-2 p-2.5 rounded-xl border border-current/15 bg-black/[0.03] dark:bg-white/[0.03] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[11px] opacity-80">
                Personalizar Cor
              </span>
              <span className="font-mono text-[10px] opacity-65">
                {customColorDraft.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative w-8 h-8 rounded-lg cursor-pointer border border-current/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                <span
                  className="w-full h-full"
                  style={{ backgroundColor: customColorDraft }}
                />
                <input
                  type="color"
                  value={customColorDraft}
                  onChange={(e) => setCustomColorDraft(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
              <input
                type="text"
                value={customColorDraft}
                onChange={(e) => setCustomColorDraft(e.target.value)}
                placeholder="#8b5cf6"
                className="flex-1 px-2.5 py-1 rounded-lg border border-current/20 bg-transparent font-mono text-xs uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  update({ accentColor: customColorDraft });
                  setIsCustomizingColor(false);
                }}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-colors"
                title="Confirmar cor escolhida"
              >
                Ok
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Font Family */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium opacity-75 uppercase tracking-wider">
          Família da Fonte
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {FONT_OPTIONS.map((f) => {
            const active = settings.fontFamily === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => update({ fontFamily: f.id })}
                style={{
                  fontFamily: FONT_FAMILY_CSS[f.id],
                  ...(active ? { borderColor: currentAccent } : {}),
                }}
                className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                  active
                    ? 'border-indigo-500 bg-indigo-500/10 font-semibold text-indigo-600 dark:text-indigo-400'
                    : 'border-current/15 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="truncate">{f.label}</div>
                <div className="text-[10px] opacity-65 truncate">{f.sample}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium opacity-75 uppercase tracking-wider">
            Tamanho da Fonte
          </span>
          <span className="font-semibold">{settings.fontSize}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              update({ fontSize: Math.max(10, settings.fontSize - 1) })
            }
            className="p-1.5 rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={10}
            max={28}
            step={1}
            value={settings.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
            style={{ accentColor: currentAccent }}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() =>
              update({ fontSize: Math.min(28, settings.fontSize + 1) })
            }
            className="p-1.5 rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Paragraph Spacing */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium opacity-75 uppercase tracking-wider flex items-center gap-1">
            <AlignJustify className="w-3.5 h-3.5" />
            Espaçamento de Parágrafo
          </span>
          <span className="font-semibold">
            {settings.paragraphSpacing}px
          </span>
        </div>
        <input
          type="range"
          min={2}
          max={32}
          step={2}
          value={settings.paragraphSpacing}
          onChange={(e) => update({ paragraphSpacing: Number(e.target.value) })}
          style={{ accentColor: currentAccent }}
          className="w-full"
        />
      </div>

      {/* Line Height & Column Width */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="opacity-75">Altura Linha</span>
            <span className="font-semibold">{settings.lineHeight}</span>
          </div>
          <input
            type="range"
            min={1.2}
            max={2.2}
            step={0.05}
            value={settings.lineHeight}
            onChange={(e) => update({ lineHeight: Number(e.target.value) })}
            style={{ accentColor: currentAccent }}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="opacity-75">Largura Coluna</span>
            <span className="font-semibold">{settings.maxWidth}px</span>
          </div>
          <input
            type="range"
            min={520}
            max={1200}
            step={20}
            value={settings.maxWidth}
            onChange={(e) => update({ maxWidth: Number(e.target.value) })}
            style={{ accentColor: currentAccent }}
            className="w-full"
          />
        </div>
      </div>

      {/* Option to re-enable AI tools if user previously hid them inside IA Chat */}
      {settings.hideAITools && (
        <div className="pt-2 border-t border-current/10">
          <button
            type="button"
            onClick={() => update({ hideAITools: false })}
            className="w-full py-1.5 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <Eye className="w-3.5 h-3.5" />
            <span>Reativar Opções de IA</span>
          </button>
        </div>
      )}
    </div>
  );
};
