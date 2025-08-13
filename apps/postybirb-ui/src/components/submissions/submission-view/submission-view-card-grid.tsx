import { Box, Grid, Transition, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useEffect, useMemo, useState } from 'react';
import Sortable from 'sortablejs';
import submissionApi from '../../../api/submission.api';
import { draggableIndexesAreDefined } from '../../../helpers/sortable.helper';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { ComponentErrorBoundary } from '../../error-boundary';
import { SubmissionViewCard } from './submission-view-card/submission-view-card';

function createMinWidthQuery(breakpoint: string): string {
  return '(min-width: '.concat(breakpoint, ')');
}

type SubmissionViewCardGridProps = {
  submissions: SubmissionDto[];
  onSelect(submission: SubmissionDto): void;
  selectedSubmissions: SubmissionDto[];
  view: 'grid' | 'list';
};

export function SubmissionViewCardGrid(props: SubmissionViewCardGridProps) {
  const { submissions, onSelect, selectedSubmissions, view } = props;
  const theme = useMantineTheme();
  const [orderedSubmissions, setOrderedSubmissions] = useState(
    submissions.sort((a, b) => a.order - b.order),
  );
  const [mounted, setMounted] = useState(false);

  // Hook to detect current breakpoint using theme breakpoints
  const mdBreakpoint = useMemo(
    () => createMinWidthQuery(theme.breakpoints.md),
    [theme.breakpoints.md],
  );
  const isMdUp = useMediaQuery(mdBreakpoint);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setOrderedSubmissions(submissions.sort((a, b) => a.order - b.order));
  }, [submissions]);

  useEffect(() => {
    const el = document.getElementsByClassName(
      'mantine-Grid-inner',
    )[0] as HTMLElement;
    if (!el) {
      // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
      console.warn('Could not find submission grid element');
      return () => {};
    }
    const sortable = new Sortable(el, {
      draggable: '.submission-grid-col',
      handle: '.sort-handle',
      disabled: orderedSubmissions.length === 0,
      animation: 150,
      ghostClass: 'submission-drag-ghost',
      chosenClass: 'submission-drag-chosen',
      onEnd: (event) => {
        if (draggableIndexesAreDefined(event)) {
          const newOrderedSubmissions = [...orderedSubmissions];
          const [movedSubmission] = newOrderedSubmissions.splice(
            event.oldDraggableIndex,
            1,
          );
          newOrderedSubmissions.splice(
            event.newDraggableIndex,
            0,
            movedSubmission,
          );
          setOrderedSubmissions(newOrderedSubmissions);
          submissionApi.reorder(movedSubmission.id, event.newDraggableIndex);
        }
      },
    });
    return () => {
      try {
        sortable.destroy();
      } catch (e) {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error('Failed to destroy sortable', e);
      }
    };
  }, [orderedSubmissions]);

  // Calculate span based on view and breakpoint
  let span = 12; // Default for mobile
  if (view === 'grid') {
    span = isMdUp ? 6 : 12; // 6 columns on md+ screens, 12 on smaller
  } else {
    span = 12; // List view always full width
  }

  if (submissions.length === 1) {
    span = 12;
  }

  return (
    <Box className="submission-grid-container">
      <Grid id="submission-grid" gutter="md">
        {orderedSubmissions.map((submission, index) => (
          <Transition
            key={submission.id}
            mounted={mounted}
            transition="fade"
            duration={300}
            timingFunction="ease"
          >
            {(styles) => (
              <Grid.Col
                span={span}
                className="submission-grid-col"
                style={styles}
              >
                <ComponentErrorBoundary key={`ceb-${submission.id}`}>
                  <SubmissionViewCard
                    key={submission.id}
                    submission={submission}
                    onSelect={onSelect}
                    isSelected={selectedSubmissions.some(
                      (s) => s.id === submission.id,
                    )}
                  />
                </ComponentErrorBoundary>
              </Grid.Col>
            )}
          </Transition>
        ))}
      </Grid>
    </Box>
  );
}
