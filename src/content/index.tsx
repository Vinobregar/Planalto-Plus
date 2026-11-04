import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sparkles } from 'lucide-react';
import tailwindStyles from '../styles/tailwind.css?inline';
import { parsePlanaltoDom } from '../parser/planaltoParser';
import { LegislationDocument } from '../types/legislation';
import { PlanaltoReaderApp } from '../components/PlanaltoReaderApp';

const HOST_ID = 'planalto-moderno-host';

function injectWebFonts() {
  if (document.getElementById('planalto-moderno-fonts')) return;
  const link = document.createElement('link');
  link.id = 'planalto-moderno-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap';
  document.head.appendChild(link);

  const dyslexicStyle = document.createElement('style');
  dyslexicStyle.id = 'planalto-moderno-opendyslexic';
  dyslexicStyle.textContent = `
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(dyslexicStyle);
}

const ContentController: React.FC<{ doc: LegislationDocument }> = ({ doc }) => {
  const [modernActive, setModernActive] = useState(true);

  useEffect(() => {
    const prevOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    if (modernActive) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = prevOverflow;
      document.body.style.overflow = prevBodyOverflow;
    }

    return () => {
      document.documentElement.style.overflow = prevOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [modernActive]);

  if (!modernActive) {
    return (
      <div className="fixed bottom-5 right-5 z-[2147483647] font-sans">
        <button
          type="button"
          onClick={() => setModernActive(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-2xl border border-indigo-400/30 transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ativar Planalto Moderno</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2147483646]">
      <PlanaltoReaderApp
        doc={doc}
        onToggleOriginalView={() => setModernActive(false)}
      />
    </div>
  );
};

export function mountPlanaltoModerno() {
  if (document.getElementById(HOST_ID)) return;

  const parsedDoc = parsePlanaltoDom(document, window.location.href);
  if (parsedDoc.articles.length === 0 && parsedDoc.blocks.length === 0) {
    return; // Not a legislation text page
  }

  injectWebFonts();

  const host = document.createElement('div');
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const styleTag = document.createElement('style');
  styleTag.textContent = tailwindStyles;
  shadow.appendChild(styleTag);

  const mountPoint = document.createElement('div');
  mountPoint.id = 'planalto-moderno-root';
  shadow.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  root.render(<ContentController doc={parsedDoc} />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPlanaltoModerno);
} else {
  mountPlanaltoModerno();
}
