import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCallOut,
  EuiTitle,
} from '@elastic/eui';
import { ValidationMessage, ValidationResult } from '@postybirb/types';
import { useMemo } from 'react';
import { useSubmission } from '../../../../../hooks/submission/use-submission';
import { useSubmissionOptions } from '../../../../../hooks/submission/use-submission-options';
import Translation from '../../../../translations/translation';
import { SubmissionSectionProps } from '../../submission-form-props';
import SubmissionFormGenerator from '../submission-form-generator/submission-form-generator';

type SubmissionOptionsSectionProps = SubmissionSectionProps;

function ValidationMessages(props: {
  messages: ValidationMessage<object>[];
  type: keyof ValidationResult;
}): JSX.Element {
  const { messages, type } = props;
  // Only display messages without fields
  return (
    <>
      {messages
        .filter((m) => m.field === undefined)
        .map((m) => (
          <EuiCallOut
            color={type === 'errors' ? 'danger' : 'warning'}
            size="s"
            title={<Translation id={m.id} values={m.values} />}
            iconType="alert"
          />
        ))}
    </>
  );
}

export default function SubmissionOptionsSection(
  props: SubmissionOptionsSectionProps
) {
  const { submission, updateView } = useSubmission();
  const { defaultOption, option, validation } = props;
  const { isLoading, account, form, validations } = useSubmissionOptions(
    option,
    submission.type,
    validation
  );

  const validationAlerts = useMemo(
    () =>
      Object.entries(validations.result).map(([key, value]) => (
        <ValidationMessages
          messages={value}
          type={key as keyof ValidationResult}
        />
      )),
    [validations]
  );

  return (
    <EuiAccordion
      initialIsOpen
      id={option.id}
      buttonContent={
        <EuiTitle size="xs">
          <h4 data-anchor={account?.id}>{account?.name}</h4>
        </EuiTitle>
      }
      extraAction={
        option.isDefault ? null : (
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            style={{ verticalAlign: 'middle' }}
            onClick={() => {
              // Remove option
              submission.removeOption(option);
              updateView();
            }}
          />
        )
      }
      paddingSize="s"
      isLoading={isLoading}
      className="euiAccordionForm"
      element="fieldset"
      buttonClassName="euiAccordionForm__button"
    >
      {isLoading ? null : (
        <>
          {validationAlerts}
          <SubmissionFormGenerator
            account={account}
            metadata={form}
            onUpdate={updateView}
            {...props}
          />
        </>
      )}
    </EuiAccordion>
  );
}
