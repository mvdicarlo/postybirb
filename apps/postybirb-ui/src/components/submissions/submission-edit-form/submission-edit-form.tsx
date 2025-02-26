import { Trans } from '@lingui/macro';
import {
  Box,
  Flex,
  Group,
  Input,
  Loader,
  Paper,
  Stack,
  Text,
  Tree,
  TreeNodeData,
  useTree,
} from '@mantine/core';
import {
  AccountId,
  FileSubmissionMetadata,
  IAccountDto,
  ISubmissionScheduleInfo,
  NullAccount,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconExclamationCircle,
} from '@tabler/icons-react';
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

type SubmissionEditFormProps = {
  submission: SubmissionDto;
};

export function SubmissionEditForm(props: SubmissionEditFormProps) {
  const { submission } = props;
  const { state: accounts, isLoading } = useStore(AccountStore);

  const defaultOption = submission.getDefaultOptions();
  const isSpecialSubmissionType =
    submission.isMultiSubmission || submission.isTemplate;
  const top = 109;

  const optionsGroupedByWebsiteId = useMemo(
    () =>
      Object.entries(
        submission.options
          .filter((o) => !o.isDefault)
          .reduce(
            (acc, option) => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const account = accounts.find((a) => a.id === option.accountId)!;
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
          children: group.options.map((o) => {
            const validation = submission.validations.find(
              (v) => v.id === o.id,
            );
            const hasErrors = !!validation?.errors?.length;
            const hasWarnings = !!validation?.warnings?.length;
            return {
              label: (
                <Box display="flex">
                  {hasErrors && (
                    <Text flex="1" size="lg" c="red">
                      <IconExclamationCircle size="1rem" />
                    </Text>
                  )}
                  {hasWarnings && (
                    <Text flex="1" size="lg" c="orange">
                      <IconAlertTriangle size="1rem" />
                    </Text>
                  )}
                  <Text ml={4}>{account.name}</Text>
                </Box>
              ),
              value: o.id,
            };
          }),
        };
      }),
    ],
    [defaultOption.id, optionsGroupedByWebsiteId, submission.validations],
  );

  const tree = useTree({
    initialExpandedState: navTree.reduce(
      (acc, node) => ({ ...acc, [node.value]: true }),
      {},
    ),
  });

  const removeAccount = (account: IAccountDto) => {
    const optionToDelete = submission.options
      .filter((o) => !o.isDefault)
      .find((o) => o.accountId === account.id);
    if (optionToDelete) {
      websiteOptionsApi.remove([optionToDelete.id]);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdate = useCallback(
    debounce((schedule: ISubmissionScheduleInfo) => {
      submissionApi.update(submission.id, {
        isScheduled: isSpecialSubmissionType ? false : submission.isScheduled,
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
