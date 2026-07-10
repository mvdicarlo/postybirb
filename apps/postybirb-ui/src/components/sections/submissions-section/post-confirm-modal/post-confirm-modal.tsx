import { Trans, useLingui } from '@lingui/react/macro';
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import type { PostRecordResumeMode, SubmissionId } from '@postybirb/types';
import { IconClock, IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccountsMap } from '../../../../stores/entity/account-store';
import { useSubmissionsMap } from '../../../../stores/entity/submission-store';
import type { SubmissionRecord } from '../../../../stores/records';
import { ReorderableSubmissionList } from '../../../shared/reorderable-submission-list';
import { DependencyReorderableTree } from './dependency-reorderable-tree';
import {
  buildDependencyForest,
  flattenForest,
  type DependencyNode,
} from './dependency-tree';
import './post-confirm-modal.css';

export interface PostConfirmModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Handler when user confirms - receives the ordered submission IDs and optional resume mode */
  onConfirm: (orderedIds: string[], resumeMode?: PostRecordResumeMode) => void;
  /** All selected submissions (will be filtered to only valid ones) */
  selectedSubmissions: SubmissionRecord[];
  /** Total number of selected submissions (including invalid) */
  totalSelectedCount: number;
  /** Whether the confirm action is loading */
  loading?: boolean;
}

/**
 * Modal for confirming submission posting with reorderable queue.
 * Shows only valid submissions (with website options and no errors).
 */
