/* eslint-disable lingui/no-unlocalized-strings */
import { useLingui } from '@lingui/react';
import { Input } from '@mantine/core';
import { TextFieldType } from '@postybirb/form-builder';
import { externalTranslations } from '../../../external-translations';
import { FormFieldProps } from './form-field.type';
import { InputField } from './input-field';

export function Field(props: FormFieldProps): JSX.Element | null {
  const { field } = props;
  const { _ } = useLingui();

  let formField: JSX.Element | null = null;
  switch (field.formField) {
    case 'input':
      formField = <InputField {...(props as FormFieldProps<TextFieldType>)} />;
      break;
    default:
      formField = <div>Unknown field type: {field.formField}</div>;
  }

  // eslint-disable-next-line prefer-const
  let { label, i18nLabel } = field;
  const i18n = i18nLabel || label;
  const translationLabel = externalTranslations[i18n];
  if (!translationLabel) {
    console.warn('Missing translation for field', field);
  } else {
    label = _(translationLabel);
  }

  return (
    <Input.Wrapper required={field.required} label={label}>
      {formField}
    </Input.Wrapper>
  );
}
