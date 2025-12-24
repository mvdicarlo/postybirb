/**
 * TemplatesContent - Main content area for templates view.
 * Displays template editor when a template is selected.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    Center,
    Container,
    Divider,
    Group,
    ScrollArea,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import type { SubmissionId } from '@postybirb/types';
import {
    IconInbox,
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import type { SubmissionRecord } from '../../../stores/records';
import { useSubmissionsMap } from '../../../stores/submission-store';
import {
    useSubNavVisible,
    useToggleSectionPanel,
} from '../../../stores/ui-store';
import { isTemplatesViewState, type ViewState } from '../../../types/view-state';
import { SubmissionEditCard } from '../submissions-section/submission-edit-card';

interface TemplatesContentProps {
  viewState: ViewState;
}

/**
 * Empty state when no template is selected.
 */
function EmptyTemplateSelection() {
  return (
    <Center h="100%">
      <Stack align="center" gap="md">
        <IconInbox size={64} stroke={1.5} opacity={0.3} />
        <Text size="sm" c="dimmed" ta="center">
          <Trans>Select a template from the list to view or edit it</Trans>
        </Text>
      </Stack>
    </Center>
  );
}

/**
 * Header for templates content area.
 */
function TemplatesContentHeader() {
  const { visible: isSectionPanelVisible } = useSubNavVisible();
  const toggleSectionPanel = useToggleSectionPanel();

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
              <Trans>Templates</Trans>
            </Title>
            <Text size="sm" c="dimmed">
              <Trans>Template Editor</Trans>
            </Text>
          </Box>
        </Group>
      </Group>
    </Box>
  );
}

/**
 * Content area for the templates view.
 * Shows selected template editor or empty state.
 */
export function TemplatesContent({ viewState }: TemplatesContentProps) {
  const selectedId = isTemplatesViewState(viewState)
    ? viewState.params.selectedId
    : null;

  const submissionsMap = useSubmissionsMap();
  const selectedTemplate = useMemo(
    () =>
      selectedId
        ? (submissionsMap.get(selectedId as SubmissionId) as
            | SubmissionRecord
            | undefined)
        : null,
    [selectedId, submissionsMap],
  );

  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      <TemplatesContentHeader />
      <Divider />
      <Box style={{ flex: 1, minHeight: 0 }}>
        {!selectedTemplate ? (
          <EmptyTemplateSelection />
        ) : (
          <ScrollArea style={{ height: '100%' }} type="hover" scrollbarSize={6}>
            <Container size="xxl">
              <Box p="md">
                <SubmissionEditCard
                  submission={selectedTemplate}
                  isCollapsible={false}
                />
              </Box>
            </Container>
          </ScrollArea>
        )}
      </Box>
    </Box>
  );
}
