/**
 * SubmissionEditCard - Collapsible card for editing a single submission.
 * Uses its own context provider for state management.
 */

import { Box, Collapse, Group, Paper, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { SubmissionRecord } from '../../../../stores/records';
import { ComponentErrorBoundary } from '../../../error-boundary';
import { SubmissionEditCardActions } from './actions';
import { SubmissionEditCardBody } from './body';
import {
    SubmissionEditCardProvider,
    useSubmissionEditCardContext,
} from './context';
import {
    SubmissionEditCardCollapsedHeader,
    SubmissionEditCardHeader,
} from './header';
import './submission-edit-card.css';

export interface SubmissionEditCardProps {
  /** The submission to edit */
  submission: SubmissionRecord;
  /** Whether the card can be collapsed */
  isCollapsible: boolean;
  /** Whether to show full or simple view */
  fullView: boolean;
}

/**
 * Inner card component that uses context.
 */
function SubmissionEditCardInner() {
  const { isCollapsible, submission } = useSubmissionEditCardContext();
  const [expanded, { toggle }] = useDisclosure(true);

  // If not collapsible, always show expanded
  const isExpanded = isCollapsible ? expanded : true;

  return (
    <Paper withBorder radius="sm" p={0} className="postybirb__edit_card">
      {/* Header - clickable only if collapsible */}
      {isCollapsible ? (
        <UnstyledButton
          onClick={toggle}
          className="postybirb__edit_card_header"
        >
          <Group gap="xs" px="sm" py="xs" wrap="nowrap">
            {isExpanded ? (
              <SubmissionEditCardHeader />
            ) : (
              <SubmissionEditCardCollapsedHeader />
            )}
            <SubmissionEditCardActions submission={submission} />
          </Group>
        </UnstyledButton>
      ) : (
        <Box className="postybirb__edit_card_header_static">
          <ComponentErrorBoundary>
            <Group gap="xs" px="sm" py="xs" wrap="nowrap">
              <SubmissionEditCardHeader />
              <SubmissionEditCardActions />
            </Group>
          </ComponentErrorBoundary>
        </Box>
      )}

      {/* Collapsible Body */}
      <Collapse in={isExpanded}>
        <ComponentErrorBoundary>
          <SubmissionEditCardBody />
        </ComponentErrorBoundary>
      </Collapse>
    </Paper>
  );
}

/**
 * Submission edit card with its own context provider.
 */
export function SubmissionEditCard({
  submission,
  isCollapsible,
  fullView,
}: SubmissionEditCardProps) {
  return (
    <ComponentErrorBoundary>
      <SubmissionEditCardProvider
        submission={submission}
        isCollapsible={isCollapsible}
        fullView={fullView}
      >
        <SubmissionEditCardInner />
      </SubmissionEditCardProvider>
    </ComponentErrorBoundary>
  );
}
