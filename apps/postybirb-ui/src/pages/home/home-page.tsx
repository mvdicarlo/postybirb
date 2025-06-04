import { Trans } from '@lingui/macro';
import { Box, Space, Stack } from '@mantine/core';
import { IPostQueueRecord } from '@postybirb/types';
import { IconClock, IconHome } from '@tabler/icons-react';
import { useState } from 'react';
import { DashboardStats } from '../../components/dashboard/dashboard-stats/dashboard-stats';
import { QueueControl } from '../../components/dashboard/queue-control/queue-control';
import { RecentPosts } from '../../components/dashboard/recent-posts/recent-posts';
import { SubmissionsList } from '../../components/dashboard/submissions-list/submissions-list';
import { PageHeader } from '../../components/page-header/page-header';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';

export default function HomePage() {
  const { state: submissions } = useStore(SubmissionStore);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const queueRecords = submissions
    .map((submission) => submission.postQueueRecord)
    .filter(Boolean) as IPostQueueRecord[];

  // Get the currently posting submission
  const currentlyPostingSubmission = submissions
    .find((submission) => submission.getPostingRecord() !== undefined)
    ?.getPostingRecord();

  const postRecords = submissions.flatMap((submission) => submission.posts);

  // Calculate stats
  const numSubmissions = submissions.filter((s) => !s.isArchived).length;
  const numScheduled = submissions.filter((s) => s.isScheduled).length;
  const numInQueue = queueRecords.length;

  const content =
    activeTab === 'dashboard' ? (
      <Stack gap="xl">
        <DashboardStats
          numSubmissions={numSubmissions}
          numScheduled={numScheduled}
          numInQueue={numInQueue}
        />

        <QueueControl />

        <SubmissionsList
          submissions={submissions}
          queueRecords={queueRecords}
          currentlyPosting={currentlyPostingSubmission}
        />
      </Stack>
    ) : (
      <RecentPosts posts={postRecords} submissions={submissions} />
    );

  return (
    <>
      <PageHeader
        icon={<IconHome />}
        title={<Trans>Home</Trans>}
        tabs={[
          {
            label: <Trans>Dashboard</Trans>,
            key: 'dashboard',
            icon: <IconHome />,
          },
          {
            label: <Trans>Recent</Trans>,
            key: 'recent',
            icon: <IconClock />,
          },
        ]}
        onTabChange={setActiveTab}
      />
      <Space h="md" />
      <Box>{content}</Box>
    </>
  );
}
