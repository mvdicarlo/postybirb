/* eslint-disable consistent-return */
/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
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
import {
    IconArrowRight,
    IconChevronDown,
    IconSearch,
    IconWorld,
    IconX,
} from '@tabler/icons-react';
import { mergeAttributes, Node } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWebsites } from '../../../../stores';

/**
 * React component rendered inside the editor for the UsernameShortcut inline node.
 * Features:
 * - Two-part badge: left side shows shortcut name + website selector, right side has editable username input
 * - Arrow key navigation between editor and input field
 * - Inline website selection popover with search
 */
function UsernameShortcutView({
  node,
  updateAttributes,
  editor: tiptapEditor,
}: {
  node: { attrs: { shortcut: string; only: string; username: string } };
  updateAttributes: (attrs: Record<string, unknown>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
}) {
  const websites = useWebsites();

  const shortcutName = node.attrs.shortcut;
  const onlyProp = node.attrs.only;
  const usernameProp = node.attrs.username;

  // Ref for the input element
  const inputRef = useRef<HTMLInputElement>(null);

  // Local state for the username input (controlled)
  const [usernameValue, setUsernameValue] = useState(usernameProp);

  // Sync local username state when props change (e.g., undo/redo)
  useEffect(() => {
    setUsernameValue(usernameProp);
  }, [usernameProp]);

  // Arrow key navigation: listen for adjacency to this node
  useEffect(() => {
    const pmView = tiptapEditor?.view;
    if (!pmView) return;

    let isAdjacentRef: 'before' | 'after' | null = null;

    const checkAdjacency = () => {
      const { state } = pmView;
      const { selection } = state;

      if (!selection.empty) {
        isAdjacentRef = null;
        return;
      }

      const pos = selection.from;
      const $pos = state.doc.resolve(pos);

      // Check node before cursor
      if (pos > 0) {
        const nodeBefore = state.doc.nodeAt(pos - 1);
        if (nodeBefore?.type.name === 'username' && nodeBefore.attrs.shortcut === shortcutName) {
          isAdjacentRef = 'after';
          return;
        }
      }

      // Check node after cursor
      const nodeAfter = state.doc.nodeAt(pos);
      if (nodeAfter?.type.name === 'username' && nodeAfter.attrs.shortcut === shortcutName) {
        isAdjacentRef = 'before';
        return;
      }

      isAdjacentRef = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;

      if (e.key === 'ArrowRight' && isAdjacentRef === 'before') {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(0, 0);
      } else if (e.key === 'ArrowLeft' && isAdjacentRef === 'after') {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
        const len = inputRef.current?.value.length || 0;
        inputRef.current?.setSelectionRange(len, len);
      }
    };

    // ProseMirror update handler to check adjacency on selection changes
    const origDispatch = pmView.dispatch.bind(pmView);
    // We use a simpler approach: check on each transaction
    const onTransaction = () => {
      checkAdjacency();
    };

    // Listen to editor updates
    tiptapEditor.on('selectionUpdate', onTransaction);
    checkAdjacency();

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      tiptapEditor.off('selectionUpdate', onTransaction);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [tiptapEditor, shortcutName]);

  // Popover state management for website selection
  const [opened, { close, toggle }] = useDisclosure(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

  // Local state for selected website IDs
  const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<string[]>(
    () => (onlyProp ? onlyProp.split(',').filter(Boolean) : []),
  );

  useEffect(() => {
    const propsIds = onlyProp ? onlyProp.split(',').filter(Boolean) : [];
    setSelectedWebsiteIds(propsIds);
  }, [onlyProp]);

  const websiteOptions = useMemo(
    () => websites.map((w) => ({ value: w.id, label: w.displayName })),
    [websites],
  );

  const filteredWebsiteOptions = useMemo(() => {
    if (!debouncedSearchTerm) return websiteOptions;
    return websiteOptions.filter((option) =>
      option.label.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
    );
  }, [websiteOptions, debouncedSearchTerm]);

  // Commit username changes via TipTap's updateAttributes
  const commitUsername = useCallback(
    (value: string) => {
      if (value !== usernameProp) {
        updateAttributes({ username: value });
      }
    },
    [usernameProp, updateAttributes],
  );

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setUsernameValue(newValue);
      commitUsername(newValue);
    },
    [commitUsername],
  );

  const handleUsernameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();

      const input = e.target as HTMLInputElement;
      const { selectionStart, selectionEnd, value } = input;
      const isAtStart = selectionStart === 0 && selectionEnd === 0;
      const isAtEnd = selectionStart === value.length && selectionEnd === value.length;

      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setUsernameValue(usernameProp);
        commitUsername(usernameProp);
        input.blur();
      } else if (e.key === 'ArrowLeft' && isAtStart) {
        e.preventDefault();
        input.blur();
        const pmView = tiptapEditor?.view;
        if (pmView) {
          const { state } = pmView;
          state.doc.descendants((docNode: { type: { name: string }; attrs: { shortcut: string } }, pos: number) => {
            if (docNode.type.name === 'username' && docNode.attrs.shortcut === shortcutName) {
              const tr = state.tr.setSelection(Selection.near(state.doc.resolve(pos)));
              pmView.dispatch(tr);
              pmView.focus();
              return false;
            }
            return true;
          });
        }
      } else if (e.key === 'ArrowRight' && isAtEnd) {
        e.preventDefault();
        input.blur();
        const pmView = tiptapEditor?.view;
        if (pmView) {
          const { state } = pmView;
          state.doc.descendants((docNode: { type: { name: string }; attrs: { shortcut: string }; nodeSize: number }, pos: number) => {
            if (docNode.type.name === 'username' && docNode.attrs.shortcut === shortcutName) {
              const tr = state.tr.setSelection(Selection.near(state.doc.resolve(pos + docNode.nodeSize)));
              pmView.dispatch(tr);
              pmView.focus();
              return false;
            }
            return true;
          });
        }
      }
    },
    [usernameProp, commitUsername, tiptapEditor, shortcutName],
  );

  const handleInputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.focus();
  }, []);

  const updateWebsiteSelection = useCallback(
    (newOnlyValue: string) => {
      const newIds = newOnlyValue ? newOnlyValue.split(',').filter(Boolean) : [];
      setSelectedWebsiteIds(newIds);
      updateAttributes({ only: newOnlyValue });
    },
    [updateAttributes],
  );

  const handleWebsiteToggle = useCallback(
    (websiteId: string) => {
      const newSelected = selectedWebsiteIds.includes(websiteId)
        ? selectedWebsiteIds.filter((id) => id !== websiteId)
        : [...selectedWebsiteIds, websiteId];
      updateWebsiteSelection(newSelected.join(','));
    },
    [selectedWebsiteIds, updateWebsiteSelection],
  );

  const handleSelectAll = useCallback(() => {
    const allIds = websiteOptions.map((opt) => opt.value);
    const isAllSelected = selectedWebsiteIds.length === allIds.length;
    updateWebsiteSelection(isAllSelected ? '' : allIds.join(','));
  }, [websiteOptions, selectedWebsiteIds, updateWebsiteSelection]);

  const selectedDisplayText = useMemo(() => {
    if (selectedWebsiteIds.length === 0) {
      return <Trans>All Websites</Trans>;
    }
    if (selectedWebsiteIds.length === 1) {
      const website = websites.find((w) => w.id === selectedWebsiteIds[0]);
      return website?.displayName || <Trans>Unknown</Trans>;
    }
    const names = selectedWebsiteIds
      .map((id) => websites.find((w) => w.id === id)?.displayName)
      .filter(Boolean)
      .slice(0, 3);
    if (selectedWebsiteIds.length <= 3) return names.join(', ');
    return `${names.join(', ')} + ${selectedWebsiteIds.length - 3}`;
  }, [selectedWebsiteIds, websites]);

  const badgeColor = useMemo(() => {
    if (selectedWebsiteIds.length === 0) return 'gray';
    if (selectedWebsiteIds.length === websites.length) return 'green';
    return 'blue';
  }, [selectedWebsiteIds.length, websites.length]);

  return (
    <NodeViewWrapper as="span" className="username-shortcut" style={{ verticalAlign: 'text-bottom', position: 'relative' }}>
      <Badge
        className="username-shortcut-badge"
        variant="light"
        contentEditable={false}
        radius="xl"
        tt="none"
        size="sm"
        styles={{ label: { display: 'flex', alignItems: 'center', gap: 4 } }}
      >
        <span style={{ fontWeight: 600 }}>{shortcutName}</span>
        <IconArrowRight size={12} style={{ opacity: 0.5 }} />
        <Popover
          opened={opened}
          onChange={(isOpen) => { if (!isOpen) close(); }}
          position="bottom-start"
          width={300}
          shadow="md"
          withArrow
          withinPortal
        >
          <Popover.Target>
            <Tooltip label={<Trans>Select websites to apply usernames to</Trans>} withArrow>
              <Box
                component="span"
                className="only-website-selector"
                contentEditable={false}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  toggle();
                }}
                style={{
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '0 2px',
                  borderRadius: 'var(--mantine-radius-sm)',
                  transition: 'background-color 0.15s ease',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                <Text span inherit size="xs" style={{ lineHeight: 1 }}>
                  {selectedDisplayText}
                </Text>
                <IconChevronDown
                  size={10}
                  style={{
                    transform: opened ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    opacity: 0.7,
                  }}
                />
              </Box>
            </Tooltip>
          </Popover.Target>

          <Popover.Dropdown p={0} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}>
            <Stack gap="xs">
              <Box>
                <Group align="apart" p="xs" style={{ alignItems: 'center' }}>
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="blue">
                      <IconWorld size={14} />
                    </ThemeIcon>
                    <Text size="sm" fw={600}><Trans>Websites</Trans></Text>
                  </Group>
                  <Badge size="xs" variant="filled" color={badgeColor}>
                    {selectedWebsiteIds.length === 0 ? <Trans>All</Trans> : `${selectedWebsiteIds.length} / ${websites.length}`}
                  </Badge>
                </Group>
                <Divider />
              </Box>

              <Box p="sm" py={0}>
                <TextInput
                  leftSection={<IconSearch size={14} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="xs"
                  rightSection={searchTerm ? <UnstyledButton onClick={() => setSearchTerm('')}><IconX size={14} /></UnstyledButton> : null}
                />
              </Box>

              <Box px="sm" pb="0">
                <Group gap="xs">
                  <Button size="xs" variant="light" color="blue" onClick={handleSelectAll} style={{ flex: 1 }}>
                    {selectedWebsiteIds.length === websites.length ? <Trans>Deselect All</Trans> : <Trans>Select All</Trans>}
                  </Button>
                </Group>
              </Box>

              <Divider />

              <Box style={{ maxHeight: '200px', overflow: 'auto' }}>
                {filteredWebsiteOptions.length > 0 ? (
                  <Stack gap={0} p="xs">
                    {filteredWebsiteOptions.map((option) => {
                      const isSelected = selectedWebsiteIds.includes(option.value);
                      return (
                        <UnstyledButton
                          className="only-website-toggle-btn"
                          key={option.value}
                          onClick={() => handleWebsiteToggle(option.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: 'var(--mantine-radius-sm)',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <Group gap="sm" wrap="nowrap">
                            <Checkbox checked={isSelected} onChange={() => {}} size="xs" color="blue" styles={{ input: { cursor: 'pointer' } }} />
                            <Text
                              size="sm"
                              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
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
                    <Text ta="center" c="dimmed" size="sm"><Trans>No items found</Trans></Text>
                  </Box>
                )}
              </Box>
            </Stack>
          </Popover.Dropdown>
        </Popover>

        <span
          className="username-shortcut-separator"
          contentEditable={false}
        />
        <input
          ref={inputRef}
          type="text"
          className="username-shortcut-input"
          value={usernameValue}
          onChange={handleUsernameChange}
          onKeyDown={handleUsernameKeyDown}
          onClick={handleInputClick}
          placeholder="username"
        />
      </Badge>
    </NodeViewWrapper>
  );
}

/**
 * TipTap Node extension for the Username shortcut inline node.
 * Most complex custom node — features an editable username input and website selector.
 */
export const UsernameShortcutExtension = Node.create({
  name: 'username',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      shortcut: { default: '' },
      only: { default: '' },
      username: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="username"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'username' })];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(UsernameShortcutView as any);
  },

  addCommands() {
    return {
      insertUsernameShortcut:
        (attrs: { shortcut: string; only?: string; username?: string }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: { commands: any }) => {
          return commands.insertContent([
            {
              type: this.name,
              attrs: {
                shortcut: attrs.shortcut,
                only: attrs.only ?? '',
                username: attrs.username ?? '',
              },
            },
            { type: 'text', text: ' ' },
          ]);
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});
