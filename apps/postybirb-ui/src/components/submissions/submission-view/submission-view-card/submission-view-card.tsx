import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Alert,
  Box,
  Card,
  Flex,
  Input,
  List,
  Loader,
  ScrollArea,
  Stack,
} from '@mantine/core';
import {
  AccountId,
  IAccount,
  IAccountDto,
  IEntityDto,
  ISubmissionScheduleInfo,
  NullAccount,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import {
  IconArrowsMove,
  IconExclamationCircle,
  IconSquare,
  IconSquareFilled,
} from '@tabler/icons-react';
import { debounce } from 'lodash';
import { useCallback } from 'react';
import submissionApi from '../../../../api/submission.api';
import websiteOptionsApi from '../../../../api/website-options.api';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { AccountStore } from '../../../../stores/account.store';
import { useStore } from '../../../../stores/use-store';
import { WebsiteOptionGroupSection } from '../../../form/website-option-form/website-option-group-section';
import { ImplementedWebsiteSelect } from '../../../form/website-select/implemented-website-select';
import { ValidationTranslation } from '../../../translations/validation-translation';
import { SubmissionFilePreview } from '../../submission-file-preview/submission-file-preview';
import { SubmissionScheduler } from '../../submission-scheduler/submission-scheduler';
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
  const defaultOption = submission.getDefaultOptions();

  const optionsGroupedByWebsiteId = submission.options
    .filter((o) => !o.isDefault)
    .reduce(
      (acc, option) => {
        const account = accounts.find((a) => a.id === option.accountId);
        if (!account) {
          return acc;
        }
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
    );

  const removeAccount = (account: IAccountDto) => {
    const options = submission.options
      .filter((o) => o.accountId !== account.id)
      .filter((o) => !o.isDefault);
    websiteOptionsApi.remove(submission.options.map((o) => o.id));
    options.forEach((o) => {
      websiteOptionsApi.create({
        accountId: o.account.id,
        submissionId: submission.id,
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
    [submission],
  );

  if (isLoading) {
    return <Loader />;
  }

  const fileValidationIssues = submission.validations.reduce(
    (prev, curr) => ({
      id: prev.id,
      account: prev.account,
      errors: [...(prev.errors ?? []), ...(curr.errors ?? [])].filter(
        (e) => e.field === 'files',
      ),
      warnings: [...(prev.warnings ?? []), ...(curr.warnings ?? [])].filter(
        (e) => e.field === 'files',
      ),
    }),
    { id: '', errors: [], warnings: [], account: {} as IEntityDto<IAccount> },
  );

  return (
    <Card
      shadow="xs"
      withBorder={isSelected}
      style={{ contentVisibility: 'auto' }}
    >
      <Card.Section ta="center" bg="rgba(0,0,0,0.1)">
        <Flex>
          <IconArrowsMove
            className="sort-handle"
            style={{ cursor: 'move', margin: 'auto', marginLeft: 4 }}
          />
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
        <ScrollArea.Autosize mah={400}>
          <Flex>
            {type === SubmissionType.FILE && files.length ? (
              <SubmissionFilePreview file={files[0]} height={75} width={75} />
            ) : null}
            <Box mx="xs" flex="10">
              <Stack gap="xs">
                {fileValidationIssues.errors?.length ? (
                  <Alert
                    variant="outline"
                    color="red"
                    icon={<IconExclamationCircle />}
                  >
                    <List
                      withPadding
                      listStyleType="disc"
                      spacing="xs"
                      size="sm"
                    >
                      {fileValidationIssues.errors.map((error) => (
                        <List.Item key={error.id}>
                          <ValidationTranslation
                            id={error.id}
                            values={error.values}
                          />
                        </List.Item>
                      ))}
                    </List>
                  </Alert>
                ) : null}

                {fileValidationIssues.warnings?.length ? (
                  <Alert
                    variant="outline"
                    color="orange"
                    icon={<IconExclamationCircle />}
                  >
                    <List
                      withPadding
                      listStyleType="disc"
                      spacing="xs"
                      size="sm"
                    >
                      {fileValidationIssues.warnings.map((warning) => (
                        <List.Item key={warning.id}>
                          <ValidationTranslation
                            id={warning.id}
                            values={warning.values}
                          />
                        </List.Item>
                      ))}
                    </List>
                  </Alert>
                ) : null}
                <Input.Wrapper label={<Trans>Schedule</Trans>}>
                  <SubmissionScheduler
                    schedule={submission.schedule}
                    onChange={(schedule) => {
                      debouncedUpdate(schedule);
                    }}
                  />
                </Input.Wrapper>
                <ImplementedWebsiteSelect submission={submission} />
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
                      bAccount.websiteInfo.websiteDisplayName ?? bAccount.name,
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
        </ScrollArea.Autosize>
      </Card.Section>
    </Card>
  );
}
