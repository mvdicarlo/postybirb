import { Trans } from '@lingui/macro';
import { Box, Grid } from '@mantine/core';
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
    .filter(Boolean);

  // Get the currently posting submission
  const currentlyPostingSubmission = submissions.find(
    (submission) => submission.getPostingRecord() !== undefined,
  );

  // Calculate stats
  const numSubmissions = submissions.filter((s) => !s.isArchived).length;
  const numScheduled = submissions.filter((s) => s.isScheduled).length;
  const numInQueue = queueRecords.length;

  const content =
    activeTab === 'dashboard' ? (
      <Grid>
        <Grid.Col span={12}>
          <DashboardStats
            numSubmissions={numSubmissions}
            numScheduled={numScheduled}
            numInQueue={numInQueue}
          />
        </Grid.Col>

        <Grid.Col span={12}>
          <QueueControl />
        </Grid.Col>

        <Grid.Col span={12}>
          <SubmissionsList
            submissions={submissions}
            queueRecords={queueRecords}
            currentlyPosting={currentlyPostingSubmission}
            onRefresh={handleRefresh}
          />
        </Grid.Col>
      </Grid>
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
      <Box>{content}</Box>
    </>
  );
}
