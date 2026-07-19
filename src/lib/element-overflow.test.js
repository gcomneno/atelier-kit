import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOverflowDisclosure,
  getOverflowDisclosureView,
  hasVerticalOverflow,
  observeElementOverflow
} from './element-overflow.js';

test('vertical overflow distinguishes below, exactly at, and above the visible limit', () => {
  assert.equal(hasVerticalOverflow({ scrollHeight: 99, clientHeight: 100 }), false);
  assert.equal(hasVerticalOverflow({ scrollHeight: 100, clientHeight: 100 }), false);
  assert.equal(hasVerticalOverflow({ scrollHeight: 102, clientHeight: 100 }), true);
});

test('overflow observation reacts to resize and font changes, then cleans up', async () => {
  const listeners = new Map();
  const fontListeners = new Map();
  let observerCallback = () => {};
  let observedElement;
  let disconnected = false;
  /** @type {(value: unknown) => void} */
  let resolveFonts = () => {};
  const fontsReady = new Promise((resolve) => {
    resolveFonts = resolve;
  });
  const element = /** @type {Element} */ ({});
  const environment = {
    ResizeObserverClass: class {
      /** @param {() => void} callback */
      constructor(callback) {
        observerCallback = callback;
      }
      /** @param {Element} node */
      observe(node) {
        observedElement = node;
      }
      disconnect() {
        disconnected = true;
      }
    },
    windowTarget: {
      /** @param {string} type @param {() => void} callback */
      addEventListener(type, callback) {
        listeners.set(type, callback);
      },
      /** @param {string} type */
      removeEventListener(type) {
        listeners.delete(type);
      }
    },
    fonts: {
      ready: fontsReady,
      /** @param {string} type @param {() => void} callback */
      addEventListener(type, callback) {
        fontListeners.set(type, callback);
      },
      /** @param {string} type */
      removeEventListener(type) {
        fontListeners.delete(type);
      }
    }
  };
  let measurements = 0;

  const cleanup = observeElementOverflow(element, () => measurements++, environment);
  assert.equal(observedElement, element);

  observerCallback();
  listeners.get('resize')?.();
  fontListeners.get('loadingdone')?.();
  resolveFonts(undefined);
  await fontsReady;
  await Promise.resolve();
  assert.equal(measurements, 4);

  cleanup();
  assert.equal(disconnected, true);
  assert.equal(listeners.size, 0);
  assert.equal(fontListeners.size, 0);
  observerCallback();
  assert.equal(measurements, 4);
});

test('overflow observation remains safe without browser observer, window, or font APIs', () => {
  const cleanup = observeElementOverflow(/** @type {Element} */ ({}), () => {
    assert.fail('no unavailable API should schedule a measurement');
  }, {
    ResizeObserverClass: /** @type {never} */ (null),
    windowTarget: /** @type {never} */ (null),
    fonts: /** @type {never} */ (null)
  });

  assert.doesNotThrow(cleanup);
});

test('missing environment overrides use the browser globals', async () => {
  const originalResizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const windowListeners = new Map();
  const fontListeners = new Map();
  let observed;
  let disconnected = false;
  let measurements = 0;

  try {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: class {
        /** @param {() => void} callback */
        constructor(callback) {
          this.callback = callback;
        }
        /** @param {Element} element */
        observe(element) {
          observed = element;
          this.callback();
        }
        disconnect() {
          disconnected = true;
        }
      }
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        /** @param {string} type @param {() => void} callback */
        addEventListener: (type, callback) => windowListeners.set(type, callback),
        /** @param {string} type */
        removeEventListener: (type) => windowListeners.delete(type)
      }
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        fonts: {
          ready: Promise.resolve(),
          /** @param {string} type @param {() => void} callback */
          addEventListener: (type, callback) => fontListeners.set(type, callback),
          /** @param {string} type */
          removeEventListener: (type) => fontListeners.delete(type)
        }
      }
    });

    const element = /** @type {Element} */ ({});
    const cleanup = observeElementOverflow(element, () => measurements++);
    await Promise.resolve();
    assert.equal(observed, element);
    assert.equal(windowListeners.has('resize'), true);
    assert.equal(fontListeners.has('loadingdone'), true);
    assert.equal(measurements, 2);

    cleanup();
    assert.equal(disconnected, true);
    assert.equal(windowListeners.size, 0);
    assert.equal(fontListeners.size, 0);
  } finally {
    restoreGlobal('ResizeObserver', originalResizeObserver);
    restoreGlobal('window', originalWindow);
    restoreGlobal('document', originalDocument);
  }
});

