import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCallOut,
  EuiTitle,
} from '@elastic/eui';
import { ValidationMessage, ValidationResult } from '@postybirb/types';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import Translation from '../../../../translations/translation';
import FormGeneratorApi from '../../../../../api/form-generator.api';
import {
  SubmissionSectionProps,
  SubmissionValidationResult,
} from '../../submission-form-props';
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
  const { account, option, submission, validation, onUpdate } = props;
  const { isLoading, data } = useQuery(
    [option.id],
    async () =>
      (
        await (option.account
          ? FormGeneratorApi.getForm({
              account: option.account,
              type: submission.type,
            })
          : FormGeneratorApi.getDefaultForm())
      ).body,
    {
      refetchOnWindowFocus: false,
    }
  );

  const validationMsgs: SubmissionValidationResult = useMemo(
    () =>
      validation.find((v) => v.id === option.id) ??
      ({
        id: option.id,
        result: {},
      } as SubmissionValidationResult),
    [option.id, validation]
  );
  const validationAlerts = useMemo(
    () =>
      Object.entries(validationMsgs.result).map(([key, value]) => (
        <ValidationMessages
          messages={value}
          type={key as keyof ValidationResult}
        />
      )),
    [validationMsgs]
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
              onUpdate();
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
          <SubmissionFormGenerator metadata={data} {...props} />
        </>
      )}
    </EuiAccordion>
  );
}
