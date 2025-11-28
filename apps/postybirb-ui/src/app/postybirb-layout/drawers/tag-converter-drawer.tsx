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
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  ICreateTagConverterDto,
  IWebsiteInfoDto,
  TagConverterDto,
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
import tagConvertersApi from '../../../api/tag-converters.api';
import { ComponentErrorBoundary } from '../../../components/error-boundary/specialized-error-boundaries';
import { DeleteActionPopover } from '../../../components/shared/delete-action-popover/delete-action-popover';
import { TagConverterStore } from '../../../stores/tag-converter-store';
import { useStore } from '../../../stores/use-store';
import { WebsiteStore } from '../../../stores/website.store';
import { CommonTranslations } from '../../../translations/common-translations';
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
                <Trans>Conversion</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {websites.map(({ id, displayName }) => (
              <tr key={id}>
                <td
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #eee',
                    width: '30%',
                  }}
                >
                  <Group>
                    <Text>{displayName}</Text>
                    {value[id]?.trim().length > 0 && (
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
                    value={value[id] ?? ''}
                    onChange={(event) =>
                      handleChange(id, event.currentTarget.value)
                    }
                    onBlur={(event) =>
                      handleBlur(id, event.currentTarget.value)
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

function ExistingTagConverter(props: {
  tagConverter: TagConverterDto;
  tagSupportingWebsites: IWebsiteInfoDto[];
}) {
  const { tagConverter, tagSupportingWebsites } = props;
  const [state, setState] = useState<ICreateTagConverterDto>({
    tag: tagConverter.tag,
    convertTo: { ...tagConverter.convertTo },
  });
  const [opened, { toggle }] = useDisclosure(false);

  const hasChanges = !areEqual(
    { tag: tagConverter.tag, convertTo: tagConverter.convertTo },
    state,
  );

  const sitesWithValues = useMemo(
    () =>
      tagSupportingWebsites.filter(
        (site) => state.convertTo[site.id]?.trim().length > 0,
      ),
    [tagSupportingWebsites, state.convertTo],
  );

  return (
    <Paper withBorder p="xs" radius="md" shadow={opened ? 'sm' : undefined}>
      <Flex>
        <Box flex="10">
          <Text fw={500} flex="10">
            {tagConverter.tag}
          </Text>
        </Box>

        <Box flex="1">
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
        </Box>
      </Flex>
      <Group>
        {sitesWithValues.length > 0 && (
          <Group gap={5} pt="4">
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

      <Collapse in={opened}>
        <Divider my="xs" />
        <TextInput
          required
          value={state.tag}
          label={<Trans>Tag</Trans>}
          onChange={(event) =>
            setState({ ...state, tag: event.currentTarget.value })
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
                    message: (
                      <CommonTranslations.NounUpdated>
                        <Trans>Tag converter</Trans>
                      </CommonTranslations.NounUpdated>
                    ),
                    color: 'green',
                  });
                })
                .catch(() => {
                  notifications.show({
                    title: state.tag,
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
                {tagConverter.tag}
              </Text>
            }
            onDelete={() => {
              tagConvertersApi.remove([tagConverter.id]).then(() => {
                notifications.show({
                  title: tagConverter.tag,
                  message: (
                    <CommonTranslations.NounDeleted>
                      <Trans>Tag converter</Trans>
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

function TagConverters() {
  const { state: tagConverters, isLoading } = useStore(TagConverterStore);
  const { state: websiteInfo, isLoading: isLoadingWebsiteInfo } =
    useStore(WebsiteStore);
  const [newConverterFields, setNewConverterFields] =
    useState<ICreateTagConverterDto>({ tag: '', convertTo: {} });
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
    setNewConverterFields({ tag: '', convertTo: {} });
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
                value={newConverterFields.tag}
                label={<Trans>Tag</Trans>}
                onChange={(event) =>
                  setNewConverterFields({
                    ...newConverterFields,
                    tag: event.currentTarget.value,
                  })
                }
              />
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
                <CommonTranslations.Clear />
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
                    setNewConverterFields({ tag: '', convertTo: {} });
                    notifications.show({
                      title: newConverterFields.tag,
                      message: (
                        <CommonTranslations.NounCreated>
                          <Trans>Tag converter</Trans>
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

        {filteredTagConverters.length > 0 ? (
          // eslint-disable-next-line lingui/no-unlocalized-strings
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
            <CommonTranslations.NoItemsFound />
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

export function TagConverterDrawer() {
  const [visible, toggle] = useDrawerToggle('tagConvertersDrawerVisible');
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
            <Trans>Tag Converters</Trans>
          </Text>
        }
        styles={{ body: { padding: '16px', height: 'calc(100% - 60px)' } }}
      >
        <TagConverters />
      </Drawer>
    </ComponentErrorBoundary>
  );
}
