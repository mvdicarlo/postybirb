import { EuiSpacer } from '@elastic/eui';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { DefaultSubmissionNameField } from './default-submission-name-field';
import { DefaultSubmissionScheduleField } from './default-submission-schedule-field';

type SubmissionTableCardTitleProps = {
  submission: SubmissionDto;
};

export function SubmissionTableCardTitle(
  props: SubmissionTableCardTitleProps
): JSX.Element {
  return (
    <div>
      <DefaultSubmissionNameField {...props} />
      <EuiSpacer size="xs" />
      <DefaultSubmissionScheduleField {...props} />
    </div>
  );
}
