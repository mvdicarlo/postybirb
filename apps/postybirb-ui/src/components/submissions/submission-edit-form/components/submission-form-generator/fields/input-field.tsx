import { EuiFieldText, EuiTextArea } from '@elastic/eui';
import { TextFieldType } from '@postybirb/form-builder';
import { useState } from 'react';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';
import useValidations from './use-validations';
import useDefaultOption from './useDefaultOption';

type InputFieldProps = SubmissionGeneratedFieldProps<TextFieldType>;

export default function InputField(props: InputFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const validation = useValidations(props);
  const defaultValue = useDefaultOption<string>(props);
  const [value, setValue] = useState(
    option.data[propKey] || field.defaultValue
  );

  return (
    <FormRow
      {...props}
      validations={validation}
      copyValue={value}
      maxLength={field.maxLength}
      maxLengthValue={value?.length}
    >
      {field.formField === 'input' ? (
        <EuiFieldText
          required={field.required}
          fullWidth
          compressed
          value={value}
          isInvalid={validation.isInvalid}
          placeholder={defaultValue}
          maxLength={field.maxLength}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onBlur={(e) => {
            option.data[propKey] = e.target.value;
            setValue(e.target.value);
            onUpdate();
          }}
        />
      ) : (
        <EuiTextArea
          required={field.required}
          fullWidth
          compressed
          value={value}
          isInvalid={validation.isInvalid}
          maxLength={field.maxLength}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onBlur={(e) => {
            option.data[propKey] = e.target.value;
            setValue(e.target.value);
            onUpdate();
          }}
        />
      )}
    </FormRow>
  );
}
