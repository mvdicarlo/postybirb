import { Trans, t } from '@lingui/react/macro';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tree,
  TreeNodeData,
  useTree,
} from '@mantine/core';
import { IAccountDto, NULL_ACCOUNT_ID, SubmissionType } from '@postybirb/types';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWebsites } from '../../../hooks/account/use-websites';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

type WebsiteSelectProps = {
  submission: SubmissionDto;
  onSelect(accounts: IAccountDto[]): void;
};

export function WebsiteSelect(props: WebsiteSelectProps) {
  const { submission, onSelect } = props;
  const { accounts, filteredAccounts } = useWebsites();
  const [value, setValue] = useState<string[]>(
    submission.options
      .filter((o) => o.accountId !== NULL_ACCOUNT_ID)
      .map((o) => o.accountId),
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Sync value with submission.options when it changes externally
  useEffect(() => {
    const newValue = submission.options
      .filter((o) => o.accountId !== NULL_ACCOUNT_ID)
      .map((o) => o.accountId);
    setValue(newValue);
  }, [submission.options]);

  const websiteGroups = useMemo(
    () =>
      filteredAccounts
        .filter((website) => {
          if (submission.type === SubmissionType.MESSAGE) {
            return website.supportsMessage;
          }
          if (submission.type === SubmissionType.FILE) {
            return website.supportsFile;
          }
          return false;
        })
        .map((website) => ({
          id: website.id,
          displayName: website.displayName,
          accounts: website.accounts,
        }))
        .filter((website) => website.accounts.length > 0),
    [filteredAccounts, submission.type],
  );

  const allAccountIds = useMemo(
    () => websiteGroups.flatMap((w) => w.accounts.map((a) => a.id)),
    [websiteGroups],
  );

  const handleChange = useCallback(
    (newValue: string[]) => {
      setValue(newValue);
      const selectedAccounts = accounts.filter((a) => newValue.includes(a.id));
      onSelect(selectedAccounts);
    },
    [accounts, onSelect],
  );

  const handleSelectAll = useCallback(() => {
    const isAllSelected = value.length === allAccountIds.length;
    const newValue = isAllSelected ? [] : allAccountIds;
    handleChange(newValue);
  }, [value.length, allAccountIds, handleChange]);

  const handleGroupToggle = useCallback(
    (groupAccountIds: string[]) => {
      const allGroupSelected = groupAccountIds.every((id) =>
        value.includes(id),
      );
      const newValue = allGroupSelected
        ? value.filter((id) => !groupAccountIds.includes(id))
        : [...new Set([...value, ...groupAccountIds])];
      handleChange(newValue);
    },
    [value, handleChange],
  );

  const handleAccountToggle = useCallback(
    (accountId: string) => {
      const newValue = value.includes(accountId)
        ? value.filter((id) => id !== accountId)
        : [...value, accountId];
      handleChange(newValue);
    },
    [value, handleChange],
  );

  const getGroupSelectionState = useCallback(
    (groupAccountIds: string[]) => {
      const selectedCount = groupAccountIds.filter((id) =>
        value.includes(id),
      ).length;
      if (selectedCount === 0) return 'none';
      if (selectedCount === groupAccountIds.length) return 'all';
      return 'some';
    },
    [value],
  );

  // Filter websites based on search query
  const filteredWebsiteGroups = useMemo(() => {
    if (!searchQuery.trim()) return websiteGroups;

    const query = searchQuery.toLowerCase();
    return websiteGroups
      .map((group) => ({
        ...group,
        accounts: group.accounts.filter(
          (account) =>
            account.name.toLowerCase().includes(query) ||
            group.displayName.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.accounts.length > 0);
  }, [websiteGroups, searchQuery]);

  // Build tree data
  const treeData: TreeNodeData[] = useMemo(
    () =>
      filteredWebsiteGroups.map((group) => {
        const groupAccountIds = group.accounts.map((a) => a.id);
        const selectionState = getGroupSelectionState(groupAccountIds);

        return {
          value: group.id,
          label: (
            <Group gap="sm" wrap="nowrap" style={{ width: '100%' }}>
              <Checkbox
                checked={selectionState === 'all'}
                indeterminate={selectionState === 'some'}
                onChange={() => handleGroupToggle(groupAccountIds)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGroupToggle(groupAccountIds);
                  }
                }}
                size="sm"
              />
              <Text size="sm" fw={600} style={{ flex: 1 }}>
                {group.displayName}
              </Text>
              <Badge size="xs" variant="light" color="gray">
                {groupAccountIds.filter((id) => value.includes(id)).length}/
                {groupAccountIds.length}
              </Badge>
            </Group>
          ),
          children: group.accounts.map((account) => ({
            value: account.id,
            label: (
              <Group gap="sm" wrap="nowrap" style={{ width: '100%' }}>
                <Checkbox
                  checked={value.includes(account.id)}
                  onChange={() => handleAccountToggle(account.id)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAccountToggle(account.id);
                    }
                  }}
                  size="sm"
                />
                <Text
                  size="sm"
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {account.name}
                </Text>
              </Group>
            ),
          })),
        };
      }),
    [
      filteredWebsiteGroups,
      value,
      getGroupSelectionState,
      handleGroupToggle,
      handleAccountToggle,
    ],
  );

  const tree = useTree({
    initialExpandedState: treeData.reduce(
      (acc, node) => ({ ...acc, [node.value]: true }),
      {},
    ),
  });

  // Only update tree expansion when NEW nodes are added (not on every treeData change)
  useEffect(() => {
    const currentExpanded = tree.expandedState;
    const newNodes = treeData.filter(
      (node) => !(node.value in currentExpanded),
    );

    if (newNodes.length > 0) {
      const newExpandedState = {
        ...currentExpanded,
        ...newNodes.reduce((acc, node) => ({ ...acc, [node.value]: true }), {}),
      };
      tree.setExpandedState(newExpandedState);
    }
  }, [treeData, tree]);

  return (
    <Box>
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          <Trans>Websites</Trans>
        </Text>

        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Button
                size="xs"
                variant="light"
                onClick={handleSelectAll}
                style={{ flexShrink: 0 }}
              >
                {value.length === allAccountIds.length ? (
                  <Trans>Deselect All</Trans>
                ) : (
                  <Trans>Select All</Trans>
                )}
              </Button>
              <TextInput
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="sm"
                style={{ flex: 1 }}
              />
              <Badge
                size="lg"
                variant="filled"
                color="blue"
                style={{ flexShrink: 0 }}
              >
                {value.length}/{allAccountIds.length}
              </Badge>
            </Group>

            {/* Tree view */}
            <ScrollArea.Autosize mah="300px" type="auto">
              {treeData.length > 0 ? (
                <Tree
                  tree={tree}
                  data={treeData}
                  renderNode={({
                    node,
                    expanded,
                    hasChildren,
                    elementProps,
                  }) => (
                    <Group
                      gap={5}
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--mantine-radius-sm)',
                      }}
                    >
                      <Box
                        {...elementProps}
                        style={{
                          ...elementProps.style,
                          display: 'flex',
                          alignItems: 'center',
                          cursor: hasChildren ? 'pointer' : 'default',
                        }}
                      >
                        {hasChildren && (
                          <IconChevronDown
                            size={16}
                            style={{
                              transform: expanded
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              // eslint-disable-next-line lingui/no-unlocalized-strings
                              transition: 'transform 200ms ease',
                            }}
                          />
                        )}
                        {!hasChildren && <Box w={16} />}
                      </Box>
                      <Box style={{ flex: 1 }}>{node.label}</Box>
                    </Group>
                  )}
                />
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  <Trans>No websites found</Trans>
                </Text>
              )}
            </ScrollArea.Autosize>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
