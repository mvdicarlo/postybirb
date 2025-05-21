/* eslint-disable lingui/no-unlocalized-strings */
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
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useClipboard, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  ICreateTagConverterDto,
  IWebsiteInfoDto,
  TagConverterDto,
} from '@postybirb/types';
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
import tagConvertersApi from '../../../api/tag-converters.api';
import { DeleteActionPopover } from '../../../components/shared/delete-action-popover/delete-action-popover';
import { TagConverterStore } from '../../../stores/tag-converter-store';
import { useStore } from '../../../stores/use-store';
import { WebsiteStore } from '../../../stores/website.store';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

function isValid(converter: ICreateTagConverterDto) {
  return converter.tag.trim().length > 0;
}

function areEqual(
  old: Pick<ICreateTagConverterDto, 'tag' | 'convertTo'>,
  current: Pick<ICreateTagConverterDto, 'tag' | 'convertTo'>,
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
  const { _ } = useLingui();
  const [viewMode, setViewMode] = useState<'compact' | 'table'>('table');
  const sitesWithValues = useMemo(
    () => websites.filter((site) => value[site.id]?.trim().length > 0),
    [websites, value],
  );

  const handleChange = (siteId: string, newValue: string) => {
    onChange({
      ...value,
      [siteId]: newValue,
    });
  };

  const handleBlur = (siteId: string, newValue: string) => {
    onChange({
      ...value,
      [siteId]: newValue.trim(),
    });
  };

  return (
    <Box mt="md">
      <Group justify="space-between" mb="md">
        <Group>
          <Text size="sm" fw={500}>
            <Trans>Website Conversions</Trans>{' '}
            {sitesWithValues.length > 0 && `(${sitesWithValues.length} active)`}
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
        <Group>
          <Button.Group>
            <Button
              variant={viewMode === 'table' ? 'filled' : 'default'}
              size="compact-xs"
              onClick={() => setViewMode('table')}
            >
              <Trans>Table</Trans>
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'filled' : 'default'}
              size="compact-xs"
              onClick={() => setViewMode('compact')}
            >
              <Trans>Compact</Trans>
            </Button>
          </Button.Group>
        </Group>
      </Group>

      <Divider mb="md" />

      {viewMode === 'table' && (
        <Box style={{ maxHeight: 'calc(100vh - 440px)', overflowY: 'auto' }}>
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
                  <Trans>Website</Trans>
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '8px',
                    borderBottom: '1px solid #ddd',
                  }}
                >
                  <Trans>Conversion</Trans>
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
                          <Trans>Set</Trans>
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
                      placeholder={_(
                        msg`Enter conversion for ${website.displayName}`,
                      )}
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
      )}

      {viewMode === 'compact' && (
        <Box style={{ maxHeight: 'calc(100vh - 440px)', overflowY: 'auto' }}>
          <Group grow align="flex-start" wrap="wrap">
            {websites.map((website) => (
              <Box key={website.id} w="48%" mb="xs">
                <TextInput
                  size="xs"
                  label={
                    <Group>
                      <Text size="sm">{website.displayName}</Text>
                      {value[website.id]?.trim().length > 0 && (
                        <Badge size="xs" variant="light" color="green">
                          <Trans>Set</Trans>
                        </Badge>
                      )}
                    </Group>
                  }
                  value={value[website.id] ?? ''}
                  placeholder={_(msg`Enter conversion`)}
                  onChange={(event) =>
                    handleChange(website.id, event.currentTarget.value)
                  }
                  onBlur={(event) =>
                    handleBlur(website.id, event.currentTarget.value)
                  }
                  disabled={disabled}
                />
              </Box>
            ))}
          </Group>
        </Box>
      )}
    </Box>
  );
}

