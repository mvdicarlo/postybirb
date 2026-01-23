/**
 * ConverterDrawer - Generic drawer for managing tag/user converters.
 * Features compact expandable cards, search, selectable rows with bulk delete,
 * and inline website conversion editing with dropdown to add new conversions.
 *
 * This is a shared implementation used by TagConverterDrawer and UserConverterDrawer.
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
import {
    IconChevronDown,
    IconChevronRight,
    IconPlus,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useWebsites } from '../../../stores/entity/website-store';
import type { BaseRecord } from '../../../stores/records/base-record';
import {
    showCreatedNotification,
    showCreateErrorNotification,
    showDeletedNotification,
    showDeleteErrorNotification,
    showUpdateErrorNotification,
} from '../../../utils/notifications';
import { EmptyState } from '../../empty-state';
import { HoldToConfirmButton } from '../../hold-to-confirm';
import { SearchInput } from '../../shared';
import { SectionDrawer } from '../section-drawer';

// ============================================================================
// Types
// ============================================================================

/**
 * Interface for converter records (tag or user).
 */
export interface ConverterRecord extends BaseRecord {
  readonly convertTo: Record<string, string>;
  readonly conversionCount: number;
}

/**
 * API interface for converter operations.
 */
export interface ConverterApi<TCreateDto, TUpdateDto> {
  create: (dto: TCreateDto) => Promise<unknown>;
  update: (id: string, dto: TUpdateDto) => Promise<unknown>;
  remove: (ids: string[]) => Promise<unknown>;
}

/**
 * Configuration for the converter drawer.
 */
export interface ConverterDrawerConfig<
  TRecord extends ConverterRecord,
  TCreateDto,
  TUpdateDto,
> {
  /** Drawer title */
  title: React.ReactNode;
  /** The primary field name ('tag' or 'username') */
  primaryField: 'tag' | 'username';
  /** Get the primary value from a record */
  getPrimaryValue: (record: TRecord) => string;
  /** API for CRUD operations */
  api: ConverterApi<TCreateDto, TUpdateDto>;
  /** Create a DTO for the update API */
  createUpdateDto: (
    primaryValue: string,
    convertTo: Record<string, string>
  ) => TUpdateDto;
  /** Create a DTO for the create API */
  createCreateDto: (
    primaryValue: string,
    convertTo: Record<string, string>
  ) => TCreateDto;
  /** Entity name for notifications (e.g., "tag converter") */
  entityName: string;
  /** Duplicate field error message */
  duplicateError: string;
}

interface WebsiteOption {
  id: string;
  displayName: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to manage converter search filtering and sorting.
 */
function useConverterSearch<TRecord extends ConverterRecord>(
  converters: TRecord[],
  getPrimaryValue: (record: TRecord) => string,
  searchQuery: string
) {
  const [debouncedSearch] = useDebouncedValue(searchQuery, 200);

  const filteredAndSortedConverters = useMemo(() => {
    let filtered = [...converters];

    // Filter by search query
    if (debouncedSearch.trim()) {
      const lowerSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (converter) =>
          getPrimaryValue(converter).toLowerCase().includes(lowerSearch) ||
          Object.values(converter.convertTo).some((value) =>
            value.toLowerCase().includes(lowerSearch)
          )
      );
    }

    // Sort alphabetically by primary field
    filtered.sort((a, b) =>
      getPrimaryValue(a)
        .toLowerCase()
        .localeCompare(getPrimaryValue(b).toLowerCase())
    );

    return filtered;
  }, [converters, getPrimaryValue, debouncedSearch]);

