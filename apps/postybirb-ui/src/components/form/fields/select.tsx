import { ActionIcon, Box, Input, Loader, ScrollArea, Text } from '@mantine/core';
import {
    SelectOption,
    SelectOptionGroup,
    SelectOptionSingle,
} from '@postybirb/form-builder';
import { IconCheck, IconChevronDown, IconSearch, IconX } from '@tabler/icons-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './select.css';

const DEFAULT_MULTI_PLACEHOLDER = 'Select options...';
const DEFAULT_SINGLE_PLACEHOLDER = 'Select option...';
const SEARCH_PLACEHOLDER = 'Type to search...';
const NO_OPTIONS_TEXT = 'No options available';
const NO_SEARCH_RESULTS_TEXT = 'No options match your search';
const CLEAR_ARIA_LABEL = 'Clear selection';
const SEARCH_ARIA_LABEL = 'Search options';
const ITEMS_SELECTED_TEXT = 'items selected';
const OPTIONS_AVAILABLE_TEXT = 'options available';
const TRANSITION_STYLE = 'transform 200ms ease';
const BORDER_STYLE = '1px solid var(--mantine-color-gray-4)';

type SelectProps = SelectSingleProps | SelectMultiProps;

interface BaseSelectProps {
  multiple: boolean;
  options: SelectOption[];
  placeholder?: JSX.Element | string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  maxDropdownHeight?: number;
  error?: boolean;
  description?: string;
  label?: string;
  withAsterisk?: boolean;
  nothingFoundMessage?: string;
}

interface SelectMultiProps extends BaseSelectProps {
  multiple: true;
  value: string[];
  onChange: (
    options: SelectOption[],
    removed: SelectOption[],
    added: SelectOption[],
  ) => void;
}

interface SelectSingleProps extends BaseSelectProps {
  multiple: false;
  value: string | null;
  onChange: (
    option: SelectOption | null,
    removed: SelectOption | null,
    added: SelectOption | null,
  ) => void;
}

function isOptionGroup(option: SelectOption): option is SelectOptionGroup {
  return 'items' in option;
}

function isOptionSingle(option: SelectOption): option is SelectOptionSingle {
  return 'value' in option && !('items' in option);
}

function flattenSelectableOptions(
  options: SelectOption[],
): SelectOptionSingle[] {
  const flattened: SelectOptionSingle[] = [];

  for (const option of options) {
    if (isOptionGroup(option)) {
      // Add the group itself if it has a value (making it selectable)
      if (option.value !== undefined) {
        flattened.push({
          label: option.label,
          value: option.value,
        });
      }
      // Recursively add child items
      flattened.push(...flattenSelectableOptions(option.items));
    } else if (isOptionSingle(option)) {
      flattened.push(option);
    }
  }

  return flattened;
}

function getSelectedOptions(
  value: string | string[] | null,
  options: SelectOption[],
): SelectOptionSingle[] {
  if (!value) return [];

  const flatOptions = flattenSelectableOptions(options);
  const values = Array.isArray(value) ? value : [value];

  return flatOptions.filter((option) => values.includes(option.value));
}

