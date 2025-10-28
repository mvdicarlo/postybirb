import { Trans } from '@lingui/macro';
import { Box, Space, Stack } from '@mantine/core';
import { IPostQueueRecord, SubmissionType } from '@postybirb/types';
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
  const activeSubmissions = submissions.filter((s) => !s.isArchived);
  const scheduledSubmissions = submissions.filter((s) => s.isScheduled);
  const numSubmissions = activeSubmissions.length;
  const numScheduled = scheduledSubmissions.length;
  const numInQueue = queueRecords.length;

  // Calculate submission type breakdown for total submissions
  const fileSubmissions = activeSubmissions.filter(
    (s) => s.type === SubmissionType.FILE,
  ).length;
  const messageSubmissions = activeSubmissions.filter(
    (s) => s.type === SubmissionType.MESSAGE,
  ).length;

  const submissionBreakdown = {
    files: fileSubmissions,
    messages: messageSubmissions,
  };

  // Calculate submission type breakdown for scheduled submissions
  const scheduledFileSubmissions = scheduledSubmissions.filter(
    (s) => s.type === SubmissionType.FILE,
  ).length;
  const scheduledMessageSubmissions = scheduledSubmissions.filter(
    (s) => s.type === SubmissionType.MESSAGE,
  ).length;

  const scheduledBreakdown = {
    files: scheduledFileSubmissions,
    messages: scheduledMessageSubmissions,
  };

  // Calculate submission type breakdown for queue submissions
  const queueSubmissions = submissions.filter((s) =>
    queueRecords.some((q) => q.submissionId === s.id),
  );
  const queueFileSubmissions = queueSubmissions.filter(
    (s) => s.type === SubmissionType.FILE,
  ).length;
  const queueMessageSubmissions = queueSubmissions.filter(
    (s) => s.type === SubmissionType.MESSAGE,
  ).length;

  const queueBreakdown = {
    files: queueFileSubmissions,
    messages: queueMessageSubmissions,
  };
  const content =
    activeTab === 'dashboard' ? (
      <Stack gap="lg">
        <DashboardStats
          numSubmissions={numSubmissions}
          numScheduled={numScheduled}
          numInQueue={numInQueue}
          submissionBreakdown={submissionBreakdown}
          scheduledBreakdown={scheduledBreakdown}
          queueBreakdown={queueBreakdown}
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
      <Space h="lg" />
      <Box>{content}</Box>
    </>
  );
}