  return {
    filteredConverters: filteredAndSortedConverters,
    allConverters: converters,
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
  primaryValue,
  convertTo,
  onUpdate,
}: {
  converterId: string;
  primaryValue: string;
  convertTo: Record<string, string>;
  onUpdate: (id: string, convertTo: Record<string, string>) => Promise<void>;
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
        await onUpdate(converterId, filtered);
      } catch {
        showUpdateErrorNotification(primaryValue);
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
// Converter Card Component
// ============================================================================

/**
 * Compact expandable converter card.
 */
function ConverterCard<
  TRecord extends ConverterRecord,
  TCreateDto,
  TUpdateDto,
>({
  converter,
  isSelected,
  onSelect,
  isExpanded,
  onToggleExpand,
  config,
}: {
  converter: TRecord;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  config: ConverterDrawerConfig<TRecord, TCreateDto, TUpdateDto>;
}) {
  const primaryValue = config.getPrimaryValue(converter);
  const [localValue, setLocalValue] = useState(primaryValue);

  const handleBlur = async () => {
    const trimmed = localValue.trim();
    if (!trimmed) {
      setLocalValue(primaryValue);
      return;
    }
    if (trimmed === primaryValue) return;

    try {
      const dto = config.createUpdateDto(trimmed, converter.convertTo);
      await config.api.update(converter.id, dto);
    } catch {
      showUpdateErrorNotification(primaryValue);
      setLocalValue(primaryValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setLocalValue(primaryValue);
    }
  };

  const handleUpdate = useCallback(
    async (id: string, convertTo: Record<string, string>) => {
      const dto = config.createUpdateDto(primaryValue, convertTo);
      await config.api.update(id, dto);
    },
    [config, primaryValue]
  );

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
          value={localValue}
          onChange={(e) => setLocalValue(e.currentTarget.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
            primaryValue={primaryValue}
            convertTo={converter.convertTo}
            onUpdate={handleUpdate}
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
  onRemove,
  entityName,
}: {
  selectedIds: Set<string>;
  onDeleted: () => void;
  onRemove: (ids: string[]) => Promise<unknown>;
  entityName: string;
}) {
  const count = selectedIds.size;

  const handleDelete = useCallback(async () => {
    try {
      await onRemove([...selectedIds]);
      showDeletedNotification(count);
      onDeleted();
    } catch {
      showDeleteErrorNotification();
    }
  }, [selectedIds, count, onDeleted, onRemove]);

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
 * Create new converter form.
 */
function CreateConverterForm({
  existingValues,
  onCreate,
  entityName,
  duplicateError,
}: {
  existingValues: Set<string>;
  onCreate: (primaryValue: string) => Promise<void>;
  entityName: string;
  duplicateError: string;
}) {
  const [value, setValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const isDuplicate = existingValues.has(value.trim().toLowerCase());

  const handleCreate = async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isDuplicate) return;

    setIsCreating(true);
    try {
      await onCreate(trimmedValue);
      showCreatedNotification(trimmedValue);
      setValue('');
    } catch {
      showCreateErrorNotification(trimmedValue);
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
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={isCreating}
        error={isDuplicate ? duplicateError : undefined}
      />
      <Tooltip label={<Trans>Create</Trans>}>
        <ActionIcon
          variant="filled"
          onClick={handleCreate}
          disabled={!value.trim() || isDuplicate || isCreating}
          loading={isCreating}
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

// ============================================================================
// Main Generic Drawer Component
// ============================================================================

/**
 * Props for the generic ConverterDrawer component.
 */
export interface ConverterDrawerProps<
  TRecord extends ConverterRecord,
  TCreateDto,
  TUpdateDto,
> {
  /** Whether the drawer is open */
  opened: boolean;
  /** Called when drawer should close */
  onClose: () => void;
  /** All converter records */
  converters: TRecord[];
  /** Configuration for the drawer */
  config: ConverterDrawerConfig<TRecord, TCreateDto, TUpdateDto>;
}

/**
 * Generic converter drawer component.
 * Used by TagConverterDrawer and UserConverterDrawer.
 */
export function ConverterDrawer<
  TRecord extends ConverterRecord,
  TCreateDto,
  TUpdateDto,
>({
  opened,
  onClose,
  converters,
  config,
}: ConverterDrawerProps<TRecord, TCreateDto, TUpdateDto>) {
  const [searchQuery, setSearchQuery] = useState('');
  const { filteredConverters, allConverters } = useConverterSearch(
    converters,
    config.getPrimaryValue,
    searchQuery
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Existing values for duplicate check (case-insensitive)
  const existingValues = useMemo(
    () =>
      new Set(allConverters.map((c) => config.getPrimaryValue(c).toLowerCase())),
    [allConverters, config]
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

  const handleCreate = useCallback(
    async (primaryValue: string) => {
      const dto = config.createCreateDto(primaryValue, {});
      await config.api.create(dto);
    },
    [config]
  );

  const allSelected =
    filteredConverters.length > 0 &&
    selectedIds.size === filteredConverters.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <SectionDrawer
      opened={opened}
      onClose={onClose}
      title={config.title}
      width={500}
    >
      <Stack gap="md" h="100%">
        {/* Create form */}
        <CreateConverterForm
          existingValues={existingValues}
          onCreate={handleCreate}
          entityName={config.entityName}
          duplicateError={config.duplicateError}
        />

        {/* Search and actions */}
        <Group gap="xs">
          <SearchInput
            flex={1}
            size="sm"
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
          <DeleteSelectedButton
            selectedIds={selectedIds}
            onDeleted={handleClearSelection}
            onRemove={config.api.remove}
            entityName={config.entityName}
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
                <ConverterCard
                  key={converter.id}
                  converter={converter}
                  isSelected={selectedIds.has(converter.id)}
                  onSelect={handleSelect}
                  isExpanded={expandedIds.has(converter.id)}
                  onToggleExpand={handleToggleExpand}
                  config={config}
                />
              ))}
            </Stack>
          ) : (
            <EmptyState
              preset={searchQuery.trim() ? 'no-results' : 'no-records'}
            />
          )}
        </Box>
      </Stack>
    </SectionDrawer>
  );
}
