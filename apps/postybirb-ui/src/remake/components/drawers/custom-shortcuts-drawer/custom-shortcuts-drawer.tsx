/**
 * CustomShortcutsDrawer - Drawer for managing custom text shortcuts.
 * Features expandable cards for editing, search, and inline name editing.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    Card,
    Collapse,
    Group,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import type { Description } from '@postybirb/types';
import {
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconPlus,
    IconX,
} from '@tabler/icons-react';
import React, { useCallback, useMemo, useState } from 'react';
import customShortcutApi from '../../../api/custom-shortcut.api';
import {
    useCustomShortcuts,
    useCustomShortcutsLoading,
} from '../../../stores/entity/custom-shortcut-store';
import type { CustomShortcutRecord } from '../../../stores/records/custom-shortcut-record';
import {
    showCreatedNotification,
    showCreateErrorNotification,
    showDeletedNotification,
    showDeleteErrorNotification,
    showUpdateErrorNotification,
} from '../../../utils/notifications';
import { EmptyState } from '../../empty-state';
import { HoldToConfirmButton } from '../../hold-to-confirm';
import { DescriptionEditor, SearchInput } from '../../shared';
import { SectionDrawer } from '../section-drawer';

// ============================================================================
// Types
// ============================================================================

export interface CustomShortcutsDrawerProps {
  /** Whether the drawer is open */
  opened: boolean;
  /** Callback when the drawer should close */
  onClose: () => void;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to filter and sort custom shortcuts.
 */
function useShortcutSearch(
  shortcuts: CustomShortcutRecord[],
  searchQuery: string,
) {
  const [debouncedSearch] = useDebouncedValue(searchQuery, 200);

  const filteredAndSortedShortcuts = useMemo(() => {
    let filtered = [...shortcuts];

    // Filter by search query
    if (debouncedSearch.trim()) {
      const lowerSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter((shortcut) =>
        shortcut.name.toLowerCase().includes(lowerSearch),
      );
    }

    // Sort alphabetically by name
    filtered.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    );

    return filtered;
  }, [shortcuts, debouncedSearch]);

  return filteredAndSortedShortcuts;
}

// ============================================================================
// Shortcut Card Component
// ============================================================================

interface ShortcutCardProps {
  shortcut: CustomShortcutRecord;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
}

const ShortcutCard = React.memo(function ShortcutCard({
  shortcut,
  isExpanded,
  onToggleExpand,
  onDelete,
}: ShortcutCardProps) {
  const [name, setName] = useState(shortcut.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [localDescription, setLocalDescription] = useState<Description>(
    shortcut.shortcut || [],
  );
  const [isDirty, setIsDirty] = useState(false);

  const handleNameBlur = async () => {
    setIsEditingName(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== shortcut.name) {
      try {
        await customShortcutApi.update(shortcut.id, {
          name: trimmed,
          shortcut: shortcut.shortcut,
        });
      } catch (error) {
        showUpdateErrorNotification(t`shortcut`);
        setName(shortcut.name);
      }
    } else {
      setName(shortcut.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setName(shortcut.name);
      setIsEditingName(false);
    }
  };

  const handleDescriptionChange = (value: Description) => {
    setLocalDescription(value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await customShortcutApi.update(shortcut.id, {
        name: shortcut.name,
        shortcut: localDescription,
      });
      setIsDirty(false);
    } catch (error) {
      showUpdateErrorNotification(t`shortcut`);
    }
  };

  return (
    <Card withBorder p="xs">
      {/* Header row */}
      <Group gap="xs" wrap="nowrap" align="center">
        {/* Expand/collapse button */}
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => onToggleExpand(shortcut.id)}
          aria-label={isExpanded ? t`Collapse` : t`Expand`}
        >
          {isExpanded ? (
            <IconChevronDown size={16} />
          ) : (
            <IconChevronRight size={16} />
          )}
        </ActionIcon>

        {/* Name (editable) */}
        {isEditingName ? (
          <TextInput
            size="xs"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            autoFocus
            maxLength={64}
            flex={1}
          />
        ) : (
          <Text
            size="sm"
            fw={500}
            flex={1}
            style={{ cursor: 'pointer' }}
            onClick={() => setIsEditingName(true)}
            truncate
          >
            {shortcut.name}
          </Text>
        )}

        {/* Delete button */}
        <Tooltip label={<Trans>Hold to delete</Trans>}>
          <HoldToConfirmButton
            onConfirm={() => onDelete(shortcut.id)}
            size="xs"
            color="red"
            variant="subtle"
          >
            <IconX size={14} />
          </HoldToConfirmButton>
        </Tooltip>
      </Group>

      {/* Expanded content */}
      <Collapse in={isExpanded}>
        <Box mt="xs">
          <DescriptionEditor
            value={localDescription}
            onChange={handleDescriptionChange}
            showCustomShortcuts={false}
            minHeight={80}
          />
          {isDirty && (
            <Group mt="xs" justify="flex-end">
              <ActionIcon
                variant="filled"
                color="blue"
                size="sm"
                onClick={handleSave}
                aria-label={t`Save`}
              >
                <IconCheck size={14} />
              </ActionIcon>
            </Group>
          )}
        </Box>
      </Collapse>
    </Card>
  );
});

// ============================================================================
// Create Shortcut Form
// ============================================================================

interface CreateShortcutFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  existingNames: Set<string>;
}

