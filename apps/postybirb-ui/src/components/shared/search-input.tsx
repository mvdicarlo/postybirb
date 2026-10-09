/**
 * SearchInput - Standardized search input component.
 * Provides consistent search functionality across sections and drawers.
 */

import { useLingui } from '@lingui/react/macro';
import { ActionIcon, TextInput, type TextInputProps } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useRef } from 'react';

type SearchInputSize = 'xs' | 'sm' | 'md';

interface SearchInputProps
  extends Omit<
    TextInputProps,
    'leftSection' | 'rightSection' | 'onChange' | 'placeholder'
  > {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Size variant - affects icon sizes too */
  size?: SearchInputSize;
  /** Whether to show the clear button when there's a value */
  showClear?: boolean;
  /** Additional callback when clear is clicked */
  onClear?: () => void;
}

const ICON_SIZES: Record<SearchInputSize, { search: number; clear: number }> = {
  xs: { search: 14, clear: 12 },
  sm: { search: 16, clear: 14 },
  md: { search: 18, clear: 16 },
};

/**
 * Standardized search input with search icon and optional clear button.
 * Uses a consistent translated "Search..." placeholder.
 */
export function SearchInput({
  value,
  onChange,
  size = 'sm',
  showClear = true,
  onClear,
  onKeyDown,
  ...props
}: SearchInputProps) {
  const { t } = useLingui();
  const inputRef = useRef<HTMLInputElement>(null);
  const iconSizes = ICON_SIZES[size];

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <TextInput
      ref={inputRef}
      aria-label={t`Search`}
      placeholder={t`Search...`}
      size={size}
      leftSection={<IconSearch size={iconSizes.search} />}
      rightSection={
        showClear && value ? (
          <ActionIcon
            size={size}
            variant="subtle"
            onClick={handleClear}
            aria-label={t`Clear search`}
          >
            <IconX size={iconSizes.clear} />
          </ActionIcon>
        ) : null
      }
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key === 'Escape' && value && !event.defaultPrevented) {
          event.preventDefault();
          event.stopPropagation();
          handleClear();
        }
      }}
      {...props}
    />
  );
}
