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
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  ICreateUserConverterDto,
  IWebsiteInfoDto,
  UserConverterDto,
} from '@postybirb/types';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import userConvertersApi from '../../../api/user-converters.api';
import { ComponentErrorBoundary } from '../../../components/error-boundary/specialized-error-boundaries';
import { DeleteActionPopover } from '../../../components/shared/delete-action-popover/delete-action-popover';
import { useStore } from '../../../stores/use-store';
import { UserConverterStore } from '../../../stores/user-converter-store';
import { WebsiteStore } from '../../../stores/website.store';
import { CommonTranslations } from '../../../translations/common-translations';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

function isValid(converter: ICreateUserConverterDto) {
  return converter.username.trim().length > 0;
}

function areEqual(
  old: Pick<ICreateUserConverterDto, 'username' | 'convertTo'>,
  current: Pick<ICreateUserConverterDto, 'username' | 'convertTo'>,
) {
  return JSON.stringify(old) === JSON.stringify(current);
}

function WebsiteConverterInputs({
  value,
  onChange,
  websites,
  disabled = false,
}: {
  value: Record<string, string>;
  onChange: (newValue: Record<string, string>) => void;
  websites: IWebsiteInfoDto[];
  disabled?: boolean;
}) {
  const sitesWithValues = useMemo(
    () => websites.filter((site) => value[site.id]?.trim().length > 0),
    [websites, value],
  );

  const handleChange = (siteId: string, newValue: string) => {
    onChange({ ...value, [siteId]: newValue });
  };

  const handleBlur = (siteId: string, newValue: string) => {
    onChange({ ...value, [siteId]: newValue.trim() });
  };

  return (
    <Box mt="md">
      <Group justify="space-between" mb="md">
        <Group>
          <Text size="sm" fw={500}>
            <Trans>Website Conversions</Trans>
          </Text>
          {sitesWithValues.length > 0 && (
            <Group gap={5}>
              {sitesWithValues.map((site) => (
                <Badge
                  key={site.id}
                  size="sm"
                  variant="light"
                  color="blue"
                  radius="sm"
                >
                  {site.displayName}
                </Badge>
              ))}
            </Group>
          )}
        </Group>
      </Group>

      <Divider mb="md" />

      <Box
        style={{
          // eslint-disable-next-line lingui/no-unlocalized-strings
          maxHeight: 'calc(100vh - 440px)',
          overflowY: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #ddd',
                }}
              >
                <CommonTranslations.Website />
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #ddd',
                }}
              >
                <Trans>Username</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {websites.map((website) => (
              <tr key={website.id}>
                <td
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #eee',
                    width: '30%',
                  }}
                >
                  <Group>
                    <Text>{website.displayName}</Text>
                    {value[website.id]?.trim().length > 0 && (
                      <Badge size="xs" variant="light" color="green">
                        <IconCheck
                          size="1rem"
                          style={{ verticalAlign: 'middle' }}
                        />
                      </Badge>
                    )}
                  </Group>
                </td>
                <td
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #eee',
                    width: '70%',
                  }}
                >
                  <TextInput
                    size="xs"
                    value={value[website.id] ?? ''}
                    onChange={(event) =>
                      handleChange(website.id, event.currentTarget.value)
                    }
                    onBlur={(event) =>
                      handleBlur(website.id, event.currentTarget.value)
                    }
                    disabled={disabled}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

