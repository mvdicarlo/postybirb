/**
 *  submission posting history.PostHistoryContent 
 *
 * Renders the Relay job-tree history for a submission: every persisted job
 * (newest first) fetched from `GET /post/:id/jobs`, with the live in-flight job
 * (if any) overlaid from the posting-state store so an active post updates in
 * real time. Used inline in the edit card and in the history drawer.
 */

import { Trans } from '@lingui/react/macro';
import {
    Accordion,
    Badge,
    Button,
    Card,
    Group,
    Loader,
    RingProgress,
    Stack,
    Text,
    Textarea,
    Tooltip,
} from '@mantine/core';
import { JobTreeNode } from '@postybirb/types';
import {
    IconCircleCheck,
    IconCircleX,
    IconDeviceFloppy,
    IconDownload,
    IconFileCode,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import postApi from '../../../../api/post.api';
import type { SubmissionRecord } from '../../../../stores';
import { useSubmissionActiveJob } from '../../../../stores/ui/posting-state-store';
import { isRemote } from '../../../../transports/http-client';
import { EmptyState } from '../../../empty-state';
import { CopyToClipboard } from '../../../shared/copy-to-clipboard';
import { JobTreeView } from '../../home-section/job-tree-view';

interface PostHistoryContentProps {
  submission: SubmissionRecord;
}

const SUCCEEDED = 'SUCCEEDED';
const FAILED = 'FAILED';

/** Trigger a browser save dialog for a string payload. */
function saveStringToFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function JobJsonPanel({
  job,
  submission,
}: {
  job: JobTreeNode;
  submission: SubmissionRecord;
}) {
  const formatted = useMemo(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: {
        version: window.electron?.app_version ?? 'unknown',
        isRemote: isRemote(),
      },
      submission: {
        id: submission.id,
        type: submission.type,
        isTemplate: submission.isTemplate,
        isMultiSubmission: submission.isMultiSubmission,
        isArchived: submission.isArchived,
      },
      job,
    };
    return JSON.stringify(payload, null, 2);
  }, [job, submission]);
  return (
    <Accordion variant="contained">
      <Accordion.Item value="json-data">
        <Accordion.Control>
          <Group gap="xs">
            <IconFileCode size={16} />
            <Text fw={500} size="sm">
              <Trans>Post Data (JSON)</Trans>
            </Text>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="xs">
            <Group justify="flex-end" gap="xs">
              <CopyToClipboard
                value={formatted}
                variant="button"
                size="xs"
                color="blue"
              />
              <Button
                size="xs"
                color="green"
                variant="subtle"
                leftSection={<IconDeviceFloppy size={14} />}
                onClick={() =>
                  saveStringToFile(
                    `postybirb-job-${job.id}.json`,
                    formatted,
                    'application/json',
                  )
                }
              >
                <Trans>Save to file</Trans>
              </Button>
            </Group>
            <Textarea
              readOnly
              autosize
              minRows={4}
              maxRows={20}
              value={formatted}
              styles={{ input: { fontFamily: 'monospace', fontSize: 11 } }}
            />
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

export function PostHistoryContent({ submission }: PostHistoryContentProps) {
  const [jobs, setJobs] = useState<JobTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const activeJob = useSubmissionActiveJob(submission.id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    postApi
      .getJobHistory(submission.id)
      .then((res) => {
        if (!cancelled) setJobs(res.body);
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-fetch when the active job for this submission appears/disappears
    // (i.e. a post starts or completes) so terminal results land in history.
  }, [submission.id, activeJob?.status]);

  // Overlay the live active job over the fetched snapshot (live wins by id).
  const merged = useMemo(() => {
    if (!activeJob) return jobs;
    const replaced = jobs.map((j) => (j.id === activeJob.id ? activeJob : j));
    return replaced.some((j) => j.id === activeJob.id)
      ? replaced
      : [activeJob, ...jobs];
  }, [jobs, activeJob]);

  const stats = useMemo(() => {
    let succeeded = 0;
    let failed = 0;
    for (const job of merged) {
      if (job.status === SUCCEEDED) succeeded += 1;
      else if (job.status === FAILED) failed += 1;
    }
    return { total: merged.length, succeeded, failed };
  }, [merged]);

  // Success rate across resolved (succeeded + failed) attempts; in-flight jobs
  // are excluded so the ring reflects settled outcomes only.
  const successRate = useMemo(() => {
    const resolved = stats.succeeded + stats.failed;
    return resolved === 0 ? 0 : Math.round((stats.succeeded / resolved) * 100);
  }, [stats]);

  const handleDownloadLogs = async () => {
    setDownloading(true);
    try {
      await postApi.downloadLogs(submission.id);
    } catch {
      // Surfaced via console only; no toast infra wired in this drawer.
      // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
      console.error('Failed to download post logs');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Group justify="center" p="md">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <Stack gap="md">
      {stats.total > 0 && (
        <Card withBorder p="sm" radius="md">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="md" wrap="nowrap">
              <RingProgress
                size={64}
                thickness={6}
                roundCaps
                label={
                  <Text size="xs" ta="center" fw={700}>
                    {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                    {`${successRate}%`}
                  </Text>
                }
                sections={[
                  { value: successRate, color: 'green' },
                  ...(successRate < 100
                    ? [{ value: 100 - successRate, color: 'red' }]
                    : []),
                ]}
              />
              <Group gap="lg">
                <Stack gap={0} align="center">
                  <Text size="xl" fw={700}>
                    {stats.total}
                  </Text>
                  <Text size="xs" c="dimmed">
                    <Trans>Total</Trans>
                  </Text>
                </Stack>
                <Stack gap={0} align="center">
                  <Group gap={4} wrap="nowrap">
                    <IconCircleCheck
                      size={16}
                      color="var(--mantine-color-green-6)"
                    />
                    <Text size="xl" fw={700} c="green">
                      {stats.succeeded}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    <Trans>Successful</Trans>
                  </Text>
                </Stack>
                <Stack gap={0} align="center">
                  <Group gap={4} wrap="nowrap">
                    <IconCircleX
                      size={16}
                      color="var(--mantine-color-red-6)"
                    />
                    <Text size="xl" fw={700} c="red">
                      {stats.failed}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    <Trans>Failed</Trans>
                  </Text>
                </Stack>
              </Group>
            </Group>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconDownload size={14} />}
              loading={downloading}
              onClick={handleDownloadLogs}
            >
              <Trans>Download logs</Trans>
            </Button>
          </Group>
        </Card>
      )}

      {merged.length === 0 ? (
        <EmptyState preset="no-records" size="sm" />
      ) : (
        <Stack gap="sm">
          {merged.map((job, index) => (
            <Card key={job.id} withBorder p="sm" radius="md">
              <Stack gap="sm">
                <JobTreeView
                  job={job}
                  headerLabel={
                    <Group gap={6} wrap="nowrap">
                      <Text size="sm" fw={500}>
                        <Trans>Attempt {merged.length - index}</Trans>
                      </Text>
                      {index === 0 && merged.length > 1 && (
                        <Tooltip
                          label={<Trans>Most recent attempt</Trans>}
                          withArrow
                        >
                          <Badge size="xs" variant="light" color="blue">
                            <Trans>Latest</Trans>
                          </Badge>
                        </Tooltip>
                      )}
                    </Group>
                  }
                />
                <JobJsonPanel job={job} submission={submission} />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
