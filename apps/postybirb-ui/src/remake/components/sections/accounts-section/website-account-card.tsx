/**
 * WebsiteAccountCard - Compact card showing a website with its accounts.
 * Displays login status and allows account selection.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Paper,
  Popover,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChevronDown,
  IconChevronRight,
  IconLogin,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { memo, useCallback, useState } from 'react';
import accountApi from '../../../api/account.api';
import type { AccountRecord } from '../../../stores/records';
import type { WebsiteRecord } from '../../../stores/records/website-record';
import {
  showCreateErrorNotification,
  showCreatedNotification,
  showUpdateErrorNotification,
} from '../../../utils/notifications';
import { HoldToConfirmButton } from '../../hold-to-confirm';
import { useAccountsContext } from './context';
import { useAccountActions } from './hooks';

interface WebsiteAccountCardProps {
  /** Website record */
  website: WebsiteRecord;
  /** Accounts for this website */
  accounts: AccountRecord[];
}

/** Maximum characters allowed for account name */
const MAX_ACCOUNT_NAME_LENGTH = 24;

/**
 * Single account row within a website card.
 * Uses AccountsContext via useAccountActions hook.
 * Memoized to prevent re-renders when sibling rows or parent card re-renders.
 */
const AccountRow = memo(({ account }: { account: AccountRecord }) => {
  const {
    isSelected,
    handleSelect,
    handleLoginRequest,
    handleDelete,
    handleReset,
  } = useAccountActions(account.id);

  const [
    resetPopoverOpened,
    { open: openResetPopover, close: closeResetPopover },
  ] = useDisclosure(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(account.name);

  const onReset = useCallback(() => {
    handleReset();
    closeResetPopover();
  }, [handleReset, closeResetPopover]);

  const handleNameBlur = useCallback(async () => {
    const trimmedName = editName.trim();

    // If empty or unchanged, revert to original
    if (!trimmedName || trimmedName === account.name) {
      setEditName(account.name);
      setIsEditingName(false);
      return;
    }

    // Save the new name
    try {
      await accountApi.update(account.id, {
        name: trimmedName,
        groups: account.groups,
      });
      setIsEditingName(false);
    } catch {
      showUpdateErrorNotification(account.name);
      setEditName(account.name);
      setIsEditingName(false);
    }
  }, [editName, account.id, account.name, account.groups]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setEditName(account.name);
      setIsEditingName(false);
    }
  }, [account.name]);

  const handleNameClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
  }, []);

  return (
    <Group
      gap="xs"
      px="xs"
      py={4}
      wrap="nowrap"
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        backgroundColor: isSelected
          ? 'var(--mantine-primary-color-light)'
          : undefined,
      }}
    >
      <UnstyledButton onClick={handleSelect} style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs" wrap="nowrap">
          <IconUser size={14} style={{ opacity: 0.5, flexShrink: 0 }} />

          <Box style={{ flex: 1, minWidth: 0 }}>
            {isEditingName ? (
              <TextInput
                size="xs"
                value={editName}
                onChange={(e) =>
                  setEditName(
                    e.currentTarget.value.slice(0, MAX_ACCOUNT_NAME_LENGTH),
                  )
                }
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                autoFocus
                styles={{
                  input: {
                    minHeight: 'unset',
                    height: 'auto',
                    // eslint-disable-next-line lingui/no-unlocalized-strings
                    padding: '2px 4px',
                  },
                }}
              />
            ) : (
              <Text
                size="xs"
                truncate
                onClick={handleNameClick}
                style={{ cursor: 'text' }}
              >
                {account.name}
              </Text>
            )}
            {account.username && (
              <Text size="xs" c="dimmed" truncate>
                {account.username}
              </Text>
            )}
          </Box>

          {account.isLoggedIn ? (
            <Badge size="xs" color="green" variant="light">
              <Trans>Online</Trans>
            </Badge>
          ) : account.isPending ? (
            <Badge size="xs" color="yellow" variant="light">
              <Trans>Pending</Trans>
            </Badge>
          ) : (
            <Badge size="xs" color="gray" variant="light">
              <Trans>Offline</Trans>
            </Badge>
          )}
        </Group>
      </UnstyledButton>

      {/* Action buttons */}
      <Group gap={4} wrap="nowrap">
        {/* Login button */}
        <Tooltip label={<Trans>Login</Trans>}>
          <ActionIcon
            size="xs"
            variant="subtle"
            color="blue"
            onClick={(e) => {
              e.stopPropagation();
              handleLoginRequest();
            }}
          >
            <IconLogin size={14} />
          </ActionIcon>
        </Tooltip>

        {/* Reset button with confirmation popover */}
        <Popover
          trapFocus
          returnFocus
          withArrow
          opened={resetPopoverOpened}
          onChange={(opened) => {
            if (!opened) closeResetPopover();
          }}
          position="right"
          shadow="md"
        >
          <Popover.Target>
            <Tooltip label={<Trans>Reset account data</Trans>}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="yellow"
                onClick={(e) => {
                  e.stopPropagation();
                  openResetPopover();
                }}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              <Text size="xs" fw={500}>
                <Trans>Reset account?</Trans>
              </Text>
              <Text size="xs" c="dimmed">
                <Trans>This will clear all account data and cookies.</Trans>
              </Text>
              <Group gap="xs" justify="flex-end">
                <Button size="xs" variant="default" onClick={closeResetPopover}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button size="xs" color="yellow" onClick={onReset}>
                  <Trans>Reset</Trans>
                </Button>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>

        {/* Delete button - hold to confirm */}
        <Tooltip label={<Trans>Hold to delete</Trans>}>
          <Box onClick={(e) => e.stopPropagation()}>
            <HoldToConfirmButton
              size="xs"
              variant="subtle"
              color="red"
              onConfirm={() => handleDelete()}
            >
              <IconTrash size={14} />
            </HoldToConfirmButton>
          </Box>
        </Tooltip>
      </Group>
    </Group>
  );
});

