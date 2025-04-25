import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Divider,
  Flex,
  Grid,
  Group,
  Input,
  Popover,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IAccountDto, IWebsiteInfoDto } from '@postybirb/types';
import {
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconLogin2,
  IconPlus,
  IconRestore,
} from '@tabler/icons-react';
import { useState } from 'react';
import accountApi from '../../../../api/account.api';
import { DeleteActionPopover } from '../../../../components/shared/delete-action-popover/delete-action-popover';

type OnLoginProps = (
  login: { account: IAccountDto; website: IWebsiteInfoDto } | null,
) => void;

type WebsiteCardProps = {
  accounts: IAccountDto[];
  website: IWebsiteInfoDto;
  onLogin: OnLoginProps;
};

type AccountItemProps = {
  account: IAccountDto;
  website: IWebsiteInfoDto;
  onLogin: OnLoginProps;
};

function AccountItem({ account, website, onLogin }: AccountItemProps) {
  const { _ } = useLingui();
  const [accountName, setAccountName] = useState(account.name);

  const handleNameSave = () => {
    if (accountName.trim() && accountName !== account.name) {
      accountApi.update(account.id, {
        name: accountName.trim(),
        groups: [],
      });
    }
  };

  return (
    <Grid
      gutter={0}
      align="center"
      py="xs"
      // eslint-disable-next-line lingui/no-unlocalized-strings
      style={{ borderBottom: '1px solid var(--mantine-color-gray-7)' }}
    >
      <Grid.Col span={5}>
        <Input
          pl=".5em"
          variant="unstyled"
          size="xs"
          value={accountName}
          onChange={(e) => setAccountName(e.currentTarget.value)}
          placeholder={_(msg`Name`)}
          onBlur={handleNameSave}
          leftSection={<IconEdit size={14} color="gray" />}
          styles={{
            input: {
              fontWeight: 500,
              minHeight: 'auto',
              height: 'auto',
            },
          }}
        />
      </Grid.Col>

      <Grid.Col span={4}>
        <Badge
          size="xs"
          color={account.state.isLoggedIn ? 'green' : 'red'}
          variant="dot"
        >
          {account.state.isLoggedIn ? (
            (account.state.username ?? <Trans>Unknown</Trans>)
          ) : (
            <Trans>Not logged in</Trans>
          )}
        </Badge>
      </Grid.Col>

      <Grid.Col span={3}>
        <Group gap={4} p="right">
          <Tooltip label={<Trans>Login</Trans>}>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="blue"
              onClick={() => onLogin({ account, website })}
            >
              <IconLogin2 size={16} />
            </ActionIcon>
          </Tooltip>

          <Popover position="bottom" withArrow shadow="sm">
            <Popover.Target>
              <Tooltip label={<Trans>Reset</Trans>}>
                <ActionIcon size="sm" variant="subtle" color="orange">
                  <IconRestore size={16} />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown py="xs" px="sm">
              <Text size="xs" fw={500} mb="xs">
                <Trans>
                  This will clear all data associated with this account. You
                  will need to log in again.
                </Trans>
              </Text>
              <Button
                size="xs"
                variant="light"
                color="red"
                fullWidth
                onClick={() => {
                  accountApi.clear(account.id).finally(() => {
                    onLogin(null);
                  });
                }}
              >
                <Trans>Clear Account</Trans>
              </Button>
            </Popover.Dropdown>
          </Popover>

          <DeleteActionPopover
            onDelete={() => {
              accountApi.remove([account.id]).finally(() => {
                onLogin(null);
              });
            }}
            showText={false}
          />
        </Group>
      </Grid.Col>
    </Grid>
  );
}

function NewAccountItem({
  website,
}: Pick<AccountItemProps, 'website' | 'onLogin'>) {
  const { _ } = useLingui();
  const [isAdding, setIsAdding] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');

  if (!isAdding) {
    return (
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={() => setIsAdding(true)}
        fullWidth
        mt="xs"
      >
        <Trans>Add Account</Trans>
      </Button>
    );
  }

  const handleAddAccount = () => {
    if (newAccountName.trim()) {
      accountApi
        .create({
          name: newAccountName.trim(),
          website: website.id,
          groups: [],
        })
        .then(() => {
          setNewAccountName('');
          setIsAdding(false);
        });
    } else {
      setIsAdding(false);
    }
  };

  return (
    <Box mt="xs">
      <Grid gutter={5}>
        <Grid.Col span={7}>
          <Input
            size="xs"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.currentTarget.value)}
            placeholder={_(msg`Enter account name`)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddAccount();
              } else if (e.key === 'Escape') {
                setIsAdding(false);
              }
            }}
          />
        </Grid.Col>
        <Grid.Col span={5}>
          <Group gap={5} grow>
            <Button size="xs" onClick={handleAddAccount}>
              <Trans>Add</Trans>
            </Button>
            <Button
              size="xs"
              variant="subtle"
              onClick={() => setIsAdding(false)}
            >
              <Trans>Cancel</Trans>
            </Button>
          </Group>
        </Grid.Col>
      </Grid>
    </Box>
  );
}

export function WebsiteCard(props: WebsiteCardProps) {
  const { website, accounts, onLogin } = props;
  const [opened, { toggle }] = useDisclosure(true);
  const loggedInAccounts = accounts.filter(
    (account) => account.state.isLoggedIn,
  );

  return (
    <Card withBorder shadow="xs" radius="md" p="xs">
      <Flex
        justify="space-between"
        align="center"
        onClick={toggle}
        style={{ cursor: 'pointer' }}
      >
        <Group gap={8}>
          <Text fw={600} size="sm" lineClamp={1} style={{ maxWidth: 200 }}>
            {website.displayName}
          </Text>
          <Group gap={4}>
            <Badge size="xs" variant="outline">
              {accounts.length}
            </Badge>
            {loggedInAccounts.length > 0 && (
              <Badge size="xs" variant="filled" color="green">
                {loggedInAccounts.length}/{accounts.length}
              </Badge>
            )}
          </Group>
        </Group>
        <ActionIcon variant="subtle" size="sm">
          {opened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </ActionIcon>
      </Flex>

      <Collapse in={opened}>
        <Divider my="xs" />

        {accounts.length > 0 ? (
          <>
            <Grid gutter={0} mb="xs">
              <Grid.Col span={5}>
                <Text size="xs" c="dimmed" fw={500} pl={5}>
                  <Trans>Account Name</Trans>
                </Text>
              </Grid.Col>
              <Grid.Col span={4}>
                <Text size="xs" c="dimmed" fw={500}>
                  <Trans>Status</Trans>
                </Text>
              </Grid.Col>
              <Grid.Col span={3}>
                <Text size="xs" c="dimmed" fw={500} ta="center" pr={5}>
                  <Trans>Actions</Trans>
                </Text>
              </Grid.Col>
            </Grid>

            <Divider mb="xs" />

            <Box
              style={{
                backgroundColor: 'var(--mantine-color-body)',
                borderRadius: 'var(--mantine-radius-sm)',
              }}
            >
              {accounts.map((account) => (
                <AccountItem
                  key={account.id}
                  account={account}
                  website={website}
                  onLogin={onLogin}
                />
              ))}
            </Box>
          </>
        ) : (
          <Text size="xs" c="dimmed" ta="center" py="xs">
            <Trans>No accounts added yet</Trans>
          </Text>
        )}

        <NewAccountItem website={website} onLogin={onLogin} />
      </Collapse>
    </Card>
  );
}
