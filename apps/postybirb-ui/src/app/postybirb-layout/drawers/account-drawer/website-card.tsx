import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
    ActionIcon,
    Box,
    Button,
    Card,
    Input,
    Popover,
    Table,
    Text,
    Title,
    Tooltip,
} from '@mantine/core';
import { IAccountDto, IWebsiteInfoDto } from '@postybirb/types';
import {
    IconEdit,
    IconLogin2,
    IconRestore,
    IconTrash,
} from '@tabler/icons-react';
import accountApi from '../../../../api/account.api';

type WebsiteCardProps = {
  accounts: IAccountDto[];
  website: IWebsiteInfoDto;
  onLogin: (
    login: { account: IAccountDto; website: IWebsiteInfoDto } | null
  ) => void;
};

const NewAccountProps = (): IAccountDto =>
  ({
    id: '',
    name: '',
    groups: [],
    state: {
      isLoggedIn: true,
      username: '-',
    },
  } as unknown as IAccountDto);

// TODO - Add function
function AccountTable(props: WebsiteCardProps) {
  const { accounts, website, onLogin } = props;
  const { _ } = useLingui();

  const accountsAndNewAccount = [...accounts, { ...NewAccountProps() }];

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
        {accountsAndNewAccount.map((account) => (
          <Table.Tr key={JSON.stringify(account)}>
            <Table.Td>
              <Input
                variant="unstyled"
                rightSection={<IconEdit size={14} />}
                defaultValue={account.name}
                placeholder={
                  account.id === ''
                    ? _(msg`Enter name to add new account`)
                    : _(msg`Name`)
                }
                onBlur={(e) => {
                  if (
                    e.target.value.trim() &&
                    e.target.value !== account.name
                  ) {
                    if (account.id === '') {
                      accountApi
                        .create({
                          name: e.target.value.trim(),
                          website: website.id,
                          groups: [],
                        })
                        .finally(() => {
                          onLogin(null);
                        });
                    } else {
                      accountApi.update(account.id, {
                        name: e.target.value.trim(),
                        groups: [],
                      });
                    }
                  }
                }}
              />
            </Table.Td>
            <Table.Td>
              <Text c={account.state.isLoggedIn ? 'green' : 'red'}>
                {account.state.isLoggedIn ? (
                  account.state.username ?? <Trans>Unknown</Trans>
                ) : (
                  <Trans>Not logged in</Trans>
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
                        accountApi.remove([account.id]).finally(() => {
                          onLogin(null);
                        });
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
                        accountApi.clear(account.id).finally(() => {
                          onLogin(null);
                        });
                      }}
                    >
                      <Trans>Clear</Trans>
                    </Button>
                  </Box>
                </Popover.Dropdown>
              </Popover>
              <Tooltip label={<Trans>Login</Trans>}>
                <ActionIcon
                  ml="lg"
                  flex="1"
                  variant="subtle"
                  onClick={() => onLogin({ account, website })}
                >
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
