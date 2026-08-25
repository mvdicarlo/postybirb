import { Trans, useLingui } from '@lingui/react/macro';
import {
    Alert,
    Badge,
    Box,
    Button,
    Checkbox,
    Divider,
    Group,
    Loader,
    Modal,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
} from '@mantine/core';
import {
    type IUnitOfWork,
    type SubmissionId,
    type UnitOfWorkId,
    UnitOfWorkState,
} from '@postybirb/types';
import {
    IconAlertCircle,
    IconFile,
    IconGitBranch,
    IconHourglass,
    IconMessage,
    IconPlayerPause,
    IconRefresh,
    IconSend,
    IconUser,
    IconWorld,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import postingApi, {
    type PostingDryRun,
    type PostingRequest,
} from '../../../../api/posting.api';
import { useAccountsMap } from '../../../../stores/entity/account-store';
import { useSubmissionsMap } from '../../../../stores/entity/submission-store';
import type { SubmissionRecord } from '../../../../stores/records';
import { ReorderableSubmissionList } from '../../../shared/reorderable-submission-list';
import '../post-preview-modal/post-preview-modal.css';
import {
    buildUnitOfWorkEvictions,
    getUnitSelectionState,
    groupUnitsByWebsite,
    type PostPreviewWebsiteGroup,
    updateUnitSelection,
} from '../post-preview-modal/post-preview-modal.utils';
import { getUnitFileName } from '../submission-history/history-utils';
import './post-confirm-modal.css';
import { buildBulkPostingRequests } from './post-confirm-modal.utils';

export interface BulkPostPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (requests: PostingRequest[]) => Promise<void>;
  selectedSubmissions: SubmissionRecord[];
  totalSelectedCount: number;
}

interface BulkCompletedWorkListProps {
  groups: PostPreviewWebsiteGroup[];
  submissions: ReadonlyMap<SubmissionId, SubmissionRecord>;
  selectedUnitIds: ReadonlySet<UnitOfWorkId>;
  onSelectionChange: (units: IUnitOfWork[], selected: boolean) => void;
}

function BulkUnitTarget({
  unit,
  submission,
}: {
  unit: IUnitOfWork;
  submission?: SubmissionRecord;
}) {
  const fileName = submission
    ? getUnitFileName(submission, unit)
    : undefined;

  return (
    <Group gap="xs" wrap="nowrap" className="postybirb__bulk_post_unit_target">
      {unit.fileId ? <IconFile size={15} /> : <IconMessage size={15} />}
      <Stack gap={0} className="postybirb__bulk_post_unit_labels">
        <Text size="xs" fw={500} truncate>
          {submission?.title || <Trans>Untitled submission</Trans>}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {unit.fileId ? (
            (fileName ?? <Trans>Unknown file</Trans>)
          ) : (
            <Trans>Message</Trans>
          )}
        </Text>
      </Stack>
    </Group>
  );
}

interface SubmissionDependenciesProps {
  submission: SubmissionRecord;
  submissions: ReadonlyMap<SubmissionId, SubmissionRecord>;
  batchIndexes: ReadonlyMap<SubmissionId, number>;
  stagedSubmissionIds: ReadonlySet<SubmissionId>;
  submissionIndex: number;
}

