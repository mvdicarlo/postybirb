/* eslint-disable react/jsx-no-useless-fragment */
import { EuiButtonIcon, EuiCopy, EuiFormRow, EuiText } from '@elastic/eui';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { PropsWithChildren, useMemo } from 'react';
import { ValidationTranslation } from '../../../../translations/translation';
import { SubmissionGeneratedFieldProps } from '../../submission-form-props';
import { UseValidationResult } from './fields/use-validations';

type FormRowProps = PropsWithChildren<SubmissionGeneratedFieldProps> & {
  // eslint-disable-next-line react/require-default-props
  validations?: UseValidationResult;
  // eslint-disable-next-line react/require-default-props
  copyValue?: string;
  // eslint-disable-next-line react/require-default-props
  maxLength?: number;
  // eslint-disable-next-line react/require-default-props
  maxLengthValue?: number;
};

export default function FormRow(props: FormRowProps) {
  const {
    validations,
    children,
    field,
    propKey,
    option,
    copyValue,
    maxLength,
    maxLengthValue,
  } = props;
  const { _ } = useLingui();
  const copyBtn = useMemo(
    () =>
      copyValue ? (
        <EuiCopy textToCopy={copyValue}>
          {(copy) => (
            <EuiButtonIcon
              aria-label={_(msg`Copy`)}
              iconType="copy"
              iconSize="s"
              onClick={copy}
            />
          )}
        </EuiCopy>
      ) : null,
    [copyValue, _]
  );

  return (
    <EuiFormRow
      labelAppend={copyBtn}
      aria-required={field.required}
      fullWidth
      id={`option-${option.id}-${propKey}`}
      label={`${field.label}${
        maxLength ? ` (${maxLengthValue ?? 0} / ${maxLength})` : ''
      }`}
      aria-label={field.label}
      isInvalid={validations?.isInvalid}
      error={validations?.errors.map((error) => (
        <ValidationTranslation id={error.id} values={error.values} />
      ))}
      helpText={validations?.warnings.map((warning) => (
        <EuiText color="warning" size="xs">
          <ValidationTranslation id={warning.id} values={warning.values} />
        </EuiText>
      ))}
    >
      <>{children as JSX.Element}</>
    </EuiFormRow>
  );
}
