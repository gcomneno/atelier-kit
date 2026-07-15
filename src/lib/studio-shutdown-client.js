export const SHUTDOWN_PHASE = Object.freeze({
  IDLE: 'idle',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
  FALLBACK: 'fallback'
});

/**
 * @typedef {(typeof SHUTDOWN_PHASE)[keyof typeof SHUTDOWN_PHASE]} ShutdownPhase
 * @typedef {{
 *   confirmShutdown: () => boolean,
 *   renderTerminal: () => unknown,
 *   afterRender: () => Promise<unknown>,
 *   closeWindow: () => unknown,
 *   showFallback: () => unknown,
 *   acknowledgeRendered: () => Promise<unknown>,
 *   onPhaseChange?: (phase: ShutdownPhase) => unknown
 * }} StudioShutdownFlowDependencies
 * @typedef {{
 *   open: () => unknown,
 *   write: (html: string) => unknown,
 *   close: () => unknown,
 *   getElementById: (id: string) => ({ focus?: () => unknown, hidden?: boolean } | null)
 * }} ShutdownDocument
 */

/**
 * Run the client-only shutdown sequence. Dependencies are injected so the
 * ordering can be verified without a browser.
 * @param {StudioShutdownFlowDependencies} dependencies
 */
export function createStudioShutdownFlow({
  confirmShutdown,
  renderTerminal,
  afterRender,
  closeWindow,
  showFallback,
  acknowledgeRendered,
  onPhaseChange = () => {}
}) {
  /** @type {ShutdownPhase} */
  let phase = SHUTDOWN_PHASE.IDLE;

  /** @param {ShutdownPhase} nextPhase */
  function setPhase(nextPhase) {
    phase = nextPhase;
    onPhaseChange(nextPhase);
  }

  return {
    get phase() {
      return phase;
    },
    begin() {
      if (phase !== SHUTDOWN_PHASE.IDLE || !confirmShutdown()) return false;
      setPhase(SHUTDOWN_PHASE.STOPPING);
      return true;
    },
    reset() {
      if (phase === SHUTDOWN_PHASE.STOPPING) setPhase(SHUTDOWN_PHASE.IDLE);
    },
    async complete() {
      if (phase !== SHUTDOWN_PHASE.STOPPING) return false;

      setPhase(SHUTDOWN_PHASE.STOPPED);
      renderTerminal();
      await afterRender();
      closeWindow();
      showFallback();
      setPhase(SHUTDOWN_PHASE.FALLBACK);
      await afterRender();
      await acknowledgeRendered();
      return true;
    }
  };
}

/** @param {Window} [windowObject] */
export function afterBrowserRender(windowObject = window) {
  return new Promise((resolve) => {
    windowObject.requestAnimationFrame(() => windowObject.requestAnimationFrame(resolve));
  });
}

/** @param {unknown} value */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Replace the live app with a server-independent terminal document.
 * @param {ShutdownDocument} documentObject
 * @param {{ lang: string, pageTitle: string, stopped: string, fallback: string }} copy
 */
export function renderStudioShutdownDocument(documentObject, { lang, pageTitle, stopped, fallback }) {
  documentObject.open();
  documentObject.write(`<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle)}</title>
    <style>
      :root { color-scheme: light; font-family: system-ui, sans-serif; background: #f6f3ed; color: #211f1b; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; }
      main { width: min(34rem, calc(100% - 3rem)); padding: 2.5rem; border: 1px solid #d8d1c5; border-radius: 1rem; background: #fff; box-shadow: 0 1rem 3rem rgb(44 37 26 / 10%); }
      h1 { margin: 0; font-size: clamp(1.75rem, 5vw, 2.5rem); }
      p { margin: 1rem 0 0; color: #5f584e; font-size: 1.05rem; line-height: 1.6; }
    </style>
  </head>
  <body>
    <main role="status" aria-live="polite" aria-atomic="true">
      <h1 id="studio-shutdown-title" tabindex="-1">${escapeHtml(stopped)}</h1>
      <p id="studio-shutdown-message" hidden>${escapeHtml(fallback)}</p>
    </main>
  </body>
</html>`);
  documentObject.close();
  documentObject.getElementById('studio-shutdown-title')?.focus?.();
}

/** @param {ShutdownDocument} documentObject */
export function showStudioShutdownFallback(documentObject) {
  const message = documentObject.getElementById('studio-shutdown-message');
  if (message) message.hidden = false;
}
