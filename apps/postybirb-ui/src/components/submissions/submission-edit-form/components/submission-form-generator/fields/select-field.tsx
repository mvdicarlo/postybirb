import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { SelectFieldType } from '@postybirb/form-builder';
import { useCallback, useState } from 'react';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';
import useValidations from './use-validations';

type SelectFieldProps = SubmissionGeneratedFieldProps<SelectFieldType>;

export default function SelectField(props: SelectFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const validation = useValidations(props);
  const [value, setValue] = useState(
    option.data[propKey] || field.defaultValue
  );

  const onChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (changeValue: EuiComboBoxOptionOption<any>[]) => {
      option.data[propKey] = changeValue.map((cv) => cv.value);
      setValue(changeValue);
      onUpdate();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <FormRow {...props} validations={validation}>
      <EuiComboBox
        aria-required={field.required}
        compressed
        isClearable
        isInvalid={validation.isInvalid}
        singleSelection={!field.allowMultiple}
        options={field.options.map((o) => ({
          label: o.label,
          id: `${option.id}-${propKey}-${o.value?.toString() || 'undefined'}`,
          value: o.value ? o.value.toString() : undefined,
        }))}
        selectedOptions={value}
        onChange={(newOptions) => {
          onChange(newOptions);
        }}
      />
    </FormRow>
  );
}
