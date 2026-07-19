/**
 * @param {{ scrollHeight: number, clientHeight: number }} element
 * @param {number} [tolerance]
 */
export function hasVerticalOverflow(element, tolerance = 1) {
  return element.scrollHeight > element.clientHeight + tolerance;
}

/**
 * @param {boolean} canToggle
 * @param {boolean} expanded
 * @param {{ readMore: string, showLess: string }} labels
 */
export function getOverflowDisclosureView(canToggle, expanded, labels) {
  return {
    showToggle: canToggle,
    truncated: canToggle && !expanded,
    ariaExpanded: expanded,
    label: expanded ? labels.showLess : labels.readMore
  };
}

/**
 * Re-run a measurement when layout or font metrics can change.
 * Browser globals are optional so SSR and DOM-light tests remain safe.
 *
 * @param {Element} element
 * @param {() => void} measure
 * @param {{
 *   ResizeObserverClass?: (new (callback: () => void) => { observe: (node: Element) => void, disconnect: () => void }) | null,
 *   windowTarget?: { addEventListener?: (type: string, callback: () => void) => void, removeEventListener?: (type: string, callback: () => void) => void } | null,
 *   fonts?: { ready?: Promise<unknown>, addEventListener?: (type: string, callback: () => void) => void, removeEventListener?: (type: string, callback: () => void) => void } | null
 * }} [environment]
 */
export function observeElementOverflow(element, measure, environment = {}) {
  const ResizeObserverClass = Object.hasOwn(environment, 'ResizeObserverClass')
    ? environment.ResizeObserverClass
    : globalThis.ResizeObserver;
  const windowTarget = Object.hasOwn(environment, 'windowTarget')
    ? environment.windowTarget
    : globalThis.window;
  const fonts = Object.hasOwn(environment, 'fonts')
    ? environment.fonts
    : globalThis.document?.fonts;
  let active = true;
  const requestMeasure = () => {
    if (active) measure();
  };

  const resizeObserver =
    typeof ResizeObserverClass === 'function' ? new ResizeObserverClass(requestMeasure) : null;
  resizeObserver?.observe(element);
  windowTarget?.addEventListener?.('resize', requestMeasure);
  fonts?.addEventListener?.('loadingdone', requestMeasure);
  fonts?.ready?.then(requestMeasure, () => {});

  return () => {
    active = false;
    resizeObserver?.disconnect();
    windowTarget?.removeEventListener?.('resize', requestMeasure);
    fonts?.removeEventListener?.('loadingdone', requestMeasure);
  };
}

/**
 * Owns the measurable state behind an overflow disclosure. Keeping this small
 * lets DOM-light clients exercise the same resize/content/cleanup behavior as
 * the Svelte action without requiring a browser emulator.
 *
 * @param {Element & { scrollHeight: number, clientHeight: number }} element
 * @param {(state: { canToggle: boolean, expanded: boolean, truncated: boolean }) => void} onState
 * @param {Parameters<typeof observeElementOverflow>[2]} [environment]
 */
export function createOverflowDisclosure(element, onState, environment) {
  let canToggle = false;
  let expanded = false;
  let active = true;

  const publish = () => {
    if (active) onState({ canToggle, expanded, truncated: canToggle && !expanded });
  };
  const measure = () => {
    if (!active || expanded) return;
    canToggle = hasVerticalOverflow(element);
    publish();
  };
  const stopObserving = observeElementOverflow(element, measure, environment);

  return {
    measure,
    toggle() {
      expanded = !expanded;
      publish();
    },
    collapse() {
      expanded = false;
      publish();
    },
    destroy() {
      active = false;
      stopObserving();
    }
  };
}
