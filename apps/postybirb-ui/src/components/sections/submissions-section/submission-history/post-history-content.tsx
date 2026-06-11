/**
 *  submission posting history.PostHistoryContent 
 *
 * Renders the Relay job-tree history for a submission: every persisted job
 * (newest first) fetched from `GET /post/:id/jobs`, with the live in-flight job
 * (if any) overlaid from the posting-state store so an active post updates in
 * real time. Used inline in the edit card and in the history drawer.
 */

import { Trans } from '@lingui/react/macro';
import { Card, Group, Loader, Stack, Text } from '@mantine/core';
import { JobTreeNode } from '@postybirb/types';
import { useEffect, useMemo, useState } from 'react';
import postApi from '../../../../api/post.api';
import type { SubmissionRecord } from '../../../../stores';
import { useSubmissionActiveJob } from '../../../../stores/ui/posting-state-store';
import { EmptyState } from '../../../empty-state';
import { JobTreeView } from '../../home-section/job-tree-view';

interface PostHistoryContentProps {
  submission: SubmissionRecord;
}

const SUCCEEDED = 'SUCCEEDED';
const FAILED = 'FAILED';

export function PostHistoryContent({ submission }: PostHistoryContentProps) {
  const [jobs, setJobs] = useState<JobTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
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
          <Group justify="space-around">
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
        </Card>
      )}

      {merged.length === 0 ? (
        <EmptyState preset="no-records" size="sm" />
      ) : (
        <Stack gap="sm">
          {merged.map((job) => (
            <Card key={job.id} withBorder p="sm">
              <JobTreeView job={job} />
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
