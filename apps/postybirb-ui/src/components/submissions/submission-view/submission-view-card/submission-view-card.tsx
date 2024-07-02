import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Image,
  Loader,
  ScrollArea,
  Stack,
} from '@mantine/core';
import {
  AccountId,
  IAccountDto,
  IWebsiteFormFields,
  NullAccount,
  ScheduleType,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import {
  IconCalendar,
  IconCopy,
  IconEdit,
  IconSend,
  IconSquare,
  IconSquareFilled,
} from '@tabler/icons-react';
import websiteOptionsApi from '../../../../api/website-options.api';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { AccountStore } from '../../../../stores/account.store';
import { useStore } from '../../../../stores/use-store';
import { defaultTargetProvider } from '../../../../transports/http-client';
import { WebsiteOptionGroupSection } from '../../../form/website-option-form/website-option-group-section';
import { WebsiteSelect } from '../../../form/website-select/website-select';

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

  if (isLoading) {
    return <Loader />;
  }

  // TODO - Unschedule / Cancel post buttons
  // TODO - Ensure notifications are sent when post scheduled/unscheduled/sent to post, etc.
  // TODO - drag and drop to change order of submissions
  // TODO - website bar theme based off theme color (and description field)
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
          <Group gap="xs">
            <Button
              size="xs"
              variant="subtle"
              c="pink"
              leftSection={<IconCopy />}
            >
              <Trans>Duplicate</Trans>
            </Button>
            <Button size="xs" variant="subtle" leftSection={<IconEdit />}>
              <Trans>Edit</Trans>
            </Button>
            {submission.schedule.scheduleType !== ScheduleType.NONE ? (
              <Button
                disabled={submission.isQueued()}
                size="xs"
                variant="subtle"
                c="teal"
                leftSection={<IconCalendar />}
              >
                <Trans>Schedule</Trans>
              </Button>
            ) : (
              <Button
                disabled={submission.isQueued()}
                size="xs"
                variant="subtle"
                c="teal"
                leftSection={<IconSend />}
              >
                <Trans>Post</Trans>
              </Button>
            )}
          </Group>
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
