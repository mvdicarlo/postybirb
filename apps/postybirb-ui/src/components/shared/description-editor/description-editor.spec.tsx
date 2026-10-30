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
jest.mock('@mantine/core', () => {
  const { createElement: element } =
    jest.requireActual<typeof import('react')>('react');
  const passthrough = ({ children }: React.PropsWithChildren) => children;
  return {
    Box: 'div',
    Badge: ({
      children,
      contentEditable,
    }: React.PropsWithChildren<{ contentEditable?: boolean }>) =>
      element('span', { contentEditable }, children),
    Text: passthrough,
    Button: 'button',
    Checkbox: 'input',
    Divider: 'hr',
    Group: 'div',
    Stack: 'div',
    TextInput: 'input',
    ThemeIcon: 'span',
    UnstyledButton: 'button',
    Tooltip: passthrough,
    Popover: Object.assign(passthrough, {
      Target: passthrough,
      Dropdown: () => null,
    }),
    useMantineColorScheme: () => ({ colorScheme: 'light' }),
  };
});
jest.mock('react-query', () => ({ useQuery: () => ({}) }));
jest.mock('../../../api/form-generator.api', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../../api/website-options.api', () => ({
  __esModule: true,
  default: { saveDescription: jest.fn(), update: jest.fn() },
}));
jest.mock('../../../utils/notifications', () => ({
  showErrorWithContext: jest.fn(),
  showErrorNotification: jest.fn(),
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

function websiteOption(): WebsiteOptionsDto {
  const dates = {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return {
    ...dates,
    id: 'option',
    accountId: 'account',
    account: {
      ...dates,
      id: 'account',
      name: 'Account',
      website: 'test',
      groups: [],
    },
    isDefault: false,
    data: {
      description: {
        overrideDefault: false,
        description: description('Original'),
      },
    },
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
  let server: WebsiteOptionsDto;
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
    server = websiteOption();
    jest
      .mocked(websiteOptionsApi.saveDescription)
      .mockImplementation(async (_id, update) => {
        const current = server.data.description;
        if (!current) throw new Error('Description fixture missing');
        if (update.expectedRevision !== (current.version?.revision ?? 0)) {
          return { status: 'conflict', value: current };
        }
        const value: DescriptionValue = {
          ...update.value,
          version: {
            revision: update.expectedRevision + 1,
            mutationId: update.mutationId,
            replacementRevision: current.version?.replacementRevision ?? 0,
          },
        };
        server = {
          ...server,
          data: { ...server.data, description: value },
        };
        return { status: 'saved', value };
      });
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

  function renderForm(option = server) {
    const submission = { type: 'FILE' } as SubmissionRecord;
    act(() =>
      root.render(
        createElement(
          FormFieldsProvider,
          { option, submission },
          createElement(FormEditor),
        ),
      ),
    );
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

  it('applies an upstream description immediately despite focused, unconfirmed edits', () => {
    const onChange = jest.fn();
    renderEditor({ value: description('Original'), onChange });
    const editor = getEditor();
    act(() => {
      editor.commands.insertContentAt(1, 'Draft ');
      editor.view.focus();
    });
    expect(editor.isFocused).toBe(true);

    renderEditor({ value: description('Template'), onChange });

    expect(getEditor()).toBe(editor);
    expect(editor.getText()).toBe('Template');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, { type: 'doc', content: [] } as Description])(
    'clears a focused, unconfirmed draft when the upstream value becomes %p',
    (value) => {
      const onChange = jest.fn();
      renderEditor({ value: description('Original'), onChange });
      const editor = getEditor();
      act(() => {
        editor.view.focus();
        editor.commands.insertContentAt(1, 'Draft ');
      });

      renderEditor({ value, onChange });

      expect(editor.isEmpty).toBe(true);
      expect(onChange).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves selection on local echoes and schema-equivalent refreshes', () => {
    const onChange = jest.fn();
    renderEditor({ value: description('Original'), onChange });
    const editor = getEditor();
    act(() => editor.commands.insertContentAt(4, 'typed'));
    const value: Description = onChange.mock.calls[0][0];
    const onTransaction = jest.fn();
    editor.on('transaction', onTransaction);
    const selection = editor.state.selection.toJSON();

    renderEditor({ value, onChange });
    renderEditor({ value: JSON.parse(JSON.stringify(value)), onChange });
    renderEditor({
      value: {
        ...value,
        content: value.content.map(({ attrs, ...node }) => node),
      },
      onChange,
    });

    expect(
      onTransaction.mock.calls.filter(
        ([{ transaction }]) => transaction.docChanged,
      ),
    ).toHaveLength(0);
    expect(editor.state.selection.toJSON()).toEqual(selection);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('navigates through the specific username shortcut when the same shortcut is used twice', async () => {
    const node = (username: string) => ({
      type: 'username',
      attrs: { shortcut: 'test', only: '', username },
    });
    renderEditor({
      value: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              node('first'),
              { type: 'text', text: ' between ' },
              node('second'),
            ],
          },
        ],
      },
      onChange: jest.fn(),
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    const editor = getEditor();
    const inputs = editor.view.dom.querySelectorAll<HTMLInputElement>(
      '.username-shortcut-input',
    );
    act(() => editor.commands.insertContentAt(1, 'Before '));
    const offset = 'Before '.length;
    const press = (element: HTMLElement, key: string) =>
      act(() => {
        element.dispatchEvent(
          new window.KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
    act(() => {
      editor.commands.setTextSelection(1 + offset);
      editor.view.focus();
    });
    press(editor.view.dom, 'ArrowRight');
    expect(document.activeElement).toBe(inputs[0]);
    act(() => inputs[0].setSelectionRange(5, 5));
    press(inputs[0], 'ArrowRight');
    expect(document.activeElement).toBe(editor.view.dom);
    expect(editor.state.selection.from).toBe(2 + offset);
    press(editor.view.dom, 'ArrowLeft');
    expect(document.activeElement).toBe(inputs[0]);
    act(() => inputs[0].setSelectionRange(0, 0));
    press(inputs[0], 'ArrowLeft');
    expect(document.activeElement).toBe(editor.view.dom);
    expect(editor.state.selection.from).toBe(1 + offset);
    expect(editor.state.selection.empty).toBe(true);
    act(() => {
      editor.commands.setTextSelection(11 + offset);
      editor.view.focus();
    });
    press(editor.view.dom, 'ArrowRight');
    expect(document.activeElement).toBe(inputs[1]);
    act(() => inputs[1].setSelectionRange(6, 6));
    press(inputs[1], 'ArrowRight');
    expect(document.activeElement).toBe(editor.view.dom);
    expect(editor.state.selection.from).toBe(12 + offset);
    expect(editor.state.selection.empty).toBe(true);
  });

  it('does not steal arrow keys from a different editor or unrelated input', async () => {
    const value: Description = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'username',
              attrs: { shortcut: 'test', only: '', username: 'first' },
            },
            { type: 'text', text: ' after' },
          ],
        },
      ],
    };
    act(() =>
      root.render(
        createElement(
          'div',
          null,
          createElement(DescriptionEditor, {
            id: 'one',
            value,
            onChange: jest.fn(),
          }),
          createElement(DescriptionEditor, {
            id: 'two',
            value,
            onChange: jest.fn(),
          }),
          createElement('input', { 'data-testid': 'unrelated' }),
        ),
      ),
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    const editors = [
      ...container.querySelectorAll<HTMLElement & { editor: Editor }>(
        '.tiptap',
      ),
    ].map((element) => element.editor);
    act(() => {
      editors.forEach((editor) => editor.commands.setTextSelection(1));
      editors[0].view.focus();
      editors[0].view.dom.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(document.activeElement).toBe(
      editors[0].view.dom.querySelector('input'),
    );
    const unrelated = container.querySelector<HTMLInputElement>(
      '[data-testid="unrelated"]',
    );
    if (!unrelated) throw new Error('Unrelated input missing');
    act(() => {
      unrelated.focus();
      unrelated.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(document.activeElement).toBe(unrelated);
  });

  it.each(['username', 'contentWarningShortcut'])(
    'keeps the document and rendered view consistent when inserting a %s after another local transaction',
    async (type) => {
      renderForm();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      const editor = getEditor();
      let nestedTransaction = false;
      editor.on('beforeTransaction', ({ nextState }) => {
        if (
          !nestedTransaction &&
          nextState.doc
            .toJSON()
            .content?.[0].content?.some(
              (node: { type: string }) => node.type === type,
            )
        ) {
          nestedTransaction = true;
          // Bubble menu effects also dispatch metadata-only transactions while a NodeView is mounting.
          editor.view.dispatch(editor.state.tr.setMeta('shortcut-test', true));
        }
      });
      act(() => {
        editor.commands.insertContentAt(1, 'words ');
        editor.commands.insertContentAt(7, [
          {
            type,
            attrs:
              type === 'username'
                ? { shortcut: 'test', only: '', username: '' }
                : { only: '' },
          },
          { type: 'text', text: ' ' },
        ]);
      });
      expect(nestedTransaction).toBe(true);
      expect(
        editor
          .getJSON()
          .content?.[0].content?.some((node) => node.type === type),
      ).toBe(true);
      const shortcut = editor.view.dom.querySelector(`.node-${type}`);
      expect(shortcut).not.toBeNull();
      expect(editor.state.doc.textContent).toBe('words  Original');
      const current = editor.getJSON();
      const selection = editor.state.selection.toJSON();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(editor.getJSON()).toEqual(current);
      expect(editor.state.selection.toJSON()).toEqual(selection);
      act(() => editor.commands.insertContentAt(7, 'before '));
      expect(
        editor
          .getJSON()
          .content?.[0].content?.some((node) => node.type === type),
      ).toBe(true);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1250);
      });
      renderForm();
      expect(
        server.data.description?.description.content[0].content?.some(
          (node) => node.type === type,
        ),
      ).toBe(true);
      expect(editor.view.dom.querySelector(`.node-${type}`)).toBe(shortcut);
      expect(editor.state.doc.textContent).toBe('words before  Original');
    },
  );

  it('recreates the editor without carrying drafts across options', () => {
    const onChange = jest.fn();
    renderEditor({ id: 'first', value: description('First'), onChange });
    const previousEditor = getEditor();
    act(() => previousEditor.commands.insertContentAt(1, 'Draft '));

    renderEditor({ id: 'second', value: description('Second'), onChange });
    const editor = getEditor();
    expect(editor).not.toBe(previousEditor);
    expect(editor.getText()).toBe('Second');
    renderEditor({ id: 'second', value: description('Template'), onChange });

    expect(editor.getText()).toBe('Template');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps read-only mode and upstream content current without recreating the editor', () => {
    const onChange = jest.fn();
    renderEditor({ value: description('Original'), onChange });
    const editor = getEditor();

    renderEditor({
      value: description('Archived'),
      onChange,
      readOnly: true,
    });

    expect(getEditor()).toBe(editor);
    expect(editor.isEditable).toBe(false);
    expect(editor.getText()).toBe('Archived');
    expect(onChange).not.toHaveBeenCalled();

    renderEditor({ value: description('Restored'), onChange });
    expect(getEditor()).toBe(editor);
    expect(editor.isEditable).toBe(true);
    act(() => editor.commands.insertContentAt(1, 'Edited '));
    expect(editor.getText()).toBe('Edited Restored');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps username shortcut input edits when the ProseMirror view is blurred and an older save arrives', async () => {
    renderForm();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    const editor = getEditor();
    act(() =>
      editor.commands.insertContentAt(1, {
        type: 'username',
        attrs: { shortcut: 'test', only: '', username: 'first' },
      }),
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1250);
    });
    const older = server;
    const input = editor.view.dom.querySelector<HTMLInputElement>(
      '.username-shortcut-input',
    );
    if (!input) throw new Error('Username shortcut input was not rendered');
    act(() => {
      editor.view.focus();
      input.focus();
      editor
        .chain()
        .setNodeSelection(1)
        .updateAttributes('username', { username: 'typed', only: 'test' })
        .run();
    });
    expect(editor.isFocused).toBe(false);
    expect(input.value).toBe('typed');
    const current = editor.getJSON();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1250);
    });
    renderForm(older);
    expect(editor.getJSON()).toEqual(current);
    expect(editor.view.dom.querySelector('.username-shortcut-input')).toBe(
      input,
    );
    expect(input.value).toBe('typed');
  });

  it('applies a template equal to an older local draft without saving the discarded draft', async () => {
    renderForm();
    const editor = getEditor();
    act(() => editor.commands.insertContentAt(1, 'Template '));
    const template = editor.getJSON() as Description;
    act(() => {
      editor.commands.insertContentAt(1, 'Draft ');
      editor.view.focus();
    });
    server = {
      ...server,
      data: {
        ...server.data,
        description: {
          overrideDefault: false,
          description: template,
          version: { revision: 1, mutationId: null, replacementRevision: 1 },
        },
      },
    };
    renderForm();
    expect(editor.getText()).toBe('Template Original');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1250);
    });
    expect(websiteOptionsApi.saveDescription).not.toHaveBeenCalled();
  });
});
