/**
 * SubmissionsContent - Primary content area for submissions view.
 * Displays submission details when submissions are selected.
 * Works for both FILE and MESSAGE submission types.
 */

import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Box,
  Card,
  Center,
  Container,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import type { SubmissionId } from '@postybirb/types';
import { SubmissionType } from '@postybirb/types';
import {
  IconInbox,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import type { SubmissionRecord } from '../../../stores/records';
import {
  useSubmissionsByType,
  useSubmissionsMap,
} from '../../../stores/submission-store';
import {
  useSubNavVisible,
  useSubmissionsContentPreferences,
  useToggleSectionPanel,
} from '../../../stores/ui-store';
import {
  isFileSubmissionsViewState,
  isMessageSubmissionsViewState,
  type ViewState,
} from '../../../types/view-state';
import { SubmissionEditCard } from './submission-edit-card';

interface SubmissionsContentProps {
  /** Current view state */
  viewState: ViewState;
  /** Type of submissions (FILE or MESSAGE) */
  submissionType: SubmissionType;
}

/**
 * Empty state when no submission is selected.
 */
function EmptySubmissionSelection() {
  return (
    <Center h="100%">
      <Stack align="center" gap="md">
        <IconInbox size={64} stroke={1.5} opacity={0.3} />
        <Text size="sm" c="dimmed" ta="center">
          <Trans>Select a submission from the list to view details</Trans>
        </Text>
      </Stack>
    </Center>
  );
}

interface SubmissionsContentHeaderProps {
  submissionType: SubmissionType;
  selectedCount: number;
  hasArchived: boolean;
}

function SubmissionsContentHeader({
  submissionType,
  selectedCount,
  hasArchived,
}: SubmissionsContentHeaderProps) {
  const { visible: isSectionPanelVisible } = useSubNavVisible();
  const toggleSectionPanel = useToggleSectionPanel();
  const { preferMultiEdit, setPreferMultiEdit } =
    useSubmissionsContentPreferences();

  return (
    <Box
      p="md"
      style={{ flexShrink: 0, backgroundColor: 'var(--mantine-color-body)' }}
    >
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ActionIcon
            c="dimmed"
            variant="transparent"
            onClick={toggleSectionPanel}
            // eslint-disable-next-line lingui/no-unlocalized-strings
            aria-label="Toggle section panel"
          >
            {isSectionPanelVisible ? (
              <IconLayoutSidebarLeftCollapse size={18} />
            ) : (
              <IconLayoutSidebarLeftExpand size={18} />
            )}
          </ActionIcon>
          <Box>
            <Title order={4} lh={1.2}>
              {submissionType === SubmissionType.FILE ? (
                <Trans>File Submissions</Trans>
              ) : (
                <Trans>Message Submissions</Trans>
              )}
            </Title>
          </Box>
        </Group>

        <Switch
          size="sm"
          disabled={hasArchived}
          checked={preferMultiEdit}
          onChange={(e) => setPreferMultiEdit(e.currentTarget.checked)}
          label={<Trans>Mass Edit</Trans>}
        />
      </Group>
    </Box>
  );
}

/**
 * Primary content for the submissions view.
 * Shows submission details when submissions are selected.
 */
export function SubmissionsContent({
  viewState,
  submissionType,
}: SubmissionsContentProps) {
  const { selectedIds, mode } = useMemo(() => {
    if (
      submissionType === SubmissionType.FILE &&
      isFileSubmissionsViewState(viewState)
    ) {
      return {
        selectedIds: viewState.params.selectedIds,
        mode: viewState.params.mode,
      };
    }
    if (
      submissionType === SubmissionType.MESSAGE &&
      isMessageSubmissionsViewState(viewState)
    ) {
      return {
        selectedIds: viewState.params.selectedIds,
        mode: viewState.params.mode,
      };
    }
    return { selectedIds: [] as string[], mode: 'single' as const };
  }, [submissionType, viewState]);

  const submissionsMap = useSubmissionsMap();
  const selectedSubmissions = useMemo(
    () =>
      selectedIds
        .map((id) => submissionsMap.get(id as SubmissionId))
        .filter((s): s is SubmissionRecord => Boolean(s)),
    [selectedIds, submissionsMap],
  );

  const allOfType = useSubmissionsByType(submissionType);
  const multiSubmission = useMemo(
    () => allOfType.find((s) => s.isMultiSubmission),
    [allOfType],
  );
  const hasArchived = useMemo(
    () => allOfType.some((s) => s.isArchived),
    [allOfType],
  );

  const { preferMultiEdit } = useSubmissionsContentPreferences();
  const effectiveMultiEdit = preferMultiEdit && !hasArchived;

  // Cards are collapsible only when multiple selected and not in mass edit mode
  const isCollapsible = selectedIds.length > 1 && !effectiveMultiEdit;

  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      <SubmissionsContentHeader
        submissionType={submissionType}
        selectedCount={selectedIds.length}
        hasArchived={hasArchived}
      />
      <Divider />
      <Box style={{ flex: 1, minHeight: 0 }}>
        {selectedIds.length === 0 && !preferMultiEdit ? (
          <EmptySubmissionSelection />
        ) : (
          <ScrollArea style={{ height: '100%' }} type="hover" scrollbarSize={6}>
            <Container size="xxl">
              <Box p="md">
                <Stack gap="md">
                  {effectiveMultiEdit ? (
                    multiSubmission ? (
                      <SubmissionEditCard
                        submission={multiSubmission}
                        isCollapsible={false}
                        targetSubmissionIds={selectedIds}
                      />
                    ) : (
                      <Card withBorder radius="sm" p="md">
                        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                        <Text size="sm" c="dimmed">
                          Multi-edit record not found for this submission type.
                        </Text>
                      </Card>
                    )
                  ) : (
                    selectedSubmissions.map((submission, index) => (
                      <SubmissionEditCard
                        key={submission.id}
                        submission={submission}
                        isCollapsible={isCollapsible}
                        defaultExpanded={index === 0}
                      />
                    ))
                  )}
                </Stack>
              </Box>
            </Container>
          </ScrollArea>
        )}
      </Box>
    </Box>
  );
}
