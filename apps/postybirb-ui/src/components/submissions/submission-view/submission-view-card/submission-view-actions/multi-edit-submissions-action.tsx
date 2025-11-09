import { Trans } from "@lingui/react/macro";
import { Button } from '@mantine/core';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { MultiEditSubmissionPath } from '../../../../../pages/route-paths';
import { SubmissionViewActionProps } from './submission-view-actions.props';

export function MultiEditSubmissionsAction({
  type,
  submissions,
}: SubmissionViewActionProps) {
  const navigateTo = useNavigate();
  const navigate = useCallback(() => {
    navigateTo(`${MultiEditSubmissionPath}/${type}`);
  }, [navigateTo, type]);
  return (
    <Button
      variant="transparent"
      c="var(--mantine-color-text)"
      onClick={navigate}
      disabled={!submissions?.length}
    >
      <Trans>Edit Many</Trans>
    </Button>
  );
}
