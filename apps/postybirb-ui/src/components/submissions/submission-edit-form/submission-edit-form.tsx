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
          label: (
            <Text fw={600}>
              {account.websiteInfo.websiteDisplayName ?? <Trans>Unknown</Trans>}
            </Text>
          ),
          children: group.options.map((o) => {
            const validation = submission.validations.find(
              (v) => v.id === o.id,
            );
            const hasErrors = !!validation?.errors?.length;
            const hasWarnings = !!validation?.warnings?.length;
            return {
              label: (
                <Group gap="xs" wrap="nowrap">
                  {hasErrors ? (
                    <IconExclamationCircle size="1rem" color="red" />
                  ) : hasWarnings ? (
                    <IconAlertTriangle size="1rem" color="orange" />
                  ) : null}
                  <Text size="sm" truncate>
                    {account.name}
                  </Text>
                </Group>
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
      <Box pos="sticky" top={top} h="fit-content" style={{ width: '200px' }}>
        <Paper withBorder m="md" p="md" shadow="sm">
          <Stack gap="xs">
            <Text fw={700} ta="center">
              <Trans>Sections</Trans>
            </Text>
            <Tree
              tree={tree}
              data={navTree}
              selectOnClick
              // style={{ maxHeight: 'calc(100vh - 180px)', overflow: 'auto' }}
              renderNode={({
                node,
                expanded,
                hasChildren,
                elementProps,
                level,
              }) => (
                <Group
                  gap={5}
                  {...elementProps}
                  style={{
                    ...elementProps.style,
                    // eslint-disable-next-line lingui/no-unlocalized-strings
                    padding: '6px 8px',
                    borderRadius: '4px',
                    marginLeft: level > 1 ? `${level * 6}px` : 0,
                    '&[data-selected="true"]': {
                      backgroundColor: 'var(--mantine-color-blue-1)',
                      fontWeight: 500,
                    },
                  }}
                >
                  {hasChildren && (
                    <IconChevronDown
                      size={18}
                      style={{
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        // eslint-disable-next-line lingui/no-unlocalized-strings
                        transition: 'transform 200ms ease',
                      }}
                    />
                  )}

                  {!hasChildren && level > 0 && (
                    <Box w={18} /> // Empty space for alignment when no chevron
                  )}

                  <Box
                    component="span"
                    style={{ cursor: hasChildren ? 'default' : 'pointer' }}
                    onClick={(e) => {
                      if (!hasChildren) {
                        e.stopPropagation();
                        const el = document.getElementById(node.value);
                        el?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                          inline: 'nearest',
                        });
                      }
                    }}
                  >
                    {node.label}
                  </Box>
                </Group>
              )}
            />
          </Stack>
        </Paper>
      </Box>
    </Flex>
  );
}
