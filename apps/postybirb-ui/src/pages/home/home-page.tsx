import { Trans } from '@lingui/macro';
import { Box, Grid, Tabs } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendarTime, IconClock, IconHome } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import postApi from '../../api/post.api';
import postQueueApi from '../../api/post-queue.api';
import { DashboardStats } from '../../components/dashboard/dashboard-stats/dashboard-stats';
import { QueueControl } from '../../components/dashboard/queue-control/queue-control';
import { RecentPosts } from '../../components/dashboard/recent-posts/recent-posts';
import { SubmissionsList } from '../../components/dashboard/submissions-list/submissions-list';
import { PageHeader } from '../../components/page-header/page-header';
import { useStore } from '../../hooks/use-store';
import { PostRecordStore } from '../../stores/post-record.store';
import { SubmissionStore } from '../../stores/submission.store';

export default function HomePage() {
  const { state: submissions } = useStore(SubmissionStore);
  const { state: postRecords } = useStore(PostRecordStore);
  
  const [queueRecords, setQueueRecords] = useState([]);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, { toggle: toggleLoading }] = useDisclosure(false);

  // Get the currently posting submission
  const currentlyPostingSubmission = postRecords.find(p => p.state === 'RUNNING');
  
  useEffect(() => {
    const loadQueueData = async () => {
      try {
        toggleLoading();
        const queue = await postQueueApi.getAll();
        setQueueRecords(queue);
      } catch (error) {
        console.error('Failed to load queue data:', error);
      } finally {
        toggleLoading();
      }
    };

    loadQueueData();
  }, [refreshToggle, toggleLoading]);

  // Calculate stats
  const numSubmissions = submissions.filter(s => !s.isArchived).length;
  const numScheduled = submissions.filter(s => s.isScheduled).length;
  const numInQueue = queueRecords.length;

  const handleRefresh = () => {
    setRefreshToggle(prev => !prev);
  };

  return (
    <>
      <PageHeader icon={<IconHome />} title={<Trans>Home</Trans>} />
      <Box>
        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="dashboard" icon={<IconHome size="0.8rem" />}>
              <Trans>Dashboard</Trans>
            </Tabs.Tab>
            <Tabs.Tab value="recent" icon={<IconClock size="0.8rem" />}>
              <Trans>Recent Posts</Trans>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard" pt="md">
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
          </Tabs.Panel>

          <Tabs.Panel value="recent" pt="md">
            <RecentPosts 
              posts={postRecords}
              submissions={submissions}
            />
          </Tabs.Panel>
        </Tabs>
      </Box>
    </>
  );
}
