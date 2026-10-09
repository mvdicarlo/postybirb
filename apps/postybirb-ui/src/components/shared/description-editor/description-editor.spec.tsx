import type {
  Description,
  DescriptionValue,
  WebsiteOptionsDto,
} from '@postybirb/types';
import type { Editor } from '@tiptap/react';
import { Window } from 'happy-dom';
import * as React from 'react';
import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import websiteOptionsApi from '../../../api/website-options.api';
import type { SubmissionRecord } from '../../../stores/records';
import {
  FormFieldsProvider,
  useFormFieldsContext,
} from '../../sections/submissions-section/submission-edit-card/account-selection/form/form-fields-context';
import type { DescriptionEditorProps } from './description-editor';

let DescriptionEditor: typeof import('./description-editor').DescriptionEditor;

jest.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (strings: TemplateStringsArray) => strings.join('') }),
  Trans: () => null,
}));
jest.mock('@mantine/core', () => ({
  Box: 'div',
  useMantineColorScheme: () => ({ colorScheme: 'light' }),
}));
jest.mock('react-query', () => ({ useQuery: () => ({}) }));
jest.mock('../../../api/form-generator.api', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../../api/website-options.api', () => ({
  __esModule: true,
  default: { update: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../../utils/notifications', () => ({
  showErrorWithContext: jest.fn(),
}));
jest.mock('../../../stores/entity/account-store', () => ({
  useAccount: () => undefined,
}));
jest.mock('../../../stores/entity/custom-shortcut-store', () => ({
  useCustomShortcuts: () => [],
}));
jest.mock('../../../stores/entity/website-store', () => ({
  useWebsites: () => [],
}));
jest.mock('../../../stores', () => ({
  useCustomShortcuts: () => [],
  useWebsites: () => [],
}));
jest.mock('./custom-blocks/website-only-selector', () => ({
  WebsiteOnlySelector: () => null,
}));
jest.mock('./components/bubble-toolbar', () => ({ BubbleToolbar: () => null }));
jest.mock('./components/description-toolbar', () => ({
  DescriptionToolbar: () => null,
}));
jest.mock('./components/html-edit-modal', () => ({
  HtmlEditModal: () => null,
}));
jest.mock('./components/insert-media-modal', () => ({
  InsertMediaModal: () => null,
}));
jest.mock('./custom-blocks/shortcut.css', () => ({}));
jest.mock('./description-editor.css', () => ({}));

function description(text: string): Description {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

function FormEditor() {
  const { getValue, setValue, option } = useFormFieldsContext();
  const value = getValue<DescriptionValue>('description');
  return createElement(DescriptionEditor, {
    id: option.id,
    value: value.description,
    onChange: (updated) =>
      setValue('description', { ...value, description: updated }),
  });
}

describe('DescriptionEditor external updates', () => {
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
      MutationObserver: browser.MutationObserver,
      DOMParser: browser.DOMParser,
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
    ({ DescriptionEditor } = await import('./description-editor'));
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
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

  function renderEditor(props: DescriptionEditorProps) {
    act(() => root.render(createElement(DescriptionEditor, props)));
  }

  function getEditor() {
    return (
      container.querySelector('.tiptap') as HTMLElement & { editor: Editor }
    ).editor;
  }

  it('applies a template to the same editor without emitting an edit', () => {
    const onChange = jest.fn();
    renderEditor({ id: 'option', value: description('Original'), onChange });
    const editor = getEditor();
    const editorElement = editor.view.dom;

    const template: Description = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [
            {
              type: 'text',
              text: 'Template description',
              marks: [{ type: 'bold' }],
            },
          ],
        },
      ],
    };
    renderEditor({ id: 'option', value: template, onChange });

    expect(getEditor()).toBe(editor);
    expect(editor.view.dom).toBe(editorElement);
    expect(editorElement.textContent).toBe('Template description');
    expect(editorElement.querySelector('h2 strong')?.textContent).toBe(
      'Template description',
    );
    expect(onChange).not.toHaveBeenCalled();

    act(() => editor.commands.insertContentAt(1, 'Edited '));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(editor.getText()).toBe('Edited Template description');
  });

  it.each([undefined, { type: 'doc', content: [] } as Description])(
    'clears the editor when the external value becomes %p',
    (value) => {
      const onChange = jest.fn();
      renderEditor({ value: description('Original'), onChange });
      renderEditor({ value, onChange });

      expect(getEditor().isEmpty).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it('preserves selection on local edit echoes and equal server refreshes', () => {
    const onChange = jest.fn();
    renderEditor({ value: description('Original'), onChange });
    const editor = getEditor();
    act(() => editor.commands.insertContentAt(4, 'typed'));
    const value = onChange.mock.calls[0][0];
    const onTransaction = jest.fn();
    editor.on('transaction', onTransaction);
    const selection = editor.state.selection.toJSON();

    renderEditor({ value, onChange });
    renderEditor({ value: JSON.parse(JSON.stringify(value)), onChange });

    expect(
      onTransaction.mock.calls.filter(
        ([{ transaction }]) => transaction.docChanged,
      ),
    ).toHaveLength(0);
    expect(editor.state.selection.toJSON()).toEqual(selection);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not replace an unsaved draft on an unchanged external value', () => {
    const value = description('Original');
    const onChange = jest.fn();
    renderEditor({ value, onChange });
    act(() => getEditor().commands.insertContentAt(1, 'Draft '));
    renderEditor({ value: JSON.parse(JSON.stringify(value)), onChange });

    expect(getEditor().getText()).toBe('Draft Original');
  });

  it('still recreates the editor when switching options', () => {
    const onChange = jest.fn();
    renderEditor({ id: 'first', value: description('First'), onChange });
    const previousEditor = getEditor();
    renderEditor({ id: 'second', value: description('Second'), onChange });

    expect(getEditor()).not.toBe(previousEditor);
    expect(getEditor().getText()).toBe('Second');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a template after a previously typed description has been saved', async () => {
    let option = {
      id: 'option',
      accountId: 'account',
      data: {
        description: {
          overrideDefault: false,
          description: description('Original'),
        },
      },
    } as unknown as WebsiteOptionsDto;
    const submission = { type: 'FILE' } as SubmissionRecord;
    const renderForm = () =>
      act(() =>
        root.render(
          createElement(
            FormFieldsProvider,
            { option, submission },
            createElement(FormEditor),
          ),
        ),
      );
    renderForm();
    act(() => getEditor().commands.insertContentAt(1, 'Typed '));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1250);
    });
    expect(websiteOptionsApi.update).toHaveBeenCalledTimes(1);
    const savedData = jest.mocked(websiteOptionsApi.update).mock.calls[0][1]
      .data;

    option = { ...option, data: JSON.parse(JSON.stringify(savedData)) };
    renderForm();
    option = {
      ...option,
      data: {
        ...option.data,
        description: {
          ...option.data.description,
          overrideDefault: false,
          description: description('Template'),
        },
      },
    };
    renderForm();

    expect(getEditor().getText()).toBe('Template');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1250);
    });
    expect(websiteOptionsApi.update).toHaveBeenCalledTimes(1);
  });
});