test('explicit null overrides disable APIs even when browser globals exist', async () => {
  const originalResizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let observerCreations = 0;
  let listenerCreations = 0;
  let measurements = 0;

  try {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: class {
        constructor() {
          observerCreations++;
        }
      }
    });
    const eventTarget = { addEventListener: () => listenerCreations++ };
    Object.defineProperty(globalThis, 'window', { configurable: true, value: eventTarget });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { fonts: { ...eventTarget, ready: Promise.resolve() } }
    });

    const cleanup = observeElementOverflow(
      /** @type {Element} */ ({}),
      () => measurements++,
      { ResizeObserverClass: null, windowTarget: null, fonts: null }
    );
    await Promise.resolve();
    assert.equal(observerCreations, 0);
    assert.equal(listenerCreations, 0);
    assert.equal(measurements, 0);
    assert.doesNotThrow(cleanup);
  } finally {
    restoreGlobal('ResizeObserver', originalResizeObserver);
    restoreGlobal('window', originalWindow);
    restoreGlobal('document', originalDocument);
  }
});

/**
 * @param {string} name
 * @param {PropertyDescriptor | undefined} descriptor
 */
function restoreGlobal(name, descriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else Reflect.deleteProperty(globalThis, name);
}

test('description disclosure follows overflow, toggles, remeasures, and cleans up', () => {
  const resizeListeners = new Map();
  let observerCallback = () => {};
  let disconnects = 0;
  /** @type {{ canToggle: boolean, expanded: boolean, truncated: boolean }[]} */
  const states = [];
  const element = /** @type {Element & { scrollHeight: number, clientHeight: number }} */ ({
    scrollHeight: 100,
    clientHeight: 100
  });
  const disclosure = createOverflowDisclosure(element, (state) => states.push(state), {
    ResizeObserverClass: class {
      /** @param {() => void} callback */
      constructor(callback) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {
        disconnects++;
      }
    },
    windowTarget: {
      addEventListener: (type, callback) => resizeListeners.set(type, callback),
      removeEventListener: (type) => resizeListeners.delete(type)
    },
    fonts: null
  });

  disclosure.measure();
  assert.deepEqual(states.at(-1), { canToggle: false, expanded: false, truncated: false });
  assert.deepEqual(getOverflowDisclosureView(false, false, labels), {
    showToggle: false,
    truncated: false,
    ariaExpanded: false,
    label: 'Leggi tutto'
  });

  element.scrollHeight = 140;
  observerCallback();
  assert.deepEqual(states.at(-1), { canToggle: true, expanded: false, truncated: true });
  assert.deepEqual(getOverflowDisclosureView(true, false, labels), {
    showToggle: true,
    truncated: true,
    ariaExpanded: false,
    label: 'Leggi tutto'
  });

  disclosure.toggle();
  assert.deepEqual(states.at(-1), { canToggle: true, expanded: true, truncated: false });
  assert.deepEqual(getOverflowDisclosureView(true, true, labels), {
    showToggle: true,
    truncated: false,
    ariaExpanded: true,
    label: 'Leggi meno'
  });

  disclosure.toggle();
  assert.deepEqual(states.at(-1), { canToggle: true, expanded: false, truncated: true });

  element.scrollHeight = 100;
  resizeListeners.get('resize')?.();
  assert.deepEqual(states.at(-1), { canToggle: false, expanded: false, truncated: false });

  element.scrollHeight = 150;
  disclosure.measure();
  assert.deepEqual(states.at(-1), { canToggle: true, expanded: false, truncated: true });

  const stateCount = states.length;
  disclosure.destroy();
  assert.equal(disconnects, 1);
  assert.equal(resizeListeners.size, 0);
  observerCallback();
  assert.equal(states.length, stateCount);
});

const labels = { readMore: 'Leggi tutto', showLess: 'Leggi meno' };
