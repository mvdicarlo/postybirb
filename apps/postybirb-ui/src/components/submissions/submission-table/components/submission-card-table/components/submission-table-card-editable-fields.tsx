import { EuiSpacer } from '@elastic/eui';
import { stopEventPropagation } from '../../../../../../helpers/event-handlers.helper';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';
import { DefaultSubmissionNameField } from './default-submission-name-field';
import { DefaultSubmissionScheduleField } from './default-submission-schedule-field';

type SubmissionTableCardEditableFieldsProps = {
  submission: SubmissionDto;
};

export function SubmissionTableCardEditableFields(
  props: SubmissionTableCardEditableFieldsProps
): JSX.Element {
  return (
    <div
      className="postybirb__submission-card-editable-fields"
      onClickCapture={stopEventPropagation}
    >
      <DefaultSubmissionNameField {...props} />
      <EuiSpacer size="xs" />
      <DefaultSubmissionScheduleField {...props} />
    </div>
  );
}
