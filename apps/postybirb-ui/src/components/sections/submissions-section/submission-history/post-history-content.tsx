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
    Button,
    Card,
    Group,
    Loader,
    Stack,
    Text,
    Textarea,
} from '@mantine/core';
import { JobTreeNode } from '@postybirb/types';
import {
    IconDeviceFloppy,
    IconDownload,
    IconFileCode,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import postApi from '../../../../api/post.api';
import type { SubmissionRecord } from '../../../../stores';
import { useSubmissionActiveJob } from '../../../../stores/ui/posting-state-store';
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

function JobJsonPanel({ job }: { job: JobTreeNode }) {
  const formatted = useMemo(() => JSON.stringify(job, null, 2), [job]);
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
        <Card withBorder p="sm">
          <Group justify="space-between" wrap="nowrap">
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
                <Text size="xl" fw={700} c="green">
                  {stats.succeeded}
                </Text>
                <Text size="xs" c="dimmed">
                  <Trans>Successful</Trans>
                </Text>
              </Stack>
              <Stack gap={0} align="center">
                <Text size="xl" fw={700} c="red">
                  {stats.failed}
                </Text>
                <Text size="xs" c="dimmed">
                  <Trans>Failed</Trans>
                </Text>
              </Stack>
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
          {merged.map((job) => (
            <Card key={job.id} withBorder p="sm">
              <Stack gap="sm">
                <JobTreeView job={job} />
                <JobJsonPanel job={job} />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
