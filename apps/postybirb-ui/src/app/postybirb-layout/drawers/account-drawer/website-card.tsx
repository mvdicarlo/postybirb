import { Trans } from '@lingui/macro';
import {
    ActionIcon,
    Box,
    Button,
    Card,
    Popover,
    Table,
    Text,
    Title,
    Tooltip,
} from '@mantine/core';
import { IAccountDto } from '@postybirb/types';
import { IconLogin2, IconRestore, IconTrash } from '@tabler/icons-react';
import accountApi from '../../../../api/account.api';
import { DisplayableWebsiteLoginInfo } from '../../../../models/displayable-website-login-info';

type WebsiteCardProps = {
  accounts: IAccountDto[];
  website: DisplayableWebsiteLoginInfo;
};

// TODO - Add function
// TODO - Rename function
function AccountTable(props: Pick<WebsiteCardProps, 'accounts'>) {
  const { accounts } = props;
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <Trans>Name</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Logged In As</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Actions</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {accounts.map((account) => (
          <Table.Tr key={account.id}>
            <Table.Td>{account.name}</Table.Td>
            <Table.Td>
              <Text c={account.state.isLoggedIn ? 'green' : 'red'}>
                {account.state.isLoggedIn ? (
                  account.state.username ?? <Trans>Unknown</Trans>
                ) : (
                  <Trans>Username</Trans>
                )}
              </Text>
            </Table.Td>
            <Table.Td w="135">
              <Popover position="bottom" withArrow>
                <Popover.Target>
                  <Tooltip label={<Trans>Delete</Trans>}>
                    <ActionIcon flex="1" variant="subtle" c="red">
                      <IconTrash />
                    </ActionIcon>
                  </Tooltip>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text c="orange" size="lg">
                    <Trans>
                      Are you sure you want to delete this? This action cannot
                      be undone.
                    </Trans>
                  </Text>
                  <Box ta="center" mt="sm">
                    <Button
                      variant="light"
                      color="red"
                      leftSection={<IconTrash />}
                      onClick={() => {
                        accountApi.remove([account.id]);
                      }}
                    >
                      <Trans>Delete</Trans>
                    </Button>
                  </Box>
                </Popover.Dropdown>
              </Popover>
              <Popover position="bottom" withArrow>
                <Popover.Target>
                  <Tooltip label={<Trans>Reset</Trans>}>
                    <ActionIcon ml="xs" flex="1" variant="subtle" c="orange">
                      <IconRestore />
                    </ActionIcon>
                  </Tooltip>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text c="orange" size="lg">
                    <Trans>
                      This will clear all data associated with this account. You
                      will need to log in again.
                    </Trans>
                  </Text>
                  <Box ta="center" mt="sm">
                    <Button
                      variant="light"
                      color="red"
                      leftSection={<IconRestore />}
                      onClick={() => {
                        accountApi.clear(account.id);
                      }}
                    >
                      <Trans>Clear</Trans>
                    </Button>
                  </Box>
                </Popover.Dropdown>
              </Popover>
              <Tooltip label={<Trans>Login</Trans>}>
                <ActionIcon ml="lg" flex="1" variant="subtle">
                  <IconLogin2 />
                </ActionIcon>
              </Tooltip>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export function WebsiteCard(props: WebsiteCardProps) {
  const { website } = props;
  return (
    <Card withBorder>
      <Card.Section>
        <Title ml="6" order={3}>
          {website.displayName}
        </Title>
      </Card.Section>
      <Card.Section>
        <AccountTable {...props} />
      </Card.Section>
    </Card>
  );
}