function SubmissionDependencies({
  submission,
  submissions,
  batchIndexes,
  stagedSubmissionIds,
  submissionIndex,
}: SubmissionDependenciesProps) {
  if (submission.dependsOn.length === 0) return null;

  return (
    <Group
      gap="xs"
      align="flex-start"
      wrap="nowrap"
      className="postybirb__bulk_post_dependencies"
    >
      <Group gap={5} wrap="nowrap" className="postybirb__bulk_post_dependencies_label">
        <IconGitBranch size={14} />
        <Text size="xs" fw={600}>
          <Trans>Depends on</Trans>
        </Text>
      </Group>
      <Group gap={5} className="postybirb__bulk_post_dependency_list">
        {submission.dependsOn.map((dependencyId) => {
          const dependency = submissions.get(dependencyId);
          const dependencyIndex = batchIndexes.get(dependencyId);
          const isStaged = stagedSubmissionIds.has(dependencyId);
          const isCompleted = Boolean(
            dependency?.post?.completed && !dependency.post.cancelled,
          );

          let status = <Trans>Outside batch</Trans>;
          let color = 'yellow';
          if (isStaged && dependencyIndex !== undefined) {
            if (dependencyIndex < submissionIndex) {
              status = <Trans>Earlier in batch</Trans>;
              color = 'blue';
            } else {
              status = <Trans>Later in batch</Trans>;
              color = 'orange';
            }
          } else if (isCompleted) {
            status = <Trans>Completed</Trans>;
            color = 'green';
          } else if (dependencyIndex !== undefined) {
            status = <Trans>Not posting</Trans>;
            color = 'gray';
          }

          const title = dependency?.title || dependencyId;
          return (
            <Group
              key={dependencyId}
              gap={5}
              wrap="nowrap"
              className="postybirb__bulk_post_dependency"
            >
              <Text size="xs" truncate title={title}>
                {title}
              </Text>
              <Badge size="xs" variant="light" color={color}>
                {status}
              </Badge>
            </Group>
          );
        })}
      </Group>
    </Group>
  );
}

