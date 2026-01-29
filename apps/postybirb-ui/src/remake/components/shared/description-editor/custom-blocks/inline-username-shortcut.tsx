import { BlockNoteEditor } from '@blocknote/core';
import {
  DefaultReactSuggestionItem,
  createReactInlineContentSpec,
  useBlockNoteEditor,
} from '@blocknote/react';
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
import { UsernameShortcut } from '@postybirb/types';
import {
  IconChevronDown,
  IconSearch,
  IconUser,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { Selection } from '@tiptap/pm/state';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWebsites } from '../../../../stores';
import './shortcut.css';

export const InlineUsernameShortcut = createReactInlineContentSpec(
  {
    type: 'username',
    propSchema: {
      id: { default: '' },
      shortcut: { default: '' },
      only: { default: '' },
      username: { default: '' },
    },
    // Using 'none' with updateInlineContent for reliable updates via ProseMirror transactions
    content: 'none',
  },
  {
    render: (props) => {
      const editor = useBlockNoteEditor();
      const websites = useWebsites();

      const inlineId = props.inlineContent.props.id as string;
      const shortcutName = props.inlineContent.props.shortcut as string;
      const onlyProp = props.inlineContent.props.only as string;
      const usernameProp = props.inlineContent.props.username as string;

      // Ref for the input element
      const inputRef = useRef<HTMLInputElement>(null);
      // Ref to track if we're adjacent to this node (for arrow key navigation)
      const isAdjacentRef = useRef<'before' | 'after' | null>(null);

      // Local state for the username input (controlled)
      const [usernameValue, setUsernameValue] = useState(usernameProp);

      // Sync local username state when props change (e.g., undo/redo)
      useEffect(() => {
        setUsernameValue(usernameProp);
      }, [usernameProp]);

      // Hack: Listen for arrow keys when cursor is adjacent to this node
      useEffect(() => {
        const pmView = editor.prosemirrorView;
        if (!pmView) return;

        // Check if selection is adjacent to our node
        const checkAdjacency = () => {
          const { state } = pmView;
          const { selection } = state;
          
          if (!selection.empty) {
            isAdjacentRef.current = null;
            return;
          }

          const pos = selection.from;
          const $pos = state.doc.resolve(pos);
          
          // Check node before cursor
          if (pos > 0) {
            const nodeBefore = state.doc.nodeAt(pos - 1);
            if (nodeBefore?.type.name === 'username' && nodeBefore.attrs.id === inlineId) {
              isAdjacentRef.current = 'after';
              return;
            }
          }
          
          // Check node after cursor
          const nodeAfter = state.doc.nodeAt(pos);
          if (nodeAfter?.type.name === 'username' && nodeAfter.attrs.id === inlineId) {
            isAdjacentRef.current = 'before';
            return;
          }

          isAdjacentRef.current = null;
        };

        // Handle keydown for arrow key navigation into the input
        const handleKeyDown = (e: KeyboardEvent) => {
          // If input is focused, let arrow keys work naturally within it
          if (document.activeElement === inputRef.current) {
            return;
          }

          if (e.key === 'ArrowRight' && isAdjacentRef.current === 'before') {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current?.focus();
            // Place cursor at start
            inputRef.current?.setSelectionRange(0, 0);
          } else if (e.key === 'ArrowLeft' && isAdjacentRef.current === 'after') {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current?.focus();
            // Place cursor at end
            const len = inputRef.current?.value.length || 0;
            inputRef.current?.setSelectionRange(len, len);
          }
        };

        // Subscribe to selection changes
        const unsubscribe = editor.onSelectionChange(() => {
          checkAdjacency();
        });

        // Initial check
        checkAdjacency();

        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
          unsubscribe();
          document.removeEventListener('keydown', handleKeyDown, true);
        };
      }, [editor, inlineId]);

      // Popover state management for website selection
      const [opened, { close, toggle }] = useDisclosure(false);

      // Search state with debouncing for website filter
      const [searchTerm, setSearchTerm] = useState('');
      const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

      // Local state for selected website IDs
      const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<string[]>(
        () => (onlyProp ? onlyProp.split(',').filter(Boolean) : [])
      );

      // Sync local website selection state when props change
      useEffect(() => {
        const propsIds = onlyProp ? onlyProp.split(',').filter(Boolean) : [];
        setSelectedWebsiteIds(propsIds);
      }, [onlyProp]);

      // Available website options
      const websiteOptions = useMemo(
        () => websites.map((w) => ({ value: w.id, label: w.displayName })),
        [websites]
      );

      // Filtered website options based on search
      const filteredWebsiteOptions = useMemo(() => {
        if (!debouncedSearchTerm) return websiteOptions;
        return websiteOptions.filter((option) =>
          option.label.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
      }, [websiteOptions, debouncedSearchTerm]);

      // Commit username changes using BlockNote's updateInlineContent (proper ProseMirror transactions)
      const commitUsername = useCallback(
        (value: string) => {
          if (value !== usernameProp) {
            props.updateInlineContent({
              ...props.inlineContent,
              props: {
                ...props.inlineContent.props,
                username: value,
              },
            });
          }
        },
        [usernameProp, props]
      );

      // Handle username input change - update local state and commit immediately
      const handleUsernameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          const newValue = e.target.value;
          setUsernameValue(newValue);
          commitUsername(newValue);
        },
        [commitUsername]
      );

      // Handle username input keydown
      const handleUsernameKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
          // Prevent BlockNote from handling these keys while in input
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
            // Move cursor to before this node in the editor
            e.preventDefault();
            input.blur();
            const pmView = editor.prosemirrorView;
            if (pmView) {
              const { state } = pmView;
              // Find our node and position cursor before it
              state.doc.descendants((node, pos) => {
                if (node.type.name === 'username' && node.attrs.id === inlineId) {
                  const tr = state.tr.setSelection(
                    Selection.near(state.doc.resolve(pos))
                  );
                  pmView.dispatch(tr);
                  pmView.focus();
                  return false;
                }
                return true;
              });
            }
          } else if (e.key === 'ArrowRight' && isAtEnd) {
            // Move cursor to after this node in the editor
            e.preventDefault();
            input.blur();
            const pmView = editor.prosemirrorView;
            if (pmView) {
              const { state } = pmView;
              // Find our node and position cursor after it
              state.doc.descendants((node, pos) => {
                if (node.type.name === 'username' && node.attrs.id === inlineId) {
                  const tr = state.tr.setSelection(
                    Selection.near(state.doc.resolve(pos + node.nodeSize))
                  );
                  pmView.dispatch(tr);
                  pmView.focus();
                  return false;
                }
                return true;
              });
            }
          }
        },
        [usernameProp, commitUsername, editor, inlineId]
      );

      // Handle click on the input to focus it
      const handleInputClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        inputRef.current?.focus();
      }, []);

      // Update website selection using updateInlineContent
      const updateWebsiteSelection = useCallback(
        (newOnlyValue: string) => {
          const newIds = newOnlyValue
            ? newOnlyValue.split(',').filter(Boolean)
            : [];
          setSelectedWebsiteIds(newIds);
          props.updateInlineContent({
            ...props.inlineContent,
            props: {
              ...props.inlineContent.props,
              only: newOnlyValue,
            },
          });
        },
        [props]
      );

      // Handle individual website toggle
      const handleWebsiteToggle = useCallback(
        (websiteId: string) => {
          const newSelected = selectedWebsiteIds.includes(websiteId)
            ? selectedWebsiteIds.filter((id) => id !== websiteId)
            : [...selectedWebsiteIds, websiteId];
          updateWebsiteSelection(newSelected.join(','));
        },
        [selectedWebsiteIds, updateWebsiteSelection]
      );

      // Handle select all / deselect all
      const handleSelectAll = useCallback(() => {
        const allIds = websiteOptions.map((opt) => opt.value);
        const isAllSelected = selectedWebsiteIds.length === allIds.length;
        updateWebsiteSelection(isAllSelected ? '' : allIds.join(','));
      }, [websiteOptions, selectedWebsiteIds, updateWebsiteSelection]);

      // Display text for selected websites
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
        if (selectedWebsiteIds.length <= 3) {
          return names.join(', ');
        }

        return `${names.join(', ')} + ${selectedWebsiteIds.length - 3}`;
      }, [selectedWebsiteIds, websites]);

      // Color logic for the website badge
      const badgeColor = useMemo(() => {
        if (selectedWebsiteIds.length === 0) return 'gray';
        if (selectedWebsiteIds.length === websites.length) return 'green';
        return 'blue';
      }, [selectedWebsiteIds.length, websites.length]);

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
            {shortcutName}
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
              onChange={(isOpen) => {
                if (!isOpen) close();
              }}
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
                          `${selectedWebsiteIds.length} / ${websites.length}`
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
                            option.value
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
                          <Trans>No items found</Trans>
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Badge>

          {/* Username input - using controlled input with updateInlineContent */}
          <Badge
            variant="outline"
            radius="xs"
            tt="none"
            size="sm"
            h="fit-content"
            className="username-shortcut-content-badge"
            px={0}
            style={{
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          >
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
        </span>
      );
    },
  }
);

export function getUsernameShortcutsMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  shortcuts: UsernameShortcut[]
): DefaultReactSuggestionItem[] {
  return shortcuts.map((sc) => ({
    title: sc.id,
    icon: <IconUser size={16} />,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: 'username',
          props: {
            id: Date.now().toString(),
            shortcut: sc.id,
            only: '',
            username: '',
          },
        } as never,
        ' ',
      ]);
    },
    // eslint-disable-next-line lingui/no-unlocalized-strings
    group: 'Username Shortcuts',
  }));
}
