import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  Fieldset,
  Group,
  HoverCard,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useClipboard, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { ICreateTagGroupDto, TagGroupDto } from '@postybirb/types';
import {
  IconChevronDown,
  IconChevronUp,
  IconClipboardCopy,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import tagGroupsApi from '../../../api/tag-groups.api';
import { ComponentErrorBoundary } from '../../../components/error-boundary/specialized-error-boundaries';
import { DeleteActionPopover } from '../../../components/shared/delete-action-popover/delete-action-popover';
import { TagGroupStore } from '../../../stores/tag-group-store';
import { useStore } from '../../../stores/use-store';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

function isValidTagGroup(tagGroup: ICreateTagGroupDto) {
  return tagGroup.name.trim().length > 0 && tagGroup.tags.length > 0;
}

function areEqual(
  old: Pick<ICreateTagGroupDto, 'name' | 'tags'>,
  current: Pick<ICreateTagGroupDto, 'name' | 'tags'>,
) {
  return JSON.stringify(old) === JSON.stringify(current);
}

function TagBadgePreview({ tags }: { tags: string[] }) {
  const visibleTags = tags.slice(0, 5);
  const remainingCount = Math.max(0, tags.length - 5);

  return (
    <Group gap="xs">
      {visibleTags.map((tag) => (
        <Text key={tag} size="xs" c="dimmed" span>
          {tag}
        </Text>
      ))}
      {remainingCount > 0 && (
        <Text size="xs" c="dimmed" span>
          +{remainingCount} <Trans>more</Trans>
        </Text>
      )}
    </Group>
  );
}

function ExistingTagGroup(props: { tagGroup: TagGroupDto }) {
  const { _ } = useLingui();
  const { tagGroup } = props;
  const [state, setState] = useState<ICreateTagGroupDto>({
    name: tagGroup.name,
    tags: tagGroup.tags,
  });
  const [opened, { toggle }] = useDisclosure(false);
  const clipboard = useClipboard();

  const hasChanges = !areEqual(
    { name: tagGroup.name, tags: tagGroup.tags },
    state,
  );

  const handleCopyTags = () => {
    clipboard.copy(tagGroup.tags.join(', '));
    notifications.show({
      title: <Trans>Copied</Trans>,
      message: _(msg`${tagGroup.tags.length} tags copied to clipboard`),
      color: 'blue',
      autoClose: 2000,
    });
  };

  return (
    <Paper withBorder p="xs" radius="md" shadow={opened ? 'sm' : undefined}>
      <Group justify="space-between" mb={opened ? 'xs' : 0}>
        <Group>
          <HoverCard
            shadow="md"
            position="right"
            withArrow
            openDelay={300}
            closeDelay={200}
            width={280}
          >
            <HoverCard.Target>
              <Text fw={500} style={{ cursor: 'pointer' }}>
                {tagGroup.name}{' '}
                <Badge size="xs" variant="light" color="gray">
                  {tagGroup.tags.length}
                </Badge>
              </Text>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Text size="sm" fw={500}>
                <Trans>Tags in this group:</Trans>
              </Text>
              <Box mt="xs" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {tagGroup.tags.map((tag) => (
                  <Badge
                    key={tag}
                    size="sm"
                    variant="light"
                    color="blue"
                    radius="sm"
                    mr="xs"
                    mb="xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </Box>
            </HoverCard.Dropdown>
          </HoverCard>
          <TagBadgePreview tags={tagGroup.tags} />
          <Tooltip label={<Trans>Copy all tags</Trans>}>
            <ActionIcon variant="subtle" size="xs" onClick={handleCopyTags}>
              <IconClipboardCopy size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Group>
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={toggle}
            rightSection={
              opened ? (
                <IconChevronUp size={16} />
              ) : (
                <IconChevronDown size={16} />
              )
            }
          >
            {opened ? <Trans>Hide</Trans> : <Trans>Edit</Trans>}
          </Button>
        </Group>
      </Group>

      <Collapse in={opened}>
        <Divider my="xs" />
        <TextInput
          required
          value={state.name}
          label={<Trans>Group Name</Trans>}
          onChange={(event) =>
            setState({
              ...state,
              name: event.currentTarget.value,
            })
          }
        />
        <TagsInput
          mt="xs"
          required
          clearable
          value={state.tags}
          label={<Trans>Tags</Trans>}
          onClear={() => {
            setState({
              ...state,
              tags: [],
            });
          }}
          onChange={(value) =>
            setState({
              ...state,
              tags: value,
            })
          }
        />
        <Group mt="md" grow>
          <Button
            variant="light"
            disabled={!isValidTagGroup(state) || !hasChanges}
            onClick={() => {
              tagGroupsApi
                .update(tagGroup.id, state)
                .then(() => {
                  notifications.show({
                    title: state.name,
                    message: <Trans>Tag group updated</Trans>,
                    color: 'green',
                  });
                })
                .catch(() => {
                  notifications.show({
                    title: state.name,
                    message: <Trans>Failed to update</Trans>,
                    color: 'red',
                  });
                });
            }}
          >
            <Trans>Update</Trans>
          </Button>
          <DeleteActionPopover
            additionalContent={
              <Text size="sm" mt="xs">
                {tagGroup.name} ({tagGroup.tags.length})
              </Text>
            }
            onDelete={() => {
              tagGroupsApi.remove([tagGroup.id]).then(() => {
                notifications.show({
                  title: tagGroup.name,
                  message: <Trans>Tag group deleted</Trans>,
                  color: 'green',
                });
              });
            }}
          />
        </Group>
      </Collapse>
    </Paper>
  );
}

function TagGroups() {
  const { _ } = useLingui();
  const { state: tagGroups, isLoading } = useStore(TagGroupStore);
  const [newGroupFields, setNewGroupFields] = useState<ICreateTagGroupDto>({
    name: '',
    tags: [],
  });
  const [search, setSearch] = useState('');
  const [showNewGroupForm, { toggle: toggleNewGroupForm }] =
    useDisclosure(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedTagGroups = useMemo(
    () =>
      [...(tagGroups || [])].sort((a, b) => {
        if (sortDirection === 'asc') {
          return a.name.localeCompare(b.name);
        }
        return b.name.localeCompare(a.name);
      }),
    [tagGroups, sortDirection],
  );

  const filteredTagGroups = useMemo(() => {
    const filtered = sortedTagGroups;
    if (!search.trim()) return filtered;

    const searchLower = search.toLowerCase();
    return filtered.filter(
      (group) =>
        group.name.toLowerCase().includes(searchLower) ||
        group.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
    );
  }, [sortedTagGroups, search]);

  const resetForm = () => {
    setNewGroupFields({
      name: '',
      tags: [],
    });
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        const tags = clipboardText
          .split(/[,\n]/)
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        if (tags.length > 0) {
          setNewGroupFields((prev) => ({
            ...prev,
            tags: [...new Set([...prev.tags, ...tags])],
          }));

          notifications.show({
            title: <Trans>Tags Pasted</Trans>,
            message: _(msg`${tags.length} tags imported from clipboard`),
            color: 'blue',
          });
        }
      }
    } catch (error) {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: <Trans>Failed to paste from clipboard</Trans>,
        color: 'red',
      });
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Box>
      <Stack gap="md">
        <Group grow>
          <TextInput
            placeholder={_(msg`Search`)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              search ? (
                <ActionIcon variant="transparent" onClick={() => setSearch('')}>
                  <IconX size={16} />
                </ActionIcon>
              ) : null
            }
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </Group>

        <Group justify="space-between">
          <Group>
            <Text fw={500} size="md">
              <Trans>Tag Groups</Trans> ({filteredTagGroups.length}/
              {tagGroups?.length || 0})
            </Text>
            <Group ml="xs">
              <Tooltip
                label={
                  sortDirection === 'asc'
                    ? _(msg`Sort Descending`)
                    : _(msg`Sort Ascending`)
                }
              >
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={toggleSortDirection}
                >
                  {sortDirection === 'asc' ? (
                    <IconSortAscending size={16} />
                  ) : (
                    <IconSortDescending size={16} />
                  )}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            variant="light"
            size="compact-sm"
            onClick={toggleNewGroupForm}
          >
            {showNewGroupForm ? (
              <Trans>Hide Form</Trans>
            ) : (
              <Trans>Create New</Trans>
            )}
          </Button>
        </Group>

        <Collapse in={showNewGroupForm}>
          <Fieldset
            legend={
              <Box mx="4">
                <Trans>Create new tag group</Trans>
              </Box>
            }
          >
            <TextInput
              required
              value={newGroupFields.name}
              label={<Trans>Group Name</Trans>}
              onChange={(event) =>
                setNewGroupFields({
                  ...newGroupFields,
                  name: event.currentTarget.value,
                })
              }
            />
            <Box mt="xs">
              <Group justify="space-between" mb={5}>
                <Text component="label" size="sm" fw={500}>
                  <Trans>Tags</Trans>
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={handlePasteFromClipboard}
                  leftSection={<IconClipboardCopy size={14} />}
                  aria-label={_(msg`Paste tags from clipboard`)}
                >
                  <Trans>Paste from clipboard</Trans>
                </Button>
              </Group>
              <TagsInput
                required
                clearable
                value={newGroupFields.tags}
                onChange={(value) =>
                  setNewGroupFields({
                    ...newGroupFields,
                    tags: value,
                  })
                }
              />
            </Box>
            <Group mt="md" grow>
              <Button
                variant="light"
                color="gray"
                onClick={resetForm}
                disabled={
                  newGroupFields.name === '' && newGroupFields.tags.length === 0
                }
              >
                <Trans>Clear</Trans>
              </Button>
              <Button
                variant="filled"
                disabled={!isValidTagGroup(newGroupFields)}
                onClick={() => {
                  tagGroupsApi.create(newGroupFields).then(() => {
                    setNewGroupFields({
                      name: '',
                      tags: [],
                    });
                    notifications.show({
                      title: newGroupFields.name,
                      message: <Trans>Tag group created</Trans>,
                      color: 'green',
                    });
                  });
                }}
              >
                <Trans>Save</Trans>
              </Button>
            </Group>
          </Fieldset>
        </Collapse>

        {filteredTagGroups.length > 0 ? (
          // eslint-disable-next-line lingui/no-unlocalized-strings
          <ScrollArea h="calc(100vh - 280px)" offsetScrollbars>
            <Stack gap="sm">
              {filteredTagGroups.map((tagGroup) => (
                <ExistingTagGroup key={tagGroup.id} tagGroup={tagGroup} />
              ))}
            </Stack>
          </ScrollArea>
        ) : (
          <Paper p="lg" withBorder radius="md" ta="center">
            {search ? (
              <Text c="dimmed">
                <Trans>No tag groups match your search or filters</Trans>
              </Text>
            ) : (
              <Text c="dimmed">
                <Trans>No tag groups created yet</Trans>
              </Text>
            )}
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

export function TagGroupDrawer() {
  const [visible, toggle] = useDrawerToggle('tagGroupsDrawerVisible');
  return (
    <ComponentErrorBoundary>
      <Drawer
        withOverlay={false}
        closeOnClickOutside
        ml={-marginOffset}
        size="lg"
        portalProps={{
          target: getPortalTarget(),
        }}
        overlayProps={{
          left: getOverlayOffset(),
          zIndex: 0,
        }}
        trapFocus
        opened={visible}
        onClose={() => toggle()}
        title={
          <Text fw="bold" size="1.2rem">
            <Trans>Tag Groups</Trans>
          </Text>
        }
        styles={{
          body: {
            padding: '16px',
            height: 'calc(100% - 60px)',
          },
        }}
      >
        <TagGroups />
      </Drawer>
    </ComponentErrorBoundary>
  );
}
