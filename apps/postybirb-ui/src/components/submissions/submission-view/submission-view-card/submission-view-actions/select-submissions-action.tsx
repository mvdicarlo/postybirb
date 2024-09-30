import { ActionIcon } from '@mantine/core';
import {
  IconSquare,
  IconSquareFilled,
  IconSquareMinus,
} from '@tabler/icons-react';
import { SubmissionViewActionProps } from './submission-view-actions.props';

export function SelectSubmissionsAction({
  selected,
  submissions,
  onSelect,
}: SubmissionViewActionProps) {
  const allSelected = selected.length === submissions.length;
  const icon = allSelected ? <IconSquareFilled /> : <IconSquareMinus />;
  return (
    <ActionIcon
      variant="transparent"
      c="var(--mantine-color-text)"
      onClick={() => {
        if (allSelected) {
          onSelect([]);
        } else {
          onSelect(submissions);
        }
      }}
    >
      {selected.length > 0 ? icon : <IconSquare />}
    </ActionIcon>
  );
}
