import { Trans } from '@lingui/macro';
import { Flex, Input, Loader, Stack } from '@mantine/core';
import {
  AccountId,
  FileSubmissionMetadata,
  IAccountDto,
  ISubmissionScheduleInfo,
  NullAccount,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { debounce } from 'lodash';
import { useCallback, useMemo } from 'react';
import submissionApi from '../../../api/submission.api';
import websiteOptionsApi from '../../../api/website-options.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { AccountStore } from '../../../stores/account.store';
import { useStore } from '../../../stores/use-store';
import { WebsiteOptionGroupSection } from '../../form/website-option-form/website-option-group-section';
import { ImplementedWebsiteSelect } from '../../form/website-select/implemented-website-select';
import { SubmissionScheduler } from '../submission-scheduler/submission-scheduler';
import { SubmissionFileManager } from './submission-file-manager/submission-file-manager';
import { SubmissionNavigationTree } from './submission-navigation-tree';

type SubmissionEditFormProps = {
  submission: SubmissionDto;
};

export function SubmissionEditForm(props: SubmissionEditFormProps) {
  const { submission } = props;
  const { state: accounts, isLoading } = useStore(AccountStore);

  const defaultOption = submission.getDefaultOptions();
  const isSpecialSubmissionType =
    submission.isMultiSubmission || submission.isTemplate;

  const top = 148;

  const optionsGroupedByWebsiteId = useMemo(
    () =>
      Object.entries(
        submission.options
          .filter((o) => !o.isDefault)
          .reduce(
            (acc, option) => {
              const account = accounts.find((a) => a.id === option.accountId);
              if (!account) return acc;

              const websiteId = account.website;
              if (!acc[websiteId]) {
                acc[websiteId] = {
                  account,
                  options: [],
                };
              }
              acc[websiteId].options.push(option);
              return acc;
            },
            {} as Record<
              AccountId,
              { account: IAccountDto; options: WebsiteOptionsDto[] }
            >,
          ),
      ).sort((a, b) => {
        const aAccount = a[1].account;
        const bAccount = b[1].account;
        return (
          aAccount.websiteInfo.websiteDisplayName ?? aAccount.name
        ).localeCompare(
          bAccount.websiteInfo.websiteDisplayName ?? bAccount.name,
        );
      }),
    [submission.options, accounts],
  );

  const removeAccount = (account: IAccountDto) => {
    const option = submission.options.find((o) => o.accountId === account.id);
    if (option && !option.isDefault) {
      websiteOptionsApi.remove([option.id]);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdate = useCallback(
    debounce((schedule: ISubmissionScheduleInfo) => {
      submissionApi.update(submission.id, {
        isScheduled: isSpecialSubmissionType ? false : submission.isScheduled,
        scheduledFor: schedule.scheduledFor,
        scheduleType: schedule.scheduleType,
        cron: schedule.cron,
        deletedWebsiteOptions: [],
        newOrUpdatedOptions: [],
        metadata: submission.metadata,
      });
    }, 1_000),
    [submission],
  );

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Flex data-submission-id={submission.id}>
      <Stack gap="xs" flex="11">
        {!isSpecialSubmissionType && submission.type === SubmissionType.FILE ? (
          <SubmissionFileManager
            submission={submission as SubmissionDto<FileSubmissionMetadata>}
          />
        ) : null}
        {!isSpecialSubmissionType ? (
          <Input.Wrapper label={<Trans>Schedule</Trans>}>
            <SubmissionScheduler
              schedule={submission.schedule}
              onChange={(schedule) => {
                debouncedUpdate(schedule);
              }}
            />
          </Input.Wrapper>
        ) : null}
        <ImplementedWebsiteSelect submission={submission} />
        <WebsiteOptionGroupSection
          options={[defaultOption]}
          submission={submission}
          account={new NullAccount() as unknown as IAccountDto}
          top={top}
        />
        {optionsGroupedByWebsiteId.map(([accountId, group]) => (
          <WebsiteOptionGroupSection
            key={accountId}
            options={group.options}
            submission={submission}
            account={group.account}
            top={top}
            onRemoveAccount={removeAccount}
          />
        ))}
      </Stack>
      <SubmissionNavigationTree
        submission={submission}
        defaultOption={defaultOption}
        optionsGroupedByWebsiteId={optionsGroupedByWebsiteId}
        top={top}
      />
    </Flex>
  );
}