/**
 * Compact card for a website showing its accounts.
 * Memoized to prevent re-renders when sibling cards haven't changed.
 */
export const WebsiteAccountCard = memo(({
  website,
  accounts,
}: WebsiteAccountCardProps) => {
  const { t } = useLingui();
  const { onAccountCreated } = useAccountsContext();
  // Default to collapsed if no accounts, expanded otherwise
  const [expanded, { toggle }] = useDisclosure(accounts.length > 0);
  const [addPopoverOpened, { open: openAddPopover, close: closeAddPopover }] =
    useDisclosure(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loggedInCount = accounts.filter((a) => a.isLoggedIn).length;
  const totalCount = accounts.length;

  const handleCreateAccount = useCallback(async () => {
    const trimmedName = newAccountName.trim();
    if (!trimmedName || isCreating) return;

    setIsCreating(true);
    try {
      const response = await accountApi.create({
        name: trimmedName,
        website: website.id,
        groups: [],
      });
      showCreatedNotification(trimmedName);
      setNewAccountName('');
      closeAddPopover();
      // Select the newly created account
      onAccountCreated(response.body.id);
    } catch {
      showCreateErrorNotification(trimmedName);
    } finally {
      setIsCreating(false);
    }
  }, [newAccountName, isCreating, website.id, closeAddPopover, onAccountCreated]);

  const handleAddKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateAccount();
    } else if (e.key === 'Escape') {
      setNewAccountName('');
      closeAddPopover();
    }
  }, [handleCreateAccount, closeAddPopover]);

  return (
    <Paper withBorder radius="sm" p={0}>
      {/* Website header */}
      <UnstyledButton onClick={toggle} style={{ width: '100%' }}>
        <Group gap="xs" px="sm" py="xs" wrap="nowrap">
          {expanded ? (
            <IconChevronDown size={14} style={{ flexShrink: 0 }} />
          ) : (
            <IconChevronRight size={14} style={{ flexShrink: 0 }} />
          )}

          <Text size="sm" fw={500} style={{ flex: 1 }} truncate>
            {website.displayName}
          </Text>

          <Badge size="xs" variant="light">
            {loggedInCount}/{totalCount}
          </Badge>
        </Group>
      </UnstyledButton>

      {/* Accounts list */}
      <Collapse in={expanded}>
        <Stack gap={2} pb="xs" px="xs">
          {accounts.length === 0
            ? null
            : accounts.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}

          {/* Add account button with popover form */}
          <Popover
            opened={addPopoverOpened}
            onClose={closeAddPopover}
            position="bottom-start"
            withArrow
            shadow="md"
          >
            <Popover.Target>
              <UnstyledButton onClick={openAddPopover}>
                <Group gap="xs" px="xs" py={4}>
                  <IconPlus size={14} style={{ opacity: 0.5 }} />
                  <Text size="xs" c="dimmed">
                    <Trans>Add account</Trans>
                  </Text>
                </Group>
              </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs">
                <Text size="xs" fw={500}>
                  <Trans>New account</Trans>
                </Text>
                <TextInput
                  size="xs"
                  placeholder={t`Account name`}
                  value={newAccountName}
                  onChange={(e) =>
                    setNewAccountName(
                      e.currentTarget.value.slice(0, MAX_ACCOUNT_NAME_LENGTH),
                    )
                  }
                  onKeyDown={handleAddKeyDown}
                  autoFocus
                  disabled={isCreating}
                />
                <Group gap="xs" justify="flex-end">
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => {
                      setNewAccountName('');
                      closeAddPopover();
                    }}
                    disabled={isCreating}
                  >
                    <Trans>Cancel</Trans>
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleCreateAccount}
                    disabled={!newAccountName.trim() || isCreating}
                    loading={isCreating}
                  >
                    <Trans>Create</Trans>
                  </Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Stack>
      </Collapse>
    </Paper>
  );
});