function BulkCompletedWorkList({
  groups,
  submissions,
  selectedUnitIds,
  onSelectionChange,
}: BulkCompletedWorkListProps) {
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
                          <BulkUnitTarget
                            unit={unit}
                            submission={submissions.get(unit.submissionId)}
                          />
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

function completedUnits(submission: SubmissionRecord): IUnitOfWork[] {
  return submission.activeUnitsOfWork.filter(
    (unit) => unit.state === UnitOfWorkState.SUCCEEDED,
  );
}

export function BulkPostPreviewModal({
  opened,
  onClose,
  onConfirm,
  selectedSubmissions,
  totalSelectedCount,
}: BulkPostPreviewModalProps) {
  const { t } = useLingui();
  const accountsMap = useAccountsMap();
  const allSubmissionsMap = useSubmissionsMap();
  const requestVersions = useRef(new Map<SubmissionId, number>());
  const selectedUnitIdsRef = useRef<Set<UnitOfWorkId>>(new Set());
  const [orderedSubmissions, setOrderedSubmissions] = useState<
    SubmissionRecord[]
  >([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<UnitOfWorkId>>(
    new Set(),
  );
  const [previews, setPreviews] = useState<
    Map<SubmissionId, PostingDryRun>
  >(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<SubmissionId>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<SubmissionId>>(new Set());
  const [isPosting, setIsPosting] = useState(false);

  const validSubmissions = useMemo(
    () =>
      selectedSubmissions.filter(
        (submission) =>
          submission.hasWebsiteOptions &&
          !submission.hasErrors &&
          !submission.isQueued &&
          !submission.isPosting,
      ),
    [selectedSubmissions],
  );

  const submissionsMap = useMemo(
    () =>
      new Map(
        validSubmissions.map((submission) => [
          submission.submissionId,
          submission,
        ]),
      ),
    [validSubmissions],
  );

  const validSubmissionIds = useMemo(
    () =>
      new Set(
        validSubmissions.map((submission) => submission.submissionId),
      ),
    [validSubmissions],
  );

  const visibleOrderedSubmissions = useMemo(
    () =>
      orderedSubmissions.filter((submission) =>
        validSubmissionIds.has(submission.submissionId),
      ),
    [orderedSubmissions, validSubmissionIds],
  );

  const batchIndexes = useMemo(
    () =>
      new Map(
        visibleOrderedSubmissions.map((submission, index) => [
          submission.submissionId,
          index,
        ]),
      ),
    [visibleOrderedSubmissions],
  );

  const completedUnitsBySubmission = useMemo(
    () =>
      new Map(
        validSubmissions.map((submission) => [
          submission.submissionId,
          completedUnits(submission),
        ]),
      ),
    [validSubmissions],
  );

  const loadPreviews = useCallback(
    (
      submissions: SubmissionRecord[],
      selection: ReadonlySet<UnitOfWorkId>,
    ) => {
      const submissionIds = submissions.map(
        (submission) => submission.submissionId,
      );
      setLoadingIds((current) => new Set([...current, ...submissionIds]));
      setErrorIds((current) => {
        const next = new Set(current);
        submissionIds.forEach((submissionId) => next.delete(submissionId));
        return next;
      });

      for (const submission of submissions) {
        const { submissionId } = submission;
        const version = (requestVersions.current.get(submissionId) ?? 0) + 1;
        requestVersions.current.set(submissionId, version);
        const evictions = buildUnitOfWorkEvictions(
          completedUnits(submission),
          selection,
        );

        postingApi
          .dryRun(submissionId, evictions)
          .then((response) => {
            if (requestVersions.current.get(submissionId) !== version) return;
            setPreviews((current) => {
              const next = new Map(current);
              next.set(submissionId, response.body);
              return next;
            });
          })
          .catch(() => {
            if (requestVersions.current.get(submissionId) !== version) return;
            setErrorIds((current) => new Set(current).add(submissionId));
          })
          .finally(() => {
            if (requestVersions.current.get(submissionId) !== version) return;
            setLoadingIds((current) => {
              const next = new Set(current);
              next.delete(submissionId);
              return next;
            });
          });
      }
    },
    [],
  );

  useEffect(() => {
    if (!opened) return undefined;

    const versions = requestVersions.current;
    const emptySelection = new Set<UnitOfWorkId>();
    selectedUnitIdsRef.current = emptySelection;
    setSelectedUnitIds(emptySelection);
    setPreviews(new Map());
    setLoadingIds(new Set());
    setErrorIds(new Set());
    setOrderedSubmissions(validSubmissions);
    loadPreviews(validSubmissions, emptySelection);

    return () => {
      for (const [submissionId, version] of versions) {
        versions.set(submissionId, version + 1);
      }
    };
    // The selected records are intentionally captured when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const selectableCompletedUnits = useMemo(
    () =>
      validSubmissions.flatMap((submission) => {
        const preview = previews.get(submission.submissionId);
        if (!preview) return [];
        const removedIds = new Set(
          preview.removedWork.map((unit) => unit.id),
        );
        return completedUnits(submission).filter(
          (unit) => !removedIds.has(unit.id),
        );
      }),
    [previews, validSubmissions],
  );

  const completedGroups = useMemo(
    () => groupUnitsByWebsite(selectableCompletedUnits, accountsMap),
    [accountsMap, selectableCompletedUnits],
  );

  const handleSelectionChange = (
    units: IUnitOfWork[],
    selected: boolean,
  ) => {
    const next = updateUnitSelection(
      selectedUnitIdsRef.current,
      units,
      selected,
    );
    selectedUnitIdsRef.current = next;
    setSelectedUnitIds(next);

    const affectedSubmissionIds = new Set(
      units.map((unit) => unit.submissionId),
    );
    loadPreviews(
      validSubmissions.filter((submission) =>
        affectedSubmissionIds.has(submission.submissionId),
      ),
      next,
    );
  };

  const handleClearSelection = () => {
    const selectedSubmissionIds = new Set(
      selectableCompletedUnits
        .filter((unit) => selectedUnitIdsRef.current.has(unit.id))
        .map((unit) => unit.submissionId),
    );
    const emptySelection = new Set<UnitOfWorkId>();
    selectedUnitIdsRef.current = emptySelection;
    setSelectedUnitIds(emptySelection);
    loadPreviews(
      validSubmissions.filter((submission) =>
        selectedSubmissionIds.has(submission.submissionId),
      ),
      emptySelection,
    );
  };

  const handleRetryPreview = useCallback(
    (submission: SubmissionRecord) => {
      loadPreviews([submission], selectedUnitIdsRef.current);
    },
    [loadPreviews],
  );

  const stagedSubmissionIds = useMemo(
    () =>
      new Set(
        visibleOrderedSubmissions
          .filter(
            (submission) =>
              (previews.get(submission.submissionId)?.remainingWork.length ??
                0) > 0,
          )
          .map((submission) => submission.submissionId),
      ),
    [previews, visibleOrderedSubmissions],
  );

  const renderExtra = useCallback(
    (submission: SubmissionRecord, submissionIndex: number) => {
      const { submissionId } = submission;
      const preview = previews.get(submissionId);
      const isLoading = loadingIds.has(submissionId);
      const hasError = errorIds.has(submissionId);
      const dependencySummary = (
        <SubmissionDependencies
          submission={submission}
          submissions={allSubmissionsMap}
          batchIndexes={batchIndexes}
          stagedSubmissionIds={stagedSubmissionIds}
          submissionIndex={submissionIndex}
        />
      );

      if (!preview && isLoading) {
        return (
          <Stack gap={6} mt="xs">
            {dependencySummary}
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="xs" c="dimmed">
                <Trans>Checking expected work</Trans>
              </Text>
            </Group>
          </Stack>
        );
      }

      if (hasError) {
        return (
          <Stack gap={6} mt="xs">
            {dependencySummary}
            <Group gap="xs">
              <Text size="xs" c="red">
                <Trans>Preview unavailable</Trans>
              </Text>
              <Button
                size="compact-xs"
                variant="subtle"
                color="red"
                leftSection={<IconRefresh size={13} />}
                onClick={() => handleRetryPreview(submission)}
              >
                <Trans>Retry</Trans>
              </Button>
            </Group>
          </Stack>
        );
      }

      if (!preview) return dependencySummary;

      const groups = groupUnitsByWebsite(preview.remainingWork, accountsMap);
      if (groups.length === 0) {
        return (
          <Stack gap={6} mt="xs">
            {dependencySummary}
            <Text size="xs" c="dimmed">
              <Trans>No work selected</Trans>
            </Text>
          </Stack>
        );
      }

      const executableIds = new Set(
        preview.executableWork.map((unit) => unit.id),
      );

      return (
        <Stack gap={6} mt="xs">
          {dependencySummary}
          <Group gap="xs">
            <Badge size="sm" variant="light" color="blue">
              <Trans>{preview.remainingWork.length} units</Trans>
            </Badge>
            <Badge size="sm" variant="light" color="green">
              <Trans>{preview.executableWork.length} ready</Trans>
            </Badge>
            {preview.deferredWork.length > 0 && (
              <Badge size="sm" variant="light" color="gray">
                <Trans>{preview.deferredWork.length} waiting</Trans>
              </Badge>
            )}
            {isLoading && <Loader size="xs" />}
          </Group>
          <Stack gap={4} className="postybirb__bulk_post_targets">
            {groups.flatMap((websiteGroup) =>
              websiteGroup.accounts.map((accountGroup) => (
                <Group
                  key={`${websiteGroup.website}:${accountGroup.accountId}`}
                  gap="xs"
                  wrap="nowrap"
                  className="postybirb__bulk_post_target_summary"
                >
                  <Badge size="xs" variant="light" color="gray">
                    {websiteGroup.websiteDisplayName ||
                      accountGroup.account?.website || (
                        <Trans>Unknown website</Trans>
                      )}
                  </Badge>
                  <Text size="xs" fw={500} truncate>
                    {accountGroup.account?.name ?? accountGroup.accountId}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {accountGroup.units
                      .map(
                        (unit) =>
                          getUnitFileName(submission, unit) ?? t`Message`,
                      )
                      .join(', ')}
                  </Text>
                  <Badge
                    size="xs"
                    variant="dot"
                    color={
                      accountGroup.units.some((unit) =>
                        executableIds.has(unit.id),
                      )
                        ? 'green'
                        : 'gray'
                    }
                    className="postybirb__bulk_post_target_count"
                  >
                    {accountGroup.units.length}
                  </Badge>
                </Group>
              )),
            )}
          </Stack>
        </Stack>
      );
    },
    [
      accountsMap,
      allSubmissionsMap,
      batchIndexes,
      errorIds,
      handleRetryPreview,
      loadingIds,
      previews,
      stagedSubmissionIds,
      t,
    ],
  );

  const postableSubmissionIds = visibleOrderedSubmissions
    .filter(
      (submission) =>
        (previews.get(submission.submissionId)?.remainingWork.length ?? 0) > 0,
    )
    .map((submission) => submission.submissionId);
  const requests = buildBulkPostingRequests(
    postableSubmissionIds,
    completedUnitsBySubmission,
    selectedUnitIds,
  );
  const expectedUnitCount = postableSubmissionIds.reduce(
    (count, submissionId) =>
      count + (previews.get(submissionId)?.remainingWork.length ?? 0),
    0,
  );
  const selectedCompletedCount = selectableCompletedUnits.filter((unit) =>
    selectedUnitIds.has(unit.id),
  ).length;
  const dependencyWaitCount = [...previews.values()].filter(
    (preview) => !preview.dependenciesCompleted,
  ).length;
  const isPaused = [...previews.values()].some((preview) => preview.paused);
  const hasSkippedSubmissions =
    validSubmissions.length < totalSelectedCount;
  const isLoading = loadingIds.size > 0;
  const hasPreviewErrors = errorIds.size > 0;

  const handleConfirm = async () => {
    setIsPosting(true);
    try {
      await onConfirm(requests);
    } finally {
      setIsPosting(false);
      onClose();
    }
  };

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
            <Trans>Review posts</Trans>
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
            <Group justify="space-between" wrap="wrap">
              <Text size="sm">
                <Trans>
                  Review the submissions and posting targets in their start
                  order.
                </Trans>
              </Text>
              <Group gap="xs">
                <Badge variant="light" color="blue">
                  <Trans>{requests.length} submissions</Trans>
                </Badge>
                <Badge variant="light" color="gray">
                  <Trans>{expectedUnitCount} units</Trans>
                </Badge>
                {selectedCompletedCount > 0 && (
                  <Badge variant="light" color="orange">
                    <Trans>{selectedCompletedCount} posting again</Trans>
                  </Badge>
                )}
              </Group>
            </Group>

            {hasSkippedSubmissions && (
              <Alert
                color="orange"
                variant="light"
                icon={<IconAlertCircle size={17} />}
                title={<Trans>Some submissions were skipped</Trans>}
              >
                <Trans>
                  Submissions with validation errors, no websites, or active
                  posting work cannot be started.
                </Trans>
              </Alert>
            )}

            {isPaused && (
              <Alert
                color="yellow"
                variant="light"
                icon={<IconPlayerPause size={17} />}
                title={<Trans>Posting is paused</Trans>}
              >
                <Trans>Confirmed work will wait until posting resumes.</Trans>
              </Alert>
            )}

            {dependencyWaitCount > 0 && (
              <Alert
                color="blue"
                variant="light"
                icon={<IconHourglass size={17} />}
                title={<Trans>Waiting for dependencies</Trans>}
              >
                <Trans>
                  {dependencyWaitCount} submission(s) will wait for dependent
                  submissions to finish.
                </Trans>
              </Alert>
            )}

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  <Trans>Posting order</Trans>
                </Text>
                {isLoading && (
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="xs" c="dimmed">
                      <Trans>Updating previews</Trans>
                    </Text>
                  </Group>
                )}
              </Group>
              <ReorderableSubmissionList
                submissions={visibleOrderedSubmissions}
                onReorder={setOrderedSubmissions}
                renderExtra={renderExtra}
                scrollable={false}
              />
            </Stack>

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
                        onClick={handleClearSelection}
                      >
                        <Trans>Clear</Trans>
                      </Button>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    <Trans>
                      Select completed work by website, account, or individual
                      record to include it again.
                    </Trans>
                  </Text>
                  <BulkCompletedWorkList
                    groups={completedGroups}
                    submissions={submissionsMap}
                    selectedUnitIds={selectedUnitIds}
                    onSelectionChange={handleSelectionChange}
                  />
                </Stack>
              </>
            )}
          </Stack>
        </ScrollArea>

        <Group
          justify="space-between"
          gap="sm"
          p="md"
          className="postybirb__post_preview_modal_footer"
        >
          <Text size="xs" c="dimmed">
            <Trans>{expectedUnitCount} unit(s) will be staged</Trans>
          </Text>
          <Group gap="sm">
            <Button variant="default" onClick={onClose} disabled={isPosting}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              leftSection={<IconSend size={16} />}
              onClick={handleConfirm}
              loading={isPosting}
              disabled={
                isLoading ||
                hasPreviewErrors ||
                requests.length === 0 ||
                isPosting
              }
            >
              <Trans>Post {requests.length}</Trans>
            </Button>
          </Group>
        </Group>
      </Box>
    </Modal>
  );
}