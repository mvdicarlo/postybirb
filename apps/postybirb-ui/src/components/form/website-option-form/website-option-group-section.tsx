import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Space,
  Stack,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  EntityId,
  IAccountDto,
  NULL_ACCOUNT_ID,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { WebsiteOptionForm } from './website-option-form';

type WebsiteOptionGroupSectionProps = {
  options: WebsiteOptionsDto[];
  submission: SubmissionDto;
  account: IAccountDto;
  onRemoveAccount?: (account: IAccountDto) => void;
};

export function WebsiteOptionGroupSection(
  props: WebsiteOptionGroupSectionProps
) {
  const { options, submission, account, onRemoveAccount } = props;
  const [userSpecifiedModalVisible, setUserSpecifiedModalVisible] = useState<
    Record<EntityId, boolean>
  >({});

  const isDefaultAccount = account.id === NULL_ACCOUNT_ID;
  const accountName = isDefaultAccount ? (
    <Group>
      <span>
        <Trans>Default</Trans>
      </span>

      <Tooltip
        label={
          <Trans>
            Save current form values as the default values for future
            submissions
          </Trans>
        }
      >
        <Button variant="subtle">
          <Trans>Save defaults</Trans>
        </Button>
      </Tooltip>
    </Group>
  ) : (
    <span>{account.websiteInfo.websiteDisplayName}</span>
  );

  return (
    <Box>
      <Title
        p="4"
        order={4}
        pos="sticky"
        top={0}
        style={{ zIndex: 99, borderRadius: 4 }}
        bg="var(--mantine-color-gray-9)"
      >
        {accountName}
      </Title>
      <Space h="4" />
      <Stack>
        {options.map((option) => (
          <Box
            style={{
              marginLeft: isDefaultAccount
                ? 0
                : account.websiteInfo.websiteDisplayName.length * 7 + 24,
            }}
          >
            {!isDefaultAccount ? (
              <>
                <Title
                  order={5}
                  c={account.state.isLoggedIn ? 'green' : 'red'}
                  pos="sticky"
                  top={0}
                  style={{ zIndex: 99 }}
                >
                  <Group>
                    <div>
                      {account.name} (
                      {account.state.username ?? <Trans>Not logged in</Trans>})
                    </div>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() =>
                        onRemoveAccount ? onRemoveAccount(account) : null
                      }
                    >
                      <IconX />
                    </ActionIcon>
                    <Tooltip
                      label={
                        <Trans>
                          Save current form values as the default values for
                          future submissions
                        </Trans>
                      }
                    >
                      <Button
                        variant="subtle"
                        onClick={() =>
                          setUserSpecifiedModalVisible({
                            ...userSpecifiedModalVisible,
                            [option.id]: true,
                          })
                        }
                      >
                        <Trans>Save defaults</Trans>
                      </Button>
                    </Tooltip>
                  </Group>
                </Title>
                <Space h="xs" />
              </>
            ) : null}
            <WebsiteOptionForm
              key={option.id}
              option={option}
              submission={submission}
              userSpecifiedModalVisible={!!userSpecifiedModalVisible[option.id]}
              onUserSpecifiedModalClosed={() =>
                setUserSpecifiedModalVisible({
                  ...userSpecifiedModalVisible,
                  [option.id]: false,
                })
              }
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
