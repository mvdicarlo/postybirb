/**
 * TagGroupDrawer - Drawer for managing tag groups.
 * Features search, editable table with name and tags columns,
 * selectable rows with bulk delete, and mini-form for creating new groups.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    Checkbox,
    Group,
    Stack,
    Table,
    TagsInput,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import { useDebouncedCallback, useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import tagGroupsApi from '../../../api/tag-groups.api';
import { useTagGroups } from '../../../stores';
import type { TagGroupRecord } from '../../../stores/records';
import { useActiveDrawer, useDrawerActions } from '../../../stores/ui-store';
import { HoldToConfirmButton } from '../../hold-to-confirm';
import { SectionDrawer } from '../section-drawer';

/**
 * Hook to manage tag group search filtering and sorting.
 */
function useTagGroupSearch(searchQuery: string) {
  const tagGroups = useTagGroups();
  const [debouncedSearch] = useDebouncedValue(searchQuery, 200);

  const filteredAndSortedGroups = useMemo(() => {
    let groups = [...tagGroups];

    // Filter by search query
    if (debouncedSearch.trim()) {
      const lowerSearch = debouncedSearch.toLowerCase();
      groups = groups.filter((group) =>
        group.name.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort alphabetically by name
    groups.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    return groups;
  }, [tagGroups, debouncedSearch]);

  return { filteredGroups: filteredAndSortedGroups, allGroups: tagGroups };
}

// ============================================================================
// Editable Cell Components
// ============================================================================

/**
 * Editable name cell component.
 * Saves on blur if name is valid (non-empty) and changed.
 */
function EditableNameCell({
  groupId,
  initialName,
  tags,
}: {
  groupId: string;
  initialName: string;
  tags: string[];
}) {
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);

  const handleBlur = async () => {
    setIsEditing(false);
    const trimmedName = name.trim();

    // Revert if empty
    if (!trimmedName) {
      setName(initialName);
      return;
    }

    // Skip if unchanged
    if (trimmedName === initialName) {
      return;
    }

    try {
      await tagGroupsApi.update(groupId, { name: trimmedName, tags });
    } catch {
      notifications.show({
        title: initialName,
        message: <Trans>Failed to update tag group</Trans>,
        color: 'red',
      });
      setName(initialName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setName(initialName);
      setIsEditing(false);
    }
  };

  return (
    <TextInput
      value={name}
      onChange={(e) => setName(e.currentTarget.value)}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      size="sm"
      styles={{
        input: {
          minWidth: 100,
        },
      }}
    />
  );
}

/**
 * Editable tags cell component.
 * Saves with 300ms debounce after tag changes.
 */
function EditableTagsCell({
  groupId,
  name,
  initialTags,
}: {
  groupId: string;
  name: string;
  initialTags: string[];
}) {
  const [tags, setTags] = useState<string[]>(initialTags);

  const debouncedSave = useDebouncedCallback(async (newTags: string[]) => {
    try {
      await tagGroupsApi.update(groupId, { name, tags: newTags });
    } catch {
      notifications.show({
        title: name,
        message: <Trans>Failed to update tags</Trans>,
        color: 'red',
      });
      setTags(initialTags);
    }
  }, 300);

  const handleChange = (newTags: string[]) => {
    setTags(newTags);
    debouncedSave(newTags);
  };

  return (
    <TagsInput
      value={tags}
      onChange={handleChange}
      size="sm"
      styles={{
        input: {
          minWidth: 150,
        },
      }}
    />
  );
}

// ============================================================================
// Action Components
// ============================================================================

/**
 * Hold-to-confirm delete button.
 * User must hold mouse down or Enter key for 1 second to confirm deletion.
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
      await tagGroupsApi.remove([...selectedIds]);
      notifications.show({
        message: <Trans>{count} tag group(s) deleted</Trans>,
        color: 'green',
      });
      onDeleted();
    } catch {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: <Trans>Failed to delete tag groups</Trans>,
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
 * Mini-form for creating a new tag group.
 */
function CreateTagGroupForm() {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsCreating(true);
    try {
      await tagGroupsApi.create({ name: trimmedName, tags: [] });
      notifications.show({
        title: trimmedName,
        message: <Trans>Tag group created</Trans>,
        color: 'green',
      });
      setName('');
    } catch {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: <Trans>Failed to create tag group</Trans>,
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
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={isCreating}
      />
      <Tooltip label={<Trans>Create</Trans>}>
        <ActionIcon
          variant="filled"
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
          loading={isCreating}
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

// ============================================================================
// Table Components
// ============================================================================

/**
 * Tag group table row component.
 */
function TagGroupRow({
  group,
  isSelected,
  onToggleSelect,
}: {
  group: TagGroupRecord;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <Table.Tr>
      <Table.Td w={40}>
        <Checkbox
          checked={isSelected}
          onChange={() => onToggleSelect(group.id)}
        />
      </Table.Td>
      <Table.Td>
        <EditableNameCell
          groupId={group.id}
          initialName={group.name}
          tags={group.tags}
        />
      </Table.Td>
      <Table.Td>
        <EditableTagsCell
          groupId={group.id}
          name={group.name}
          initialTags={group.tags}
        />
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * Tag groups table component.
 */
function TagGroupsTable({
  groups,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  groups: TagGroupRecord[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) {
  if (groups.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        <Trans>No tag groups found</Trans>
      </Text>
    );
  }

  const allSelected = groups.length > 0 && groups.every((g) => selectedIds.has(g.id));
  const someSelected = groups.some((g) => selectedIds.has(g.id)) && !allSelected;

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={40}>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={onToggleSelectAll}
            />
          </Table.Th>
          <Table.Th>
            <Trans>Name</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Tags</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {groups.map((group) => (
          <TagGroupRow
            key={group.id}
            group={group}
            isSelected={selectedIds.has(group.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}

// ============================================================================
// Main Drawer Component
// ============================================================================

/**
 * Main Tag Group Drawer component.
 */
export function TagGroupDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const opened = activeDrawer === 'tagGroups';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { filteredGroups } = useTagGroupSearch(searchQuery);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (filteredGroups.every((g) => selectedIds.has(g.id))) {
      // Deselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredGroups.forEach((g) => next.delete(g.id));
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredGroups.forEach((g) => next.add(g.id));
        return next;
      });
    }
  };

  const handleDeleted = () => {
    setSelectedIds(new Set());
  };

  return (
    <SectionDrawer
      opened={opened}
      onClose={closeDrawer}
      title={<Trans>Tag Groups</Trans>}
      width={450}
    >
      <Stack gap="md" h="100%">
        {/* Create new tag group form */}
        <CreateTagGroupForm />

        {/* Search and delete actions */}
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
            onDeleted={handleDeleted}
          />
        </Group>

        {/* Table */}
        <Box style={{ flex: 1, overflow: 'auto' }}>
          <TagGroupsTable
            groups={filteredGroups}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
          />
        </Box>
      </Stack>
    </SectionDrawer>
  );
}
