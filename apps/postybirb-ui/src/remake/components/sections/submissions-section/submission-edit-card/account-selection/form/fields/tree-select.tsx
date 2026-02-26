/**
 * TreeSelect - A dropdown select with hierarchical option list.
 *
 * Custom implementation that renders the option tree directly instead of
 * using Mantine's Tree/useTree, which avoids the infinite re-render loop
 * caused by rebuilding tree data on every state change.
 *
 * Supports single/multi-select, search filtering, keyboard navigation,
 * and mutually exclusive options.
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
} from '@mantine/core';
import { SelectOption } from '@postybirb/form-builder';
import { IconChevronDown, IconSearch, IconX } from '@tabler/icons-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  countSelectableOptions,
  filterOptions,
  flattenSelectableOptions,
  getSelectedOptions,
  handleMutuallyExclusiveSelection,
  isOptionGroup,
} from './select-utils';

const SEARCH_THRESHOLD = 7;

// ── TreeNode: memoised leaf/group renderer ──────────────────────────────

interface TreeNodeProps {
  option: SelectOption;
  depth: number;
  multiple: boolean;
  selectedValues: string[];
  focusedValue: string | null;
  onSelect: (value: string) => void;
}

const TreeNode = React.memo(function TreeNode({
  option,
  depth,
  multiple,
  selectedValues,
  focusedValue,
  onSelect,
}: TreeNodeProps) {
  if (isOptionGroup(option)) {
    const groupValue = option.value;
    const isSelectable = groupValue !== undefined;
    const isSelected = isSelectable && selectedValues.includes(groupValue);
    const isFocused = isSelectable && focusedValue === groupValue;

    return (
      <Box>
        {/* Group header row */}
        <Group
          gap="xs"
          wrap="nowrap"
          py={4}
          px="xs"
          pl={depth * 16 + 8}
          bg={isFocused ? 'var(--mantine-color-blue-light)' : undefined}
          style={{ cursor: isSelectable ? 'pointer' : 'default' }}
          data-tree-node-value={isSelectable ? groupValue : undefined}
          onClick={isSelectable ? () => onSelect(groupValue) : undefined}
        >
          {isSelectable && multiple && (
            <Checkbox
              checked={isSelected}
              onChange={() => onSelect(groupValue)}
              onClick={(e) => e.stopPropagation()}
              size="xs"
            />
          )}
          <Text size="sm" fw={500} style={{ flex: 1 }}>
            {option.label}
          </Text>
        </Group>

        {/* Children (always expanded) */}
        {option.items.map((child) => (
          <TreeNode
            key={
              isOptionGroup(child) ? (child.value ?? child.label) : child.value
            }
            option={child}
            depth={depth + 1}
            multiple={multiple}
            selectedValues={selectedValues}
            focusedValue={focusedValue}
            onSelect={onSelect}
          />
        ))}
      </Box>
    );
  }

  // Leaf option
  const isSelected = selectedValues.includes(option.value);
  const isFocused = focusedValue === option.value;

  return (
    <Group
      gap="xs"
      wrap="nowrap"
      py={4}
      px="xs"
      pl={depth * 16 + 8}
      bg={isFocused ? 'var(--mantine-color-blue-light)' : undefined}
      style={{ cursor: 'pointer' }}
      data-tree-node-value={option.value}
      onClick={() => onSelect(option.value)}
    >
      {multiple ? (
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect(option.value)}
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
  );
});

