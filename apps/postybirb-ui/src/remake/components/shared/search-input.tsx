/**
 * SearchInput - Standardized search input component.
 * Provides consistent search functionality across sections and drawers.
 */

import { useLingui } from '@lingui/react/macro';
import { ActionIcon, TextInput, type TextInputProps } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

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
  ...props
}: SearchInputProps) {
  const { t } = useLingui();
  const iconSizes = ICON_SIZES[size];

  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <TextInput
      placeholder={t`Search...`}
      size={size}
      leftSection={<IconSearch size={iconSizes.search} />}
      rightSection={
        showClear && value ? (
          <ActionIcon
            size={size}
            variant="subtle"
            onClick={handleClear}
            // eslint-disable-next-line lingui/no-unlocalized-strings
            aria-label="Clear search"
          >
            <IconX size={iconSizes.clear} />
          </ActionIcon>
        ) : null
      }
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      {...props}
    />
  );
}
