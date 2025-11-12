import { MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react/macro';
import { Input } from '@mantine/core';
import type { FieldAggregateType } from '@postybirb/form-builder';
import { FieldLabelTranslations } from '@postybirb/translations';
import { PropsWithChildren } from 'react';
import { ValidationTranslation } from '../../translations/validation-translation';
import { UseValidationResult } from '../hooks/use-validations';
import { FormFieldProps } from './form-field.type';

type FieldLabelProps = FormFieldProps & {
  validationState: UseValidationResult;
};

export function getTranslatedLabel(
  field: FieldAggregateType,
  converter: (msg: MessageDescriptor) => string,
): string {
  if (typeof field.label !== 'string') return field.label.untranslated;

  const translationLabel =
    FieldLabelTranslations[field.label as keyof typeof FieldLabelTranslations];

  if (!translationLabel) {
    // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
    console.warn('Missing translation for field', field);
    return field.label;
  }

  return converter(translationLabel);
}

export function FieldLabel(
  props: PropsWithChildren<FieldLabelProps>,
): JSX.Element {
  const { field, children, propKey, validationState } = props;
  const { errors, warnings } = validationState;
  const { t } = useLingui();

  const label = field.label ? getTranslatedLabel(field, t) : undefined;

  return (
    <Input.Wrapper required={field.required} label={label}>
      {children}
      {errors.map((error) => (
        <Input.Error
          key={`${propKey}-${error.id}-${JSON.stringify(error.values)}`}
          pb={4}
        >
          <ValidationTranslation id={error.id} values={error.values} />
        </Input.Error>
      ))}
      {warnings.map((warning) => (
        <Input.Error
          key={`${propKey}-${warning.id}-${JSON.stringify(warning.values)}`}
          c="orange"
          pb={4}
        >
          <ValidationTranslation id={warning.id} values={warning.values} />
        </Input.Error>
      ))}
    </Input.Wrapper>
  );
}
