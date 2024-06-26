/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Grid } from '@mantine/core';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import submissionApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionViewCard } from './submission-view-card/submission-view-card';

type SubmissionViewCardGridProps = {
  submissions: SubmissionDto[];
  onSelect(submission: SubmissionDto): void;
  selectedSubmissions: SubmissionDto[];
};

// TODO - Figure out a better drag and drop solution. This one is buggy.
export function SubmissionViewCardGrid(props: SubmissionViewCardGridProps) {
  const { submissions, onSelect, selectedSubmissions } = props;
  const orderedSubmissions = submissions.sort((a, b) => a.order - b.order);
  return (
    <DragDropContext
      onDragEnd={(event: any) => {
        submissionApi.reorder(event.draggableId, event.destination.index);
      }}
    >
      <Droppable droppableId="droppable">
        {(provided: any) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <Grid>
              {orderedSubmissions.map((submission) => (
                <Draggable draggableId={submission.id} index={submission.order}>
                  {(dragProvided: any) => (
                    <Grid.Col
                      span={submissions.length > 1 ? 12 : 12}
                      key={`card-${submission.id}`}
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                    >
                      <SubmissionViewCard
                        key={submission.id}
                        submission={submission}
                        onSelect={onSelect}
                        isSelected={selectedSubmissions.some(
                          (s) => s.id === submission.id
                        )}
                      />
                    </Grid.Col>
                  )}
                </Draggable>
              ))}
            </Grid>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
