import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Card,
  Flex,
  Image,
  Input,
  Loader,
  ScrollArea,
  Stack,
} from '@mantine/core';
import {
  AccountId,
  IAccountDto,
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
  NullAccount,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { IconSquare, IconSquareFilled } from '@tabler/icons-react';
import { debounce } from 'lodash';
import { useCallback } from 'react';
import submissionApi from '../../../../api/submission.api';
import websiteOptionsApi from '../../../../api/website-options.api';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { AccountStore } from '../../../../stores/account.store';
import { useStore } from '../../../../stores/use-store';
import { defaultTargetProvider } from '../../../../transports/http-client';
import { WebsiteOptionGroupSection } from '../../../form/website-option-form/website-option-group-section';
import { WebsiteSelect } from '../../../form/website-select/website-select';
import SubmissionScheduler from '../../submission-scheduler/submission-scheduler';
import { SubmissionViewCardActions } from './submission-view-card-actions';

type SubmissionViewCardProps = {
  submission: SubmissionDto;
  onSelect(submission: SubmissionDto): void;
  isSelected: boolean;
};

export function SubmissionViewCard(props: SubmissionViewCardProps) {
  const { isLoading, state: accounts } = useStore(AccountStore);
  const { submission, onSelect, isSelected } = props;
  const { type } = submission;
  const { files } = submission;
  const src = files.length
    ? `${defaultTargetProvider()}/api/file/thumbnail/${files[0].id}`
    : null;
  const defaultOption = submission.getDefaultOptions();

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
        isScheduled: submission.isScheduled,
        scheduledFor: schedule.scheduledFor,
        scheduleType: schedule.scheduleType,
        deletedWebsiteOptions: [],
        newOrUpdatedOptions: [],
        metadata: submission.metadata,
      });
    }, 1_000),
    [submission]
  );

  if (isLoading) {
    return <Loader />;
  }

  // ! TODO - Fix all internal anchor/links to use the old way of opening a window as the current form is busted
  return (
    <Card shadow="xs" withBorder={isSelected}>
      <Card.Section ta="center" pt="4" bg="rgba(0,0,0,0.1)">
        <Flex>
          <ActionIcon
            flex="6"
            c="var(--mantine-color-text)"
            variant="transparent"
            onClick={() => onSelect(submission)}
          >
            {isSelected ? <IconSquareFilled /> : <IconSquare />}
          </ActionIcon>
          <SubmissionViewCardActions submission={submission} />
        </Flex>
      </Card.Section>
      <Card.Section py="4">
        <ScrollArea h={400}>
          <Flex>
            {type === SubmissionType.FILE && src ? (
              <Image
                loading="lazy"
                h={75}
                w={75}
                fit="fill"
                src={src}
                style={{ position: 'sticky', top: 0 }}
              />
            ) : null}

            <Box mx="xs" flex="10">
              <Stack gap="xs">
                <Input.Wrapper label={<Trans>Schedule</Trans>}>
                  <SubmissionScheduler
                    schedule={submission.schedule}
                    onChange={(schedule) => {
                      debouncedUpdate(schedule);
                    }}
                  />
                </Input.Wrapper>
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
                      onRemoveAccount={removeAccount}
                    />
                  ))}
              </Stack>
            </Box>
          </Flex>
        </ScrollArea>
      </Card.Section>
    </Card>
  );
}