// ── Main component ──────────────────────────────────────────────────────

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const defaultPlaceholder = <Trans>Select...</Trans>;
  const displayPlaceholder = placeholder ?? defaultPlaceholder;

  // ── Derived data (all stable memos – no JSX in deps) ───────────────

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

  const displayText = useMemo(() => {
    if (selectedOptions.length === 0) return displayPlaceholder;
    if (multiple && selectedOptions.length > 2) {
      return <Trans>{selectedOptions.length} selected</Trans>;
    }
    return selectedOptions.map((opt) => opt.label).join(', ');
  }, [selectedOptions, displayPlaceholder, multiple]);

  // ── Callbacks ──────────────────────────────────────────────────────

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
          newValues = selectedValues.filter((v) => v !== optionValue);
        } else {
          newValues = handleMutuallyExclusiveSelection(
            selectedValues,
            option,
            options,
          );
        }
        onChange(newValues);
      } else {
        const newValue = selectedValues.includes(optionValue)
          ? ''
          : optionValue;
        onChange(newValue);
        setOpened(false);
        setSearchQuery('');
      }
    },
    [disabled, multiple, selectedValues, options, onChange],
  );

  // Ref-stable wrapper: keeps the same function identity across renders
  // so that React.memo on TreeNode isn't invalidated by parent re-renders.
  const handleOptionClickRef = useRef(handleOptionClick);
  handleOptionClickRef.current = handleOptionClick;
  const stableOnSelect = useCallback(
    (optionValue: string) => handleOptionClickRef.current(optionValue),
    [],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      onChange(multiple ? [] : '');
    },
    [disabled, multiple, onChange],
  );

  // ── Shared keyboard helpers ────────────────────────────────────────

  const moveFocus = useCallback(
    (direction: 'up' | 'down') => {
      if (flatSelectableOptions.length === 0) return;
      const currentIndex = flatSelectableOptions.findIndex(
        (o) => o.value === focusedValue,
      );
      let nextIndex: number;
      if (direction === 'down') {
        nextIndex =
          currentIndex < flatSelectableOptions.length - 1
            ? currentIndex + 1
            : 0;
      } else {
        nextIndex =
          currentIndex > 0
            ? currentIndex - 1
            : flatSelectableOptions.length - 1;
      }
      setFocusedValue(flatSelectableOptions[nextIndex]?.value ?? null);
    },
    [flatSelectableOptions, focusedValue],
  );

  const closeDropdown = useCallback(() => {
    setOpened(false);
    setSearchQuery('');
    setFocusedValue(null);
    triggerRef.current?.focus();
  }, []);

  // ── Keyboard: dropdown list (shared by search input + non-search dropdown) ─

  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveFocus('down');
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveFocus('up');
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedValue) handleOptionClick(focusedValue);
          break;
        case 'Escape':
          event.preventDefault();
          closeDropdown();
          break;
        case 'Home':
          event.preventDefault();
          if (flatSelectableOptions.length > 0)
            setFocusedValue(flatSelectableOptions[0].value);
          break;
        case 'End':
          event.preventDefault();
          if (flatSelectableOptions.length > 0)
            setFocusedValue(
              flatSelectableOptions[flatSelectableOptions.length - 1].value,
            );
          break;
        default:
          break;
      }
    },
    [
      moveFocus,
      focusedValue,
      handleOptionClick,
      closeDropdown,
      flatSelectableOptions,
    ],
  );

  // ── Keyboard: trigger button ───────────────────────────────────────

  const handleTriggerKeyDown = useCallback(
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
            moveFocus('down');
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (opened) moveFocus('up');
          break;
        case 'Escape':
          closeDropdown();
          break;
        case 'Tab':
          setOpened(false);
          setSearchQuery('');
          setFocusedValue(null);
          break;
        case 'Home':
          event.preventDefault();
          if (opened && flatSelectableOptions.length > 0)
            setFocusedValue(flatSelectableOptions[0].value);
          break;
        case 'End':
          event.preventDefault();
          if (opened && flatSelectableOptions.length > 0)
            setFocusedValue(
              flatSelectableOptions[flatSelectableOptions.length - 1].value,
            );
          break;
        default:
          // Type-ahead: open and start searching
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
      moveFocus,
      closeDropdown,
    ],
  );

  // ── Effects ────────────────────────────────────────────────────────

  // Auto-focus the search input or dropdown when opened
  useEffect(() => {
    if (opened) {
      const target = enableSearch ? searchRef : dropdownRef;
      setTimeout(() => target.current?.focus(), 0);
    }
  }, [opened, enableSearch]);

  // Scroll the focused item into view
  useEffect(() => {
    if (focusedValue && opened && scrollAreaRef.current) {
      const el = scrollAreaRef.current.querySelector(
        `[data-tree-node-value="${CSS.escape(focusedValue)}"]`,
      );
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedValue, opened]);

  // ── Render ─────────────────────────────────────────────────────────

  const showClear = clearable && selectedOptions.length > 0;

  const chevronStyles: React.CSSProperties = {
    color: 'var(--mantine-color-dimmed)',
    transform: opened ? 'rotate(180deg)' : 'rotate(0deg)',
    // eslint-disable-next-line lingui/no-unlocalized-strings
    transition: 'transform 200ms ease',
  };

  const rightSection = (
    <Group gap={4} wrap="nowrap" pr="xs">
      {showClear && (
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
          onKeyDown={handleTriggerKeyDown}
          rightSection={rightSection}
          rightSectionWidth={showClear ? 56 : 32}
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
          onKeyDown={enableSearch ? undefined : handleListKeyDown}
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
                onKeyDown={handleListKeyDown}
                size="xs"
                leftSection={<IconSearch size={14} />}
              />
            </Box>
          )}

          <ScrollArea.Autosize
            mah={250}
            type="auto"
            viewportRef={scrollAreaRef}
          >
            {opened && filteredOptions.length > 0 ? (
              <Box py={4}>
                {filteredOptions.map((option) => (
                  <TreeNode
                    key={
                      isOptionGroup(option)
                        ? (option.value ?? option.label)
                        : option.value
                    }
                    option={option}
                    depth={0}
                    multiple={multiple}
                    selectedValues={selectedValues}
                    focusedValue={focusedValue}
                    onSelect={stableOnSelect}
                  />
                ))}
              </Box>
            ) : opened ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {searchQuery ? (
                  <Trans>No matching options</Trans>
                ) : (
                  <Trans>No options available</Trans>
                )}
              </Text>
            ) : null}
          </ScrollArea.Autosize>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
