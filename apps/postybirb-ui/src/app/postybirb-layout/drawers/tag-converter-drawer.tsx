import { Trans } from '@lingui/macro';
import {
  Box,
  Button,
  Drawer,
  Fieldset,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  ICreateTagConverterDto,
  IWebsiteInfoDto,
  TagConverterDto,
} from '@postybirb/types';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import tagConvertersApi from '../../../api/tag-converters.api';
import { TagConverterStore } from '../../../stores/tag-converter-store';
import { useStore } from '../../../stores/use-store';
import { WebsiteStore } from '../../../stores/website.store';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

function isValid(converter: ICreateTagConverterDto) {
  return converter.tag.trim().length > 0;
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
  return (
    <Fieldset legend={<Box mx="4">{tagConverter.tag}</Box>}>
      {tagSupportingWebsites.map((website) => (
        <TextInput
          mt="4"
          value={state.convertTo[website.id] ?? ''}
          label={website.displayName}
          onChange={(event) => {
            setState({
              ...state,
              convertTo: {
                ...state.convertTo,
                [website.id]: event.currentTarget.value,
              },
            });
          }}
          onBlur={(event) => {
            setState({
              ...state,
              convertTo: {
                ...state.convertTo,
                [website.id]: event.currentTarget.value.trim(),
              },
            });
          }}
        />
      ))}
      <Group mt="sm" grow>
        <Button
          variant="light"
          disabled={!isValid(state)}
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
        <Button
          variant="light"
          color="red"
          onClick={() => {
            tagConvertersApi.remove([tagConverter.id]);
          }}
        >
          <IconTrash />
        </Button>
      </Group>
    </Fieldset>
  );
}

function TagConverters() {
  const { state: tagConverters, isLoading } = useStore(TagConverterStore);
  const { state: websiteInfo, isLoading: isLoadingWebsiteInfo } =
    useStore(WebsiteStore);
  const [newConverterFields, setNewConverterFields] =
    useState<ICreateTagConverterDto>({
      tag: '',
      convertTo: {},
    });

  if (isLoading || isLoadingWebsiteInfo) {
    return <Loader />;
  }

  const tagSupportingWebsites = (websiteInfo ?? [])
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .filter((website) => website.tagSupport.supportsTags);

  return (
    <Box>
      <Stack gap="md">
        <Fieldset
          legend={
            <Box mx="4">
              <Trans>Create new tag converter</Trans>
            </Box>
          }
        >
          <TextInput
            required
            value={newConverterFields.tag}
            label={<Trans>Tag</Trans>}
            onChange={(event) =>
              setNewConverterFields({
                ...newConverterFields,
                tag: event.currentTarget.value,
              })
            }
          />
          {tagSupportingWebsites.map((website) => (
            <TextInput
              mt="4"
              value={newConverterFields.convertTo[website.id] ?? ''}
              label={website.displayName}
              onChange={(event) => {
                setNewConverterFields({
                  ...newConverterFields,
                  convertTo: {
                    ...newConverterFields.convertTo,
                    [website.id]: event.currentTarget.value,
                  },
                });
              }}
              onBlur={(event) => {
                setNewConverterFields({
                  ...newConverterFields,
                  convertTo: {
                    ...newConverterFields.convertTo,
                    [website.id]: event.currentTarget.value.trim(),
                  },
                });
              }}
            />
          ))}
          <Button
            mt="sm"
            fullWidth
            disabled={
              !isValid(newConverterFields) ||
              tagConverters.some(
                (tagConverter) =>
                  tagConverter.tag === newConverterFields.tag.trim()
              )
            }
            onClick={() => {
              tagConvertersApi.create(newConverterFields).then(() => {
                setNewConverterFields({
                  tag: '',
                  convertTo: {},
                });
              });
            }}
          >
            <Trans>Save</Trans>
          </Button>
        </Fieldset>
        {tagConverters.map((tagConverter) => (
          <ExistingTagConverter
            tagConverter={tagConverter}
            tagSupportingWebsites={tagSupportingWebsites}
          />
        ))}
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
    >
      <Stack gap="xl">
        <TagConverters />
      </Stack>
    </Drawer>
  );
}
