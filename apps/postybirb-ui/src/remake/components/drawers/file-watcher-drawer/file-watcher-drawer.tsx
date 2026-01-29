/**
 * FileWatcherDrawer - Drawer for managing directory/file watchers.
 * Watches folders and automatically imports new files as submissions.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    Card,
    Group,
    Input,
    Select,
    Stack,
    Text,
    Tooltip
} from '@mantine/core';
import { DirectoryWatcherImportAction, SubmissionType } from '@postybirb/types';
import {
    IconDeviceFloppy,
    IconFolder,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import directoryWatchersApi, {
    CheckPathResult,
    FILE_COUNT_WARNING_THRESHOLD,
} from '../../../api/directory-watchers.api';
import { useDirectoryWatchers } from '../../../stores';
import type { DirectoryWatcherRecord } from '../../../stores/records';
import { useActiveDrawer, useDrawerActions } from '../../../stores/ui/drawer-store';
import {
    showCreatedNotification,
    showCreateErrorNotification,
    showDeletedNotification,
    showDeleteErrorNotification,
    showUpdatedNotification,
    showUpdateErrorNotification,
} from '../../../utils/notifications';
import { ConfirmActionModal } from '../../confirm-action-modal';
import { EmptyState } from '../../empty-state';
import { ComponentErrorBoundary } from '../../error-boundary';
import { HoldToConfirmButton } from '../../hold-to-confirm';
import { TemplatePicker } from '../../shared/template-picker';
import { SectionDrawer } from '../section-drawer';

const DRAWER_KEY = 'fileWatchers' as const;

// ============================================================================
// Watcher Card Component
// ============================================================================

interface FileWatcherCardProps {
  watcher: DirectoryWatcherRecord;
}

/**
 * Individual file watcher card with editable fields.
 */
function FileWatcherCard({ watcher }: FileWatcherCardProps) {
  const [path, setPath] = useState(watcher.path ?? '');
  const [importAction, setImportAction] = useState(watcher.importAction);
  const [template, setTemplate] = useState<string | null>(
    watcher.template ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pathCheckResult, setPathCheckResult] = useState<CheckPathResult | null>(null);

  // Memoize import action options to avoid re-renders
  const importActionOptions = useMemo(
    () => [
      {
        label: t`Create new submission`,
        value: DirectoryWatcherImportAction.NEW_SUBMISSION,
      },
    ],
    []
  );

  // Check if there are unsaved changes
  const hasChanges =
    path !== (watcher.path ?? '') ||
    importAction !== watcher.importAction ||
    template !== (watcher.template ?? null);

  const handlePickFolder = useCallback(async () => {
    if (window?.electron?.pickDirectory) {
      const folder = await window.electron.pickDirectory();
      if (folder) {
        try {
          const result = await directoryWatchersApi.checkPath(folder);
          if (!result.body.valid) {
            // Show error notification for invalid path
            showUpdateErrorNotification();
            return;
          }

          if (result.body.count > FILE_COUNT_WARNING_THRESHOLD) {
            setPendingPath(folder);
            setPathCheckResult(result.body);
            setConfirmModalOpened(true);
          } else {
            setPath(folder);
          }
        } catch {
          // If check fails, still allow selecting the folder
          setPath(folder);
        }
      }
    }
  }, []);

  const handleConfirmPath = useCallback(() => {
    if (pendingPath) {
      setPath(pendingPath);
      setPendingPath(null);
      setPathCheckResult(null);
      setConfirmModalOpened(false);
    }
  }, [pendingPath]);

  const handleCancelPath = useCallback(() => {
    setPendingPath(null);
    setPathCheckResult(null);
    setConfirmModalOpened(false);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await directoryWatchersApi.update(watcher.id, {
        path: path || undefined,
        importAction,
        templateId: template ?? undefined,
      });
      showUpdatedNotification();
    } catch {
      showUpdateErrorNotification();
    } finally {
      setIsSaving(false);
    }
  }, [watcher.id, path, importAction, template]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await directoryWatchersApi.remove([watcher.id]);
      showDeletedNotification(1);
    } catch {
      showDeleteErrorNotification();
      setIsDeleting(false);
    }
  }, [watcher.id]);

  return (
    <Card padding="md" withBorder>
      <ComponentErrorBoundary>
      <Stack gap="sm">
        {/* Folder Path */}
        <Input.Wrapper label={<Trans>Folder Path</Trans>} required>
          <Input
            leftSection={<IconFolder size={16} />}
            value={path || t`No folder selected`}
            readOnly
            disabled={!window?.electron?.pickDirectory}
            styles={{
              input: {
                cursor: window?.electron?.pickDirectory
                  ? 'pointer'
                  : 'not-allowed',
                fontFamily: 'monospace',
                fontSize: 'var(--mantine-font-size-xs)',
              },
            }}
            onClick={handlePickFolder}
          />
        </Input.Wrapper>

        {/* Import Action */}
        <Select
          size="sm"
          label={<Trans>Import Action</Trans>}
          description={<Trans>What to do when new files are detected</Trans>}
          data={importActionOptions}
          value={importAction}
          onChange={(value) =>
            setImportAction(
              (value as DirectoryWatcherImportAction) ??
                DirectoryWatcherImportAction.NEW_SUBMISSION
            )
          }
        />

        {/* Template Picker - only show for NEW_SUBMISSION action */}
        {importAction === DirectoryWatcherImportAction.NEW_SUBMISSION && (
          <TemplatePicker
            size="sm"
            type={SubmissionType.FILE}
            value={template ?? undefined}
            onChange={setTemplate}
            description={
              <Trans>Optional template to apply to imported files</Trans>
            }
          />
        )}

        {/* Actions */}
        <Group justify="space-between" mt="xs">
          <Tooltip label={<Trans>Hold to delete</Trans>}>
            <HoldToConfirmButton
              variant="subtle"
              color="red"
              size="sm"
              onConfirm={handleDelete}
              loading={isDeleting}
            >
              <IconTrash size={16} />
            </HoldToConfirmButton>
          </Tooltip>

          <Tooltip
            label={
              hasChanges ? <Trans>Save changes</Trans> : <Trans>No changes</Trans>
            }
          >
            <ActionIcon
              variant="filled"
              color="blue"
              size="md"
              onClick={handleSave}
              disabled={!hasChanges}
              loading={isSaving}
            >
              <IconDeviceFloppy size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Stack>
      </ComponentErrorBoundary>

      {/* Confirmation modal for folders with many files */}
      <ConfirmActionModal
        opened={confirmModalOpened}
        onClose={handleCancelPath}
        onConfirm={handleConfirmPath}
        title={<Trans>Folder Contains Files</Trans>}
        message={
          <Stack gap="xs">
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
          </Stack>
        }
        confirmLabel={<Trans>Confirm</Trans>}
        confirmColor="blue"
      />
    </Card>
  );
}

