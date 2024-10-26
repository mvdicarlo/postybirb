import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Input,
  Loader,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import {
  DirectoryWatcherDto,
  DirectoryWatcherImportAction,
  SubmissionType,
} from '@postybirb/types';
import { IconDeviceFloppy, IconFolder, IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import directoryWatchersApi from '../../../api/directory-watchers.api';
import { DeleteActionPopover } from '../../shared/delete-action-popover/delete-action-popover';
import TemplatePicker from '../../submission-templates/template-picker/template-picker';

type DirectoryWatcherCardProps = {
  directoryWatcher: DirectoryWatcherDto;
  refetch: () => void;
};

function hasChanged(
  original: DirectoryWatcherDto,
  updated: DirectoryWatcherDto,
): boolean {
  if (
    original.path !== updated.path ||
    original.importAction !== updated.importAction ||
    original.template !== updated.template
  ) {
    return true;
  }

  return false;
}

function DirectoryWatcherCard(props: DirectoryWatcherCardProps) {
  const { directoryWatcher, refetch } = props;
  const [state, setState] = useState({ ...directoryWatcher });
  const { _ } = useLingui();

  const options = [
    {
      label: _(msg`Create new submission`),
      value: DirectoryWatcherImportAction.NEW_SUBMISSION,
    },
  ];

  return (
    <Card
      className="postybirb-plus__directory-watcher-panel"
      shadow="sm"
      p="sm"
    >
      <Input.Wrapper label={<Trans>Folder</Trans>}>
        <Input
          leftSection={<IconFolder />}
          disabled={!window?.electron?.pickDirectory}
          value={state.path ?? _(msg`Select folder`)}
          readOnly
          onClick={() => {
            if (window?.electron?.pickDirectory) {
              window.electron.pickDirectory().then((folder) => {
                if (folder) {
                  setState({ ...state, path: folder ?? state.path });
                }
              });
            }
          }}
        />
      </Input.Wrapper>
      <Select
        label={<Trans>Action</Trans>}
        data={options}
        value={state.importAction}
        onChange={(actionValue) => {
          setState({
            ...state,
            importAction:
              (actionValue as DirectoryWatcherImportAction) ??
              DirectoryWatcherImportAction.NEW_SUBMISSION,
          });
        }}
      />

      {state.importAction === DirectoryWatcherImportAction.NEW_SUBMISSION ? (
        <TemplatePicker
          label={<Trans>Template</Trans>}
          type={SubmissionType.FILE}
          selected={state.template}
          onChange={(template) => {
            setState({
              ...state,
              template: template?.id,
            });
          }}
        />
      ) : null}
      <Group align="center" justify="center">
        <DeleteActionPopover
          onDelete={() => {
            directoryWatchersApi.remove([directoryWatcher.id]).finally(() => {
              refetch();
            });
          }}
        />
        <ActionIcon
          variant="transparent"
          disabled={!hasChanged(directoryWatcher, state)}
          aria-label={_(msg`Save folder upload changes`)}
          onClick={() => {
            directoryWatchersApi
              .update(directoryWatcher.id, {
                ...state,
              })
              .finally(() => {
                refetch();
              });
          }}
        >
          <IconDeviceFloppy />
        </ActionIcon>
      </Group>
    </Card>
  );
}

export default function DirectoryWatchersView() {
  const { data, isLoading, refetch } = useQuery(
    [`directory-watchers`],
    () => directoryWatchersApi.getAll().then((res) => res.body),
    {
      refetchOnWindowFocus: false,
      cacheTime: 0,
    },
  );

  const watcherCards = useMemo(
    () =>
      (data || []).map((watcher) => (
        <DirectoryWatcherCard
          key={watcher.id}
          directoryWatcher={watcher}
          refetch={refetch}
        />
      )),
    [data, refetch],
  );

  return (
    <Stack className="postybirb-plus__directory-watchers-container">
      <Box>
        <Text fs="italic">
          <Trans context="directory-watcher.description">
            Folder watchers allow you to automatically upload files from a
            folder to PostyBirb.
          </Trans>
        </Text>
      </Box>
      <Button
        variant="outline"
        leftSection={<IconPlus size={16} />}
        onClick={() => {
          directoryWatchersApi
            .create({
              importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
            })
            .finally(() => {
              refetch();
            });
        }}
      >
        <Trans>Add folder watcher</Trans>
      </Button>
      {isLoading || !data ? <Loader /> : <Stack>{watcherCards}</Stack>}
    </Stack>
  );
}
