import { Window } from 'happy-dom';
import * as React from 'react';
import { act, createElement } from 'react';
import type { Root } from 'react-dom/client';

let createRoot: typeof import('react-dom/client').createRoot;
let MantineProvider: typeof import('@mantine/core').MantineProvider;
let SectionDrawer: typeof import('./section-drawer').SectionDrawer;

jest.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (strings: TemplateStringsArray) => strings.join('') }),
}));
jest.mock('../../styles/layout.css', () => ({}));
jest.mock('../error-boundary', () => ({
  ComponentErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('SectionDrawer navigation', () => {
  let browser: Window;
  let container: HTMLDivElement;
  let target: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let root: Root;
  const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

  beforeAll(async () => {
    browser = new Window({ url: 'http://localhost' });
    const globals: Record<string, unknown> = {
      window: browser,
      document: browser.document,
      navigator: browser.navigator,
      HTMLElement: browser.HTMLElement,
      Element: browser.Element,
      Node: browser.Node,
      getComputedStyle: browser.getComputedStyle.bind(browser),
      requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
      cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
      IS_REACT_ACT_ENVIRONMENT: true,
      React,
    };
    Object.entries(globals).forEach(([key, value]) => {
      originalGlobals.set(
        key,
        Object.getOwnPropertyDescriptor(globalThis, key),
      );
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value,
      });
    });
    ({ createRoot } = await import('react-dom/client'));
    ({ MantineProvider } = await import('@mantine/core'));
    ({ SectionDrawer } = await import('./section-drawer'));
  });

  beforeEach(() => {
    container = document.createElement('div');
    target = document.createElement('div');
    target.id = 'postybirb-content-split';
    trigger = document.createElement('button');
    document.body.append(trigger, container, target);
    trigger.focus();
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    target.remove();
    trigger.remove();
  });

  afterAll(async () => {
    await browser.happyDOM.close();
    originalGlobals.forEach((descriptor, key) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  });

  function renderDrawer(opened: boolean, onClose = jest.fn()) {
    act(() =>
      root.render(
        createElement(
          MantineProvider,
          { env: 'test' },
          createElement(SectionDrawer, {
            opened,
            onClose,
            title: 'Tag groups',
            children: 'Content',
          }),
        ),
      ),
    );
    return target.querySelector('[role="dialog"]') as HTMLDivElement;
  }

  it('mounts in the workspace, labels the dialog, and focuses its content', () => {
    const dialog = renderDrawer(true);
    expect(dialog).not.toBeNull();
    expect(
      document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')
        ?.textContent,
    ).toBe('Tag groups');
    expect(dialog.getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(dialog);
  });

  it('hides closed drawers and restores focus when a gated drawer unmounts', () => {
    const hiddenDialog = renderDrawer(false);
    expect(hiddenDialog.getAttribute('aria-hidden')).toBe('true');
    expect(hiddenDialog.style.visibility).toBe('hidden');
    renderDrawer(true);
    act(() => root.render(null));
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');
  });

  it('ignores an already handled Escape and closes on an unhandled Escape', () => {
    const onClose = jest.fn();
    const dialog = renderDrawer(true, onClose);
    const handled = new browser.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    act(() => dialog.dispatchEvent(handled as unknown as KeyboardEvent));
    expect(onClose).not.toHaveBeenCalled();
    act(() =>
      dialog.dispatchEvent(
        new browser.KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }) as unknown as KeyboardEvent,
      ),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not steal focus when navigating to another control', () => {
    renderDrawer(true);
    const destination = document.createElement('button');
    document.body.append(destination);
    destination.focus();
    act(() => root.render(null));
    expect(document.activeElement).toBe(destination);
    destination.remove();
  });
});