// ============================================================================
// Create Button Component
// ============================================================================

/**
 * Button to create a new file watcher.
 */
function CreateWatcherButton() {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    try {
      await directoryWatchersApi.create({
        importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
      });
      showCreatedNotification();
    } catch {
      showCreateErrorNotification();
    } finally {
      setIsCreating(false);
    }
  }, []);

  return (
    <Tooltip label={<Trans>Create new file watcher</Trans>}>
      <ActionIcon
        variant="filled"
        size="lg"
        onClick={handleCreate}
        loading={isCreating}
      >
        <IconPlus size={18} />
      </ActionIcon>
    </Tooltip>
  );
}

// ============================================================================
// Watcher List Component
// ============================================================================

interface WatcherListProps {
  watchers: DirectoryWatcherRecord[];
}

/**
 * List of file watcher cards.
 */
function WatcherList({ watchers }: WatcherListProps) {
  if (watchers.length === 0) {
    return (
      <EmptyState
        preset="no-records"
        message={<Trans>No file watchers configured</Trans>}
        description={
          <Trans>
            Create a file watcher to automatically import new files from a
            folder
          </Trans>
        }
      />
    );
  }

  return (
    <Stack gap="sm">
      {watchers.map((watcher) => (
        <FileWatcherCard key={watcher.id} watcher={watcher} />
      ))}
    </Stack>
  );
}

// ============================================================================
// Main Drawer Component
// ============================================================================

/**
 * File Watcher Drawer - manages directory watchers for auto-importing files.
 */
export function FileWatcherDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const opened = activeDrawer === DRAWER_KEY;

  const watchers = useDirectoryWatchers();

  return (
    <SectionDrawer
      opened={opened}
      onClose={closeDrawer}
      title={<Trans>File Watchers</Trans>}
      width={400}
    >
      <Stack gap="md" h="100%">
        {/* Header with description and create button */}
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Text size="sm" c="dimmed">
              <Trans>
                Automatically import new files from specified folders
              </Trans>
            </Text>
          </Box>
          <CreateWatcherButton />
        </Group>

        {/* Watcher list */}
        <Box style={{ flex: 1, overflow: 'auto' }}>
          <WatcherList watchers={watchers} />
        </Box>
      </Stack>
    </SectionDrawer>
  );
}
