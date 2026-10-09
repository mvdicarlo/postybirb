import { Window } from 'happy-dom';
import * as React from 'react';
import { act, createElement } from 'react';
import type { Root } from 'react-dom/client';

let createRoot: typeof import('react-dom/client').createRoot;
let MantineProvider: typeof import('@mantine/core').MantineProvider;
let SearchInput: typeof import('./search-input').SearchInput;

jest.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (strings: TemplateStringsArray) => strings.join('') }),
}));

describe('SearchInput recovery', () => {
  let browser: Window;
  let container: HTMLDivElement;
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
    ({ SearchInput } = await import('./search-input'));
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  afterAll(async () => {
    await browser.happyDOM.close();
    originalGlobals.forEach((descriptor, key) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  });

  function renderSearch(props: React.ComponentProps<typeof SearchInput>) {
    act(() =>
      root.render(
        createElement(
          MantineProvider,
          { env: 'test' },
          createElement(SearchInput, props),
        ),
      ),
    );
    return container.querySelector('input') as HTMLInputElement;
  }

  it('provides a translated accessible name and accepts a specific name', () => {
    const input = renderSearch({ value: '', onChange: jest.fn() });
    expect(input.getAttribute('aria-label')).toBe('Search');
    renderSearch({
      value: '',
      onChange: jest.fn(),
      'aria-label': 'Search templates',
    });
    expect(input.getAttribute('aria-label')).toBe('Search templates');
  });

  it('clears the query and returns focus from the clear button to the input', () => {
    const onChange = jest.fn();
    const onClear = jest.fn();
    const input = renderSearch({ value: 'draft', onChange, onClear });
    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Clear search');
    act(() => {
      button.focus();
      button.click();
    });
    expect(onChange).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(input);
  });

  it('clears on Escape without closing the containing drawer', () => {
    const onChange = jest.fn();
    const input = renderSearch({ value: 'draft', onChange });
    const outerKeyDown = jest.fn();
    document.addEventListener('keydown', outerKeyDown);
    try {
      const event = new browser.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      act(() => input.dispatchEvent(event as unknown as KeyboardEvent));
      expect(onChange).toHaveBeenCalledWith('');
      expect(event.defaultPrevented).toBe(true);
      expect(outerKeyDown).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', outerKeyDown);
    }
  });

  it('allows Escape to reach the containing drawer when the query is empty', () => {
    const onChange = jest.fn();
    const input = renderSearch({ value: '', onChange });
    const outerKeyDown = jest.fn();
    document.addEventListener('keydown', outerKeyDown);
    try {
      act(() =>
        input.dispatchEvent(
          new browser.KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true,
          }) as unknown as KeyboardEvent,
        ),
      );
      expect(onChange).not.toHaveBeenCalled();
      expect(outerKeyDown).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('keydown', outerKeyDown);
    }
  });

  it('respects a caller that handles Escape', () => {
    const onChange = jest.fn();
    const input = renderSearch({
      value: 'draft',
      onChange,
      onKeyDown: (event) => event.preventDefault(),
    });
    act(() =>
      input.dispatchEvent(
        new browser.KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }) as unknown as KeyboardEvent,
      ),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hides the clear button when there is no query or clear is disabled', () => {
    renderSearch({ value: '', onChange: jest.fn() });
    expect(container.querySelector('button')).toBeNull();
    renderSearch({ value: 'draft', onChange: jest.fn(), showClear: false });
    expect(container.querySelector('button')).toBeNull();
  });
});