function CreateShortcutForm({
  onSuccess,
  onCancel,
  existingNames,
}: CreateShortcutFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t`Name is required`);
      return;
    }
    if (existingNames.has(trimmed.toLowerCase())) {
      setError(t`A shortcut with this name already exists`);
      return;
    }

    try {
      await customShortcutApi.create({ name: trimmed });
      showCreatedNotification(t`shortcut`);
      onSuccess();
    } catch (e) {
      showCreateErrorNotification(t`shortcut`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Card withBorder p="xs">
      <Group gap="xs" wrap="nowrap">
        <TextInput
          placeholder={t`Shortcut name`}
          size="xs"
          value={name}
          onChange={(e) => {
            setName(e.currentTarget.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          error={error}
          autoFocus
          maxLength={64}
          flex={1}
        />
        <ActionIcon
          variant="filled"
          color="blue"
          size="sm"
          onClick={handleSubmit}
          aria-label={t`Create`}
        >
          <IconPlus size={14} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={onCancel}
          aria-label={t`Cancel`}
        >
          <IconX size={14} />
        </ActionIcon>
      </Group>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CustomShortcutsDrawer({
  opened,
  onClose,
}: CustomShortcutsDrawerProps) {
  const shortcuts = useCustomShortcuts();
  const loading = useCustomShortcutsLoading();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const filteredShortcuts = useShortcutSearch(shortcuts, searchQuery);

  // Existing shortcut names for duplicate checking
  const existingNames = useMemo(
    () => new Set(shortcuts.map((s) => s.name.toLowerCase())),
    [shortcuts],
  );

  const toggleExpanded = useCallback((id: string) => {
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

  const handleDelete = useCallback(async (id: string) => {
    try {
      await customShortcutApi.remove([id]);
      showDeletedNotification(1);
    } catch (error) {
      showDeleteErrorNotification();
    }
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setIsCreating(false);
  }, []);

  const isEmpty = filteredShortcuts.length === 0 && !searchQuery.trim();
  const noResults = filteredShortcuts.length === 0 && searchQuery.trim();

  return (
    <SectionDrawer
      opened={opened}
      onClose={onClose}
      title={<Trans>Custom Shortcuts</Trans>}
      width={520}
    >
      <Stack gap="sm" h="100%">
        {/* Search and add button */}
        <Group gap="xs" wrap="nowrap">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            size="xs"
            style={{ flex: 1 }}
          />
          <Tooltip label={<Trans>Add shortcut</Trans>}>
            <ActionIcon
              variant="light"
              color="blue"
              size="md"
              onClick={() => setIsCreating(true)}
              disabled={isCreating}
              aria-label={t`Add shortcut`}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Create form */}
        {isCreating && (
          <CreateShortcutForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreating(false)}
            existingNames={existingNames}
          />
        )}

        {/* Content area */}
        <ScrollArea flex={1} offsetScrollbars>
          {isEmpty && !isCreating && <EmptyState />}

          {noResults && <EmptyState />}

          <Stack gap="xs">
            {filteredShortcuts.map((shortcut) => (
              <ShortcutCard
                key={shortcut.id}
                shortcut={shortcut}
                isExpanded={expandedIds.has(shortcut.id)}
                onToggleExpand={toggleExpanded}
                onDelete={handleDelete}
              />
            ))}
          </Stack>
        </ScrollArea>
      </Stack>
    </SectionDrawer>
  );
}
