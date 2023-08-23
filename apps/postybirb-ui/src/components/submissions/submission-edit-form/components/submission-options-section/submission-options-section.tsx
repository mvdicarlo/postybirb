import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { ValidationMessage, ValidationResult } from '@postybirb/types';
import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import userSpecifiedWebsiteOptionsApi from '../../../../../api/user-specified-website-options.api';
import { useToast } from '../../../../../app/app-toast-provider';
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
  const { addToast, addErrorToast } = useToast();
  const { submission, updateView } = useSubmission();
  const { option, validation } = props;
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
        <div>
          <EuiToolTip content="Saves current values as the default for this account to be loaded in future submissions.">
            <EuiButton
              className="mr-2"
              size="s"
              onClick={() => {
                userSpecifiedWebsiteOptionsApi
                  .create({
                    account: account.id,
                    type: submission.type,
                    options: option.data,
                  })
                  .then(() => {
                    addToast({
                      id: Date.now().toString(),
                      text: (
                        <FormattedMessage
                          id="default-options-saved"
                          defaultMessage="Defaults saved"
                        />
                      ),
                    });
                  })
                  .catch((err) => {
                    addErrorToast(err);
                  });
              }}
            >
              <FormattedMessage
                id="edit-form.set-default-options"
                defaultMessage="Save as default"
              />
            </EuiButton>
          </EuiToolTip>

          {option.isDefault ? null : (
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
          )}
        </div>
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
