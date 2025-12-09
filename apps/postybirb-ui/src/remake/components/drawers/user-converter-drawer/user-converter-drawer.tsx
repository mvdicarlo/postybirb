/**
 * UserConverterDrawer - Drawer for managing user converters.
 * Features compact expandable cards, search, selectable rows with bulk delete,
 * and inline website conversion editing with dropdown to add new conversions.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Card,
    Checkbox,
    Collapse,
    Combobox,
    Group,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    Tooltip,
    useCombobox,
} from '@mantine/core';
import { useDebouncedCallback, useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    IconChevronDown,
    IconChevronRight,
    IconPlus,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import userConvertersApi from '../../../api/user-converters.api';
import type { UserConverterRecord } from '../../../stores/records';
import { useActiveDrawer, useDrawerActions } from '../../../stores/ui-store';
import { useUserConverters } from '../../../stores/user-converter-store';
import { useWebsites } from '../../../stores/website-store';
import { HoldToConfirmButton } from '../../hold-to-confirm';
import { SectionDrawer } from '../section-drawer';

// ============================================================================
// Types
// ============================================================================

interface WebsiteOption {
  id: string;
  displayName: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to manage user converter search filtering and sorting.
 */
function useUserConverterSearch(searchQuery: string) {
  const userConverters = useUserConverters();
  const [debouncedSearch] = useDebouncedValue(searchQuery, 200);

  const filteredAndSortedConverters = useMemo(() => {
    let converters = [...userConverters];

    // Filter by search query
    if (debouncedSearch.trim()) {
      const lowerSearch = debouncedSearch.toLowerCase();
      converters = converters.filter(
        (converter) =>
          converter.username.toLowerCase().includes(lowerSearch) ||
          Object.values(converter.convertTo).some((value) =>
            value.toLowerCase().includes(lowerSearch)
          )
      );
    }

    // Sort alphabetically by username
    converters.sort((a, b) =>
      a.username.toLowerCase().localeCompare(b.username.toLowerCase())
    );

    return converters;
  }, [userConverters, debouncedSearch]);

  return {
    filteredConverters: filteredAndSortedConverters,
    allConverters: userConverters,
  };
}

// ============================================================================
// Website Conversion Components
// ============================================================================

/**
 * Single website conversion row with editable value and delete button.
 */
