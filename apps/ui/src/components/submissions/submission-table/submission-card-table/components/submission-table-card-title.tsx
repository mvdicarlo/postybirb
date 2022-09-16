import { EuiSpacer } from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import { DefaultSubmissionNameField } from './default-submission-name-field';
import { DefaultSubmissionScheduleField } from './default-submission-schedule-field';

type SubmissionTableCardTitleProps = {
  submission: ISubmissionDto;
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
