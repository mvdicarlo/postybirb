import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  Fieldset,
  Flex,
  Group,
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
import { CommonTranslations } from '../../../translations/common-translations';
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

function ExistingTagGroup(props: { tagGroup: TagGroupDto }) {
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
      message: <CommonTranslations.CopiedToClipboard />,
      color: 'blue',
      autoClose: 2000,
    });
  };

  return (
    <Paper withBorder p="xs" radius="md" shadow={opened ? 'sm' : undefined}>
      <Flex justify="space-between" mb={opened ? 'xs' : 0}>
        <Group>
          <Text fw={500}>{tagGroup.name} </Text>
          <Badge size="xs" variant="light" color="gray">
            {tagGroup.tags.length}
          </Badge>
          <Tooltip label={<CommonTranslations.CopyToClipboard />}>
            <ActionIcon variant="subtle" size="xs" onClick={handleCopyTags}>
              <IconClipboardCopy size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Button
          variant="subtle"
          size="compact-sm"
          onClick={toggle}
          rightSection={
            opened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />
          }
        >
          {opened ? <CommonTranslations.Hide /> : <CommonTranslations.Edit />}
        </Button>
      </Flex>
      <Group gap={5} pt="4">
        {tagGroup.tags.map((tag) => (
          <Badge size="xs" variant="light" color="blue" radius="sm" key={tag}>
            {tag}
          </Badge>
        ))}
      </Group>

      <Collapse in={opened}>
        <Divider my="xs" />
        <TextInput
          required
          value={state.name}
          label={<Trans>Name</Trans>}
          onChange={(event) =>
            setState({ ...state, name: event.currentTarget.value })
          }
        />
        <TagsInput
          mt="xs"
          required
          clearable
          value={state.tags}
          label={<Trans>Tags</Trans>}
          onClear={() => {
            setState({ ...state, tags: [] });
          }}
          onChange={(value) => setState({ ...state, tags: value })}
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
                    message: (
                      <CommonTranslations.NounUpdated
                        noun={<Trans>Tag group</Trans>}
                      />
                    ),
                    color: 'green',
                  });
                })
                .catch(() => {
                  notifications.show({
                    title: state.name,
                    message: <CommonTranslations.FailedToUpdate />,
                    color: 'red',
                  });
                });
            }}
          >
            <CommonTranslations.Update />
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
                  message: (
                    <CommonTranslations.NounDeleted
                      noun={<Trans>Tag group</Trans>}
                    />
                  ),
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
    setNewGroupFields({ name: '', tags: [] });
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Box>
      <Stack gap="md">
        <Group grow>
          <TextInput
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
          <Group>
            <Group ml="xs">
              <Tooltip
                label={
                  sortDirection === 'asc' ? (
                    <CommonTranslations.SortDescending />
                  ) : (
                    <CommonTranslations.SortAscending />
                  )
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
              label={<Trans>Name</Trans>}
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
              </Group>
              <TagsInput
                required
                clearable
                value={newGroupFields.tags}
                onChange={(value) =>
                  setNewGroupFields({ ...newGroupFields, tags: value })
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
                <CommonTranslations.Clear />
              </Button>
              <Button
                variant="filled"
                disabled={!isValidTagGroup(newGroupFields)}
                onClick={() => {
                  tagGroupsApi.create(newGroupFields).then(() => {
                    setNewGroupFields({ name: '', tags: [] });
                    notifications.show({
                      title: newGroupFields.name,
                      message: (
                        <CommonTranslations.NounCreated
                          noun={<Trans>Tag group</Trans>}
                        />
                      ),
                      color: 'green',
                    });
                  });
                }}
              >
                <CommonTranslations.Save />
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
            <CommonTranslations.NoItemsFound />
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
        closeOnClickOutside
        ml={-marginOffset}
        size="lg"
        portalProps={{ target: getPortalTarget() }}
        overlayProps={{ left: getOverlayOffset(), zIndex: 100 }}
        trapFocus
        opened={visible}
        onClose={() => toggle()}
        title={
          <Text fw="bold" size="1.2rem">
            <Trans>Tag Groups</Trans>
          </Text>
        }
        styles={{ body: { padding: '16px', height: 'calc(100% - 60px)' } }}
      >
        <TagGroups />
      </Drawer>
    </ComponentErrorBoundary>
  );
}