function renderOption(
  option: SelectOption,
  selectedValues: string[],
  onOptionClick: (option: SelectOptionSingle) => void,
  depth = 0,
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'xs',
  flatOptions: SelectOptionSingle[] = [],
  focusedIndex = -1,
): JSX.Element[] {
  const elements: JSX.Element[] = [];

  const handleKeyDown = (
    event: React.KeyboardEvent,
    optionToSelect: SelectOptionSingle,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOptionClick(optionToSelect);
    }
  };

  if (isOptionGroup(option)) {
    // Render group header (selectable if it has a value)
    if (option.value !== undefined) {
      const isSelected = selectedValues.includes(option.value);
      const selectableOption = { label: option.label, value: option.value };
      const optionIndex = flatOptions.findIndex(opt => opt.value === option.value);
      const isFocused = optionIndex === focusedIndex;
      
      elements.push(
        <Box
          key={`group-${option.value}`}
          className={`select-option select-option-group ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          role="option"
          tabIndex={-1}
          aria-selected={isSelected}
          data-option-index={optionIndex}
          onClick={() => onOptionClick(selectableOption)}
          onKeyDown={(e) => handleKeyDown(e, selectableOption)}
        >
          <Text className="select-option-label" truncate size={size} fw={500}>
            {option.label}
          </Text>
          {isSelected && (
            <IconCheck size={16} className="select-option-check" />
          )}
        </Box>,
      );
    } else {
      // Non-selectable group header
      elements.push(
        <Box
          key={`group-header-${option.label}`}
          className="select-option-group-header"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          role="presentation"
        >
          <Text size="xs" tt="uppercase" fw={700} c="dimmed" lh={1.2}>
            {option.label}
          </Text>
        </Box>,
      );
    }

    // Render child items
    for (const item of option.items) {
      elements.push(
        ...renderOption(item, selectedValues, onOptionClick, depth + 1, size, flatOptions, focusedIndex),
      );
    }
  } else if (isOptionSingle(option)) {
    const isSelected = selectedValues.includes(option.value);
    const optionIndex = flatOptions.findIndex(opt => opt.value === option.value);
    const isFocused = optionIndex === focusedIndex;
    
    elements.push(
      <Box
        key={option.value}
        className={`select-option ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        role="option"
        tabIndex={-1}
        aria-selected={isSelected}
        data-option-index={optionIndex}
        onClick={() => onOptionClick(option)}
        onKeyDown={(e) => handleKeyDown(e, option)}
      >
        <Text className="select-option-label" truncate size={size}>
          {option.label}
        </Text>
        {isSelected && (
          <IconCheck size={16} className="select-option-check" />
        )}
      </Box>,
    );
  }

  return elements;
}

export function Select(props: SelectProps): JSX.Element {
  const {
    multiple,
    options,
    value,
    onChange,
    placeholder,
    disabled,
    size = 'sm',
    loading = false,
    clearable = false,
    searchable = false,
    maxDropdownHeight = 220,
    error = false,
    description,
    label,
    withAsterisk = false,
    nothingFoundMessage,
  } = props;
  const [opened, setOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOptions = getSelectedOptions(value, options);
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const displayPlaceholder =
    placeholder ||
    (multiple ? DEFAULT_MULTI_PLACEHOLDER : DEFAULT_SINGLE_PLACEHOLDER);

  const displayText =
    selectedOptions.length > 0
      ? multiple && selectedOptions.length > 3
        ? `${selectedOptions.length} ${ITEMS_SELECTED_TEXT}`
        : selectedOptions.map((opt) => opt.label).join(', ')
      : displayPlaceholder;

  const dropdownId = React.useId();

  // Filter options based on search query with improved fuzzy search
  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    
    const query = searchQuery.toLowerCase().trim();
    
    const filterOption = (option: SelectOption): SelectOption | null => {
      if (isOptionGroup(option)) {
        const filteredItems = option.items
          .map(item => filterOption(item))
          .filter(Boolean) as SelectOption[];
        
        // Check if group label matches (fuzzy search)
        const groupMatches = option.label.toLowerCase().includes(query) ||
          query.split(' ').every(word => option.label.toLowerCase().includes(word));
        
        if (groupMatches || filteredItems.length > 0) {
          return {
            ...option,
            items: filteredItems
          };
        }
        return null;
      }
      
      // Fuzzy search for individual options
      const optionMatches = option.label.toLowerCase().includes(query) ||
        query.split(' ').every(word => option.label.toLowerCase().includes(word)) ||
        option.label.toLowerCase().split(' ').some(word => word.startsWith(query));
      
      return optionMatches ? option : null;
    };
    
    return options.map(option => filterOption(option)).filter(Boolean) as SelectOption[];
  }, [options, searchQuery, searchable]);

  const flatSelectableOptions = React.useMemo(() => 
    flattenSelectableOptions(filteredOptions), [filteredOptions]
  );

  const handleOptionClick = useCallback((option: SelectOptionSingle) => {
    if (disabled) return;

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.includes(option.value);

      let newValues: string[];
      let removedOptions: SelectOption[] = [];
      let addedOptions: SelectOption[] = [];

      if (isSelected) {
        newValues = currentValues.filter((v) => v !== option.value);
        removedOptions = [option];
      } else {
        newValues = [...currentValues, option.value];
        addedOptions = [option];
      }

      const newSelectedOptions = getSelectedOptions(newValues, options);
      (onChange as SelectMultiProps['onChange'])(
        newSelectedOptions,
        removedOptions,
        addedOptions,
      );
    } else {
      const currentOption = value
        ? getSelectedOptions(value, options)[0] || null
        : null;
      const newOption = option.value === value ? null : option;

      (onChange as SelectSingleProps['onChange'])(
        newOption,
        currentOption,
        newOption,
      );
      
      // Close dropdown for single select
      setOpened(false);
      setSearchQuery('');
    }
  }, [disabled, multiple, value, options, onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (multiple) {
      (onChange as SelectMultiProps['onChange'])([], selectedOptions, []);
    } else {
      const currentOption = value ? getSelectedOptions(value, options)[0] || null : null;
      (onChange as SelectSingleProps['onChange'])(null, currentOption, null);
    }
  }, [disabled, multiple, onChange, selectedOptions, value, options]);

  const handleToggle = useCallback(() => {
    if (!disabled && !loading) {
      setOpened(!opened);
      if (!opened) {
        setFocusedIndex(-1);
        // Focus search input when opening if searchable
        if (searchable) {
          setTimeout(() => searchRef.current?.focus(), 0);
        }
      }
    }
  }, [disabled, loading, opened, searchable]);

  const handleTriggerKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (opened && focusedIndex >= 0) {
        const focusedOption = flatSelectableOptions[focusedIndex];
        if (focusedOption) {
          handleOptionClick(focusedOption);
        }
      } else if (!disabled && !loading) {
        setOpened(!opened);
      }
    } else if (event.key === ' ') {
      event.preventDefault();
      if (!disabled && !loading) {
        setOpened(!opened);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!opened && !disabled && !loading) {
        setOpened(true);
      } else if (opened) {
        setFocusedIndex(prev => 
          prev < flatSelectableOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (opened) {
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : flatSelectableOptions.length - 1
        );
      }
    } else if (event.key === 'Escape') {
      setOpened(false);
      setSearchQuery('');
      setFocusedIndex(-1);
      triggerRef.current?.focus();
    } else if (event.key === 'Backspace' && clearable && selectedOptions.length > 0) {
      event.preventDefault();
      const mockEvent = { stopPropagation: () => {} } as React.MouseEvent;
      handleClear(mockEvent);
    } else if (event.key === 'Tab') {
      setOpened(false);
      setSearchQuery('');
      setFocusedIndex(-1);
    }
  }, [opened, focusedIndex, flatSelectableOptions, handleOptionClick, disabled, loading, clearable, selectedOptions, handleClear]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setFocusedIndex(-1);
  }, []);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusedIndex(0);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpened(false);
      setSearchQuery('');
      setFocusedIndex(-1);
      triggerRef.current?.focus();
    } else if (event.key === 'Enter' && focusedIndex >= 0) {
      event.preventDefault();
      const focusedOption = flatSelectableOptions[focusedIndex];
      if (focusedOption) {
        handleOptionClick(focusedOption);
      }
    }
  }, [focusedIndex, flatSelectableOptions, handleOptionClick]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('.select-container')) {
      setOpened(false);
      setSearchQuery('');
      setFocusedIndex(-1);
    }
  }, []);

  useEffect(() => {
    if (opened) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [opened, handleClickOutside]);

  // Auto-scroll focused option into view
  useEffect(() => {
    if (opened && focusedIndex >= 0 && optionsRef.current) {
      const focusedElement = optionsRef.current.querySelector(
        `[data-option-index="${focusedIndex}"]`
      ) as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, opened]);

  return (
    <Box>
      {label && (
        <Box mb={5}>
          <Text size={size === 'xs' ? 'sm' : size} fw={500} component="label">
            {label}
            {withAsterisk && (
              <Text span c="red" ml={4}>
                *
              </Text>
            )}
          </Text>
        </Box>
      )}
      
      <Box
        className={`select-container ${disabled ? 'disabled' : ''} ${opened ? 'opened' : ''} ${error ? 'error' : ''} ${loading ? 'loading' : ''}`}
      >
        <Box
          ref={triggerRef}
          className="select-trigger"
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={opened}
          aria-controls={dropdownId}
          aria-haspopup="listbox"
          aria-disabled={disabled}
          aria-invalid={error}
          aria-label={label || (typeof placeholder === 'string' ? placeholder : undefined)}
          onClick={handleToggle}
          onKeyDown={handleTriggerKeyDown}
          data-size={size}
        >
          <Text
            className={`select-text ${selectedOptions.length === 0 ? 'placeholder' : ''}`}
            truncate
            c={selectedOptions.length === 0 ? 'dimmed' : undefined}
            size={size}
          >
            {displayText}
          </Text>
          
          <Box className="select-controls" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {loading && <Loader size={size === 'xs' ? 12 : 16} />}
            {clearable && selectedOptions.length > 0 && !loading && (
              <ActionIcon
                size={size === 'xs' ? 16 : size === 'sm' ? 18 : 20}
                variant="subtle"
                color="gray"
                onClick={handleClear}
                aria-label={CLEAR_ARIA_LABEL}
                tabIndex={-1}
              >
                <IconX size={size === 'xs' ? 10 : 12} />
              </ActionIcon>
            )}
            <IconChevronDown
              size={size === 'xs' ? 14 : 16}
              className={`select-arrow ${opened ? 'up' : 'down'}`}
              style={{ 
                color: 'var(--mantine-color-dimmed)',
                transform: opened ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: TRANSITION_STYLE
              }}
            />
          </Box>
        </Box>

        {opened && (
          <Box className="select-dropdown" style={{ maxHeight: maxDropdownHeight }}>
            {searchable && (
              <Box p="xs" className="select-search-container">
                <Input
                  ref={searchRef}
                  placeholder={SEARCH_PLACEHOLDER}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  size={size}
                  leftSection={<IconSearch size={14} />}
                  aria-label={SEARCH_ARIA_LABEL}
                  styles={{
                    input: {
                      border: BORDER_STYLE,
                      '&:focus': {
                        borderColor: 'var(--mantine-color-blue-filled)',
                      }
                    }
                  }}
                />
              </Box>
            )}
            
            <ScrollArea.Autosize mah={maxDropdownHeight - (searchable ? 70 : 0)}>
              <Box 
                ref={optionsRef}
                id={dropdownId}
                className="select-options" 
                role="listbox" 
                aria-multiselectable={multiple}
                aria-label={`${filteredOptions.length} ${OPTIONS_AVAILABLE_TEXT}`}
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions
                    .map((option) =>
                      renderOption(
                        option,
                        selectedValues,
                        handleOptionClick,
                        0,
                        size,
                        flatSelectableOptions,
                        focusedIndex,
                      ),
                    )
                    .flat()
                ) : (
                  <Box p="sm" ta="center">
                    <Text c="dimmed" size="sm">
                      {nothingFoundMessage || (searchQuery ? NO_SEARCH_RESULTS_TEXT : NO_OPTIONS_TEXT)}
                    </Text>
                  </Box>
                )}
              </Box>
            </ScrollArea.Autosize>
          </Box>
        )}
      </Box>
      
      {description && (
        <Box mt={5}>
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        </Box>
      )}
      
      {error && typeof error === 'string' && (
        <Box mt={5}>
          <Text size="xs" c="red">
            {error}
          </Text>
        </Box>
      )}
    </Box>
  );
}
