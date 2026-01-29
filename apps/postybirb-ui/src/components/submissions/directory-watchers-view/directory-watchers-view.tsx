import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  Button,
  Card,
  Grid,
  Group,
  Input,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  DirectoryWatcherDto,
  DirectoryWatcherImportAction,
  SubmissionType,
} from '@postybirb/types';
import { IconDeviceFloppy, IconFolder, IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import directoryWatchersApi, {
  CheckPathResult,
  FILE_COUNT_WARNING_THRESHOLD,
} from '../../../api/directory-watchers.api';
import { CommonTranslations } from '../../../translations/common-translations';
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
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModalOpened, { open: openConfirmModal, close: closeConfirmModal }] = useDisclosure(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pathCheckResult, setPathCheckResult] = useState<CheckPathResult | null>(null);
  const { t } = useLingui();
  const changed = hasChanged(directoryWatcher, state);

  const options = [
    {
      label: t`Create new submission`,
      value: DirectoryWatcherImportAction.NEW_SUBMISSION,
    },
  ];

  const handlePickFolder = async () => {
    if (window?.electron?.pickDirectory) {
      const folder = await window.electron.pickDirectory();
      if (folder) {
        try {
          const result = await directoryWatchersApi.checkPath(folder);
          if (!result.body.valid) {
            notifications.show({
              title: t`Invalid folder`,
              message: result.body.error,
              color: 'red',
            });
            return;
          }

          if (result.body.count > FILE_COUNT_WARNING_THRESHOLD) {
            setPendingPath(folder);
            setPathCheckResult(result.body);
            openConfirmModal();
          } else {
            setState({ ...state, path: folder });
          }
        } catch {
          // If check fails, still allow selecting the folder
          setState({ ...state, path: folder });
        }
      }
    }
  };

  const handleConfirmPath = () => {
    if (pendingPath) {
      setState({ ...state, path: pendingPath });
      setPendingPath(null);
      setPathCheckResult(null);
      closeConfirmModal();
    }
  };

  const handleCancelPath = () => {
    setPendingPath(null);
    setPathCheckResult(null);
    closeConfirmModal();
  };

  const handleSave = () => {
    setIsSaving(true);
    directoryWatchersApi
      .update(directoryWatcher.id, { ...state })
      .then(() => {
        notifications.show({
          message: (
            <CommonTranslations.NounUpdated>
              <Trans>Importer</Trans>
            </CommonTranslations.NounUpdated>
          ),
          color: 'green',
        });
        refetch();
      })
      .catch((err) => {
        notifications.show({
          title: (
            <CommonTranslations.NounUpdateFailed>
              <Trans>Importer</Trans>
            </CommonTranslations.NounUpdateFailed>
          ),
          message: err.message,
          color: 'red',
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <Card
      className="postybirb-plus__directory-watcher-panel"
      shadow="md"
      padding="lg"
      radius="md"
      withBorder
    >
      <Stack gap="md">
        <Input.Wrapper label={<Trans>Folder Path</Trans>} required>
          <Input
            size="md"
            leftSection={<IconFolder size={18} />}
            disabled={!window?.electron?.pickDirectory}
            value={state.path ?? t`No folder selected`}
            readOnly
            styles={{
              input: {
                cursor: window?.electron?.pickDirectory
                  ? 'pointer'
                  : 'not-allowed',
                fontFamily: 'monospace',
              },
            }}
            onClick={handlePickFolder}
          />
        </Input.Wrapper>

        <Modal
          opened={confirmModalOpened}
          onClose={handleCancelPath}
          title={<Trans>Folder Contains Files</Trans>}
          centered
        >
          <Stack>
            <Text>
              <Trans>
                The folder "{pendingPath?.split('/').pop() ?? pendingPath}" contains {pathCheckResult?.count ?? 0} files.
              </Trans>
            </Text>
            {pathCheckResult && pathCheckResult.files.length > 0 && (
              <Text size="sm" c="dimmed">
                {pathCheckResult.files.slice(0, 5).join(', ')}
                {pathCheckResult.files.length > 5 && `, ... ${t`and ${pathCheckResult.files.length - 5} more`}`}
              </Text>
            )}
            <Text>
              <Trans>Are you sure you want to watch this folder?</Trans>
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={handleCancelPath}>
                <Trans>Cancel</Trans>
              </Button>
              <Button color="blue" onClick={handleConfirmPath}>
                <Trans>Confirm</Trans>
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Select
          size="md"
          label={<Trans>Import Action</Trans>}
          description={<Trans>What to do when new files are detected</Trans>}
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
              setState({ ...state, template: template?.id });
            }}
          />
        ) : null}

        <Group justify="space-between" mt="md">
          <DeleteActionPopover
            onDelete={() => {
              directoryWatchersApi.remove([directoryWatcher.id]).then(() => {
                notifications.show({
                  message: (
                    <CommonTranslations.NounDeleted>
                      <Trans>Importer</Trans>
                    </CommonTranslations.NounDeleted>
                  ),
                  color: 'green',
                });
                refetch();
              });
            }}
          />
          <Button
            leftSection={<IconDeviceFloppy size={18} />}
            disabled={!changed}
            loading={isSaving}
            onClick={handleSave}
            variant="light"
          >
            <CommonTranslations.Save />
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

export default function DirectoryWatchersView() {
  const { data, isLoading, refetch } = useQuery(
    [`directory-watchers`],
    () => directoryWatchersApi.getAll().then((res) => res.body),
    { refetchOnWindowFocus: false, cacheTime: 0 },
  );

  const { t } = useLingui();

  const watcherCards = useMemo(
    () =>
      (data || []).map((watcher) => (
        <Grid.Col key={watcher.id} span={{ base: 12, md: 6, lg: 4 }}>
          <DirectoryWatcherCard directoryWatcher={watcher} refetch={refetch} />
        </Grid.Col>
      )),
    [data, refetch],
  );

  const handleCreateNew = () => {
    directoryWatchersApi
      .create({ importAction: DirectoryWatcherImportAction.NEW_SUBMISSION })
      .then(() => {
        notifications.show({
          message: <CommonTranslations.NounCreated />,
          color: 'green',
        });
        refetch();
      })
      .catch((err) => {
        notifications.show({ message: err.message, color: 'red' });
      });
  };

  return (
    <Stack className="postybirb-plus__directory-watchers-container" gap="lg">
      <Paper shadow="xs" p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box style={{ flex: 1 }}>
              <Title order={3} mb="xs">
                <Trans>Auto Importer</Trans>
              </Title>
              <Text size="sm" c="dimmed">
                <Trans context="directory-watcher.description">
                  Automatically import new files from specified folders into
                  PostyBirb
                </Trans>
              </Text>
            </Box>
            <Button
              size="md"
              variant="filled"
              leftSection={<IconPlus size={18} />}
              onClick={handleCreateNew}
            >
              <CommonTranslations.NounNew />
            </Button>
          </Group>
        </Stack>
      </Paper>

      {isLoading || !data ? (
        <Group justify="center" p="xl">
          <Loader size="lg" />
        </Group>
      ) : data.length === 0 ? null : (
        <Grid>{watcherCards}</Grid>
      )}
    </Stack>
  );
}