function ExistingTagConverter(props: {
  tagConverter: TagConverterDto;
  tagSupportingWebsites: IWebsiteInfoDto[];
}) {
  const { _ } = useLingui();
  const { tagConverter, tagSupportingWebsites } = props;
  const [state, setState] = useState<ICreateTagConverterDto>({
    tag: tagConverter.tag,
    convertTo: { ...tagConverter.convertTo },
  });
  const [opened, { toggle }] = useDisclosure(false);
  const clipboard = useClipboard();

  const hasChanges = !areEqual(
    { tag: tagConverter.tag, convertTo: tagConverter.convertTo },
    state,
  );

  // Count how many website conversions are active
  const activeConversions = useMemo(
    () =>
      Object.values(state.convertTo).filter((v) => v.trim().length > 0).length,
    [state.convertTo],
  );

  const handleCopyToClipboard = () => {
    const text = Object.entries(state.convertTo)
      .filter(([, value]) => value.trim().length > 0)
      .map(([site, value]) => {
        const website = tagSupportingWebsites.find((w) => w.id === site);
        return `${website?.displayName || site}: ${value}`;
      })
      .join('\n');

    clipboard.copy(`Tag: ${state.tag}\n${text}`);
    notifications.show({
      title: <Trans>Copied</Trans>,
      message: <Trans>Converter details copied to clipboard</Trans>,
      color: 'blue',
      autoClose: 2000,
    });
  };

  return (
    <Paper withBorder p="xs" radius="md" shadow={opened ? 'sm' : undefined}>
      <Group justify="space-between" mb={opened ? 'xs' : 0}>
        <Group>
          <Text fw={500}>{tagConverter.tag}</Text>
          <Badge size="xs" variant="light" color="blue">
            {activeConversions} <Trans>sites</Trans>
          </Badge>
          <Tooltip label={<Trans>Copy details</Trans>}>
            <ActionIcon
              variant="subtle"
              size="xs"
              onClick={handleCopyToClipboard}
              aria-label={_(msg`Copy converter details`)}
            >
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
          value={state.tag}
          label={<Trans>Tag</Trans>}
          onChange={(event) =>
            setState({
              ...state,
              tag: event.currentTarget.value,
            })
          }
        />
        <WebsiteConverterInputs
          value={state.convertTo}
          onChange={(convertTo) => setState({ ...state, convertTo })}
          websites={tagSupportingWebsites}
        />
        <Group mt="md" grow>
          <Button
            variant="light"
            disabled={!isValid(state) || !hasChanges}
            onClick={() => {
              tagConvertersApi
                .update(tagConverter.id, state)
                .then(() => {
                  notifications.show({
                    title: state.tag,
                    message: <Trans>Tag converter updated</Trans>,
                    color: 'green',
                  });
                })
                .catch(() => {
                  notifications.show({
                    title: state.tag,
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
                {tagConverter.tag}
              </Text>
            }
            onDelete={() => {
              tagConvertersApi.remove([tagConverter.id]).then(() => {
                notifications.show({
                  title: tagConverter.tag,
                  message: <Trans>Tag converter deleted</Trans>,
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

function TagConverters() {
  const { _ } = useLingui();
  const { state: tagConverters, isLoading } = useStore(TagConverterStore);
  const { state: websiteInfo, isLoading: isLoadingWebsiteInfo } =
    useStore(WebsiteStore);
  const [newConverterFields, setNewConverterFields] =
    useState<ICreateTagConverterDto>({
      tag: '',
      convertTo: {},
    });
  const [search, setSearch] = useState('');
  const [showNewConverterForm, { toggle: toggleNewConverterForm }] =
    useDisclosure(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedTagConverters = useMemo(
    () =>
      [...(tagConverters || [])].sort((a, b) => {
        if (sortDirection === 'asc') {
          return a.tag.localeCompare(b.tag);
        }
        return b.tag.localeCompare(a.tag);
      }),
    [tagConverters, sortDirection],
  );

  const filteredTagConverters = useMemo(() => {
    if (!search.trim()) return sortedTagConverters;

    const searchLower = search.toLowerCase();
    return sortedTagConverters.filter(
      (converter) =>
        converter.tag.toLowerCase().includes(searchLower) ||
        Object.values(converter.convertTo).some((value) =>
          value.toLowerCase().includes(searchLower),
        ),
    );
  }, [sortedTagConverters, search]);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const resetForm = () => {
    setNewConverterFields({
      tag: '',
      convertTo: {},
    });
  };

  const handlePasteTagFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setNewConverterFields((prev) => ({
          ...prev,
          tag: clipboardText.trim(),
        }));

        notifications.show({
          title: <Trans>Tag Pasted</Trans>,
          message: <Trans>Tag pasted from clipboard</Trans>,
          color: 'blue',
        });
      }
    } catch (error) {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: <Trans>Failed to paste from clipboard</Trans>,
        color: 'red',
      });
    }
  };

  if (isLoading || isLoadingWebsiteInfo) {
    return <Loader />;
  }

  const tagSupportingWebsites = (websiteInfo ?? []).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  return (
    <Box>
      <Stack gap="md">
        <Group grow>
          <TextInput
            placeholder={_(msg`Search tag converters...`)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              search ? (
                <ActionIcon
                  variant="transparent"
                  onClick={() => setSearch('')}
                  aria-label={_(msg`Clear search`)}
                >
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
              <Trans>Tag Converters</Trans> ({filteredTagConverters.length}/
              {tagConverters?.length || 0})
            </Text>
            <Group ml="xs">
              <Tooltip
                label={
                  sortDirection === 'asc' ? (
                    <Trans>Sort Descending</Trans>
                  ) : (
                    <Trans>Sort Ascending</Trans>
                  )
                }
              >
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={toggleSortDirection}
                  aria-label={_(msg`Toggle sort direction`)}
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
            onClick={toggleNewConverterForm}
          >
            {showNewConverterForm ? (
              <Trans>Hide Form</Trans>
            ) : (
              <Trans>Create New</Trans>
            )}
          </Button>
        </Group>

        <Collapse in={showNewConverterForm}>
          <Fieldset
            legend={
              <Box mx="4">
                <Trans>Create new tag converter</Trans>
              </Box>
            }
          >
            <Group align="flex-end">
              <TextInput
                required
                style={{ flex: 1 }}
                value={newConverterFields.tag}
                label={<Trans>Tag</Trans>}
                onChange={(event) =>
                  setNewConverterFields({
                    ...newConverterFields,
                    tag: event.currentTarget.value,
                  })
                }
              />
              <Button
                variant="subtle"
                size="xs"
                onClick={handlePasteTagFromClipboard}
                leftSection={<IconClipboardCopy size={14} />}
                aria-label={_(msg`Paste tag from clipboard`)}
              >
                <Trans>Paste</Trans>
              </Button>
            </Group>

            <WebsiteConverterInputs
              value={newConverterFields.convertTo}
              onChange={(convertTo) =>
                setNewConverterFields({ ...newConverterFields, convertTo })
              }
              websites={tagSupportingWebsites}
            />

            <Group mt="md" grow>
              <Button
                variant="light"
                color="gray"
                onClick={resetForm}
                disabled={
                  newConverterFields.tag === '' &&
                  Object.keys(newConverterFields.convertTo).length === 0
                }
              >
                <Trans>Clear</Trans>
              </Button>
              <Button
                variant="filled"
                disabled={
                  !isValid(newConverterFields) ||
                  tagConverters.some(
                    (tagConverter) =>
                      tagConverter.tag === newConverterFields.tag.trim(),
                  )
                }
                onClick={() => {
                  tagConvertersApi.create(newConverterFields).then(() => {
                    setNewConverterFields({
                      tag: '',
                      convertTo: {},
                    });
                    notifications.show({
                      title: newConverterFields.tag,
                      message: <Trans>Tag converter created</Trans>,
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

        {filteredTagConverters.length > 0 ? (
          <ScrollArea h="calc(100vh - 280px)" offsetScrollbars>
            <Stack gap="sm">
              {filteredTagConverters.map((tagConverter) => (
                <ExistingTagConverter
                  key={tagConverter.id}
                  tagConverter={tagConverter}
                  tagSupportingWebsites={tagSupportingWebsites}
                />
              ))}
            </Stack>
          </ScrollArea>
        ) : (
          <Paper p="lg" withBorder radius="md" ta="center">
            {search ? (
              <Text c="dimmed">
                <Trans>No tag converters match your search</Trans>
              </Text>
            ) : (
              <Text c="dimmed">
                <Trans>No tag converters created yet</Trans>
              </Text>
            )}
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

export function TagConverterDrawer() {
  const [visible, toggle] = useDrawerToggle('tagConvertersDrawerVisible');
  return (
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
          <Trans>Tag Converters</Trans>
        </Text>
      }
      styles={{
        body: {
          padding: '16px',
          height: 'calc(100% - 60px)',
        },
      }}
    >
      <TagConverters />
    </Drawer>
  );
}
