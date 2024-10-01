/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trans } from '@lingui/macro';
import { Alert, Box, Flex, Loader, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  FieldAggregateType,
  FormBuilderMetadata,
} from '@postybirb/form-builder';
import {
  AccountId,
  IWebsiteFormFields,
  ValidationMessage,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import formGeneratorApi from '../../../api/form-generator.api';
import websiteOptionsApi from '../../../api/website-options.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { ValidationTranslation } from '../../translations/translation';
import { Field } from '../fields/field';
import { UserSpecifiedWebsiteOptionsSaveModal } from '../user-specified-website-options-modal/user-specified-website-options-modal';

type WebsiteOptionFormProps = {
  option: WebsiteOptionsDto;
  submission: SubmissionDto;
  userSpecifiedModalVisible: boolean;
  onUserSpecifiedModalClosed: () => void;
};

type InnerFormProps = {
  account: AccountId;
  submission: SubmissionDto;
  formFields: FormBuilderMetadata<never>;
  option: WebsiteOptionsDto;
  defaultOption: WebsiteOptionsDto;
  userSpecifiedModalVisible: boolean;
  userSpecifiedModalClosed: () => void;
};

type FieldEntry = {
  key: string;
  field: FieldAggregateType<never>;
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
            c={type === 'errors' ? 'red' : 'orange'}
            title={<ValidationTranslation id={m.id} values={m.values} />}
          />
        ))}
    </>
  );
}

function InnerForm({
  formFields,
  option,
  defaultOption,
  account,
  submission,
  userSpecifiedModalVisible,
  userSpecifiedModalClosed,
}: InnerFormProps) {
  const [validations, setValidations] = useState<ValidationResult>({
    errors: [],
    warnings: [],
  });
  const fetchValidation = useRef<((value: IWebsiteFormFields) => void) | null>(
    null
  );

  useEffect(() => {
    const fetchData = async (value: IWebsiteFormFields) => {
      if (option.isDefault) {
        setValidations({
          errors: [],
          warnings: [],
        });
      } else {
        const res = await websiteOptionsApi.validate({
          defaultOptions: defaultOption.data,
          account,
          submission: submission.id,
          options: value ?? option.data,
        });

        setValidations(res.body);
      }
    };

    fetchData(option.data);
    fetchValidation.current = debounce(fetchData, 1_200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const save = useCallback(
    debounce(
      (values) =>
        websiteOptionsApi.update(option.id, {
          data: values as IWebsiteFormFields,
        }),
      1_200
    ),
    []
  );

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      ...Object.entries(formFields).reduce(
        (acc, [key, field]) => ({
          ...acc,
          [key]:
            option.data[key as keyof IWebsiteFormFields] === undefined
              ? field.defaultValue
              : option.data[key as keyof IWebsiteFormFields],
        }),
        {}
      ),
    },
    onValuesChange(values) {
      if (fetchValidation.current) {
        fetchValidation.current(values as IWebsiteFormFields);
      }
      save(values);
    },
  });

  const optionValidations = validations || {
    errors: [],
    warnings: [],
  };
  const validationAlerts = Object.entries(optionValidations).map(
    ([key, value]) => (
      <ValidationMessages
        key={key}
        messages={value}
        type={key as keyof ValidationResult}
      />
    )
  );

  // split form into cols
  const cols: Record<string, FieldEntry[]> = {};
  Object.entries(formFields).forEach(([key, field]) => {
    const col = field.col ?? Number.MAX_SAFE_INTEGER;
    if (!cols[col]) {
      cols[col] = [];
    }
    cols[col].push({ key, field });
  });

  return (
    <Box>
      <UserSpecifiedWebsiteOptionsSaveModal
        opened={userSpecifiedModalVisible}
        onClose={userSpecifiedModalClosed}
        account={account}
        form={formFields}
        type={submission.type}
        values={form.getValues()}
      />
      {validationAlerts}
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
                    : 0
                )
                .map((entry) => (
                  <Field
                    propKey={entry.key}
                    defaultOption={defaultOption}
                    field={entry.field as unknown as FieldAggregateType<never>}
                    form={form}
                    key={entry.key}
                    option={option as unknown as WebsiteOptionsDto<never>}
                    validation={[]}
                  />
                ))}
            </Stack>
          );
        })}
      </Flex>
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
  const { account } = option;
  const { isLoading: isLoadingFormFields, data: formFields } = useQuery(
    `website-option-${option.id}`,
    () =>
      formGeneratorApi
        .getForm({ accountId: account, type: submission.type })
        .then((res) => res.body)
  );
  const defaultOption = submission.getDefaultOptions();

  if (isLoadingFormFields) {
    return <Loader />;
  }

  if (!formFields) {
    return (
      <Box>
        <Trans>Unable to display form</Trans>
      </Box>
    );
  }

  return (
    <InnerForm
      formFields={formFields}
      option={option}
      defaultOption={defaultOption}
      account={account}
      submission={submission}
      userSpecifiedModalVisible={userSpecifiedModalVisible}
      userSpecifiedModalClosed={onUserSpecifiedModalClosed}
    />
  );
}
