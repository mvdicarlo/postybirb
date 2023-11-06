import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { ValidationMessage, ValidationResult } from '@postybirb/types';
import { useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';

import { useSubmission } from '../../../../../hooks/submission/use-submission';
import { useSubmissionOptions } from '../../../../../hooks/submission/use-submission-options';
import Translation from '../../../../translations/translation';
import { SubmissionSectionProps } from '../../submission-form-props';
import SubmissionFormGenerator from '../submission-form-generator/submission-form-generator';
import UserSpecifiedWebsiteOptionsSaveModal from './user-specified-website-options-save-modal';

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
  const { option, validation } = props;
  const { isLoading, account, form, validations } = useSubmissionOptions(
    option,
    submission.type,
    validation
  );
  const [isDefaultSaveModalVisible, setIsDefaultSaveModalVisible] =
    useState(false);

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
            <EuiButtonEmpty
              className="mr-2"
              size="s"
              onClick={() => {
                setIsDefaultSaveModalVisible(true);
              }}
            >
              <FormattedMessage
                id="edit-form.set-default-options"
                defaultMessage="Save as default"
              />
            </EuiButtonEmpty>
          </EuiToolTip>

          {option.isDefault ? null : (
            <EuiButtonIcon
              color="danger"
              iconType="trash"
              aria-label="Remove submission"
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
      {isDefaultSaveModalVisible && form ? (
        <UserSpecifiedWebsiteOptionsSaveModal
          accountId={option.account}
          type={submission.type}
          options={option.data}
          form={form}
          onClose={() => {
            setIsDefaultSaveModalVisible(false);
          }}
        />
      ) : null}
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
