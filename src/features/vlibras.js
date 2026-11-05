/**
 * Módulo G: Integração do VLibras Oficial (src/features/vlibras.js)
 * - Injeção assíncrona do widget oficial do VLibras (`https://vlibras.gov.br/app/vlibras-plugin.js`
 *   e `https://vlibras.gov.br/app`) — tradução em Libras do Governo Federal através de avatar 3D.
 * - Acessível a TODOS os usuários da extensão (gratuitos e pagos).
 * - Controle liga/desliga ("Exibir botão do VLibras na página") para ocultá-lo facilmente caso prefira a tela limpa.
 */

const VLIBRAS_CONTAINER_ID = 'planalto-plus-vlibras-container';
const VLIBRAS_SCRIPT_ID = 'planalto-plus-vlibras-script';
const VLIBRAS_SCRIPT_URL = 'https://vlibras.gov.br/app/vlibras-plugin.js';
const VLIBRAS_APP_URL = 'https://vlibras.gov.br/app';

/**
 * Injeta ou exibe/oculta o widget oficial do VLibras no DOM da página
 */
export function syncVlibrasWidget(enabled = true) {
  if (typeof document === 'undefined' || !document.body) return;

  let container = document.getElementById(VLIBRAS_CONTAINER_ID);

  if (!enabled) {
    if (container) {
      container.style.display = 'none';
    }
    // Oculta também caso a página original do Planalto já possua um container [vw] nativo
    const existingVw = document.querySelectorAll('[vw]');
    existingVw.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.display = 'none';
      }
    });
    return;
  }

  // Reexibe qualquer container [vw] existente
  const existingVw = document.querySelectorAll('[vw]');
  existingVw.forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.display = '';
      el.style.zIndex = '2147483647';
    }
  });

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

  if (!document.getElementById(VLIBRAS_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = VLIBRAS_SCRIPT_ID;
    script.src = VLIBRAS_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      try {
        if (window.VLibras && typeof window.VLibras.Widget === 'function') {
          new window.VLibras.Widget(VLIBRAS_APP_URL);
        }
      } catch {
        // Ignora silenciosamente se bloqueado por CSP estrito de rede offline
      }
    };
    document.head.appendChild(script);
  }
}
