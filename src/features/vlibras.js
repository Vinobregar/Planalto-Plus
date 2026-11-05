/**
 * Módulo G: Integração do VLibras Oficial (src/features/vlibras.js)
 * - Injeção assíncrona do widget oficial do VLibras (cdn.jsdelivr.net / vlibras.gov.br) —
 *   tradução em Libras do Governo Federal através de avatar 3D.
 * - Acessível a TODOS os usuários da extensão (gratuitos e pagos).
 * - Botão discreto "X" para ocultar diretamente ao lado do widget (sem poluir menu de aparência).
 */

const VLIBRAS_CONTAINER_ID = 'planalto-plus-vlibras-container';
const VLIBRAS_SCRIPT_ID = 'planalto-plus-vlibras-script';
const VLIBRAS_CLOSE_BTN_ID = 'planalto-vlibras-close-btn';
const VLIBRAS_STYLE_ID = 'planalto-vlibras-global-style';

function injectVlibrasTopZIndexStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(VLIBRAS_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = VLIBRAS_STYLE_ID;
  style.textContent = `
    #vlibras-access-wrapper,
    #vlibras-access,
    #vlibras-app-root,
    [vw],
    #${VLIBRAS_CLOSE_BTN_ID} {
      z-index: 2147483647 !important;
      position: fixed !important;
    }
    #vlibras-access-wrapper {
      pointer-events: none !important;
    }
    #vlibras-access,
    #vlibras-button,
    #${VLIBRAS_CLOSE_BTN_ID} {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);
}

// URL local empacotada na extensão para conformidade estrita com a Content Security Policy (chrome-extension://)
function getExtensionVlibrasUrl() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      return chrome.runtime.getURL('assets/vlibras/vlibras-plugin.js');
    }
    if (typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.getURL === 'function') {
      return browser.runtime.getURL('assets/vlibras/vlibras-plugin.js');
    }
  } catch {
    // Fallback
  }
  return null;
}

const VLIBRAS_PLUGIN_CDN =
  'https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/vlibras-portal@v7.12.2/app/vlibras-plugin.js';
const VLIBRAS_APP_ROOT = 'https://vlibras.gov.br/app';

function attachVlibrasCloseButton(onCloseCallback) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(VLIBRAS_CLOSE_BTN_ID);
  if (existing) {
    if (typeof onCloseCallback === 'function') {
      existing._onCloseCallback = onCloseCallback;
    }
    return;
  }

  const btn = document.createElement('button');
  btn.id = VLIBRAS_CLOSE_BTN_ID;
  btn.type = 'button';
  btn.title = 'Ocultar botão do VLibras';
  btn.setAttribute('aria-label', 'Ocultar botão do VLibras');
  btn.innerHTML = '✕';
  btn._onCloseCallback = onCloseCallback;

  Object.assign(btn.style, {
    position: 'fixed',
    right: '54px',
    top: 'calc(50vh - 10px)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: '1.5px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold',
    zIndex: '2147483647',
    padding: '0',
    lineHeight: '1',
    transition: 'all 0.2s ease',
  });

  btn.onmouseenter = () => {
    btn.style.transform = 'scale(1.15)';
    btn.style.backgroundColor = '#ef4444';
  };
  btn.onmouseleave = () => {
    btn.style.transform = 'scale(1)';
    btn.style.backgroundColor = '#0f172a';
  };

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    syncVlibrasWidget(false);
    if (typeof btn._onCloseCallback === 'function') {
      btn._onCloseCallback();
    }
  };

  document.body.appendChild(btn);
}

/**
 * Injeta ou exibe/oculta o widget oficial do VLibras no DOM da página
 */
export function syncVlibrasWidget(enabled = true, onHideCallback) {
  if (typeof document === 'undefined' || !document.body) return;

  injectVlibrasTopZIndexStyles();

  const existingCloseBtn = document.getElementById(VLIBRAS_CLOSE_BTN_ID);

  if (!enabled) {
    if (existingCloseBtn) existingCloseBtn.style.display = 'none';

    const wrappers = document.querySelectorAll(
      '#vlibras-access-wrapper, #vlibras-app-root, [vw], #' + VLIBRAS_CONTAINER_ID
    );
    wrappers.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.display = 'none';
      }
    });
    return;
  }

  // Reexibe o botão X e elementos existentes
  if (existingCloseBtn) existingCloseBtn.style.display = 'flex';

  const wrappers = document.querySelectorAll(
    '#vlibras-access-wrapper, #vlibras-app-root, [vw], #' + VLIBRAS_CONTAINER_ID
  );
  wrappers.forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.display = '';
      el.style.zIndex = '2147483647';
    }
  });

  // Injeta a estrutura [vw] padrão caso o wrapper ainda não exista
  let container = document.getElementById(VLIBRAS_CONTAINER_ID);
  const existingVw = document.querySelectorAll('[vw]');
  if (!container && existingVw.length === 0) {
    container = document.createElement('div');
    container.id = VLIBRAS_CONTAINER_ID;
    container.setAttribute('vw', 'true');
    container.className = 'enabled';
    container.style.zIndex = '2147483647';

    const accessButton = document.createElement('div');
    accessButton.setAttribute('vw-access-button', 'true');
    accessButton.className = 'active';

    const pluginWrapper = document.createElement('div');
    pluginWrapper.setAttribute('vw-plugin-wrapper', 'true');

    const topWrapper = document.createElement('div');
    topWrapper.className = 'vw-plugin-top-wrapper';
    pluginWrapper.appendChild(topWrapper);

    container.appendChild(accessButton);
    container.appendChild(pluginWrapper);
    document.body.appendChild(container);
  } else if (container) {
    container.style.display = '';
  }

  // Injeta script do VLibras priorizando recurso local empacotado (chrome-extension://) para CSP compliance
  if (!document.getElementById(VLIBRAS_SCRIPT_ID)) {
    const localUrl = getExtensionVlibrasUrl();
    const primarySrc = localUrl || VLIBRAS_PLUGIN_CDN;

    const script = document.createElement('script');
    script.id = VLIBRAS_SCRIPT_ID;
    script.src = primarySrc;
    script.async = true;
    script.onload = () => {
      try {
        if (window.VLibras && typeof window.VLibras.Widget === 'function') {
          new window.VLibras.Widget(VLIBRAS_APP_ROOT);
        }
      } catch {
        // Fallback
      }
    };
    script.onerror = () => {
      if (localUrl) return; // Se o local falhou, não tenta cdn bloqueado por CSP
      const fallbackScript = document.createElement('script');
      fallbackScript.src = VLIBRAS_PLUGIN_CDN;
      fallbackScript.async = true;
      document.head.appendChild(fallbackScript);
    };
    document.head.appendChild(script);
  }

  // Adiciona botão "X" ao lado do widget para ocultá-lo facilmente
  attachVlibrasCloseButton(onHideCallback);
}
