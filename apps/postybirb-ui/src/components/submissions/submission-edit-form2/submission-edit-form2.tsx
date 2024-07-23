import { Trans } from '@lingui/macro';
import { Input, Stack } from '@mantine/core';
import {
    AccountId,
    IAccountDto,
    ISubmissionScheduleInfo,
    IWebsiteFormFields,
    NullAccount,
    WebsiteOptionsDto,
} from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback } from 'react';
import submissionApi from '../../../api/submission.api';
import websiteOptionsApi from '../../../api/website-options.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { AccountStore } from '../../../stores/account.store';
import { useStore } from '../../../stores/use-store';
import { WebsiteOptionGroupSection } from '../../form/website-option-form/website-option-group-section';
import { WebsiteSelect } from '../../form/website-select/website-select';
import SubmissionScheduler from '../submission-scheduler/submission-scheduler';

type SubmissionEditForm2Props = {
  submission: SubmissionDto;
};

// TODO - sidenav tree
// TODO - image form
// TODO - buttons and template imports
export function SubmissionEditForm2(props: SubmissionEditForm2Props) {
  const { submission } = props;
  const { state: accounts } = useStore(AccountStore);

  const defaultOption = submission.getDefaultOptions();
  const isTemplate = submission.isTemplate();

  const optionsGroupedByWebsiteId = submission.options
    .filter((o) => !o.isDefault)
    .reduce((acc, option) => {
      const account = accounts.find((a) => a.id === option.account)!;
      const websiteId = account.website;
      if (!acc[websiteId]) {
        acc[websiteId] = {
          account,
          options: [],
        };
      }
      acc[websiteId].options.push(option);
      return acc;
    }, {} as Record<AccountId, { account: IAccountDto; options: WebsiteOptionsDto[] }>);

  const removeAccount = (account: IAccountDto) => {
    const options = submission.options
      .filter((o) => o.account !== account.id)
      .filter((o) => !o.isDefault);
    websiteOptionsApi.remove(submission.options.map((o) => o.id));
    options.forEach((o) => {
      websiteOptionsApi.create({
        account: o.account,
        submission: submission.id,
        data: o.data,
      });
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdate = useCallback(
    debounce((schedule: ISubmissionScheduleInfo) => {
      submissionApi.update(submission.id, {
        isScheduled: isTemplate ? false : submission.isScheduled,
        scheduledFor: schedule.scheduledFor,
        scheduleType: schedule.scheduleType,
        deletedWebsiteOptions: [],
        newOrUpdatedOptions: [],
        metadata: submission.metadata,
      });
    }, 1_000),
    [submission]
  );

  return (
    <Stack gap="xs">
      {!isTemplate ? (
        <Input.Wrapper label={<Trans>Schedule</Trans>}>
          <SubmissionScheduler
            schedule={submission.schedule}
            onChange={(schedule) => {
              debouncedUpdate(schedule);
            }}
          />
        </Input.Wrapper>
      ) : null}
      <WebsiteSelect
        submission={submission}
        onSelect={(selectedAccounts) => {
          const existingOptions = submission.options.filter(
            (o) => !o.isDefault
          );
          const removedOptions: WebsiteOptionsDto[] = [];
          const newAccounts: AccountId[] = [];
          selectedAccounts.forEach((account) => {
            const exists = existingOptions.find(
              (o) => o.account === account.id
            );
            if (!exists) {
              newAccounts.push(account.id);
            }
          });
          existingOptions.forEach((option) => {
            const exists = selectedAccounts.find(
              (a) => a.id === option.account
            );
            if (!exists) {
              removedOptions.push(option);
            }
          });
          removedOptions.forEach((option) => {
            websiteOptionsApi.remove([option.id]);
          });
          newAccounts.forEach((account) => {
            websiteOptionsApi.create({
              account,
              submission: submission.id,
              data: {} as IWebsiteFormFields,
            });
          });
        }}
      />
      <WebsiteOptionGroupSection
        options={[defaultOption]}
        submission={submission}
        account={new NullAccount() as unknown as IAccountDto}
      />
      {Object.entries(optionsGroupedByWebsiteId)
        .sort((a, b) => {
          const aAccount = a[1].account;
          const bAccount = b[1].account;
          return (
            aAccount.websiteInfo.websiteDisplayName ?? aAccount.name
          ).localeCompare(
            bAccount.websiteInfo.websiteDisplayName ?? bAccount.name
          );
        })
        .map(([accountId, group]) => (
          <WebsiteOptionGroupSection
            key={accountId}
            options={group.options}
            submission={submission}
            account={group.account}
            top={80}
            onRemoveAccount={removeAccount}
          />
        ))}
    </Stack>
  );
}
