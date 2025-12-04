import { Plural, Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Card,
  Flex,
  Group,
  Input,
  List,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Title,
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
  IconCalendarEvent,
  IconExclamationCircle,
  IconSquare,
  IconSquareFilled,
} from '@tabler/icons-react';
import { debounce } from 'lodash';
import moment from 'moment/min/moment-with-locales';
import React, { useCallback } from 'react';
import submissionApi from '../../../../api/submission.api';
import websiteOptionsApi from '../../../../api/website-options.api';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { AccountStore } from '../../../../stores/account.store';
import { useStore } from '../../../../stores/use-store';
import { CommonTranslations } from '../../../../translations/common-translations';
import { ComponentErrorBoundary } from '../../../error-boundary/specialized-error-boundaries';
import { WebsiteOptionGroupSection } from '../../../form/website-option-form/website-option-group-section';
import { ImplementedWebsiteSelect } from '../../../form/website-select/implemented-website-select';
import { UpdateOnLanguageChange } from '../../../translations/update-on-language-change';
import { ValidationTranslation } from '../../../translations/validation-translation';
import { SubmissionFilePreview } from '../../submission-file-preview/submission-file-preview';
import { SubmissionScheduler } from '../../submission-scheduler/submission-scheduler';
import { SubmissionViewCardActions } from './submission-view-card-actions';

type SubmissionViewCardProps = {
  submission: SubmissionDto;
  onSelect(submission: SubmissionDto): void;
  isSelected: boolean;
};

