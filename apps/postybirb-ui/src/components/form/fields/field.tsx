/* eslint-disable lingui/no-unlocalized-strings */
import { RadioFieldType, TextFieldType } from '@postybirb/form-builder';
import { FormFieldProps } from './form-field.type';
import { InputField } from './input-field';
import { RadioField } from './radio-field';

export function Field(props: FormFieldProps): JSX.Element | null {
  const { field } = props;

  let formField: JSX.Element | null = null;
  switch (field.formField) {
    case 'input':
    case 'textarea':
      formField = <InputField {...(props as FormFieldProps<TextFieldType>)} />;
      break;
    case 'radio':
    case 'rating':
      formField = <RadioField {...(props as FormFieldProps<RadioFieldType>)} />;
      break;
    default:
      formField = <div>Unknown field type: {field.formField}</div>;
  }

  // TODO - Happily merge external translation and the shared translations.
  return formField;
}
