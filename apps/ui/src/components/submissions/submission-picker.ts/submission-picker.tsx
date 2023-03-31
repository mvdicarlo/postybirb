/* eslint-disable react/require-default-props */
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import { SubmissionType } from '@postybirb/types';
import { SubmissionDto } from 'apps/ui/src/models/dtos/submission.dto';
import { SubmissionStore } from 'apps/ui/src/stores/submission.store';
import { useCallback, useState } from 'react';
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

  const options = filteredSubmissions.map((submission) => ({
    label: submission.getDefaultOptions().data.title || 'Unknown submission',
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
