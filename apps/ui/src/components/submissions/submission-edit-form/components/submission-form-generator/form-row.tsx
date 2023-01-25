/* eslint-disable react/jsx-no-useless-fragment */
import { EuiFormRow, EuiText } from '@elastic/eui';
import { PropsWithChildren } from 'react';
import Translation from '../../../../translations/translation';
import { SubmissionGeneratedFieldProps } from '../../submission-form-props';
import { UseValidationResult } from './fields/use-validations';

type FormRowProps = PropsWithChildren<SubmissionGeneratedFieldProps> & {
  // eslint-disable-next-line react/require-default-props
  validations?: UseValidationResult;
};

export default function FormRow(props: FormRowProps) {
  const { validations, children, field, propKey, option } = props;
  return (
    <EuiFormRow
      aria-required={field.required}
      fullWidth
      id={`option-${option.id}-${propKey}`}
      label={field.label}
      aria-label={field.label}
      isInvalid={validations?.isInvalid}
      error={validations?.errors.map((error) => (
        <Translation id={error.id} values={error.values} />
      ))}
      helpText={validations?.warnings.map((warning) => (
        <EuiText color="warning" size="xs">
          <Translation id={warning.id} values={warning.values} />
        </EuiText>
      ))}
    >
      <>{children as JSX.Element}</>
    </EuiFormRow>
  );
}
