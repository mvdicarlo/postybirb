import { Trans } from '@lingui/macro';
import {
  Box,
  Button,
  Drawer,
  Fieldset,
  Group,
  Loader,
  Stack,
  TagsInput,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ICreateTagGroupDto, TagGroupDto } from '@postybirb/types';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import tagGroupsApi from '../../../api/tag-groups.api';
import { TagGroupStore } from '../../../stores/tag-group-store';
import { useStore } from '../../../stores/use-store';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

function isValidTagGroup(tagGroup: ICreateTagGroupDto) {
  return tagGroup.name.trim().length > 0 && tagGroup.tags.length > 0;
}

function areEqual(
  old: Pick<ICreateTagGroupDto, 'name' | 'tags'>,
  current: Pick<ICreateTagGroupDto, 'name' | 'tags'>
) {
  return JSON.stringify(old) === JSON.stringify(current);
}

function ExistingTagGroup(props: { tagGroup: TagGroupDto }) {
  const { tagGroup } = props;
  const [state, setState] = useState<ICreateTagGroupDto>({
    name: tagGroup.name,
    tags: tagGroup.tags,
  });
  return (
    <>
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
      <Group mt="sm" grow>
        <Button
          variant="light"
          disabled={
            !isValidTagGroup(state) ||
            areEqual({ name: tagGroup.name, tags: tagGroup.tags }, state)
          }
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
        <Button
          variant="light"
          color="red"
          onClick={() => {
            tagGroupsApi.remove([tagGroup.id]);
          }}
        >
          <IconTrash />
        </Button>
      </Group>
    </>
  );
}

function TagGroups() {
  const { state: tagGroups, isLoading } = useStore(TagGroupStore);
  const [newGroupFields, setNewGroupFields] = useState<ICreateTagGroupDto>({
    name: '',
    tags: [],
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Box>
      <Stack gap="md">
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
          <TagsInput
            required
            clearable
            value={newGroupFields.tags}
            label={<Trans>Tags</Trans>}
            onChange={(value) =>
              setNewGroupFields({
                ...newGroupFields,
                tags: value,
              })
            }
          />
          <Button
            mt="sm"
            fullWidth
            disabled={!isValidTagGroup(newGroupFields)}
            onClick={() => {
              tagGroupsApi.create(newGroupFields).then(() => {
                setNewGroupFields({
                  name: '',
                  tags: [],
                });
              });
            }}
          >
            <Trans>Save</Trans>
          </Button>
        </Fieldset>
        {tagGroups.map((tagGroup) => (
          <Box key={tagGroup.id}>
            <ExistingTagGroup tagGroup={tagGroup} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export function TagGroupDrawer() {
  const [visible, toggle] = useDrawerToggle('tagGroupsDrawerVisible');
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
          <Trans>Tag Groups</Trans>
        </Text>
      }
    >
      <Stack gap="xl">
        <TagGroups />
      </Stack>
    </Drawer>
  );
}
