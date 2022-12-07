/* eslint-disable react/jsx-no-useless-fragment */
import { EuiFormRow } from '@elastic/eui';
import { PropsWithChildren } from 'react';
import { SubmissionGeneratedFieldProps } from '../../submission-form-props';

type FormRowProps = PropsWithChildren<SubmissionGeneratedFieldProps>;

export default function FormRow(props: FormRowProps) {
  const { children, field, propKey, option } = props;
  return (
    <EuiFormRow
      aria-required={field.required}
      fullWidth
      id={`option-${option.id}-${propKey}`}
      label={field.label}
      aria-label={field.label}
    >
      <>{children as JSX.Element}</>
    </EuiFormRow>
  );
}
