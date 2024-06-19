import { Trans } from '@lingui/macro';
import { Box, Space, Title } from '@mantine/core';
import {
    IAccountDto,
    NULL_ACCOUNT_ID,
    WebsiteOptionsDto,
} from '@postybirb/types';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { WebsiteOptionForm } from './website-option-form';

type WebsiteOptionGroupSectionProps = {
  options: WebsiteOptionsDto[];
  submission: SubmissionDto;
  account: IAccountDto;
};

export function WebsiteOptionGroupSection(
  props: WebsiteOptionGroupSectionProps
) {
  const { options, submission, account } = props;

  const isDefaultAccount = account.id === NULL_ACCOUNT_ID;
  const accountName =
    // eslint-disable-next-line no-nested-ternary
    isDefaultAccount ? (
      <Trans>Default</Trans>
    ) : account.websiteInfo.websiteDisplayName ? (
      <span>{account.websiteInfo.websiteDisplayName}</span>
    ) : null;

  return (
    <Box>
      <Title order={4}>{accountName}</Title>
      <Space h="xs" />
      <Box ml={isDefaultAccount ? 0 : 'md'}>
        {!isDefaultAccount ? (
          <>
            <Title order={5} c={account.state.isLoggedIn ? 'green' : 'red'}>
              {account.name} (
              {account.state.username ?? <Trans>Not logged in</Trans>})
            </Title>
            <Space h="xs" />
          </>
        ) : null}
        {options.map((option) => (
          <WebsiteOptionForm
            key={option.id}
            option={option}
            submission={submission}
          />
        ))}
      </Box>
    </Box>
  );
}
