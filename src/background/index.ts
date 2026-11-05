import { callProviderDirectly, AIRequestPayload } from '../services/aiService';

const extensionAPI =
  typeof chrome !== 'undefined' && chrome.runtime
    ? chrome
    : typeof (globalThis as any).browser !== 'undefined' && (globalThis as any).browser?.runtime
    ? (globalThis as any).browser
    : null;

if (extensionAPI?.runtime?.onMessage) {
  extensionAPI.runtime.onMessage.addListener(
    (
      message: { type?: string; payload?: AIRequestPayload },
      _sender: any,
      sendResponse: (res: any) => void
    ) => {
      if (message && message.type === 'OPEN_PRO_PAGE') {
        try {
          const url = extensionAPI.runtime.getURL('docs/pro.html');
          if (extensionAPI.tabs?.create) {
            extensionAPI.tabs.create({ url });
          }
        } catch {
          // ignore
        }
        sendResponse({ ok: true });
        return false;
      }

      if (message && message.type === 'PLANALTO_AI_COMPLETION' && message.payload) {
        callProviderDirectly(message.payload)
          .then((text) => {
            if (typeof sendResponse === 'function') {
              try {
                sendResponse({ ok: true, text });
              } catch {
                // ignore
              }
            }
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            if (typeof sendResponse === 'function') {
              try {
                sendResponse({ ok: false, error: msg });
              } catch {
                // ignore
              }
            }
          });
        return true; // keep message channel open for async response in both Chrome and Firefox
      }
      return false;
    }
  );
}
