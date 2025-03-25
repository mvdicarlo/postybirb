import { SegmentedControl } from '@mantine/core';
import { IconLayoutGrid, IconLayoutList } from '@tabler/icons-react';
import { SubmissionViewActionProps } from './submission-view-actions.props';

const iconProps = {
  style: { display: 'block' },
  size: 20,
  stroke: 1.5,
};

export function SubmissionViewLayoutAction({
  view,
  setView,
}: SubmissionViewActionProps) {
  return (
    <SegmentedControl
      size="xs"
      value={view}
      onChange={(value) => {
        setView(value as 'grid' | 'list');
      }}
      data={[
        {
          value: 'grid',
          label: <IconLayoutGrid {...iconProps} />,
        },
        {
          value: 'list',
          label: <IconLayoutList {...iconProps} />,
        },
      ]}
    />
  );
}
