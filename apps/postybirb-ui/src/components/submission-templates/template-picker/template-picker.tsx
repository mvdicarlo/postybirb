import { EuiComboBox } from '@elastic/eui';
import { SubmissionId, SubmissionType } from '@postybirb/types';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionTemplateStore } from '../../../stores/submission-template.store';
import { useStore } from '../../../stores/use-store';

type TemplatePickerProps = {
  type: SubmissionType;
  selected?: SubmissionId;
  onChange: (submission?: SubmissionDto) => void;
};

export default function TemplatePicker(props: TemplatePickerProps) {
  const { type, selected, onChange } = props;
  const { state } = useStore(SubmissionTemplateStore);
  const templates = state
    .filter((template) => template.type === type)
    .map((template) => ({
      key: template.id,
      value: template,
      label: template.getTemplateName(),
    }));
  const current = state.find((template) => template.id === selected);

  return (
    <EuiComboBox
      singleSelection
      options={templates}
      selectedOptions={
        current
          ? [
              {
                key: current.id,
                value: current,
                label: current.getTemplateName(),
              },
            ]
          : []
      }
      onChange={(options) => {
        if (options.length === 0) {
          onChange(undefined);
        } else {
          onChange(options[0].value as SubmissionDto);
        }
      }}
    />
  );
}
