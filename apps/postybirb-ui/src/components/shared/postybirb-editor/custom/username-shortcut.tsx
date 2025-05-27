/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  // Handler for keyboard events to improve navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!ref.current) return;

    const ceEl = ref.current.querySelector('.ce') as HTMLSpanElement | null;
    if (!ceEl) return;

    // Handle special cases for better editing experience
    if (event.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (
        range.collapsed &&
        range.startContainer === ceEl &&
        range.startOffset === 0
      ) {
        // If backspace at beginning of shortcut, move cursor outside and prevent default
        event.preventDefault();
        selection.modify('move', 'backward', 'character');
      }
    } else if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        // Improve arrow key navigation near the shortcut boundaries
        if (event.key === 'ArrowLeft' && range.startOffset === 0) {
          // Enhanced logic to detect if we're at the start of any content inside the shortcut
          const isAtStart = 
            range.startContainer === ceEl || 
            (ceEl.contains(range.startContainer as Node) && 
             (!range.startContainer.previousSibling || 
              range.startContainer.nodeType === Node.TEXT_NODE && 
              range.startOffset === 0));
          
          if (isAtStart) {
            event.preventDefault();
            // Move cursor outside and to the left of the shortcut element
            const parent = ref.current?.parentNode;
            if (parent) {
              const newRange = document.createRange();
              newRange.setStartBefore(ref.current as Node);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              selection.modify('move', 'backward', 'character');
            }
          }
        } else if (
          event.key === 'ArrowRight' &&
          range.startContainer.nodeType === Node.TEXT_NODE &&
          range.startOffset === (range.startContainer.textContent?.length || 0)
        ) {
          if (ceEl.contains(range.startContainer)) {
            event.preventDefault();
            selection.modify('move', 'forward', 'character');
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    const cPerm: HTMLSpanElement | null | undefined =
      ref.current?.querySelector('.ce');
    const cPermParent = cPerm?.parentElement;

    // Add keyboard event listener for better navigation
    document.addEventListener('keydown', handleKeyDown, true);

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
      document.removeEventListener('keydown', handleKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleKeyDown, onStale]);

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

      // State for dropdown visibility
      const [showDropdown, setShowDropdown] = useState(false);

      // Available website options for the dropdown
      const websiteOptions = useMemo(
        () => websites.map((w) => ({ value: w.id, label: w.displayName })),
        [websites],
      );

      // Handle website selection
      const handleWebsiteSelect = useCallback(
        (websiteId: string) => {
          const { inline, block } = getMyInlineNode(
            editor,
            props.inlineContent.props.id,
          );

          if (inline) {
            // For handling multiple website selections
            let newOnlyValue = websiteId;
            const currentOnly = props.inlineContent.props.only as string;

            // If websiteId is empty, we want to set to "All websites"
            if (websiteId === '') {
              // Reset to all websites
              newOnlyValue = '';
            } else if (currentOnly) {
              const websites = currentOnly.split(',');

              // Check if website is already selected
              if (websites.includes(websiteId)) {
                // Remove it if already selected
                newOnlyValue = websites
                  .filter((id) => id !== websiteId)
                  .join(',');
              } else {
                // Add it to the list
                newOnlyValue = currentOnly
                  ? `${currentOnly},${websiteId}`
                  : websiteId;
              }
            }

            // Update the "only" prop with selected website IDs
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (inline as Record<string, any>).props.only = newOnlyValue;

            editor.updateBlock(block.id, {
              content: block.content,
            });
            // Keep dropdown open for multiple selections
          }
        },
        [editor, props.inlineContent.props.id],
      );

      // Determine if a website is selected and get its name
      const selectedWebsitesDisplay = useMemo(() => {
        const websiteIds = props.inlineContent.props.only;
        if (!websiteIds) return null;

        const ids = websiteIds.split(',');
        const selectedWebsiteNames = ids
          .map((id) => {
            const website = websites.find((w) => w.id === id);
            return website?.displayName;
          })
          .filter(Boolean); // Remove undefined values

        if (selectedWebsiteNames.length === 0) return null;
        return selectedWebsiteNames.join(', ');
      }, [props.inlineContent.props.only, websites]);

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

      // Click handler for toggling website dropdown
      const handleWebsiteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowDropdown((prev) => !prev);
      };

      return (
        <span style={{ verticalAlign: 'text-bottom', position: 'relative' }}>
          <Badge
            variant="outline"
            contentEditable={false}
            radius="xs"
            tt="uppercase"
          >
            {props.inlineContent.props.shortcut}
          </Badge>
          <Badge
            variant="light"
            size="xs"
            color="blue"
            contentEditable={false}
            radius="xs"
            style={{ marginLeft: '2px', cursor: 'pointer' }}
            onClick={handleWebsiteClick}
          >
            {selectedWebsitesDisplay || 'All websites'}
          </Badge>
          <Shortcut item={props.contentRef} onStale={onStale} />

          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                zIndex: 1000,
                top: '100%',
                left: 0,
                backgroundColor: 'var(--mantine-color-body)',
                border: '1px solid var(--mantine-color-gray-4)',
                borderRadius: 'var(--mantine-radius-sm)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                maxHeight: '200px',
                overflow: 'auto',
                width: '200px',
              }}
            >
              <div
                style={{
                  padding: '8px',
                  borderBottom: '1px solid var(--mantine-color-gray-3)',
                  fontWeight: 'bold',
                }}
              >
                Select website
              </div>
              <div
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  background: !props.inlineContent.props.only
                    ? 'var(--mantine-color-blue-0)'
                    : undefined,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onClick={() => handleWebsiteSelect('')}
              >
                <span>All websites</span>
                {!props.inlineContent.props.only && <span>✓</span>}
              </div>
              {websiteOptions.map((option) => {
                // Check if this website is in the selected list
                const selectedWebsites = props.inlineContent.props.only
                  ? props.inlineContent.props.only.split(',')
                  : [];
                const isSelected = selectedWebsites.includes(option.value);

                return (
                  <div
                    key={option.value}
                    style={{
                      padding: '8px',
                      cursor: 'pointer',
                      background: isSelected
                        ? 'var(--mantine-color-blue-0)'
                        : undefined,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onClick={() => handleWebsiteSelect(option.value)}
                  >
                    <span>{option.label}</span>
                    {isSelected && <span>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
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
