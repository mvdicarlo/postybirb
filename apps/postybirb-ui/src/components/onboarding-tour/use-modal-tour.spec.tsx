import { Window } from 'happy-dom';
import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';

let useModalTour: typeof import('./use-modal-tour').useModalTour;
let useTourStore: typeof import('../../stores/ui/tour-store').useTourStore;

function ModalTourProbe({ opened, ready }: { opened: boolean; ready: boolean }) {
  const { isActive, startTour } = useModalTour('preview', opened, ready);
  return createElement('button', { onClick: startTour }, String(isActive));
}

describe('modal tours', () => {
  let browser: Window;
  let container: HTMLDivElement;
  let root: Root;
  const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

  beforeAll(async () => {
    browser = new Window({ url: 'http://localhost' });
    const globals = {
      window: browser,
      document: browser.document,
      localStorage: browser.localStorage,
      IS_REACT_ACT_ENVIRONMENT: true,
    };
    Object.entries(globals).forEach(([key, value]) => {
      originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value,
      });
    });
    ({ useModalTour } = await import('./use-modal-tour'));
    ({ useTourStore } = await import('../../stores/ui/tour-store'));
  });

  beforeEach(() => {
    jest.useFakeTimers();
    useTourStore.getState().resetAllTours();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(async () => {
    await browser.happyDOM.close();
    originalGlobals.forEach((descriptor, key) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  });

  function render(opened = true, ready = true) {
    act(() => root.render(createElement(ModalTourProbe, { opened, ready })));
  }

  function advance() {
    act(() => jest.advanceTimersByTime(300));
  }

  it('waits for an open, ready modal and its transition before starting', () => {
    render(false);
    advance();
    expect(useTourStore.getState().activeTourId).toBeNull();
    render(true, false);
    advance();
    expect(useTourStore.getState().activeTourId).toBeNull();
    render();
    expect(useTourStore.getState().activeTourId).toBeNull();
    advance();
    expect(useTourStore.getState().activeTourId).toBe('preview');
    expect(container.textContent).toBe('true');
  });

  it('cancels pending startup when closed or no longer ready', () => {
    render();
    render(false);
    advance();
    expect(useTourStore.getState().activeTourId).toBeNull();
    render();
    render(true, false);
    advance();
    expect(useTourStore.getState().activeTourId).toBeNull();
  });

  it.each(['completeTour', 'skipTour'] as const)(
    'remembers %s and permits manual replay',
    (action) => {
      render();
      advance();
      act(() => useTourStore.getState()[action]('preview'));
      render(false);
      render();
      advance();
      expect(useTourStore.getState().activeTourId).toBeNull();
      act(() => container.querySelector('button')!.click());
      expect(useTourStore.getState().activeTourId).toBe('preview');
    },
  );

  it('waits for another active tour without replacing it', () => {
    useTourStore.getState().startTour('other');
    render();
    advance();
    expect(useTourStore.getState().activeTourId).toBe('other');
    act(() => useTourStore.getState().completeTour('other'));
    advance();
    expect(useTourStore.getState().activeTourId).toBe('preview');
  });

  it('ends its own tour on close and on unmount', () => {
    render();
    advance();
    render(false);
    expect(useTourStore.getState().activeTourId).toBeNull();
    render();
    advance();
    expect(useTourStore.getState().activeTourId).toBe('preview');
    act(() => root.render(null));
    expect(useTourStore.getState().activeTourId).toBeNull();
  });

  it('does not end another tour when the modal closes', () => {
    useTourStore.getState().startTour('other');
    render();
    render(false);
    expect(useTourStore.getState().activeTourId).toBe('other');
    act(() => root.render(null));
    expect(useTourStore.getState().activeTourId).toBe('other');
  });
});