export function PostConfirmModal({
  opened,
  onClose,
  onConfirm,
  selectedSubmissions,
  totalSelectedCount,
  loading = false,
}: PostConfirmModalProps) {
  const { t } = useLingui();
  const accountsMap = useAccountsMap();
  const submissionsMap = useSubmissionsMap();

  // Filter to only valid submissions that can be posted
  const validSubmissions = selectedSubmissions.filter(
    (s) => s.hasWebsiteOptions && !s.hasErrors,
  );

  // Flat, fully-reorderable post order (every submission is a top-level record
  // so any of them can be granularly ordered) plus the read-only dependency
  // forest shown for context. Both are seeded when the modal opens; the flat
  // order defaults to a dependency-friendly (prerequisite-first) sequence.
  const [orderedSubmissions, setOrderedSubmissions] = useState<
    SubmissionRecord[]
  >([]);
  const [forest, setForest] = useState<DependencyNode[]>([]);

  useEffect(() => {
    if (opened) {
      const built = buildDependencyForest(validSubmissions);
      setForest(built);
      setOrderedSubmissions(flattenForest(built));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // Ids being posted in this batch (used to color dependency chips).
  const batchIds = useMemo(
    () => new Set(validSubmissions.map((s) => s.id)),
    [validSubmissions],
  );

  const anyHasDependencies = useMemo(
    () =>
      validSubmissions.some((s) =>
        (s.metadata?.dependsOn ?? []).some((id) => batchIds.has(id)),
      ),
    [validSubmissions, batchIds],
  );

  // Build the "waits for" chips for a set of prerequisite ids.
  const buildWaitsFor = useCallback(
    (dependencyIds: string[]) => {
      if (dependencyIds.length === 0) return null;
      return (
        <Group gap={6} mt={4} align="center" wrap="wrap">
          <Text
            size="xs"
            c="dimmed"
            fw={500}
            span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <IconClock size={12} />
            <Trans>Waits for</Trans>
          </Text>
          {dependencyIds.map((dependencyId) => {
            const dependency = submissionsMap.get(dependencyId as SubmissionId);
            const inBatch = batchIds.has(dependencyId);
            const label = dependency
              ? dependency.title.trim() || t`Untitled`
              : t`Deleted submission`;
            let tooltip: string;
            let color: string;
            if (!dependency) {
              tooltip = t`This dependency no longer exists and will be ignored.`;
              color = 'red';
            } else if (inBatch) {
              tooltip = t`Also being posted in this batch.`;
              color = 'grape';
            } else {
              tooltip = t`Not selected here — this submission still waits for it to finish posting.`;
              color = 'gray';
            }
            return (
              <Tooltip
                key={dependencyId}
                label={tooltip}
                multiline
                w={220}
                withArrow
              >
                <Badge
                  size="xs"
                  variant="light"
                  color={color}
                  radius="sm"
                  style={{
                    maxWidth: 180,
                    textTransform: 'none',
                    cursor: 'default',
                  }}
                >
                  {label}
                </Badge>
              </Tooltip>
            );
          })}
        </Group>
      );
    },
    [submissionsMap, batchIds, t],
  );

  // Website "post" chips, grouped by website: one two-tone pill per website
  // showing the website name (accent color) and its account names (plain).
  const buildWebsitePills = useCallback(
    (submission: SubmissionRecord) => {
      const nonDefaultOptions = submission.options.filter((o) => !o.isDefault);
      if (nonDefaultOptions.length === 0) return null;

      const groups = new Map<string, { website: string; accounts: string[] }>();
      for (const option of nonDefaultOptions) {
        const acc = accountsMap.get(option.accountId);
        const website =
          acc?.websiteDisplayName ?? option.account?.website ?? t`Unknown`;
        const name = acc?.name ?? option.account?.name ?? option.accountId;
        const group = groups.get(website);
        if (group) group.accounts.push(name);
        else groups.set(website, { website, accounts: [name] });
      }

      return (
        <Group gap={6} wrap="wrap">
          {[...groups.values()].map((group) => (
            <WebsitePostPill
              key={group.website}
              website={group.website}
              accounts={group.accounts}
            />
          ))}
        </Group>
      );
    },
    [accountsMap, t],
  );

  // Extra content under each row in the flat post-order list: website chips and
  // the full "waits for" chip set (no nesting here, so show every dependency).
  const renderExtra = useCallback(
    (submission: SubmissionRecord) => {
      const pills = buildWebsitePills(submission);
      const chips = buildWaitsFor(submission.metadata?.dependsOn ?? []);
      if (!pills && !chips) return null;
      return (
        <Stack gap={2} mt={4}>
          {pills}
          {chips}
        </Stack>
      );
    },
    [buildWebsitePills, buildWaitsFor],
  );

  // Render one read-only tree row: title, website chips, and any "waits for"
  // chips not already implied by nesting (external / independent prerequisites).
  const renderRow = useCallback(
    (node: DependencyNode) => {
      const { submission } = node;
      const extraDeps = (submission.metadata?.dependsOn ?? []).filter(
        (id) => !node.ancestorIds.includes(id),
      );
      return (
        <Stack gap={4}>
          <Text size="sm" fw={500} truncate>
            {submission.title.trim() || <Trans>Untitled</Trans>}
          </Text>
          {buildWebsitePills(submission)}
          {buildWaitsFor(extraDeps)}
        </Stack>
      );
    },
    [buildWebsitePills, buildWaitsFor],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(orderedSubmissions.map((s) => s.id));
    onClose();
  }, [orderedSubmissions, onConfirm, onClose]);

  const validCount = validSubmissions.length;
  const hasSkippedSubmissions = validCount < totalSelectedCount;

  return (
    <Modal
      className="postybirb__post-confirm-modal"
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs" align="center">
          <Text fw={600}>
            <Trans>Post Submissions</Trans>
          </Text>
          {validCount > 0 && (
            <Badge variant="light" color="blue" radius="sm">
              {validCount}
            </Badge>
          )}
        </Group>
      }
      centered
      radius="md"
      size="md"
      padding="md"
      styles={{
        content: { maxHeight: '85vh' },
        header: { backgroundColor: 'var(--mantine-color-body)' },
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        },
      }}
    >
      {/* Scrollable content */}
      <Stack gap="md" p="md">
        {/* Info message */}
        <Text size="sm" c="dimmed">
          {hasSkippedSubmissions ? (
            <Trans>
              {validCount} of {totalSelectedCount} selected submission(s) are
              ready to post. Submissions without websites or with validation
              errors will be skipped.
            </Trans>
          ) : (
            <Trans>
              {validCount} submission(s) will be posted in the order shown
              below.
            </Trans>
          )}
        </Text>

        {/* Dependency explainer (only when a submission has dependencies) */}
        {anyHasDependencies && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
            p="xs"
            radius="md"
          >
            <Text size="xs">
              <Trans>
                Order any submission below. Dependencies are enforced
                automatically — a submission still waits for the ones it depends
                on to finish posting, regardless of the order you set.
              </Trans>
            </Text>
          </Alert>
        )}

        {/* Flat post-order list: every submission is individually reorderable */}
        {validCount > 0 && (
          <ReorderableSubmissionList
            submissions={orderedSubmissions}
            onReorder={setOrderedSubmissions}
            renderExtra={renderExtra}
            fill
          />
        )}

        {/* Read-only dependency tree for context */}
        {validCount > 0 && anyHasDependencies && (
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              <Trans>Dependencies</Trans>
            </Text>
            <DependencyReorderableTree
              forest={forest}
              renderRow={renderRow}
              readOnly
              fill
            />
          </Stack>
        )}
      </Stack>

      {/* Sticky footer: action buttons stay visible while content scrolls */}
      <Group
        justify="flex-end"
        gap="sm"
        px="md"
        py="sm"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 2,
          backgroundColor: 'var(--mantine-color-body)',
          borderTopWidth: 1,
          borderTopStyle: 'solid',
          borderTopColor: 'var(--mantine-color-default-border)',
        }}
      >
        <Button variant="default" onClick={onClose} disabled={loading}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          color="blue"
          onClick={handleConfirm}
          loading={loading}
          disabled={validCount === 0}
        >
          <Trans>Post</Trans>
        </Button>
      </Group>
    </Modal>
  );
}

/**
 * A grouped website "post" chip rendered as a single two-tone pill, e.g.
 * `DISCORD | test1, test2`: the website name carries the accent (pill) color,
 * and the account names sit on a plain background — the color boundary is the
 * visual divider between them.
 */
function WebsitePostPill({
  website,
  accounts,
}: {
  website: string;
  accounts: string[];
}) {
  return (
    <Box
      style={{
        display: 'inline-flex',
        alignItems: 'stretch',
        maxWidth: '100%',
        borderRadius: 'var(--mantine-radius-sm)',
        overflow: 'hidden',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'var(--mantine-color-default-border)',
      }}
    >
      <Text
        span
        fw={700}
        style={{
          backgroundColor: 'var(--mantine-primary-color-light)',
          color: 'var(--mantine-primary-color-light-color)',
          paddingBlock: 0,
          paddingInline: 5,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {website}
      </Text>
      <Text
        span
        c="dimmed"
        style={{
          paddingBlock: 0,
          paddingInline: 5,
          fontSize: 10,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {accounts.join(', ')}
      </Text>
    </Box>
  );
}
