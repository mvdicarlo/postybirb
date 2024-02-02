/* eslint-disable react/require-default-props */
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { ISubmissionDto, SubmissionType } from '@postybirb/types';
import { useCallback, useState } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';

type SubmissionPickerProps = {
  type: SubmissionType;
  singleSelection?: boolean;
  compressed?: boolean;
  selected?: SubmissionDto[] | string[];
  onChange: (submissions: ISubmissionDto[]) => void;
};

export default function SubmissionPicker(props: SubmissionPickerProps) {
  const { type, compressed, singleSelection, selected, onChange } = props;
  const { state, isLoading } = useStore(SubmissionStore);

  const filteredSubmissions = state.filter(
    (submission) => submission.type === type
  );

  const { _ } = useLingui();

  const options = filteredSubmissions.map((submission) => ({
    label:
      submission.getDefaultOptions().data.title || _(msg`Unknown submission`),
    value: submission,
  }));

  const [selectedInternal, setSelectedInternal] = useState<
    EuiComboBoxOptionOption<SubmissionDto>[]
  >([]);

  const onChangeInternal = useCallback(
    (submissions: EuiComboBoxOptionOption<SubmissionDto>[]) => {
      setSelectedInternal(submissions);
      onChange(submissions.map((s) => s.value as SubmissionDto));
    },
    [onChange]
  );

  const selectedOptions: EuiComboBoxOptionOption<SubmissionDto>[] = selected
    ? (selected
        .map((s) =>
          options.find((o) =>
            typeof s === 'string' ? s === o.value.id : s.id === o.value.id
          )
        )
        .filter((s) => !!s) as EuiComboBoxOptionOption<SubmissionDto>[])
    : selectedInternal;

  return (
    <EuiComboBox
      isLoading={isLoading}
      compressed={compressed}
      singleSelection={singleSelection}
      options={options}
      selectedOptions={selectedOptions}
      onChange={onChangeInternal}
    />
  );
}
