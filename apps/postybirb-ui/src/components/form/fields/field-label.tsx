import { MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react';
import { Input } from '@mantine/core';
import { FieldAggregateType } from '@postybirb/form-builder';
import { PropsWithChildren } from 'react';
import { externalTranslations } from '../../../external-translations';
import { ValidationTranslation } from '../../translations/translation';
import { UseValidationResult } from '../hooks/use-validations';
import { FormFieldProps } from './form-field.type';

type FieldLabelProps = FormFieldProps & {
  validationState: UseValidationResult;
};

export function getTranslatedLabel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: FieldAggregateType<any>,
  converter: (msg: MessageDescriptor) => string
): string {
  // eslint-disable-next-line prefer-const
  let { label, i18nLabel } = field;
  const i18n = i18nLabel || label;
  const translationLabel = externalTranslations[i18n];
  if (!translationLabel) {
    // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
    console.warn('Missing translation for field', field);
  } else {
    label = converter(translationLabel);
  }
  return label;
}

export function FieldLabel(
  props: PropsWithChildren<FieldLabelProps>
): JSX.Element {
  const { field, children, propKey, validationState } = props;
  const { errors, warnings } = validationState;
  const { _ } = useLingui();

  const label = getTranslatedLabel(field, _);

  return (
    <Input.Wrapper required={field.required} label={label}>
      {children}
      {errors.map((error) => (
        <Input.Error key={`${propKey}-${error.id}`}>
          <ValidationTranslation id={error.id} values={error.values} />
        </Input.Error>
      ))}
      {warnings.map((warning) => (
        <Input.Error key={`${propKey}-${warning.id}`} c="orange">
          <ValidationTranslation id={warning.id} values={warning.values} />
        </Input.Error>
      ))}
    </Input.Wrapper>
  );
}
