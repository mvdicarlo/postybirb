/* eslint-disable lingui/no-unlocalized-strings */
import {
  BooleanFieldType,
  RadioFieldType,
  TagFieldType,
  TextFieldType,
} from '@postybirb/form-builder';
import { BooleanField } from './boolean-field';
import { FormFieldProps } from './form-field.type';
import { InputField } from './input-field';
import { RadioField } from './radio-field';
import { TagField } from './tag-field';

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
    case 'checkbox':
      formField = (
        <BooleanField {...(props as FormFieldProps<BooleanFieldType>)} />
      );
      break;
    case 'tag':
      formField = <TagField {...(props as FormFieldProps<TagFieldType>)} />;
      break;
    default:
      formField = <div>Unknown field type: {field.formField}</div>;
  }

  // TODO - Happily merge external translation and the shared translations.
  return formField;
}
