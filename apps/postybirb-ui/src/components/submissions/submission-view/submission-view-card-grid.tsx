import { Grid } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import Sortable from 'sortablejs';
import submissionApi from '../../../api/submission.api';
import { draggableIndexesAreDefined } from '../../../helpers/sortable.helper';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionViewCard } from './submission-view-card/submission-view-card';

type SubmissionViewCardGridProps = {
  submissions: SubmissionDto[];
  onSelect(submission: SubmissionDto): void;
  selectedSubmissions: SubmissionDto[];
  view: 'grid' | 'list';
};

export function SubmissionViewCardGrid(props: SubmissionViewCardGridProps) {
  const { submissions, onSelect, selectedSubmissions, view } = props;

  // Create a dependency array that includes the submission IDs and their update timestamps
  const submissionDeps = useMemo(
    () =>
      submissions.map((sub) => ({
        id: sub.id,
        updatedAt: sub.updatedAt,
        order: sub.order,
      })),
    [submissions],
  );

  // Memoize the sorted submissions using the dependency array
  const sortedSubmissions = useMemo(
    () => [...submissions].sort((a, b) => a.order - b.order),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submissionDeps], // Only resort when IDs, update times, or order changes
  );

  const [orderedSubmissions, setOrderedSubmissions] =
    useState(sortedSubmissions);

  useEffect(() => {
    setOrderedSubmissions(sortedSubmissions);
  }, [sortedSubmissions]);

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

  let span = view === 'grid' ? 6 : 12;
  if (submissions.length === 1) {
    span = 12;
  }

  return (
    <Grid id="submission-grid">
      {orderedSubmissions.map((submission) => (
        <Grid.Col
          span={span}
          key={`card-${submission.id}`}
          className="submission-grid-col"
        >
          <SubmissionViewCard
            key={submission.id}
            submission={submission}
            onSelect={onSelect}
            isSelected={selectedSubmissions.some((s) => s.id === submission.id)}
          />
        </Grid.Col>
      ))}
    </Grid>
  );
}
