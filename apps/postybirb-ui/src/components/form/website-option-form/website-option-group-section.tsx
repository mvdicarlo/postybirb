import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
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
  top?: number;
  onRemoveAccount?: (account: IAccountDto) => void;
};

export function WebsiteOptionGroupSection(
  props: WebsiteOptionGroupSectionProps,
) {
  const { top, options, submission, account, onRemoveAccount } = props;
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
    <Box className="postybirb__group-section" group-id={account.id}>
      <Paper pos="sticky" top={top ?? 0} style={{ zIndex: 99 }}>
        <Title p="4" order={4}>
          {accountName}
        </Title>
      </Paper>
      <Space h="4" />
      <Stack>
        {options.map((option) => (
          <Box
            key={option.id}
            id={option.id}
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
                  top={top ?? 0}
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
