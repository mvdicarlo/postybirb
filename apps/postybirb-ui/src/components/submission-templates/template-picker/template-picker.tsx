import { Select } from '@mantine/core';
import { SubmissionId, SubmissionType } from '@postybirb/types';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionTemplateStore } from '../../../stores/submission-template.store';
import { useStore } from '../../../stores/use-store';

type TemplatePickerProps = {
  type: SubmissionType;
  selected?: SubmissionId;
  label: JSX.Element;
  onChange: (submission?: SubmissionDto) => void;
};

export default function TemplatePicker(props: TemplatePickerProps) {
  const { label, type, selected, onChange } = props;
  const { state } = useStore(SubmissionTemplateStore);
  const templates = state
    .filter((template) => template.type === type)
    .map((template) => ({
      key: template.id,
      value: template.id,
      label: template.getTemplateName(),
    }));
  const current = state.find((template) => template.id === selected);
  return (
    <Select
      label={label}
      data={templates}
      value={current?.id}
      onChange={(option) => {
        const template = state.find((t) => t.id === option);
        onChange(template);
      }}
    />
  );
}
