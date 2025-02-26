/* eslint-disable lingui/no-unlocalized-strings */
/* eslint-disable react-hooks/rules-of-hooks */
import { BlockNoteEditor } from '@blocknote/core';
import {
  DefaultReactSuggestionItem,
  createReactInlineContentSpec,
  useBlockNoteEditor,
} from '@blocknote/react';
import { Badge } from '@mantine/core';
import { UsernameShortcut } from '@postybirb/types';
import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../../../../stores/use-store';
import { WebsiteStore } from '../../../../stores/website.store';
import { schema } from '../schema';
import './shortcut.css';

function getMyInlineNode(editor: BlockNoteEditor, id: string) {
  const currentBlock = editor.getTextCursorPosition().block;
  if (Array.isArray(currentBlock?.content)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inline = currentBlock?.content.find((i: any) => i?.props?.id === id);
    return { inline, block: currentBlock };
  }
  return { inline: null, block: currentBlock };
}

function findTextNode(node: HTMLElement | null): HTMLElement | undefined {
  if (!node) return undefined;

  if (node.nodeType === Node.TEXT_NODE) {
    return node;
  }

  for (const child of Array.from(node.childNodes)) {
    const text = findTextNode(child as HTMLElement);
    if (text) return text;
  }

  return undefined;
}

function Shortcut(props: {
  onStale: () => void;
  item: (node: HTMLElement | null) => void;
}) {
  const { item, onStale } = props;
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const cPerm: HTMLSpanElement | null | undefined =
      ref.current?.querySelector('.ce');
    const cPermParent = cPerm?.parentElement;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          const ceNode: HTMLSpanElement | undefined = Array.from(
            mutation.removedNodes,
          ).find(
            (node) =>
              node.nodeName === 'SPAN' &&
              (node as HTMLSpanElement).classList.contains('ce'),
          ) as HTMLSpanElement;
          if (ceNode) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const c = ceNode.querySelector('span') as HTMLSpanElement;
            if (c) {
              c.innerText = '';
              cPermParent?.replaceChildren(ceNode);
              const selection = window.getSelection();
              onStale();
              if (selection) {
                selection.modify('move', 'forward', 'character');
              }
            }
          }
        }
      });

      const current = ref.current as HTMLSpanElement;
      const ceEl: HTMLSpanElement | null = current.querySelector('.ce');
      if (ceEl && ceEl.innerText.trim() !== current.innerText.trim()) {
        const textNode = findTextNode(current);
        if (textNode && ceEl.children[0]) {
          ceEl.children[0].appendChild(textNode);
        }
      }
    });

    if (ref.current) {
      observer.observe(ref.current, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }
    return () => {
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current, onStale]);

  const el = <span ref={item} className="ce" />;

  return (
    <span ref={ref}>
      <Badge variant="outline" radius="xs" tt="none">
        {el}
      </Badge>
    </span>
  );
}

export const InlineUsernameShortcut = createReactInlineContentSpec(
  {
    type: 'username',
    propSchema: {
      id: {
        default: Date.now().toString(),
      },
      shortcut: {
        default: '',
      },
      only: {
        default: '',
      },
    },
    content: 'styled',
  },
  {
    render: (props) => {
      const editor = useBlockNoteEditor();
      const { state: websites } = useStore(WebsiteStore);
      const website = websites.find(
        (w) => w.usernameShortcut?.id === props.inlineContent.props.shortcut,
      )?.displayName;

      const onStale = useCallback(() => {
        const { inline, block } = getMyInlineNode(
          editor,
          props.inlineContent.props.id,
        );
        if (inline) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (inline as any).content = [{ type: 'text', text: '', styles: {} }];
          editor.updateBlock(block.id, {
            content: block.content,
          });
        }
      }, [editor, props.inlineContent.props.id]);

      return (
        <span style={{ verticalAlign: 'text-bottom' }}>
          <Badge
            variant="outline"
            contentEditable={false}
            radius="xs"
            tt="uppercase"
          >
            {props.inlineContent.props.shortcut}
          </Badge>
          <Shortcut item={props.contentRef} onStale={onStale} />
        </span>
      );
    },
  },
);

export const getUsernameShortcutsMenuItems = (
  editor: typeof schema.BlockNoteEditor,
  shortcuts: UsernameShortcut[],
): DefaultReactSuggestionItem[] =>
  shortcuts.map((sc) => ({
    title: sc.id,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: 'username',
          props: {
            id: Date.now().toString(),
            shortcut: sc.id,
            only: '',
          },
          content: 'username',
        },
        ' ', // add a space after the shortcut
      ]);
    },
  }));
