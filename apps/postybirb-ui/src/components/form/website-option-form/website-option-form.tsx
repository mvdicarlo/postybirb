/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trans } from '@lingui/macro';
import { Box, Flex, Loader, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
    FieldAggregateType,
    FormBuilderMetadata,
} from '@postybirb/form-builder';
import {
    IAccountDto,
    NULL_ACCOUNT_ID,
    NullAccount,
    SubmissionType,
    WebsiteOptionsDto,
} from '@postybirb/types';
import { useQuery } from 'react-query';
import formGeneratorApi from '../../../api/form-generator.api';
import { AccountStore } from '../../../stores/account.store';
import { useStore } from '../../../stores/use-store';
import { Field } from '../fields/field';

type WebsiteOptionFormProps = {
  option: WebsiteOptionsDto;
  type: SubmissionType;
  defaultOption: WebsiteOptionsDto;
};

type InnerFormProps = {
  formFields: FormBuilderMetadata<never>;
  option: WebsiteOptionsDto;
  defaultOption: WebsiteOptionsDto;
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
      case 'switch':
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

function InnerForm({ formFields, option, defaultOption }: InnerFormProps) {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      ...Object.values(formFields).reduce(
        (acc, field) => ({ ...acc, [field.label]: field.defaultValue }),
        {}
      ),
    },
    onValuesChange(values, previous) {
      console.log(values, previous);
    },
  });

  // split form into cols
  const cols: Record<string, FieldEntry[]> = {};
  Object.entries(formFields).forEach(([key, field]) => {
    const col = field.col ?? Number.MAX_SAFE_INTEGER;
    if (!cols[col]) {
      cols[col] = [];
    }
    cols[col].push({ key, field });
  });

  //   <Input.Wrapper
  //   label={field.label}
  //   w={field.type === 'rating' ? '100px' : '100%'}
  // >
  //   <Input w="100%" />
  // </Input.Wrapper>

  return (
    <Box>
      <Flex gap="xs">
        {Object.entries(cols).map(([col, fields]) => {
          const grow = shouldGrow(fields);
          return (
            <div
              key={col}
              style={{
                flexGrow: grow ? '1' : '0',
                flex: grow ? '1' : undefined,
              }}
            >
              {fields
                .sort((a, b) => a.field.row! - b.field.row!)
                .map((entry) => (
                  <Field
                    propKey={entry.key}
                    defaultOption={defaultOption}
                    field={entry.field as unknown as FieldAggregateType<any>}
                    form={form}
                    key={entry.key}
                    option={option as unknown as WebsiteOptionsDto<never>}
                    validation={[]}
                  />
                ))}
            </div>
          );
        })}
      </Flex>
    </Box>
  );
}

function getAccount(accountId: string, accounts: IAccountDto[]): IAccountDto {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) {
    // Hacky but should work for what is needed by the fields.
    return {
      ...new NullAccount(),
    } as unknown as IAccountDto;
  }
  return account;
}

export function WebsiteOptionForm(props: WebsiteOptionFormProps) {
  const { state: accounts } = useStore(AccountStore);
  const { option, type, defaultOption } = props;
  const { account } = option;
  const { isLoading: isLoadingFormFields, data: formFields } = useQuery(
    `website-option-${option.id}`,
    () =>
      formGeneratorApi
        .getForm({ accountId: account, type })
        .then((res) => res.body)
  );

  const acc = getAccount(account, accounts);
  const accountName =
    // eslint-disable-next-line no-nested-ternary
    acc.name === NULL_ACCOUNT_ID ? (
      <Trans>Default</Trans>
    ) : acc.websiteInfo.websiteDisplayName ? (
      <span>
        {acc.websiteInfo.websiteDisplayName} - {acc.name}
      </span>
    ) : null;

  if (!accountName) {
    return <Trans>Account not found</Trans>;
  }

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
    <Box>
      <Title order={4}>{accountName}</Title>
      <InnerForm
        formFields={formFields}
        option={option}
        defaultOption={defaultOption}
      />
    </Box>
  );
}
