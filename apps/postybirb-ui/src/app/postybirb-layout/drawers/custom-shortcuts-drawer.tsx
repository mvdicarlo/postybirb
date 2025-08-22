import { Trans } from '@lingui/macro';
import {
    Box,
    Button,
    Checkbox,
    Collapse,
    Divider,
    Drawer,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { DefaultDescription, ICustomShortcutDto } from '@postybirb/types';
import {
    IconChevronDown,
    IconChevronUp,
    IconPlus,
    IconSearch,
    IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import customShortcutApi from '../../../api/custom-shortcut.api';
import { ComponentErrorBoundary } from '../../../components/error-boundary';
import { PostyBirbEditor } from '../../../components/shared/postybirb-editor/postybirb-editor';
import { CustomShortcutStore } from '../../../stores/custom-shortcut.store';
import { useStore } from '../../../stores/use-store';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

function isValidShortcut(shortcut: Partial<ICustomShortcutDto>) {
  return shortcut?.name?.trim() && shortcut?.shortcut;
}

function areEqualShortcut(
  old: Partial<ICustomShortcutDto>,
  current: Partial<ICustomShortcutDto>,
) {
  return (
    old.name === current.name &&
    old.inline === current.inline &&
    JSON.stringify(old.shortcut) === JSON.stringify(current.shortcut)
  );
}

function ExistingShortcut({ shortcut }: { shortcut: ICustomShortcutDto }) {
  const [state, setState] = useState<ICustomShortcutDto>({ ...shortcut });
  const [opened, { toggle }] = useDisclosure(false);
  const hasChanges = !areEqualShortcut(shortcut, state);

  return (
    <Paper withBorder p="xs" radius="md" shadow={opened ? 'sm' : undefined}>
      <Group justify="space-between" mb={opened ? 'xs' : 0}>
        <Group>
          <Text fw={500}>{shortcut.name}</Text>
          <Tooltip
            label={
              shortcut.inline ? <Trans>Inline</Trans> : <Trans>Block</Trans>
            }
          >
            <Checkbox
              checked={shortcut.inline}
              readOnly
              label={<Trans>Inline</Trans>}
              size="xs"
            />
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
            <Trans>Edit</Trans>
          </Button>
        </Group>
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
        <Checkbox
          mt="xs"
          checked={state.inline}
          label={<Trans>Inline</Trans>}
          onChange={(event) =>
            setState({ ...state, inline: event.currentTarget.checked })
          }
        />
        <Box mt="xs">
          <Text size="sm" mb={4}>
            <Trans>Shortcut</Trans>
          </Text>
          <PostyBirbEditor
            isDefaultEditor={false}
            value={state.shortcut}
            onChange={(val) => setState({ ...state, shortcut: val })}
          />
        </Box>
        <Group mt="md" grow>
          <Button
            variant="light"
            disabled={!isValidShortcut(state) || !hasChanges}
            onClick={() => {
              customShortcutApi.update(shortcut.id, state).then(() => {
                notifications.show({
                  title: <Trans>Updated</Trans>,
                  message: <Trans>Shortcut updated</Trans>,
                  color: 'green',
                  autoClose: 2000,
                });
              });
            }}
          >
            <Trans>Save</Trans>
          </Button>
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => {
              customShortcutApi.remove([shortcut.id]).then(() => {
                notifications.show({
                  title: <Trans>Deleted</Trans>,
                  message: <Trans>Shortcut deleted</Trans>,
                  color: 'red',
                  autoClose: 2000,
                });
              });
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </Group>
      </Collapse>
    </Paper>
  );
}

function CustomShortcuts() {
  const { state: shortcuts, isLoading } = useStore(CustomShortcutStore);
  const [newShortcut, setNewShortcut] = useState<Partial<ICustomShortcutDto>>({
    name: '',
    inline: false,
    shortcut: DefaultDescription(),
  });
  const [showNewForm, { toggle: toggleNewForm }] = useDisclosure(false);
  const [search, setSearch] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedShortcuts = useMemo(
    () =>
      [...(shortcuts || [])].sort((a, b) => {
        if (sortDirection === 'asc') {
          return a.name.localeCompare(b.name);
        }
        return b.name.localeCompare(a.name);
      }),
    [shortcuts, sortDirection],
  );

  const filteredShortcuts = useMemo(() => {
    if (!search.trim()) return sortedShortcuts;
    const searchLower = search.toLowerCase();
    return sortedShortcuts.filter(
      (sc) =>
        sc.name.toLowerCase().includes(searchLower) ||
        (sc.shortcut &&
          JSON.stringify(sc.shortcut).toLowerCase().includes(searchLower)),
    );
  }, [sortedShortcuts, search]);

  const resetForm = () => {
    setNewShortcut({
      name: '',
      inline: false,
      shortcut: DefaultDescription(),
    });
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
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </Group>
        <Group justify="space-between">
          <Button
            leftSection={<IconPlus size={16} />}
            variant="light"
            onClick={toggleNewForm}
          >
            <Trans>New Shortcut</Trans>
          </Button>
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() =>
              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            }
          >
            {sortDirection === 'asc' ? (
              <Trans>Sort Asc</Trans>
            ) : (
              <Trans>Sort Desc</Trans>
            )}
          </Button>
        </Group>
        <Collapse in={showNewForm}>
          <Paper withBorder p="xs" radius="md" shadow="sm">
            <TextInput
              required
              value={newShortcut.name}
              label={<Trans>Name</Trans>}
              onChange={(event) =>
                setNewShortcut({
                  ...newShortcut,
                  name: event.currentTarget.value,
                })
              }
            />
            <Checkbox
              mt="xs"
              checked={!!newShortcut.inline}
              label={<Trans>Inline</Trans>}
              onChange={(event) =>
                setNewShortcut({
                  ...newShortcut,
                  inline: event.currentTarget.checked,
                })
              }
            />
            <Box mt="xs">
              <Text size="sm" mb={4}>
                <Trans>Shortcut</Trans>
              </Text>
              <PostyBirbEditor
                isDefaultEditor={false}
                value={newShortcut.shortcut || []}
                onChange={(val) =>
                  setNewShortcut({ ...newShortcut, shortcut: val })
                }
              />
            </Box>
            <Group mt="md" grow>
              <Button
                variant="light"
                disabled={!isValidShortcut(newShortcut)}
                onClick={() => {
                  customShortcutApi
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    .create({ name: newShortcut.name! })
                    .then(() => {
                      notifications.show({
                        title: <Trans>Created</Trans>,
                        message: <Trans>Shortcut created</Trans>,
                        color: 'green',
                        autoClose: 2000,
                      });
                      resetForm();
                      toggleNewForm();
                    });
                }}
              >
                <Trans>Create</Trans>
              </Button>
            </Group>
          </Paper>
        </Collapse>
        {filteredShortcuts.length > 0 ? (
          <Stack gap="sm">
            {filteredShortcuts.map((sc) => (
              <ExistingShortcut key={sc.id} shortcut={sc} />
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" ta="center">
            <Trans>No shortcuts found</Trans>
          </Text>
        )}
      </Stack>
    </Box>
  );
}

export function CustomShortcutsDrawer() {
  const [visible, toggle] = useDrawerToggle('customShortcutsDrawerVisible');
  return (
    <ComponentErrorBoundary>
      <Drawer
        closeOnClickOutside
        ml={-marginOffset}
        size="lg"
        portalProps={{
          target: getPortalTarget(),
        }}
        overlayProps={{
          left: getOverlayOffset(),
          zIndex: 100,
        }}
        trapFocus
        opened={visible}
        onClose={() => toggle()}
        title={
          <Text fw="bold" size="1.2rem">
            <Trans>Custom Shortcuts</Trans>
          </Text>
        }
        styles={{
          body: {
            padding: '16px',
            height: 'calc(100% - 60px)',
          },
        }}
      >
        <CustomShortcuts />
      </Drawer>
    </ComponentErrorBoundary>
  );
}
