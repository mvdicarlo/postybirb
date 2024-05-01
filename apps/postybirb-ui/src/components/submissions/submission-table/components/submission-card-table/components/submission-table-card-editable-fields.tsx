import { EuiSpacer } from '@elastic/eui';
import { cloneDeep, debounce } from 'lodash';
import { useCallback } from 'react';
import submissionApi from '../../../../../../api/submission.api';
import { useSubmissionOptions } from '../../../../../../hooks/submission/use-submission-options';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';
import SubmissionFormGenerator from '../../../../submission-edit-form/components/submission-form-generator/submission-form-generator';
import { DefaultSubmissionNameField } from './default-submission-name-field';
import { DefaultSubmissionScheduleField } from './default-submission-schedule-field';

type SubmissionTableCardEditableFieldsProps = {
  submission: SubmissionDto;
};

function DefaultSubmissionFields(
  props: SubmissionTableCardEditableFieldsProps
) {
  const { submission } = props;
  const defaultOptions = cloneDeep(submission.getDefaultOptions());
  const { form, isLoading, account } = useSubmissionOptions(
    defaultOptions,
    submission.type,
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const save = useCallback(
    debounce(() => {
      submissionApi.update(submission.id, {
        isScheduled: submission.isScheduled,
        ...submission.schedule,
        metadata: submission.metadata,
        newOrUpdatedOptions: [defaultOptions],
      });
    }, 1_000),
    [defaultOptions]
  );
  if (!defaultOptions || isLoading) return null;

  delete form?.title;

  return (
    <SubmissionFormGenerator
      metadata={form}
      option={defaultOptions}
      defaultOption={defaultOptions}
      validation={[]}
      account={account}
      onUpdate={save}
    />
  );
}

export function SubmissionTableCardEditableFields(
  props: SubmissionTableCardEditableFieldsProps
): JSX.Element {
  return (
    <div className="postybirb__submission-card-editable-fields">
      <DefaultSubmissionNameField {...props} />
      <EuiSpacer size="xs" />
      <DefaultSubmissionScheduleField {...props} />
      <EuiSpacer size="xs" />
      <DefaultSubmissionFields {...props} />
    </div>
  );
}
