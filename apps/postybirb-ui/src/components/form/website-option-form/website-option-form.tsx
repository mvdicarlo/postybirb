/* eslint-disable @typescript-eslint/no-explicit-any */
import { Alert, Box, Flex, Stack } from '@mantine/core';
import {
  FieldAggregateType
} from '@postybirb/form-builder';
import {
  AccountId,
  ValidationMessage,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { ValidationTranslation } from '../../translations/validation-translation';
import { Field } from '../fields/field';
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

type FieldEntry = {
  key: string;
  field: FieldAggregateType;
};

function shouldGrow(entries: FieldEntry[]): boolean {
  for (const entry of entries) {
    if (entry.field.grow) {
      return true;
    }

    switch (entry.field.formField) {
      case 'checkbox':
      case 'radio':
      case 'rating':
        break;
      case 'input':
      case 'tag':
      case 'textarea':
      default:
        return true;
    }
  }

  return false;
}

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

  // split form into cols
  const cols: Record<string, FieldEntry[]> = {};
  Object.entries(formFields).forEach(([key, field]) => {
    if (field.hidden) {
      return;
    }
    const col = field.col ?? Number.MAX_SAFE_INTEGER;
    if (!cols[col]) {
      cols[col] = [];
    }
    cols[col].push({ key, field });
  });

  return (
    <Flex gap="xs">
      {Object.entries(cols).map(([col, fields]) => {
        const grow = shouldGrow(fields);
        return (
          <Stack
            gap="xs"
            key={col}
            style={{
              flexGrow: grow ? '1' : '0',
              flex: grow ? '1' : undefined,
            }}
          >
            {fields
              .sort((a, b) =>
                typeof a.field.row === 'number' &&
                typeof b.field.row === 'number'
                  ? a.field.row - b.field.row
                  : 0,
              )
              .map((entry) => (
                <Field
                  submission={submission}
                  propKey={entry.key}
                  defaultOption={defaultOption}
                  field={entry.field as unknown as FieldAggregateType}
                  key={entry.key}
                  option={option}
                  validation={submission.validations ?? []}
                />
              ))}
          </Stack>
        );
      })}
    </Flex>
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
