import { Trans } from '@lingui/react/macro';
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react-hooks/rules-of-hooks */
import { BlockNoteEditor } from '@blocknote/core';
import {
  DefaultReactSuggestionItem,
  createReactInlineContentSpec,
  useBlockNoteEditor,
} from '@blocknote/react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Popover,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { UsernameShortcut } from '@postybirb/types';
import {
  IconChevronDown,
  IconSearch,
  IconUser,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../../../stores/use-store';
import { WebsiteStore } from '../../../../stores/website.store';
import { CommonTranslations } from '../../../../translations/common-translations';
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

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Check if cursor is inside our shortcut element
    const isInsideShortcut =
      ref.current.contains(range.startContainer) ||
      ref.current.contains(range.endContainer);

    if (!isInsideShortcut) return; // Handle special cases for better editing experience
    if (event.key === 'Backspace') {
      // Check if we're at the beginning of the editable content
      const isAtBeginning =
        range.collapsed &&
        range.startOffset === 0 &&
        (range.startContainer === ceEl ||
          ((range.startContainer.nodeType === Node.TEXT_NODE ||
            range.startContainer.nodeType === Node.ELEMENT_NODE) &&
            ceEl.contains(range.startContainer) &&
            range.startContainer.textContent === ''));

      const isRemovingLast =
        range.collapsed &&
        range.startOffset === 1 &&
        (range.startContainer === ceEl ||
          ((range.startContainer.nodeType === Node.TEXT_NODE ||
            range.startContainer.nodeType === Node.ELEMENT_NODE) &&
            ceEl.contains(range.startContainer) &&
            range.startContainer.textContent !== ''));
      if (isRemovingLast) {
        // If we're removing the last character, delete it manually and prevent escape
        event.preventDefault();

        // Manually remove the character
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const textNode = range.startContainer as Text;
          const currentText = textNode.textContent || '';
          const newText =
            currentText.slice(0, range.startOffset - 1) +
            currentText.slice(range.startOffset);
          textNode.textContent = newText;

          // Keep cursor at the same position (now at the end of remaining text)
          const newRange = document.createRange();
          newRange.setStart(textNode, Math.max(0, range.startOffset - 1));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        return; // Early return to prevent other logic from running
      }

      if (isAtBeginning) {
        event.preventDefault();
        // Move cursor to before the shortcut element
        const newRange = document.createRange();
        newRange.setStartBefore(ref.current);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else if (event.key === 'ArrowLeft') {
      // Check if we're at the very beginning of the editable content
      const isAtBeginning =
        range.collapsed &&
        range.startOffset === 0 &&
        (range.startContainer === ceEl ||
          (range.startContainer.nodeType === Node.TEXT_NODE &&
            ceEl.contains(range.startContainer) &&
            !range.startContainer.previousSibling));

      if (isAtBeginning) {
        event.preventDefault();
        // Move cursor to before the shortcut element
        const newRange = document.createRange();
        newRange.setStartBefore(ref.current);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
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
      <Badge
        variant="outline"
        radius="xs"
        tt="none"
        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
      >
        {el}
      </Badge>
    </span>
  );
}

export const InlineUsernameShortcut = createReactInlineContentSpec(
  {
    type: 'username',
    propSchema: {
      id: { default: Date.now().toString() },
      shortcut: { default: '' },
      only: { default: '' },
    },
    content: 'styled',
  },
  {
    render: (props) => {
      const editor = useBlockNoteEditor();
      const { state: websites } = useStore(WebsiteStore);

      // Popover state management
      const [opened, { open, close, toggle }] = useDisclosure(false);

      // Search state with debouncing for better performance
      const [searchTerm, setSearchTerm] = useState('');
      const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

      // Available website options
      const websiteOptions = useMemo(
        () => websites.map((w) => ({ value: w.id, label: w.displayName })),
        [websites],
      );

      // Filtered website options
      const filteredWebsiteOptions = useMemo(() => {
        if (!debouncedSearchTerm) return websiteOptions;
        return websiteOptions.filter((option) =>
          option.label
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()),
        );
      }, [websiteOptions, debouncedSearchTerm]);

      // Selected website IDs
      const selectedWebsiteIds = useMemo(() => {
        const onlyProp = props.inlineContent.props.only as string;
        return onlyProp ? onlyProp.split(',').filter(Boolean) : [];
      }, [props.inlineContent.props.only]);

      // Update selection helper
      const updateSelection = useCallback(
        (newOnlyValue: string) => {
          const { inline, block } = getMyInlineNode(
            editor,
            props.inlineContent.props.id,
          );

          if (inline) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (inline as Record<string, any>).props.only = newOnlyValue;
            editor.updateBlock(block.id, { content: block.content });
          }
        },
        [editor, props.inlineContent.props.id],
      );

      // Handle individual website selection
      const handleWebsiteToggle = useCallback(
        (websiteId: string) => {
          const newSelected = selectedWebsiteIds.includes(websiteId)
            ? selectedWebsiteIds.filter((id) => id !== websiteId)
            : [...selectedWebsiteIds, websiteId];

          updateSelection(newSelected.join(','));
        },
        [selectedWebsiteIds, updateSelection],
      );

      // Handle select all/none
      const handleSelectAll = useCallback(() => {
        const allIds = websiteOptions.map((opt) => opt.value);
        const isAllSelected = selectedWebsiteIds.length === allIds.length;
        updateSelection(isAllSelected ? '' : allIds.join(','));
      }, [websiteOptions, selectedWebsiteIds, updateSelection]); // Clear all selections
      const handleClearAll = useCallback(() => {
        updateSelection('');
      }, [updateSelection]);

      // Handle escape key to close popover
      useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
          if (event.key === 'Escape' && opened) {
            close();
          }
        };

        if (opened) {
          document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
          document.removeEventListener('keydown', handleEscapeKey);
        };
      }, [opened, close]);

      // Display text for selected websites
      const selectedDisplayText = useMemo(() => {
        if (selectedWebsiteIds.length === 0) {
          return <Trans>All Websites</Trans>;
        }

        if (selectedWebsiteIds.length === 1) {
          const website = websites.find((w) => w.id === selectedWebsiteIds[0]);
          return website?.displayName || <CommonTranslations.Unknown />;
        }

        const names = selectedWebsiteIds
          .map((id) => websites.find((w) => w.id === id)?.displayName)
          .filter(Boolean)
          .slice(0, 3); // Limit to 3 names for display
        if (selectedWebsiteIds.length <= 3) {
          return names.join(', ');
        }

        return `${names.join(', ')} + ${selectedWebsiteIds.length - 3}`;
      }, [selectedWebsiteIds, websites]);

      // Color logic for the badge
      const badgeColor = useMemo(() => {
        if (selectedWebsiteIds.length === 0) return 'gray';
        if (selectedWebsiteIds.length === websites.length) return 'green';
        return 'blue';
      }, [selectedWebsiteIds.length, websites.length]);

      const onStale = useCallback(() => {
        const { inline, block } = getMyInlineNode(
          editor,
          props.inlineContent.props.id,
        );
        if (inline) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (inline as any).content = [{ type: 'text', text: '', styles: {} }];
          editor.updateBlock(block.id, { content: block.content });
        }
      }, [editor, props.inlineContent.props.id]);

      return (
        <span
          className="username-shortcut"
          style={{ verticalAlign: 'text-bottom', position: 'relative' }}
        >
          <Badge
            className="username-shortcut-badge"
            variant="outline"
            contentEditable={false}
            radius="xs"
            tt="uppercase"
            size="sm"
            h="fit-content"
            style={{
              borderRight: 'none',
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            {props.inlineContent.props.shortcut}
            <span
              style={{
                paddingLeft: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              →
            </span>
            <Popover
              opened={opened}
              onClose={close}
              position="bottom-start"
              width={300}
              shadow="md"
              withArrow
              withinPortal
            >
              <Popover.Target>
                <Tooltip
                  label={<Trans>Select websites to apply usernames to</Trans>}
                  withArrow
                >
                  <Badge
                    variant="light"
                    size="sm"
                    color={badgeColor}
                    contentEditable={false}
                    radius="sm"
                    onClick={toggle}
                    pr={4}
                    pl={6}
                    style={{
                      cursor: 'pointer',
                      // eslint-disable-next-line lingui/no-unlocalized-strings
                      transition: 'all 0.2s ease',
                    }}
                    styles={{ root: { textTransform: 'none' } }}
                    rightSection={
                      <Box
                        ml={4}
                        style={{ display: 'flex', alignItems: 'center' }}
                      >
                        <IconChevronDown
                          size={12}
                          style={{
                            transform: opened
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                            // eslint-disable-next-line lingui/no-unlocalized-strings
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </Box>
                    }
                  >
                    {selectedDisplayText}
                  </Badge>
                </Tooltip>
              </Popover.Target>

              <Popover.Dropdown p={0}>
                <Stack gap="xs">
                  {/* Header */}
                  <Box>
                    <Group
                      align="apart"
                      p="xs"
                      style={{ alignItems: 'center' }}
                    >
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color="blue">
                          <IconWorld size={14} />
                        </ThemeIcon>
                        <Text size="sm" fw={600}>
                          <Trans>Websites</Trans>
                        </Text>
                      </Group>
                      <Badge size="xs" variant="filled" color={badgeColor}>
                        {selectedWebsiteIds.length === 0 ? (
                          <Trans>All</Trans>
                        ) : (
                          `${selectedWebsiteIds.length}/${websites.length}`
                        )}
                      </Badge>
                    </Group>

                    <Divider />
                  </Box>

                  {/* Search */}
                  <Box p="sm" py={0}>
                    <TextInput
                      leftSection={<IconSearch size={14} />}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      size="xs"
                      rightSection={
                        searchTerm ? (
                          <UnstyledButton onClick={() => setSearchTerm('')}>
                            <IconX size={14} />
                          </UnstyledButton>
                        ) : null
                      }
                    />
                  </Box>

                  {/* Action buttons */}
                  <Box px="sm" pb="0">
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        color="blue"
                        onClick={handleSelectAll}
                        style={{ flex: 1 }}
                      >
                        {selectedWebsiteIds.length === websites.length ? (
                          <Trans>Deselect All</Trans>
                        ) : (
                          <Trans>Select All</Trans>
                        )}
                      </Button>
                    </Group>
                  </Box>

                  <Divider />

                  {/* Website list */}
                  <Box style={{ maxHeight: '200px', overflow: 'auto' }}>
                    {filteredWebsiteOptions.length > 0 ? (
                      <Stack gap={0} p="xs">
                        {filteredWebsiteOptions.map((option) => {
                          const isSelected = selectedWebsiteIds.includes(
                            option.value,
                          );
                          return (
                            <UnstyledButton
                              className="only-website-toggle-btn"
                              key={option.value}
                              onClick={() => handleWebsiteToggle(option.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: 'var(--mantine-radius-sm)',
                                // eslint-disable-next-line lingui/no-unlocalized-strings
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              <Group gap="sm" wrap="nowrap">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by button click
                                  size="xs"
                                  color="blue"
                                  styles={{ input: { cursor: 'pointer' } }}
                                />
                                <Text
                                  size="sm"
                                  style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                  }}
                                  fw={isSelected ? 500 : 400}
                                  c={isSelected ? 'blue' : undefined}
                                >
                                  {option.label}
                                </Text>
                              </Group>
                            </UnstyledButton>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Box p="md">
                        <Text ta="center" c="dimmed" size="sm">
                          <CommonTranslations.NoItemsFound />
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Badge>

          <Shortcut item={props.contentRef} onStale={onStale} />
        </span>
      );
    },
  },
);

export const getUsernameShortcutsMenuItems = (
  editor: BlockNoteEditor,
  shortcuts: UsernameShortcut[],
): DefaultReactSuggestionItem[] =>
  shortcuts.map((sc) => ({
    title: sc.id,
    icon: <IconUser size={16} />,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: 'username',
          props: { id: Date.now().toString(), shortcut: sc.id, only: '' },
          content: 'username',
        } as never,
        ' ', // add a space after the shortcut
      ]);
    },
    // eslint-disable-next-line lingui/no-unlocalized-strings
    group: 'Username Shortcuts',
  }));