function WebsiteConversionRow({
  websiteId,
  websiteName,
  value,
  onValueChange,
  onRemove,
}: {
  websiteId: string;
  websiteName: string;
  value: string;
  onValueChange: (websiteId: string, value: string) => void;
  onRemove: (websiteId: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = () => {
    const trimmed = localValue.trim();
    if (trimmed !== value) {
      onValueChange(websiteId, trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed" style={{ width: 100, flexShrink: 0 }} truncate>
        {websiteName}
      </Text>
      <TextInput
        flex={1}
        size="xs"
        value={localValue}
        onChange={(e) => setLocalValue(e.currentTarget.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <Tooltip label={<Trans>Remove</Trans>}>
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          onClick={() => onRemove(websiteId)}
        >
          <IconX size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

/**
 * Dropdown to add a new website conversion.
 */
function AddWebsiteDropdown({
  availableWebsites,
  onAdd,
}: {
  availableWebsites: WebsiteOption[];
  onAdd: (websiteId: string) => void;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return availableWebsites;
    const lowerSearch = search.toLowerCase();
    return availableWebsites.filter((w) =>
      w.displayName.toLowerCase().includes(lowerSearch)
    );
  }, [availableWebsites, search]);

  if (availableWebsites.length === 0) {
    return null;
  }

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onAdd(val);
        setSearch('');
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <TextInput
          size="xs"
          placeholder={t`Add website`}
          leftSection={<IconPlus size={14} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            combobox.closeDropdown();
            setSearch('');
          }}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={200}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((website) => (
                <Combobox.Option key={website.id} value={website.id}>
                  {website.displayName}
                </Combobox.Option>
              ))
            ) : (
              <Combobox.Empty>
                <Trans>No websites found</Trans>
              </Combobox.Empty>
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

/**
 * Website conversions editor - shows active conversions with add/remove.
 */
function WebsiteConversionsEditor({
  converterId,
  username,
  convertTo,
}: {
  converterId: string;
  username: string;
  convertTo: Record<string, string>;
}) {
  const websites = useWebsites();
  const [localConvertTo, setLocalConvertTo] =
    useState<Record<string, string>>(convertTo);

  // Get website display names map
  const websiteMap = useMemo(() => {
    const map = new Map<string, string>();
    websites.forEach((w) => map.set(w.id, w.displayName));
    return map;
  }, [websites]);

  // Websites that already have conversions (including empty string values for newly added)
  const activeWebsiteIds = useMemo(
    () => Object.keys(localConvertTo).filter((id) => id in localConvertTo),
    [localConvertTo]
  );

  // Websites available to add (sorted alphabetically)
  const availableWebsites = useMemo(
    () =>
      websites
        .filter((w) => !activeWebsiteIds.includes(w.id))
        .map((w) => ({ id: w.id, displayName: w.displayName }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [websites, activeWebsiteIds]
  );

  // Debounced save
  const debouncedSave = useDebouncedCallback(
    async (newConvertTo: Record<string, string>) => {
      try {
        // Filter out empty values before saving
        const filtered = Object.fromEntries(
          Object.entries(newConvertTo).filter(([, v]) => v.trim().length > 0)
        );
        await userConvertersApi.update(converterId, {
          username,
          convertTo: filtered,
        });
      } catch {
        notifications.show({
          title: username,
          message: <Trans>Failed to update conversions</Trans>,
          color: 'red',
        });
      }
    },
    300
  );

  const handleValueChange = (websiteId: string, value: string) => {
    const newConvertTo = { ...localConvertTo, [websiteId]: value };
    setLocalConvertTo(newConvertTo);
    debouncedSave(newConvertTo);
  };

  const handleRemove = (websiteId: string) => {
    const newConvertTo = { ...localConvertTo };
    delete newConvertTo[websiteId];
    setLocalConvertTo(newConvertTo);
    debouncedSave(newConvertTo);
  };

  const handleAdd = (websiteId: string) => {
    const newConvertTo = { ...localConvertTo, [websiteId]: '' };
    setLocalConvertTo(newConvertTo);
    // Don't save yet - let user enter a value first
  };

  return (
    <Stack gap="xs" mt="xs">
      {activeWebsiteIds.length > 0 ? (
        activeWebsiteIds
          .sort((a, b) =>
            (websiteMap.get(a) ?? '').localeCompare(websiteMap.get(b) ?? '')
          )
          .map((websiteId) => (
            <WebsiteConversionRow
              key={websiteId}
              websiteId={websiteId}
              websiteName={websiteMap.get(websiteId) ?? websiteId}
              value={localConvertTo[websiteId] ?? ''}
              onValueChange={handleValueChange}
              onRemove={handleRemove}
            />
          ))
      ) : (
        <Text size="xs" c="dimmed" fs="italic">
          <Trans>No website conversions</Trans>
        </Text>
      )}
      <AddWebsiteDropdown
        availableWebsites={availableWebsites}
        onAdd={handleAdd}
      />
    </Stack>
  );
}

// ============================================================================
// User Converter Card Component
// ============================================================================

/**
 * Compact expandable user converter card.
 */
function UserConverterCard({
  converter,
  isSelected,
  onSelect,
  isExpanded,
  onToggleExpand,
}: {
  converter: UserConverterRecord;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const [username, setUsername] = useState(converter.username);

  const handleUsernameBlur = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsername(converter.username);
      return;
    }
    if (trimmed === converter.username) return;

    try {
      await userConvertersApi.update(converter.id, {
        username: trimmed,
        convertTo: converter.convertTo,
      });
    } catch {
      notifications.show({
        title: converter.username,
        message: <Trans>Failed to update username</Trans>,
        color: 'red',
      });
      setUsername(converter.username);
    }
  };

  const handleUsernameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setUsername(converter.username);
    }
  };

  return (
    <Card padding="xs" withBorder shadow="0">
      <Group gap="xs" wrap="nowrap">
        <Checkbox
          checked={isSelected}
          onChange={(e) => onSelect(converter.id, e.currentTarget.checked)}
          // eslint-disable-next-line lingui/no-unlocalized-strings
          aria-label="Select converter"
        />
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => onToggleExpand(converter.id)}
        >
          {isExpanded ? (
            <IconChevronDown size={16} />
          ) : (
            <IconChevronRight size={16} />
          )}
        </ActionIcon>
        <TextInput
          flex={1}
          size="xs"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
          onBlur={handleUsernameBlur}
          onKeyDown={handleUsernameKeyDown}
          styles={{ input: { fontWeight: 500 } }}
        />
        <Badge size="sm" variant="light" color="blue">
          {converter.conversionCount}
        </Badge>
      </Group>
      <Collapse in={isExpanded}>
        <Box pl={60}>
          <WebsiteConversionsEditor
            converterId={converter.id}
            username={converter.username}
            convertTo={converter.convertTo}
          />
        </Box>
      </Collapse>
    </Card>
  );
}

// ============================================================================
// Action Components
// ============================================================================

/**
 * Delete selected converters button.
 */
function DeleteSelectedButton({
  selectedIds,
  onDeleted,
}: {
  selectedIds: Set<string>;
  onDeleted: () => void;
}) {
  const count = selectedIds.size;

  const handleDelete = useCallback(async () => {
    try {
      await userConvertersApi.remove([...selectedIds]);
      notifications.show({
        message: <Trans>{count} user converter(s) deleted</Trans>,
        color: 'green',
      });
      onDeleted();
    } catch {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: <Trans>Failed to delete user converters</Trans>,
        color: 'red',
      });
    }
  }, [selectedIds, count, onDeleted]);

  return (
    <Tooltip
      label={
        count === 0 ? (
          <Trans>Select items to delete</Trans>
        ) : (
          <Trans>Hold to delete {count} item(s)</Trans>
        )
      }
    >
      <HoldToConfirmButton
        variant="subtle"
        color="red"
        disabled={count === 0}
        onConfirm={handleDelete}
      >
        <IconTrash size={18} />
      </HoldToConfirmButton>
    </Tooltip>
  );
}

/**
 * Create new user converter form.
 */
function CreateUserConverterForm({
  existingUsernames,
}: {
  existingUsernames: Set<string>;
}) {
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const isDuplicate = existingUsernames.has(username.trim().toLowerCase());

  const handleCreate = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || isDuplicate) return;

    setIsCreating(true);
    try {
      await userConvertersApi.create({ username: trimmedUsername, convertTo: {} });
      notifications.show({
        title: trimmedUsername,
        message: <Trans>User converter created</Trans>,
        color: 'green',
      });
      setUsername('');
    } catch {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: <Trans>Failed to create user converter</Trans>,
        color: 'red',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  return (
    <Group gap="xs">
      <TextInput
        flex={1}
        size="sm"
        placeholder={t`New`}
        leftSection={<IconPlus size={16} />}
        value={username}
        onChange={(e) => setUsername(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={isCreating}
        error={isDuplicate ? t`Username already exists` : undefined}
      />
      <Tooltip label={<Trans>Create</Trans>}>
        <ActionIcon
          variant="filled"
          onClick={handleCreate}
          disabled={!username.trim() || isDuplicate || isCreating}
          loading={isCreating}
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

// ============================================================================
// Main Drawer Component
// ============================================================================

/**
 * User converter drawer component.
 */
export function UserConverterDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const opened = activeDrawer === 'userConverters';

  const [searchQuery, setSearchQuery] = useState('');
  const { filteredConverters, allConverters } =
    useUserConverterSearch(searchQuery);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Existing usernames for duplicate check (case-insensitive)
  const existingUsernames = useMemo(
    () => new Set(allConverters.map((c) => c.username.toLowerCase())),
    [allConverters]
  );

  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedIds(new Set(filteredConverters.map((c) => c.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [filteredConverters]
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allSelected =
    filteredConverters.length > 0 &&
    selectedIds.size === filteredConverters.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <SectionDrawer
      opened={opened}
      onClose={closeDrawer}
      title={<Trans>User Converters</Trans>}
      width={500}
    >
      <Stack gap="md" h="100%">
        {/* Create form */}
        <CreateUserConverterForm existingUsernames={existingUsernames} />

        {/* Search and actions */}
        <Group gap="xs">
          <TextInput
            flex={1}
            size="sm"
            placeholder={t`Search...`}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <DeleteSelectedButton
            selectedIds={selectedIds}
            onDeleted={handleClearSelection}
          />
        </Group>

        {/* Select all */}
        {filteredConverters.length > 0 && (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(e) => handleSelectAll(e.currentTarget.checked)}
            label={<Trans>Select all</Trans>}
            size="xs"
          />
        )}

        {/* Converter list */}
        <Box style={{ flex: 1, overflow: 'auto' }}>
          {filteredConverters.length > 0 ? (
            <Stack gap="xs">
              {filteredConverters.map((converter) => (
                <UserConverterCard
                  key={converter.id}
                  converter={converter}
                  isSelected={selectedIds.has(converter.id)}
                  onSelect={handleSelect}
                  isExpanded={expandedIds.has(converter.id)}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </Stack>
          ) : (
            <Stack align="center" justify="center" py="xl">
              <Text c="dimmed" size="sm">
                <Trans>No user converters found</Trans>
              </Text>
            </Stack>
          )}
        </Box>
      </Stack>
    </SectionDrawer>
  );
}
