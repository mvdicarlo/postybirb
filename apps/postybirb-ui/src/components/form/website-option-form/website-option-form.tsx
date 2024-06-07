import { Trans } from '@lingui/macro';
import { Box, Grid, Loader, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
    FieldAggregateType,
    FormBuilderMetadata,
} from '@postybirb/form-builder';
import {
    NULL_ACCOUNT_ID,
    SubmissionType,
    WebsiteOptionsDto,
} from '@postybirb/types';
import { useState } from 'react';
import { useQuery } from 'react-query';
import formGeneratorApi from '../../../api/form-generator.api';
import { AccountStore } from '../../../stores/account.store';
import { useStore } from '../../../stores/use-store';

type WebsiteOptionFormProps = {
  option: WebsiteOptionsDto;
  type: SubmissionType;
};

function InnerForm({ formFields }: { formFields: FormBuilderMetadata<never> }) {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      ...Object.values(formFields).reduce(
        (acc, field) => ({ ...acc, [field.label]: field.defaultValue }),
        {}
      ),
    },
  });
  const [submittedValues, setSubmittedValues] = useState<
    typeof form.values | null
  >(null);

  // split form into rows
  const rows: Record<string, FieldAggregateType<never>[]> = {};
  Object.values(formFields).forEach((field) => {
    const row = field.row ?? 0;
    if (!rows[row]) {
      rows[row] = [];
    }
    rows[row].push(field);
  });

  console.log(submittedValues, form.values);
  return (
    <form onSubmit={form.onSubmit(setSubmittedValues)}>
      {Object.entries(rows).map(([row, fields]) => (
        <Grid key={row}>
          {fields.map((field) => (
            <Grid.Col key={field.label} span={field.gridSpan ?? 12}>
              {field.label}
            </Grid.Col>
          ))}
        </Grid>
      ))}
      <button type="submit">Submit</button>
    </form>
  );
}

export function WebsiteOptionForm(props: WebsiteOptionFormProps) {
  const { state: accounts } = useStore(AccountStore);
  const { option, type } = props;
  const { account } = option;
  const {
    isLoading: isLoadingFormFields,
    data: formFields,
    refetch: reloadFormFields,
  } = useQuery(`website-option-${option.id}`, () =>
    formGeneratorApi
      .getForm({ accountId: account, type })
      .then((res) => res.body)
  );

  const accountName =
    // eslint-disable-next-line no-nested-ternary
    account === NULL_ACCOUNT_ID ? (
      <Trans>Default</Trans>
    ) : accounts.find((a) => a.id === account)?.websiteInfo
        .websiteDisplayName ? (
      <span>
        {accounts.find((a) => a.id === account)!.websiteInfo.websiteDisplayName}{' '}
        - {accounts.find((a) => a.id === account)!.name}
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
      <InnerForm formFields={formFields} />
    </Box>
  );
}
