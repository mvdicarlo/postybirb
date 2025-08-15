/* eslint-disable @typescript-eslint/no-explicit-any */
import { Alert, Box } from '@mantine/core';
import {
    AccountId,
    ValidationMessage,
    ValidationResult,
    WebsiteOptionsDto,
} from '@postybirb/types';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { ValidationTranslation } from '../../translations/validation-translation';
import { SectionLayout } from '../layout/section-layout';
import { UserSpecifiedWebsiteOptionsSaveModal } from '../user-specified-website-options-modal/user-specified-website-options-modal';
import { FormFieldsProvider, useFormFields } from './use-form-fields';

type WebsiteOptionFormProps = {
  option: WebsiteOptionsDto;
  submission: SubmissionDto;
  userSpecifiedModalVisible: boolean;
  onUserSpecifiedModalClosed: () => void;
};

type InnerFormProps = {
  account: AccountId;
  submission: SubmissionDto;
  option: WebsiteOptionsDto;
  defaultOption: WebsiteOptionsDto;
  userSpecifiedModalVisible: boolean;
  userSpecifiedModalClosed: () => void;
};

type SubInnerFormProps = {
  submission: SubmissionDto;
  option: WebsiteOptionsDto;
  defaultOption: WebsiteOptionsDto;
};

function ValidationMessages(props: {
  messages: ValidationMessage[];
  type: keyof ValidationResult;
}): JSX.Element {
  const { messages, type } = props;
  // Only display messages without fields
  return (
    <>
      {messages
        .filter((m) => m.field === undefined)
        .map((m) => (
          <Alert
            key={m.id}
            c={type === 'errors' ? 'red' : 'orange'}
            title={<ValidationTranslation id={m.id} values={m.values} />}
          />
        ))}
    </>
  );
}

function SubInnerForm(props: SubInnerFormProps) {
  const { option, defaultOption, submission } = props;
  const { formFields } = useFormFields();

  return (
    <SectionLayout
      fields={formFields}
      option={option}
      defaultOption={defaultOption}
      submission={submission}
    />
  );
}

function InnerForm({
  option,
  defaultOption,
  account,
  submission,
  userSpecifiedModalVisible,
  userSpecifiedModalClosed,
}: InnerFormProps) {
  const { formFields } = useFormFields();
  const validations = submission.validations.find(
    (v) => v.id === option.id,
  ) ?? {
    id: option.id,
    errors: [],
    warnings: [],
  };

  const validationAlerts = [
    <ValidationMessages
      key="errors"
      messages={validations.errors ?? []}
      type="errors"
    />,
    <ValidationMessages
      key="warnings"
      messages={validations.warnings ?? []}
      type="warnings"
    />,
  ];

  return (
    <Box className="postybirb__website-option-form" option-id={option.id}>
      <UserSpecifiedWebsiteOptionsSaveModal
        opened={userSpecifiedModalVisible}
        onClose={userSpecifiedModalClosed}
        accountId={account}
        form={formFields}
        type={submission.type}
        values={option.data as unknown as Record<string, unknown>}
      />
      {validationAlerts}
      <SubInnerForm
        key={option.id}
        option={option}
        defaultOption={defaultOption}
        submission={submission}
      />
    </Box>
  );
}

export function WebsiteOptionForm(props: WebsiteOptionFormProps) {
  const {
    option,
    submission,
    onUserSpecifiedModalClosed,
    userSpecifiedModalVisible,
  } = props;

  const defaultOption = submission.getDefaultOptions();

  return (
    <FormFieldsProvider option={option} submission={submission}>
      <InnerForm
        key={option.id}
        option={option}
        defaultOption={defaultOption}
        account={option.accountId}
        submission={submission}
        userSpecifiedModalVisible={userSpecifiedModalVisible}
        userSpecifiedModalClosed={onUserSpecifiedModalClosed}
      />
    </FormFieldsProvider>
  );
}
