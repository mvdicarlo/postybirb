import { msg, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { ComboboxItem, Loader, MultiSelect } from '@mantine/core';
import { SubmissionId, SubmissionType } from '@postybirb/types';
import { SubmissionStore } from '../../../stores/submission.store';
import { useStore } from '../../../stores/use-store';

type SubmissionPickerProps = {
  type: SubmissionType;
  value: SubmissionId[];
  onChange: (value: SubmissionId[]) => void;
};

export function SubmissionPicker(props: SubmissionPickerProps) {
  const { type, value, onChange } = props;
  const { _ } = useLingui();
  const { state, isLoading } = useStore(SubmissionStore);
  const submissions = state.filter((submission) => submission.type === type);

  const submissionOptions: ComboboxItem[] = submissions.map((submission) => ({
    label: submission.getDefaultOptions().data.title ?? _(msg`Unknown`),
    value: submission.id,
  }));

  if (isLoading) {
    return <Loader />;
  }

  return (
    <MultiSelect
      clearable
      required
      label={<Trans>Submissions</Trans>}
      data={submissionOptions}
      value={value}
      onChange={onChange}
    />
  );
}
