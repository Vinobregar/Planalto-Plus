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

    /* Print overrides in main document to ensure multi-page flow without overlaps */
    @media print {
      /* Oculta todos os nós originais do Planalto fora do host moderno para evitar sobreposição de texto */
      body.planalto-moderno-active > :not(#planalto-moderno-host),
      body.planalto-print-active > :not(#planalto-moderno-host) {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        position: absolute !important;
        left: -99999px !important;
      }

      html, body {
        overflow: visible !important;
        position: static !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      #planalto-moderno-host {
        position: static !important;
        display: block !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
      }
      .planalto-content-wrapper {
        position: static !important;
        inset: auto !important;
        display: block !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
      }
      #vlibras-access-wrapper,
      #planalto-vlibras-close-btn,
      #vlibras-app-root,
      [vw] {
        display: none !important;
      }
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
      document.documentElement.classList.add('planalto-moderno-active');
      document.body.classList.add('planalto-moderno-active');
    } else {
      document.documentElement.style.overflow = prevOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.classList.remove('planalto-moderno-active');
      document.body.classList.remove('planalto-moderno-active');
    }

    // Ao imprimir, destrava overflow de html e body e oculta nós originais do Planalto
    const handleBeforePrint = () => {
      document.documentElement.style.overflow = 'visible';
      document.body.style.overflow = 'visible';
      document.documentElement.classList.add('planalto-print-active');
      document.body.classList.add('planalto-print-active');

      if (modernActive) {
        Array.from(document.body.children).forEach((child) => {
          if (child.id !== HOST_ID && child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') {
            const htmlEl = child as HTMLElement;
            htmlEl.dataset.planaltoPrintPrevDisplay = htmlEl.style.display || '';
            htmlEl.style.display = 'none';
          }
        });
      }
    };

    const handleAfterPrint = () => {
      document.documentElement.classList.remove('planalto-print-active');
      document.body.classList.remove('planalto-print-active');

      if (modernActive) {
        Array.from(document.body.children).forEach((child) => {
          const htmlEl = child as HTMLElement;
          if (htmlEl.id !== HOST_ID && htmlEl.dataset.planaltoPrintPrevDisplay !== undefined) {
            htmlEl.style.display = htmlEl.dataset.planaltoPrintPrevDisplay || '';
            delete htmlEl.dataset.planaltoPrintPrevDisplay;
          }
        });
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
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
          <span>Ativar Planalto Plus</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2147483646] planalto-content-wrapper">
      <PlanaltoReaderApp
        doc={doc}
        onToggleOriginalView={() => setModernActive(false)}
      />
    </div>
  );
};

function isExcludedUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes('quadro_ecr.htm') || u.includes('quadro_emc.htm');
}

export function mountPlanaltoModerno() {
  if (isExcludedUrl(window.location.href)) return;
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

if (document.readyState !== 'complete') {
  window.addEventListener('load', () => {
    if (!document.getElementById(HOST_ID)) {
      mountPlanaltoModerno();
    }
  });
}
