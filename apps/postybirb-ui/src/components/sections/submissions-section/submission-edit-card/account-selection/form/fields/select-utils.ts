/**
 * Select field utilities - type guards, option helpers, and selection logic
 */

import {
    SelectOption,
    SelectOptionGroup,
    SelectOptionSingle,
} from '@postybirb/form-builder';

/**
 * Type guard: checks if option is a group with items
 */
export function isOptionGroup(option: SelectOption): option is SelectOptionGroup {
  return 'items' in option;
}

/**
 * Type guard: checks if option is a single selectable option
 */
export function isOptionSingle(option: SelectOption): option is SelectOptionSingle {
  return 'value' in option && !('items' in option);
}

/**
 * Checks if options contain any nested groups (hierarchical structure)
 * Returns true if any option has items array with children
 */
export function hasNestedGroups(options: SelectOption[]): boolean {
  for (const option of options) {
    if (isOptionGroup(option) && option.items.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Flattens all selectable options from a hierarchical structure.
 * Groups with a value are included as selectable options.
 */
export function flattenSelectableOptions(
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
          data: option.data,
          mutuallyExclusive: option.mutuallyExclusive,
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

/**
 * Gets selected options from values
 */
export function getSelectedOptions(
  value: string | string[] | null,
  options: SelectOption[],
): SelectOptionSingle[] {
  if (!value) return [];

  const flatOptions = flattenSelectableOptions(options);
  const values = Array.isArray(value) ? value : [value];

  return flatOptions.filter((option) => values.includes(option.value));
}

/**
 * Handles mutually exclusive option selection logic.
 * When a mutually exclusive option is selected, all others are deselected.
 * When a regular option is selected while an exclusive option is selected,
 * the exclusive option is deselected.
 *
 * @param currentValues - Current selected values
 * @param addedOption - The option being added (or null if removing)
 * @param options - All available options (for looking up mutually exclusive flag)
 * @returns New array of selected values
 */
export function handleMutuallyExclusiveSelection(
  currentValues: string[],
  addedOption: SelectOptionSingle | null,
  options: SelectOption[],
): string[] {
  if (!addedOption) {
    return currentValues;
  }

  const flatOptions = flattenSelectableOptions(options);

  // If the added option is mutually exclusive, only keep it
  if (addedOption.mutuallyExclusive) {
    return [addedOption.value];
  }

  // Check if any currently selected option is mutually exclusive
  const hasExclusiveSelected = currentValues.some((val) => {
    const opt = flatOptions.find((o) => o.value === val);
    return opt?.mutuallyExclusive;
  });

  if (hasExclusiveSelected) {
    // Remove exclusive options, keep the new non-exclusive one
    const nonExclusiveValues = currentValues.filter((val) => {
      const opt = flatOptions.find((o) => o.value === val);
      return !opt?.mutuallyExclusive;
    });
    return [...nonExclusiveValues, addedOption.value];
  }

  // Normal case: add the option
  return [...currentValues, addedOption.value];
}

/**
 * Filters options based on search query while preserving parent structure.
 * If a child matches, its parent group is included.
 * If a group label matches, all its children are included.
 */
export function filterOptions(
  options: SelectOption[],
  searchQuery: string,
): SelectOption[] {
  if (!searchQuery.trim()) return options;

  const query = searchQuery.toLowerCase().trim();

  const filterOption = (option: SelectOption): SelectOption | null => {
    if (isOptionGroup(option)) {
      const filteredItems = option.items
        .map((item) => filterOption(item))
        .filter(Boolean) as SelectOption[];

      // Check if group label matches
      const groupMatches =
        option.label.toLowerCase().includes(query) ||
        query.split(' ').every((word) => option.label.toLowerCase().includes(word));

      if (groupMatches) {
        // Include group with all children if group label matches
        return option;
      }

      if (filteredItems.length > 0) {
        // Include group with only matching children
        return {
          ...option,
          items: filteredItems,
        };
      }

      return null;
    }

    // Single option: fuzzy match
    const optionMatches =
      option.label.toLowerCase().includes(query) ||
      query.split(' ').every((word) => option.label.toLowerCase().includes(word)) ||
      option.label
        .toLowerCase()
        .split(' ')
        .some((word) => word.startsWith(query));

    return optionMatches ? option : null;
  };

  return options.map((option) => filterOption(option)).filter(Boolean) as SelectOption[];
}

/**
 * Counts total selectable options (for search threshold)
 */
export function countSelectableOptions(options: SelectOption[]): number {
  return flattenSelectableOptions(options).length;
}
