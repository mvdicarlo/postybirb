import { MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react';
import { Input } from '@mantine/core';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import type { FieldAggregateType } from '@postybirb/form-builder';
import { PropsWithChildren } from 'react';
import { ValidationTranslation } from '../../translations/validation-translation';
import { UseValidationResult } from '../hooks/use-validations';
import { fieldLabelTranslations } from './field-translations';
import { FormFieldProps } from './form-field.type';

type FieldLabelProps = FormFieldProps & {
  validationState: UseValidationResult;
};

export function getTranslatedLabel(
  field: FieldAggregateType,
  converter: (msg: MessageDescriptor) => string,
): string {
  const translationLabel = fieldLabelTranslations[field.label];

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