function ExistingUserConverter(props: {
  userConverter: UserConverterDto;
  websites: IWebsiteInfoDto[];
}) {
  const { userConverter, websites } = props;
  const [state, setState] = useState<ICreateUserConverterDto>({
    username: userConverter.username,
    convertTo: { ...userConverter.convertTo },
  });
  const [opened, { toggle }] = useDisclosure(false);

  const hasChanges = !areEqual(
    { username: userConverter.username, convertTo: userConverter.convertTo },
    state,
  );

  // Count how many website conversions are active
  const activeConversions = useMemo(
    () =>
      Object.values(state.convertTo).filter((v) => v.trim().length > 0).length,
    [state.convertTo],
  );

  return (
    <Paper withBorder p="xs" radius="md" shadow={opened ? 'sm' : undefined}>
      <Group justify="space-between" mb={opened ? 'xs' : 0}>
        <Group>
          <Text fw={500}>{userConverter.username}</Text>
          <Badge size="xs" variant="light" color="blue">
            {activeConversions}
          </Badge>
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
            {opened ? <CommonTranslations.Hide /> : <CommonTranslations.Edit />}
          </Button>
        </Group>
      </Group>

      <Collapse in={opened}>
        <Divider my="xs" />
        <TextInput
          required
          value={state.username}
          label={<Trans>Username</Trans>}
          onChange={(event) =>
            setState({ ...state, username: event.currentTarget.value })
          }
        />
        <WebsiteConverterInputs
          value={state.convertTo}
          onChange={(convertTo) => setState({ ...state, convertTo })}
          websites={websites}
        />
        <Group mt="md" grow>
          <Button
            variant="light"
            disabled={!isValid(state) || !hasChanges}
            onClick={() => {
              userConvertersApi
                .update(userConverter.id, state)
                .then(() => {
                  notifications.show({
                    title: state.username,
                    message: (
                      <CommonTranslations.NounUpdated>
                        <Trans>User converter</Trans>
                      </CommonTranslations.NounUpdated>
                    ),
                    color: 'green',
                  });
                })
                .catch(() => {
                  notifications.show({
                    title: state.username,
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
                {userConverter.username}
              </Text>
            }
            onDelete={() => {
              userConvertersApi.remove([userConverter.id]).then(() => {
                notifications.show({
                  title: userConverter.username,
                  message: (
                    <CommonTranslations.NounDeleted>
                      <Trans>User converter</Trans>
                    </CommonTranslations.NounDeleted>
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

function UserConverters() {
  const { state: userConverters, isLoading } = useStore(UserConverterStore);
  const { state: websiteInfo, isLoading: isLoadingWebsiteInfo } =
    useStore(WebsiteStore);
  const [newConverterFields, setNewConverterFields] =
    useState<ICreateUserConverterDto>({ username: '', convertTo: {} });
  const [search, setSearch] = useState('');
  const [showNewConverterForm, { toggle: toggleNewConverterForm }] =
    useDisclosure(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedUserConverters = useMemo(
    () =>
      [...(userConverters || [])].sort((a, b) => {
        if (sortDirection === 'asc') {
          return a.username.localeCompare(b.username);
        }
        return b.username.localeCompare(a.username);
      }),
    [userConverters, sortDirection],
  );

  const filteredUserConverters = useMemo(() => {
    if (!search.trim()) return sortedUserConverters;

    const searchLower = search.toLowerCase();
    return sortedUserConverters.filter(
      (converter) =>
        converter.username.toLowerCase().includes(searchLower) ||
        Object.values(converter.convertTo).some((value) =>
          value.toLowerCase().includes(searchLower),
        ),
    );
  }, [sortedUserConverters, search]);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const resetForm = () => {
    setNewConverterFields({ username: '', convertTo: {} });
  };

  if (isLoading || isLoadingWebsiteInfo) {
    return <Loader />;
  }

  const websites = (websiteInfo ?? [])
    .filter((website) => website.usernameShortcut !== undefined)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

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
            onClick={toggleNewConverterForm}
          >
            {showNewConverterForm ? (
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

        <Collapse in={showNewConverterForm}>
          <Fieldset
            legend={
              <Box mx="4">
                <Trans>New</Trans>
              </Box>
            }
          >
            <Group align="flex-end">
              <TextInput
                required
                style={{ flex: 1 }}
                value={newConverterFields.username}
                label={<Trans>Username</Trans>}
                onChange={(event) =>
                  setNewConverterFields({
                    ...newConverterFields,
                    username: event.currentTarget.value,
                  })
                }
              />
            </Group>

            <WebsiteConverterInputs
              value={newConverterFields.convertTo}
              onChange={(convertTo) =>
                setNewConverterFields({ ...newConverterFields, convertTo })
              }
              websites={websites}
            />

            <Group mt="md" grow>
              <Button
                variant="light"
                color="gray"
                onClick={resetForm}
                disabled={
                  newConverterFields.username === '' &&
                  Object.keys(newConverterFields.convertTo).length === 0
                }
              >
                <CommonTranslations.Clear />
              </Button>
              <Button
                variant="filled"
                disabled={
                  !isValid(newConverterFields) ||
                  userConverters.some(
                    (userConverter) =>
                      userConverter.username ===
                      newConverterFields.username.trim(),
                  )
                }
                onClick={() => {
                  userConvertersApi.create(newConverterFields).then(() => {
                    setNewConverterFields({ username: '', convertTo: {} });
                    notifications.show({
                      title: newConverterFields.username,
                      message: (
                        <CommonTranslations.NounCreated>
                          <Trans>User converter</Trans>
                        </CommonTranslations.NounCreated>
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

        {filteredUserConverters.length > 0 ? (
          // eslint-disable-next-line lingui/no-unlocalized-strings
          <ScrollArea h="calc(100vh - 280px)" offsetScrollbars>
            <Stack gap="sm">
              {filteredUserConverters.map((userConverter) => (
                <ExistingUserConverter
                  key={userConverter.id}
                  userConverter={userConverter}
                  websites={websites}
                />
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

export function UserConverterDrawer() {
  const [visible, toggle] = useDrawerToggle('userConvertersDrawerVisible');
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
            <Trans>User Converters</Trans>
          </Text>
        }
        styles={{ body: { padding: '16px', height: 'calc(100% - 60px)' } }}
      >
        <UserConverters />
      </Drawer>
    </ComponentErrorBoundary>
  );
}
