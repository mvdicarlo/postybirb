import { Trans } from '@lingui/macro';
import {
  Box,
  Flex,
  Group,
  Input,
  Loader,
  Paper,
  Stack,
  Tree,
  TreeNodeData,
  useTree,
} from '@mantine/core';
import {
  AccountId,
  FileSubmissionMetadata,
  IAccountDto,
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
  NullAccount,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { IconChevronDown } from '@tabler/icons-react';
import { debounce } from 'lodash';
import { useCallback, useMemo } from 'react';
import submissionApi from '../../../api/submission.api';
import websiteOptionsApi from '../../../api/website-options.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { AccountStore } from '../../../stores/account.store';
import { useStore } from '../../../stores/use-store';
import { WebsiteOptionGroupSection } from '../../form/website-option-form/website-option-group-section';
import { WebsiteSelect } from '../../form/website-select/website-select';
import SubmissionScheduler from '../submission-scheduler/submission-scheduler';
import { SubmissionFileManager } from './submission-file-manager/submission-file-manager';

type SubmissionEditForm2Props = {
  submission: SubmissionDto;
};

export function SubmissionEditForm2(props: SubmissionEditForm2Props) {
  const { submission } = props;
  const { state: accounts, isLoading } = useStore(AccountStore);

  const defaultOption = submission.getDefaultOptions();
  const isTemplate = submission.isTemplate();
  const top = 109;

  const optionsGroupedByWebsiteId = useMemo(
    () =>
      Object.entries(
        submission.options
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
          }, {} as Record<AccountId, { account: IAccountDto; options: WebsiteOptionsDto[] }>)
      ).sort((a, b) => {
        const aAccount = a[1].account;
        const bAccount = b[1].account;
        return (
          aAccount.websiteInfo.websiteDisplayName ?? aAccount.name
        ).localeCompare(
          bAccount.websiteInfo.websiteDisplayName ?? bAccount.name
        );
      }),
    [submission.options, accounts]
  );

  const navTree: TreeNodeData[] = useMemo(
    () => [
      {
        value: defaultOption.id,
        label: <Trans>Default</Trans>,
      },
      ...optionsGroupedByWebsiteId.map(([, group]) => {
        const { account } = group;
        return {
          value: account.id,
          label: account.websiteInfo.websiteDisplayName ?? (
            <Trans>Unknown</Trans>
          ),
          children: group.options.map((o) => ({
            label: account.name,
            value: o.id,
          })),
        };
      }),
    ],
    [defaultOption.id, optionsGroupedByWebsiteId]
  );

  const tree = useTree({
    initialExpandedState: navTree.reduce(
      (acc, node) => ({ ...acc, [node.value]: true }),
      {}
    ),
  });

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

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Flex>
      <Stack gap="xs" flex="11">
        {!isTemplate && submission.type === SubmissionType.FILE ? (
          <SubmissionFileManager
            submission={submission as SubmissionDto<FileSubmissionMetadata>}
          />
        ) : null}
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
      <Box pos="sticky" top={top} h="fit-content">
        <Paper withBorder m="md" p="md">
          <Tree
            tree={tree}
            data={navTree}
            selectOnClick
            renderNode={({ node, expanded, hasChildren, elementProps }) => (
              <Group gap={5} {...elementProps}>
                {hasChildren && (
                  <IconChevronDown
                    size={18}
                    style={{
                      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                )}

                <span
                  onClickCapture={() => {
                    if (!hasChildren) {
                      const el = document.getElementById(node.value);
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  {node.label}
                </span>
              </Group>
            )}
          />
        </Paper>
      </Box>
    </Flex>
  );
}
