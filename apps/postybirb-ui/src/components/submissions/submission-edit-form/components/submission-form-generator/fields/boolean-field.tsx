import { EuiCheckbox, EuiFormRow, EuiSwitch, EuiText } from '@elastic/eui';
import { BooleanFieldType } from '@postybirb/form-builder';
import { useState } from 'react';
import Translation from '../../../../../translations/translation';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import useValidations from './use-validations';

type InputFieldProps = SubmissionGeneratedFieldProps<BooleanFieldType>;

export default function BooleanField(props: InputFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const validations = useValidations(props);
  const [value, setValue] = useState(
    option.data[propKey] ?? field.defaultValue
  );

  return (
    <EuiFormRow
      fullWidth
      error={validations?.errors.map((error) => (
        <Translation id={error.id} values={error.values} />
      ))}
      helpText={validations?.warnings.map((warning) => (
        <EuiText color="warning" size="s">
          <Translation id={warning.id} values={warning.values} />
        </EuiText>
      ))}
      isInvalid={validations.isInvalid}
    >
      {field.formField === 'checkbox' ? (
        <EuiCheckbox
          id={`option-${option.id}-${propKey}`}
          label={field.label}
          aria-label={field.label}
          required={field.required}
          compressed
          checked={value}
          onChange={(e) => {
            option.data[propKey] = e.target.checked;
            setValue(e.target.checked);
            onUpdate();
          }}
        />
      ) : (
        <EuiSwitch
          id={`option-${option.id}-${propKey}`}
          label={field.label}
          aria-label={field.label}
          compressed
          checked={value}
          onChange={(e) => {
            option.data[propKey] = e.target.checked;
            setValue(e.target.checked);
            onUpdate();
          }}
        />
      )}
    </EuiFormRow>
  );
}