function SubmissionViewCardComponent(props: SubmissionViewCardProps) {
  const { isLoading, state: accounts } = useStore(AccountStore);
  const { submission, onSelect, isSelected } = props;
  const { type } = submission;
  const { files } = submission;
  const defaultOption = submission.getDefaultOptions();
  const title = defaultOption.data.title || <CommonTranslations.Unknown />;

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
          acc[websiteId] = { account, options: [] };
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
    const option = submission.options.find((o) => o.accountId === account.id);
    if (option && !option.isDefault) {
      websiteOptionsApi.remove([option.id]);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdate = useCallback(
    debounce((schedule: ISubmissionScheduleInfo) => {
      submissionApi.update(submission.id, {
        isScheduled: submission.isScheduled,
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

  const lastEdited = submission.options.sort((a, b) =>
    a.updatedAt > b.updatedAt ? -1 : 1,
  )[0];

  const isScheduled =
    submission.isScheduled && submission.schedule.scheduleType !== 'NONE';
  const isQueued = submission.isQueued();
  const hasWebsiteOptions =
    submission.options.filter((o) => !o.isDefault).length > 0;

  return (
    <Card
      shadow="sm"
      withBorder={isSelected}
      style={{
        contentVisibility: 'auto',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        transition: 'all 0.2s ease',
        transform: isSelected ? 'translateY(-2px)' : 'none',
        borderColor: isSelected ? 'var(--mantine-color-blue-5)' : undefined,
        borderWidth: isSelected ? '2px' : '1px',
      }}
      className={
        isQueued
          ? 'submission-card-queued'
          : isScheduled
            ? 'submission-card-scheduled'
            : ''
      }
    >
      <Card.Section
        bg={
          isQueued
            ? 'rgba(0,128,128,0.1)'
            : isScheduled
              ? 'rgba(0,100,200,0.05)'
              : 'rgba(0,0,0,0.05)'
        }
        py="xs"
        style={{
          // eslint-disable-next-line lingui/no-unlocalized-strings
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <Flex align="center" justify="space-between">
          <Group ml={8}>
            <IconArrowsMove
              className="sort-handle"
              style={{ cursor: 'move' }}
              size={16}
              opacity={0.5}
            />
            <ActionIcon
              c="var(--mantine-color-text)"
              variant="transparent"
              onClick={() => onSelect(submission)}
            >
              {isSelected ? (
                <IconSquareFilled size={18} />
              ) : (
                <IconSquare size={18} />
              )}
            </ActionIcon>
          </Group>

          <Group gap="xs" mr={8}>
            {isQueued && (
              <Badge color="teal" size="sm" variant="filled">
                <Trans>Queued</Trans>
              </Badge>
            )}
            {isScheduled && (
              <Badge
                color="blue"
                size="sm"
                variant="outline"
                leftSection={<IconCalendarEvent size={12} />}
              >
                <Trans>Scheduled</Trans>
              </Badge>
            )}
            {!hasWebsiteOptions && (
              <Badge color="orange" size="sm">
                <Trans>No websites</Trans>
              </Badge>
            )}
          </Group>
        </Flex>
      </Card.Section>

      <Card.Section p="sm">
        <Flex>
          {type === SubmissionType.FILE && files.length ? (
            <Box mr="sm">
              <SubmissionFilePreview file={files[0]} height={75} width={75} />
            </Box>
          ) : null}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Title order={4} lineClamp={1}>
              {title}
            </Title>
            <Group p="apart" mb={4}>
              <Text
                size="xs"
                fs="italic"
                c="dimmed"
                title={new Date(lastEdited.updatedAt).toLocaleString()}
              >
                <Trans>Last modified</Trans>:{' '}
                <UpdateOnLanguageChange
                  render={() => moment(lastEdited.updatedAt).fromNow()}
                />
              </Text>

              <Text size="xs">
                {Object.keys(optionsGroupedByWebsiteId).length}{' '}
                <Plural
                  value={Object.keys(optionsGroupedByWebsiteId).length}
                  one="website"
                  other="websites"
                />
              </Text>
            </Group>
            {files.length > 1 ? (
              <Group
                className="submission-card-additional-files"
                gap={4}
                wrap="nowrap"
                style={{
                  overflowX: 'auto',
                  maxWidth: '100%',
                  // Hide scrollbar in Webkit while still scrollable
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {files.slice(1).map((f) => (
                  <SubmissionFilePreview
                    key={f.id}
                    file={f}
                    height={32}
                    width={32}
                  />
                ))}
              </Group>
            ) : null}
          </Box>

          <SubmissionViewCardActions submission={submission} />
        </Flex>
      </Card.Section>

      <Card.Section px="sm" pb="sm">
        <ComponentErrorBoundary>
          <ScrollArea.Autosize mah={400} px={0}>
            <Stack gap="xs">
              {fileValidationIssues.errors?.length ? (
                <Alert
                  variant="outline"
                  color="red"
                  icon={<IconExclamationCircle />}
                  radius="md"
                  p="xs"
                >
                  <List withPadding listStyleType="disc" spacing="xs" size="sm">
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
                  radius="md"
                  p="xs"
                >
                  <List withPadding listStyleType="disc" spacing="xs" size="sm">
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
              <Box py="md">
                <ImplementedWebsiteSelect submission={submission} />
              </Box>
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
          </ScrollArea.Autosize>
        </ComponentErrorBoundary>
      </Card.Section>
    </Card>
  );
}

// Memoize the card component to prevent unnecessary re-renders by comparing updatedOn properties
export const SubmissionViewCard = React.memo(
  SubmissionViewCardComponent,
  (prevProps, nextProps) => {
    // Return true if we should NOT re-render
    // Different selection state always causes re-render
    if (prevProps.isSelected !== nextProps.isSelected) {
      return false;
    }

    // Check if the submission ID is different
    if (prevProps.submission.id !== nextProps.submission.id) {
      return false;
    }

    // Compare the submission's updatedAt
    if (prevProps.submission.updatedAt !== nextProps.submission.updatedAt) {
      return false;
    }

    if (prevProps.submission.isQueued() !== nextProps.submission.isQueued()) {
      return false;
    }

    // Check if any options have been added or removed
    const prevOptionIds = new Set(
      prevProps.submission.options.map((opt) => opt.id),
    );
    const nextOptionIds = new Set(
      nextProps.submission.options.map((opt) => opt.id),
    );

    // If the sets of IDs are not equal, re-render
    if (prevOptionIds.size !== nextOptionIds.size) {
      return false;
    }

    // Check if every ID in nextOptionIds exists in prevOptionIds
    for (const id of nextOptionIds) {
      if (!prevOptionIds.has(id)) {
        return false;
      }
    }

    // Compare the updatedAt of all options to see if any have changed
    const prevOptionsUpdateTimes = new Map(
      prevProps.submission.options.map((opt) => [opt.id, opt.updatedAt]),
    );
    for (const option of nextProps.submission.options) {
      const prevTime = prevOptionsUpdateTimes.get(option.id);
      if (!prevTime || prevTime !== option.updatedAt) {
        return false;
      }
    }

    // If we got here, nothing important changed, don't re-render
    return true;
  },
);
