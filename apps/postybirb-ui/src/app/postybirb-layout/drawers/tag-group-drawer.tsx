import { Trans } from '@lingui/macro';
import {
    Box,
    Button,
    Drawer,
    Fieldset,
    Loader,
    Stack,
    TagsInput,
    TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ICreateTagGroupDto, TagGroupDto } from '@postybirb/types';
import { useState } from 'react';
import tagGroupsApi from '../../../api/tag-groups.api';
import { TagGroupStore } from '../../../stores/tag-group-store';
import { useStore } from '../../../stores/use-store';
import AppSettings from '../../app-settings';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

function isValidTagGroup(tagGroup: ICreateTagGroupDto) {
  return tagGroup.name.trim().length > 0 && tagGroup.tags.length > 0;
}

function ExistingTagGroup(props: { tagGroup: TagGroupDto }) {
  const { tagGroup } = props;
  const [state, setState] = useState(JSON.parse(JSON.stringify(tagGroup)));
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
        onChange={(value) =>
          setState({
            ...state,
            tags: value,
          })
        }
      />
      <Button
        mt="sm"
        fullWidth
        disabled={!isValidTagGroup(state)}
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
        <Fieldset legend={<Trans>Create new tag group</Trans>}>
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
      title={<Trans>Tag Groups</Trans>}
    >
      <Stack gap="xl">
        <AppSettings />
        <TagGroups />
      </Stack>
    </Drawer>
  );
}
