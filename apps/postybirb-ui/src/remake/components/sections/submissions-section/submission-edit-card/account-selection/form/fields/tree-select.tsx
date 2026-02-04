/**
 * TreeSelect - A dropdown select with hierarchical tree structure.
 * Uses Mantine Tree, Popover, and Checkbox components.
 * Supports single/multi-select, search, keyboard navigation, and mutually exclusive options.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    Checkbox,
    Group,
    InputBase,
    Popover,
    ScrollArea,
    Text,
    TextInput,
    Tree,
    TreeNodeData,
    useTree,
} from '@mantine/core';
import { SelectOption } from '@postybirb/form-builder';
import {
    IconChevronDown,
    IconSearch,
    IconX,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    countSelectableOptions,
    filterOptions,
    flattenSelectableOptions,
    getSelectedOptions,
    handleMutuallyExclusiveSelection,
    isOptionGroup,
} from './select-utils';

const SEARCH_THRESHOLD = 7;

interface TreeSelectProps {
  options: SelectOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: React.ReactNode;
  disabled?: boolean;
  clearable?: boolean;
  error?: boolean;
}

export function TreeSelect({
  options,
  value,
  onChange,
  multiple = false,
  placeholder,
  disabled = false,
  clearable = true,
  error = false,
}: TreeSelectProps) {
  const [opened, setOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const defaultPlaceholder = <Trans>Select...</Trans>;
  const displayPlaceholder = placeholder ?? defaultPlaceholder;

  const selectedValues = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );

  const selectedOptions = useMemo(
    () => getSelectedOptions(value, options),
    [value, options],
  );

  const enableSearch = countSelectableOptions(options) >= SEARCH_THRESHOLD;

  const filteredOptions = useMemo(
    () => (searchQuery.trim() ? filterOptions(options, searchQuery) : options),
    [options, searchQuery],
  );

  const flatSelectableOptions = useMemo(
    () => flattenSelectableOptions(filteredOptions),
    [filteredOptions],
  );

  // Display text for the trigger
  const displayText = useMemo(() => {
    if (selectedOptions.length === 0) return displayPlaceholder;
    if (multiple && selectedOptions.length > 2) {
      return <Trans>{selectedOptions.length} selected</Trans>;
    }
    return selectedOptions.map((opt) => opt.label).join(', ');
  }, [selectedOptions, displayPlaceholder, multiple]);

  // Handle option selection
  const handleOptionClick = useCallback(
    (optionValue: string) => {
      if (disabled) return;

      const option = flattenSelectableOptions(options).find(
        (o) => o.value === optionValue,
      );
      if (!option) return;

      if (multiple) {
        const isSelected = selectedValues.includes(optionValue);
        let newValues: string[];

        if (isSelected) {
          // Remove the option
          newValues = selectedValues.filter((v) => v !== optionValue);
        } else {
          // Add with mutually exclusive handling
          newValues = handleMutuallyExclusiveSelection(
            selectedValues,
            option,
            options,
          );
        }
        onChange(newValues);
      } else {
        // Single select: toggle or select new
        const newValue = selectedValues.includes(optionValue) ? '' : optionValue;
        onChange(newValue);
        setOpened(false);
        setSearchQuery('');
      }
    },
    [disabled, multiple, selectedValues, options, onChange],
  );

  // Handle clear
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      onChange(multiple ? [] : '');
    },
    [disabled, multiple, onChange],
  );

  // Build tree data
  const buildTreeData = useCallback(
    (opts: SelectOption[], depth = 0): TreeNodeData[] =>
      opts.map((option) => {
        if (isOptionGroup(option)) {
          const groupValue = option.value;
          const isSelectable = groupValue !== undefined;
          const isSelected = isSelectable && selectedValues.includes(groupValue);
          const isFocused = isSelectable && focusedValue === groupValue;

          return {
            value: isSelectable ? groupValue : `group-${option.label}-${depth}`,
            label: (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{ width: '100%' }}
                bg={isFocused ? 'var(--mantine-color-blue-light)' : undefined}
              >
                {isSelectable && (
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleOptionClick(groupValue)}
                    onClick={(e) => e.stopPropagation()}
                    size="xs"
                  />
                )}
                <Text size="sm" fw={500} style={{ flex: 1 }}>
                  {option.label}
                </Text>
              </Group>
            ),
            children: buildTreeData(option.items, depth + 1),
          };
        }

        const isSelected = selectedValues.includes(option.value);
        const isFocused = focusedValue === option.value;

        return {
          value: option.value,
          label: (
            <Group
              gap="xs"
              wrap="nowrap"
              style={{ width: '100%' }}
              bg={isFocused ? 'var(--mantine-color-blue-light)' : undefined}
            >
              {multiple ? (
                <Checkbox
                  checked={isSelected}
                  onChange={() => handleOptionClick(option.value)}
                  onClick={(e) => e.stopPropagation()}
                  size="xs"
                />
              ) : null}
              <Text
                size="sm"
                style={{ flex: 1 }}
                fw={isSelected && !multiple ? 500 : undefined}
                c={isSelected && !multiple ? 'blue' : undefined}
              >
                {option.label}
              </Text>
            </Group>
          ),
        };
      }),
    [selectedValues, focusedValue, multiple, handleOptionClick],
  );

  const treeData = useMemo(
    () => buildTreeData(filteredOptions),
    [buildTreeData, filteredOptions],
  );

  const tree = useTree({
    initialExpandedState: treeData.reduce(
      (acc, node) => ({ ...acc, [node.value]: true }),
      {} as Record<string, boolean>,
    ),
  });

  // Keep all nodes expanded when tree data changes
  useEffect(() => {
    const expandAll = (nodes: TreeNodeData[]): Record<string, boolean> => {
      const state: Record<string, boolean> = {};
      for (const node of nodes) {
        state[node.value] = true;
        if (node.children) {
          Object.assign(state, expandAll(node.children));
        }
      }
      return state;
    };
    tree.setExpandedState(expandAll(treeData));
  }, [treeData, tree]);

  // Focus search or dropdown when opened
  useEffect(() => {
    if (opened) {
      if (enableSearch) {
        setTimeout(() => searchRef.current?.focus(), 0);
      } else {
        setTimeout(() => dropdownRef.current?.focus(), 0);
      }
    }
  }, [opened, enableSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (opened && focusedValue) {
            handleOptionClick(focusedValue);
          } else if (!opened) {
            setOpened(true);
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (!opened) {
            setOpened(true);
          } else {
            const currentIndex = flatSelectableOptions.findIndex(
              (o) => o.value === focusedValue,
            );
            const nextIndex =
              currentIndex < flatSelectableOptions.length - 1
                ? currentIndex + 1
                : 0;
            setFocusedValue(flatSelectableOptions[nextIndex]?.value ?? null);
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (opened) {
            const currentIndex = flatSelectableOptions.findIndex(
              (o) => o.value === focusedValue,
            );
            const prevIndex =
              currentIndex > 0
                ? currentIndex - 1
                : flatSelectableOptions.length - 1;
            setFocusedValue(flatSelectableOptions[prevIndex]?.value ?? null);
          }
          break;

        case 'Escape':
          setOpened(false);
          setSearchQuery('');
          setFocusedValue(null);
          triggerRef.current?.focus();
          break;

        case 'Tab':
          setOpened(false);
          setSearchQuery('');
          setFocusedValue(null);
          break;

        case 'Home':
          event.preventDefault();
          if (opened && flatSelectableOptions.length > 0) {
            setFocusedValue(flatSelectableOptions[0].value);
          }
          break;

        case 'End':
          event.preventDefault();
          if (opened && flatSelectableOptions.length > 0) {
            setFocusedValue(
              flatSelectableOptions[flatSelectableOptions.length - 1].value,
            );
          }
          break;

        default:
          // Type to search
          if (
            !opened &&
            enableSearch &&
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            setOpened(true);
            setSearchQuery(event.key);
            setTimeout(() => searchRef.current?.focus(), 0);
          }
      }
    },
    [
      disabled,
      opened,
      focusedValue,
      flatSelectableOptions,
      enableSearch,
      handleOptionClick,
    ],
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (flatSelectableOptions.length > 0) {
            const currentIndex = flatSelectableOptions.findIndex(
              (o) => o.value === focusedValue,
            );
            const nextIndex =
              currentIndex < flatSelectableOptions.length - 1
                ? currentIndex + 1
                : 0;
            setFocusedValue(flatSelectableOptions[nextIndex]?.value ?? null);
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (flatSelectableOptions.length > 0) {
            const currentIndex = flatSelectableOptions.findIndex(
              (o) => o.value === focusedValue,
            );
            const prevIndex =
              currentIndex > 0
                ? currentIndex - 1
                : flatSelectableOptions.length - 1;
            setFocusedValue(flatSelectableOptions[prevIndex]?.value ?? null);
          }
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedValue) {
            handleOptionClick(focusedValue);
          }
          break;

        case 'Escape':
          event.preventDefault();
          setOpened(false);
          setSearchQuery('');
          setFocusedValue(null);
          triggerRef.current?.focus();
          break;

        default:
          // Let other keys pass through for typing
          break;
      }
    },
    [focusedValue, flatSelectableOptions, handleOptionClick],
  );

  // Handle keyboard events on the dropdown when search is not enabled
  const handleDropdownKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (flatSelectableOptions.length > 0) {
            const currentIndex = flatSelectableOptions.findIndex(
              (o) => o.value === focusedValue,
            );
            const nextIndex =
              currentIndex < flatSelectableOptions.length - 1
                ? currentIndex + 1
                : 0;
            setFocusedValue(flatSelectableOptions[nextIndex]?.value ?? null);
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (flatSelectableOptions.length > 0) {
            const currentIndex = flatSelectableOptions.findIndex(
              (o) => o.value === focusedValue,
            );
            const prevIndex =
              currentIndex > 0
                ? currentIndex - 1
                : flatSelectableOptions.length - 1;
            setFocusedValue(flatSelectableOptions[prevIndex]?.value ?? null);
          }
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedValue) {
            handleOptionClick(focusedValue);
          }
          break;

        case 'Escape':
          event.preventDefault();
          setOpened(false);
          setSearchQuery('');
          setFocusedValue(null);
          triggerRef.current?.focus();
          break;

        default:
          break;
      }
    },
    [focusedValue, flatSelectableOptions, handleOptionClick],
  );

  const chevronStyles: React.CSSProperties = {
    color: 'var(--mantine-color-dimmed)',
    transform: opened ? 'rotate(180deg)' : 'rotate(0deg)',
    // eslint-disable-next-line lingui/no-unlocalized-strings
    transition: 'transform 200ms ease',
  };

  const nodeStyles: React.CSSProperties = {
    padding: 'var(--mantine-spacing-xs)',
    cursor: 'pointer',
  };

  const expandIconStyles = (expanded: boolean): React.CSSProperties => ({
    transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
    // eslint-disable-next-line lingui/no-unlocalized-strings
    transition: 'transform 150ms ease',
  });

  const rightSection = (
    <Group gap={4} wrap="nowrap">
      {clearable && selectedOptions.length > 0 && (
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={handleClear}
        >
          <IconX size={14} />
        </ActionIcon>
      )}
      <IconChevronDown size={16} style={chevronStyles} />
    </Group>
  );

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width="target"
      position="bottom-start"
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        <InputBase
          ref={triggerRef}
          component="button"
          type="button"
          pointer
          role="combobox"
          aria-expanded={opened}
          aria-haspopup="listbox"
          disabled={disabled}
          error={error}
          onClick={() => !disabled && setOpened(!opened)}
          onKeyDown={handleKeyDown}
          rightSection={rightSection}
          rightSectionPointerEvents="auto"
        >
          <Text
            size="sm"
            c={selectedOptions.length === 0 ? 'dimmed' : undefined}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayText}
          </Text>
        </InputBase>
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Box
          ref={dropdownRef}
          tabIndex={enableSearch ? -1 : 0}
          onKeyDown={enableSearch ? undefined : handleDropdownKeyDown}
          style={{ outline: 'none' }}
        >
          {enableSearch && (
            <Box p="xs" pb={0} mb="xs">
              <TextInput
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.currentTarget.value);
                  setFocusedValue(null);
                }}
                onKeyDown={handleSearchKeyDown}
                size="xs"
                leftSection={<IconSearch size={14} />}
              />
            </Box>
          )}

          <ScrollArea.Autosize mah={250} type="auto">
            {treeData.length > 0 ? (
              <Tree
                tree={tree}
                data={treeData}
                renderNode={({ node, expanded, hasChildren, elementProps }) => (
                  <Group
                    gap={4}
                    wrap="nowrap"
                    style={nodeStyles}
                    onClick={() => {
                      // Only handle selection for leaf nodes or selectable groups
                      const flatOpts = flattenSelectableOptions(options);
                      if (flatOpts.some((o) => o.value === node.value)) {
                        handleOptionClick(node.value);
                      }
                    }}
                  >
                    <Box
                      {...elementProps}
                      style={{
                        ...elementProps.style,
                        display: 'flex',
                        alignItems: 'center',
                        cursor: hasChildren ? 'pointer' : 'default',
                      }}
                      onClick={(e) => {
                        // Only toggle expansion, don't select
                        e.stopPropagation();
                        if (hasChildren) {
                          tree.toggleExpanded(node.value);
                        }
                      }}
                    >
                      {hasChildren ? (
                        <IconChevronDown
                          size={14}
                          style={expandIconStyles(expanded)}
                        />
                      ) : (
                        <Box w={14} />
                      )}
                    </Box>
                    <Box style={{ flex: 1 }}>{node.label}</Box>
                  </Group>
                )}
              />
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {searchQuery ? (
                  <Trans>No matching options</Trans>
                ) : (
                  <Trans>No options available</Trans>
                )}
              </Text>
            )}
          </ScrollArea.Autosize>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
