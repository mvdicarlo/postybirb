import { Trans, useLingui } from '@lingui/react/macro';
import {
    Alert,
    Badge,
    Box,
    Button,
    Checkbox,
    Divider,
    Group,
    LoadingOverlay,
    Modal,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
} from '@mantine/core';
import {
    type IUnitOfWork,
    type UnitOfWorkId,
    UnitOfWorkState,
} from '@postybirb/types';
import {
    IconAlertCircle,
    IconFile,
    IconHourglass,
    IconMessage,
    IconPlayerPause,
    IconRefresh,
    IconSend,
    IconUser,
    IconWorld,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import postingApi, {
    type PostingDryRun,
    type UnitOfWorkEvictions,
} from '../../../../api/posting.api';
import { useAccountsMap } from '../../../../stores/entity/account-store';
import type { SubmissionRecord } from '../../../../stores/records';
import { showPostErrorNotification } from '../../../../utils/notifications';
import { getUnitFileName } from '../submission-history/history-utils';
import './post-preview-modal.css';
import {
    buildUnitOfWorkEvictions,
    getUnitSelectionState,
    groupUnitsByWebsite,
    type PostPreviewWebsiteGroup,
    updateUnitSelection,
} from './post-preview-modal.utils';

export interface PostPreviewModalProps {
  opened: boolean;
  submission: SubmissionRecord;
  onClose: () => void;
}

interface UnitTargetProps {
  submission: SubmissionRecord;
  unit: IUnitOfWork;
}

function UnitTarget({ submission, unit }: UnitTargetProps) {
  const fileName = getUnitFileName(submission, unit);
  const isMessage = !unit.fileId;

  return (
    <Group gap="xs" wrap="nowrap" className="postybirb__post_preview_target">
      {isMessage ? <IconMessage size={15} /> : <IconFile size={15} />}
      <Text size="sm" truncate>
        {isMessage ? (
          <Trans>Message</Trans>
        ) : (
          (fileName ?? <Trans>Unknown file</Trans>)
        )}
      </Text>
    </Group>
  );
}

interface PreviewWorkListProps {
  groups: PostPreviewWebsiteGroup[];
  submission: SubmissionRecord;
  executableUnitIds: ReadonlySet<UnitOfWorkId>;
}

function PreviewWorkList({
  groups,
  submission,
  executableUnitIds,
}: PreviewWorkListProps) {
  if (groups.length === 0) {
    return (
      <Box className="postybirb__post_preview_empty">
        <Text size="sm" c="dimmed">
          <Trans>No work will post</Trans>
        </Text>
      </Box>
    );
  }

  return (
    <Stack gap={0} className="postybirb__post_preview_list">
      {groups.map((websiteGroup) => (
        <Box
          key={websiteGroup.website}
          className="postybirb__post_preview_website"
        >
          <Group
            justify="space-between"
            wrap="nowrap"
            className="postybirb__post_preview_website_header"
          >
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon variant="light" size="sm" color="gray">
                <IconWorld size={14} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                {websiteGroup.websiteDisplayName || (
                  <Trans>Unknown website</Trans>
                )}
              </Text>
            </Group>
            <Badge size="sm" variant="light" color="gray">
              {websiteGroup.accounts.reduce(
                (count, accountGroup) => count + accountGroup.units.length,
                0,
              )}
            </Badge>
          </Group>

          {websiteGroup.accounts.map((accountGroup) => (
            <Box
              key={accountGroup.accountId}
              className="postybirb__post_preview_account"
            >
              <Group
                gap="xs"
                wrap="nowrap"
                className="postybirb__post_preview_account_header"
              >
                <IconUser size={14} />
                <Text size="xs" fw={500} truncate>
                  {accountGroup.account?.name ?? accountGroup.accountId}
                </Text>
              </Group>
              {accountGroup.units.map((unit) => (
                <Group
                  key={unit.id}
                  justify="space-between"
                  wrap="nowrap"
                  className="postybirb__post_preview_unit"
                >
                  <UnitTarget submission={submission} unit={unit} />
                  <Badge
                    size="xs"
                    variant="light"
                    color={executableUnitIds.has(unit.id) ? 'green' : 'gray'}
                  >
                    {executableUnitIds.has(unit.id) ? (
                      <Trans>Ready</Trans>
                    ) : (
                      <Trans>Waiting</Trans>
                    )}
                  </Badge>
                </Group>
              ))}
            </Box>
          ))}
        </Box>
      ))}
    </Stack>
  );
}

interface CompletedWorkListProps {
  groups: PostPreviewWebsiteGroup[];
  submission: SubmissionRecord;
  selectedUnitIds: ReadonlySet<UnitOfWorkId>;
  onSelectionChange: (units: IUnitOfWork[], selected: boolean) => void;
}

function CompletedWorkList({
  groups,
  submission,
  selectedUnitIds,
  onSelectionChange,
}: CompletedWorkListProps) {
  return (
    <Stack gap={0} className="postybirb__post_preview_list">
      {groups.map((websiteGroup) => {
        const websiteUnits = websiteGroup.accounts.flatMap(
          (accountGroup) => accountGroup.units,
        );
        const websiteSelection = getUnitSelectionState(
          selectedUnitIds,
          websiteUnits,
        );

        return (
          <Box
            key={websiteGroup.website}
            className="postybirb__post_preview_website"
          >
            <Group
              justify="space-between"
              wrap="nowrap"
              className="postybirb__post_preview_website_header"
            >
              <Checkbox
                size="sm"
                checked={websiteSelection.checked}
                indeterminate={websiteSelection.indeterminate}
                onChange={(event) =>
                  onSelectionChange(
                    websiteUnits,
                    event.currentTarget.checked,
                  )
                }
                label={
                  <Group gap="xs" wrap="nowrap">
                    <ThemeIcon variant="light" size="sm" color="gray">
                      <IconWorld size={14} />
                    </ThemeIcon>
                    <Text size="sm" fw={600}>
                      {websiteGroup.websiteDisplayName || (
                        <Trans>Unknown website</Trans>
                      )}
                    </Text>
                  </Group>
                }
              />
              <Badge size="sm" variant="light" color="gray">
                {websiteUnits.length}
              </Badge>
            </Group>

            {websiteGroup.accounts.map((accountGroup) => {
              const accountSelection = getUnitSelectionState(
                selectedUnitIds,
                accountGroup.units,
              );

              return (
                <Box
                  key={accountGroup.accountId}
                  className="postybirb__post_preview_account"
                >
                  <Checkbox
                    size="xs"
                    checked={accountSelection.checked}
                    indeterminate={accountSelection.indeterminate}
                    onChange={(event) =>
                      onSelectionChange(
                        accountGroup.units,
                        event.currentTarget.checked,
                      )
                    }
                    className="postybirb__post_preview_account_header"
                    label={
                      <Group gap="xs" wrap="nowrap">
                        <IconUser size={14} />
                        <Text size="xs" fw={500} truncate>
                          {accountGroup.account?.name ?? accountGroup.accountId}
                        </Text>
                      </Group>
                    }
                  />
                  {accountGroup.units.map((unit) => (
                    <Group
                      key={unit.id}
                      justify="space-between"
                      wrap="nowrap"
                      className="postybirb__post_preview_unit"
                    >
                      <Checkbox
                        size="xs"
                        checked={selectedUnitIds.has(unit.id)}
                        onChange={(event) =>
                          onSelectionChange(
                            [unit],
                            event.currentTarget.checked,
                          )
                        }
                        label={
                          <UnitTarget submission={submission} unit={unit} />
                        }
                      />
                      <Badge size="xs" variant="outline" color="green">
                        <Trans>Posted</Trans>
                      </Badge>
                    </Group>
                  ))}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Stack>
  );
}

export function PostPreviewModal({
  opened,
  submission,
  onClose,
}: PostPreviewModalProps) {
  const { t } = useLingui();
  const accountsMap = useAccountsMap();
  const requestVersion = useRef(0);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<UnitOfWorkId>>(
    new Set(),
  );
  const [preview, setPreview] = useState<PostingDryRun | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);

  const completedUnits = useMemo(
    () =>
      submission.activeUnitsOfWork.filter(
        (unit) => unit.state === UnitOfWorkState.SUCCEEDED,
      ),
    [submission],
  );
  const removedUnitIds = useMemo<ReadonlySet<UnitOfWorkId>>(
    () => new Set(preview?.removedWork.map((unit) => unit.id) ?? []),
    [preview?.removedWork],
  );
  const selectableCompletedUnits = useMemo(
    () =>
      preview === null
        ? []
        : completedUnits.filter((unit) => !removedUnitIds.has(unit.id)),
    [completedUnits, preview, removedUnitIds],
  );
  const evictions = useMemo<UnitOfWorkEvictions>(
    () => buildUnitOfWorkEvictions(completedUnits, selectedUnitIds),
    [completedUnits, selectedUnitIds],
  );
  const completedGroups = useMemo(
    () => groupUnitsByWebsite(selectableCompletedUnits, accountsMap),
    [accountsMap, selectableCompletedUnits],
  );
  const previewGroups = useMemo(
    () => groupUnitsByWebsite(preview?.remainingWork ?? [], accountsMap),
    [accountsMap, preview],
  );
  const executableUnitIds = useMemo(
    () => new Set(preview?.executableWork.map((unit) => unit.id) ?? []),
    [preview],
  );

  useEffect(() => {
    if (!opened) return undefined;

    const currentRequest = requestVersion.current + 1;
    requestVersion.current = currentRequest;
    setIsLoadingPreview(true);
    setPreviewError(false);

    postingApi
      .dryRun(submission.submissionId, evictions)
      .then((response) => {
        if (requestVersion.current === currentRequest) {
          setPreview(response.body);
        }
      })
      .catch(() => {
        if (requestVersion.current === currentRequest) {
          setPreviewError(true);
        }
      })
      .finally(() => {
        if (requestVersion.current === currentRequest) {
          setIsLoadingPreview(false);
        }
      });

    return () => {
      if (requestVersion.current === currentRequest) {
        requestVersion.current += 1;
      }
    };
  }, [evictions, opened, retryVersion, submission.submissionId]);

  const handleSelectionChange = (
    units: IUnitOfWork[],
    selected: boolean,
  ) => {
    setSelectedUnitIds((current) =>
      updateUnitSelection(current, units, selected),
    );
  };

  const handlePost = async () => {
    setIsPosting(true);
    try {
      await postingApi.post(submission.submissionId, evictions);
      onClose();
    } catch {
      showPostErrorNotification();
    } finally {
      setIsPosting(false);
    }
  };

  const expectedCount = preview?.remainingWork.length ?? 0;
  const selectedCompletedCount = selectableCompletedUnits.filter((unit) =>
    selectedUnitIds.has(unit.id),
  ).length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      closeOnClickOutside={!isPosting}
      closeOnEscape={!isPosting}
      withCloseButton={!isPosting}
      centered
      radius="sm"
      size="xl"
      title={
        <Group gap="xs" wrap="nowrap">
          <IconSend size={19} />
          <Text fw={600}>
            <Trans>Review post</Trans>
          </Text>
        </Group>
      }
      classNames={{
        content: 'postybirb__post_preview_modal_content',
        header: 'postybirb__post_preview_modal_header',
        body: 'postybirb__post_preview_modal_body',
      }}
    >
      <Box className="postybirb__post_preview_modal_layout">
        <ScrollArea
          type="auto"
          offsetScrollbars
          className="postybirb__post_preview_modal_scroll"
        >
          <Stack gap="md" p="md" pt="xs">
            <Group justify="space-between" align="flex-start" wrap="wrap">
          <Text size="sm" fw={500} maw="70%" truncate>
            {submission.title || <Trans>Untitled submission</Trans>}
          </Text>
          <Group gap="xs">
            <Badge variant="light" color="blue">
              <Trans>{expectedCount} will post</Trans>
            </Badge>
            {selectedCompletedCount > 0 && (
              <Badge variant="light" color="orange">
                <Trans>{selectedCompletedCount} posting again</Trans>
              </Badge>
            )}
          </Group>
          </Group>

          {preview?.paused && (
          <Alert
            color="yellow"
            variant="light"
            icon={<IconPlayerPause size={17} />}
            title={<Trans>Posting is paused</Trans>}
          >
            <Trans>Confirmed work will wait until posting resumes.</Trans>
          </Alert>
          )}

          {preview && !preview.dependenciesCompleted && (
          <Alert
            color="blue"
            variant="light"
            icon={<IconHourglass size={17} />}
            title={<Trans>Waiting for dependencies</Trans>}
          >
            <Trans>Work will begin after dependent submissions finish.</Trans>
          </Alert>
          )}

          {previewError && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertCircle size={17} />}
            title={<Trans>Unable to preview this post</Trans>}
          >
            <Button
              mt="xs"
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconRefresh size={14} />}
              onClick={() => setRetryVersion((current) => current + 1)}
            >
              <Trans>Retry</Trans>
            </Button>
          </Alert>
          )}

          <Box pos="relative" mih={120}>
          <LoadingOverlay
            visible={isLoadingPreview}
            overlayProps={{ blur: 1, backgroundOpacity: 0.45 }}
            loaderProps={{ size: 'sm' }}
          />
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                <Trans>Will post</Trans>
              </Text>
              {preview && (
                <Text size="xs" c="dimmed">
                  <Trans>{preview.executableWork.length} ready now</Trans>
                </Text>
              )}
            </Group>
            <PreviewWorkList
              groups={previewGroups}
              submission={submission}
              executableUnitIds={executableUnitIds}
            />
          </Stack>
          </Box>

          {completedGroups.length > 0 && (
          <>
            <Divider />
            <Stack gap="xs">
              <Group justify="space-between">
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    <Trans>Post again</Trans>
                  </Text>
                  <Badge size="sm" variant="light" color="gray">
                    {selectableCompletedUnits.length}
                  </Badge>
                </Group>
                {selectedCompletedCount > 0 && (
                  <Button
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    onClick={() => setSelectedUnitIds(new Set())}
                  >
                    <Trans>Clear</Trans>
                  </Button>
                )}
              </Group>
              <CompletedWorkList
                groups={completedGroups}
                submission={submission}
                selectedUnitIds={selectedUnitIds}
                onSelectionChange={handleSelectionChange}
              />
            </Stack>
          </>
            )}
          </Stack>
        </ScrollArea>

        <Group
          justify="flex-end"
          gap="sm"
          p="md"
          className="postybirb__post_preview_modal_footer"
        >
          <Button variant="default" onClick={onClose} disabled={isPosting}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            leftSection={<IconSend size={16} />}
            onClick={handlePost}
            loading={isPosting}
            disabled={
              isLoadingPreview || previewError || !preview || expectedCount === 0
            }
          >
            {t`Post`}
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}