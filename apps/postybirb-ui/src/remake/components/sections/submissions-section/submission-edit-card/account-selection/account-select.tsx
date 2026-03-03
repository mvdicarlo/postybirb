/**
 * AccountSelect - A custom multi-select dropdown for selecting accounts grouped by website.
 * Uses Mantine's Combobox primitives to allow clickable group headers that toggle
 * all accounts in that website group. Login state is indicated by color.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
    Badge,
    Box,
    Button,
    Checkbox,
    CloseButton,
    Combobox,
    Group,
    Pill,
    PillsInput,
    ScrollArea,
    Stack,
    Text,
    useCombobox,
} from '@mantine/core';
import { SubmissionRating, SubmissionType } from '@postybirb/types';
import {
    IconCircleFilled,
    IconSquare,
    IconSquareCheck,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import websiteOptionsApi from '../../../../../api/website-options.api';
import { useAccounts } from '../../../../../stores/entity/account-store';
import {
    useFileWebsites,
    useMessageWebsites,
} from '../../../../../stores/entity/website-store';
import type {
    AccountRecord,
    WebsiteRecord,
} from '../../../../../stores/records';
import { useSubmissionEditCardContext } from '../context';

interface AccountGroupItem {
  websiteId: string;
  websiteDisplayName: string;
  accounts: AccountRecord[];
}

/**
 * Custom multi-select for account selection with grouped options and clickable group headers.
 */
export function AccountSelect() {
  const { submission } = useSubmissionEditCardContext();
  const { t } = useLingui();
  const accounts = useAccounts();
  const fileWebsites = useFileWebsites();
  const messageWebsites = useMessageWebsites();
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [isDeselectingAll, setIsDeselectingAll] = useState(false);
  const [search, setSearch] = useState('');

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch('');
    },
    onDropdownOpen: () => {
      combobox.updateSelectedOptionIndex('active');
    },
  });

  // Map of accountId -> WebsiteOptionsDto for quick lookup
  const optionsByAccount = useMemo(() => {
    const map = new Map<
      string,
      { id: string; accountId: string; isDefault: boolean }
    >();
    submission.options.forEach((opt) => {
      if (!opt.isDefault) {
        map.set(opt.accountId, opt);
      }
    });
    return map;
  }, [submission.options]);

  // Filter websites based on submission type
  const websites = useMemo(
    () =>
      submission.type === SubmissionType.FILE ? fileWebsites : messageWebsites,
    [submission.type, fileWebsites, messageWebsites],
  );

  // Group accounts by website, filtered to eligible websites
  const accountGroups: AccountGroupItem[] = useMemo(() => {
    const websiteIds = new Set(websites.map((w: WebsiteRecord) => w.id));
    const grouped = new Map<string, AccountRecord[]>();

    accounts.forEach((account: AccountRecord) => {
      if (websiteIds.has(account.website)) {
        const existing = grouped.get(account.website) ?? [];
        existing.push(account);
        grouped.set(account.website, existing);
      }
    });

    return websites
      .filter((w: WebsiteRecord) => (grouped.get(w.id)?.length ?? 0) > 0)
      .map((w: WebsiteRecord) => ({
        websiteId: w.id,
        websiteDisplayName: w.displayName,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        accounts: grouped.get(w.id)!,
      }));
  }, [accounts, websites]);

  // Selected account IDs
  const selectedAccountIds = useMemo(
    () => new Set(optionsByAccount.keys()),
    [optionsByAccount],
  );

  // All eligible accounts
  const allEligibleAccounts = useMemo(
    () => accountGroups.flatMap((g) => g.accounts),
    [accountGroups],
  );

  // Map accountId -> AccountRecord for display
  const accountById = useMemo(() => {
    const map = new Map<string, AccountRecord>();
    allEligibleAccounts.forEach((acc) => {
      map.set(acc.accountId, acc);
    });
    return map;
  }, [allEligibleAccounts]);

  // Get default rating for new options
  const getDefaultRating = useCallback(() => {
    const defaultOption = submission.options.find((opt) => opt.isDefault);
    return defaultOption?.data?.rating ?? SubmissionRating.GENERAL;
  }, [submission.options]);

  // Handle individual account toggle
  const handleAccountToggle = useCallback(
    async (accountId: string) => {
      try {
        if (selectedAccountIds.has(accountId)) {
          // Remove
          const opt = optionsByAccount.get(accountId);
          if (opt) {
            await websiteOptionsApi.remove([opt.id]);
          }
        } else {
          // Add
          const rating = getDefaultRating();
          await websiteOptionsApi.create({
            submissionId: submission.id,
            accountId,
            data: { rating },
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error('Failed to toggle account:', error);
      }
    },
    [selectedAccountIds, optionsByAccount, submission.id, getDefaultRating],
  );

  // Handle website group header click - toggle all accounts in this group
  const handleGroupToggle = useCallback(
    async (group: AccountGroupItem) => {
      const allSelected = group.accounts.every((acc) =>
        selectedAccountIds.has(acc.accountId),
      );

      try {
        if (allSelected) {
          // Deselect all in group
          const optionIds = group.accounts
            .map((acc) => optionsByAccount.get(acc.accountId)?.id)
            .filter(Boolean) as string[];
          if (optionIds.length > 0) {
            await websiteOptionsApi.remove(optionIds);
          }
        } else {
          // Select all unselected in group
          const rating = getDefaultRating();
          const unselected = group.accounts.filter(
            (acc) => !selectedAccountIds.has(acc.accountId),
          );
          await Promise.all(
            unselected.map((acc) =>
              websiteOptionsApi.create({
                submissionId: submission.id,
                accountId: acc.accountId,
                data: { rating },
              }),
            ),
          );
        }
      } catch (error) {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error('Failed to toggle website group:', error);
      }
    },
    [selectedAccountIds, optionsByAccount, submission.id, getDefaultRating],
  );

  // Handle pill remove (deselect from pills area)
  const handlePillRemove = useCallback(
    async (accountId: string) => {
      const opt = optionsByAccount.get(accountId);
      if (opt) {
        try {
          await websiteOptionsApi.remove([opt.id]);
        } catch (error) {
          // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
          console.error('Failed to remove account:', error);
        }
      }
    },
    [optionsByAccount],
  );

  // Select all eligible accounts
  const handleSelectAll = useCallback(async () => {
    const unselected = allEligibleAccounts.filter(
      (acc) => !selectedAccountIds.has(acc.accountId),
    );
    if (unselected.length === 0) return;

    setIsSelectingAll(true);
    try {
      const rating = getDefaultRating();
      await Promise.all(
        unselected.map((acc) =>
          websiteOptionsApi.create({
            submissionId: submission.id,
            accountId: acc.accountId,
            data: { rating },
          }),
        ),
      );
    } catch (error) {
      // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
      console.error('Failed to select all accounts:', error);
    } finally {
      setIsSelectingAll(false);
    }
  }, [allEligibleAccounts, selectedAccountIds, submission.id, getDefaultRating]);

  // Deselect all accounts
  const handleDeselectAll = useCallback(async () => {
    const selectedOptions = Array.from(optionsByAccount.values());
    if (selectedOptions.length === 0) return;

    setIsDeselectingAll(true);
    try {
      await websiteOptionsApi.remove(selectedOptions.map((opt) => opt.id));
    } catch (error) {
      // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
      console.error('Failed to deselect all accounts:', error);
    } finally {
      setIsDeselectingAll(false);
    }
  }, [optionsByAccount]);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return accountGroups;

    const searchLower = search.toLowerCase();
    return accountGroups
      .map((group) => ({
        ...group,
        accounts: group.accounts.filter(
          (acc) =>
            acc.name.toLowerCase().includes(searchLower) ||
            (acc.username?.toLowerCase().includes(searchLower) ?? false) ||
            group.websiteDisplayName.toLowerCase().includes(searchLower),
        ),
      }))
      .filter((group) => group.accounts.length > 0);
  }, [accountGroups, search]);

  const hasSelectedAccounts = selectedAccountIds.size > 0;
  const hasUnselectedAccounts =
    allEligibleAccounts.length > selectedAccountIds.size;

  // Render selected account pills
  const selectedPills = useMemo(() => {
    const pills: JSX.Element[] = [];
    selectedAccountIds.forEach((accountId) => {
      const acc = accountById.get(accountId);
      if (acc) {
        pills.push(
          <Pill
            key={accountId}
            withRemoveButton
            onRemove={() => handlePillRemove(accountId)}
          >
            {acc.websiteDisplayName} - {acc.name}
            {acc.username ? ` (${acc.username})` : ''}
          </Pill>,
        );
      }
    });
    return pills;
  }, [selectedAccountIds, accountById, handlePillRemove]);

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Text fw={600} size="sm">
          <Trans>Websites</Trans>
        </Text>
        <Group gap="xs">
          {hasUnselectedAccounts && (
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconSquareCheck size={14} />}
              onClick={handleSelectAll}
              loading={isSelectingAll}
              disabled={isDeselectingAll}
            >
              <Trans>Select all</Trans>
            </Button>
          )}
          {hasSelectedAccounts && (
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconSquare size={14} />}
              onClick={handleDeselectAll}
              loading={isDeselectingAll}
              disabled={isSelectingAll}
            >
              <Trans>Deselect all</Trans>
            </Button>
          )}
        </Group>
      </Group>

      <Combobox
        store={combobox}
        onOptionSubmit={(val) => {
          handleAccountToggle(val);
        }}
        withinPortal={false}
      >
        <Combobox.DropdownTarget>
          <PillsInput
            pointer
            onClick={() => combobox.toggleDropdown()}
            rightSection={
              selectedAccountIds.size > 0 ? (
                <CloseButton
                  size="sm"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleDeselectAll}
                  // eslint-disable-next-line lingui/no-unlocalized-strings
                  aria-label="Clear all"
                />
              ) : (
                <Combobox.Chevron />
              )
            }
          >
            <Pill.Group>
              {selectedPills.length > 0 ? (
                selectedPills
              ) : (
                <PillsInput.Field
                  placeholder={t`Select accounts...`}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);
                    combobox.openDropdown();
                    combobox.updateSelectedOptionIndex();
                  }}
                  onFocus={() => combobox.openDropdown()}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && search.length === 0) {
                      e.preventDefault();
                      // Remove last selected
                      const lastId = Array.from(selectedAccountIds).pop();
                      if (lastId) handlePillRemove(lastId);
                    }
                  }}
                />
              )}
              {selectedPills.length > 0 && (
                <PillsInput.Field
                  placeholder=""
                  value={search}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);
                    combobox.openDropdown();
                    combobox.updateSelectedOptionIndex();
                  }}
                  onFocus={() => combobox.openDropdown()}
                />
              )}
            </Pill.Group>
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <ScrollArea.Autosize mah={300} type="scroll">
            <Combobox.Options>
              {filteredGroups.length === 0 && (
                <Combobox.Empty>
                  <Trans>No accounts found</Trans>
                </Combobox.Empty>
              )}
              {filteredGroups.map((group) => {
                const allGroupSelected = group.accounts.every((acc) =>
                  selectedAccountIds.has(acc.accountId),
                );
                const someGroupSelected =
                  !allGroupSelected &&
                  group.accounts.some((acc) =>
                    selectedAccountIds.has(acc.accountId),
                  );

                return (
                  <Combobox.Group
                    key={group.websiteId}
                    label={
                      <WebsiteGroupHeader
                        displayName={group.websiteDisplayName}
                        allSelected={allGroupSelected}
                        someSelected={someGroupSelected}
                        selectedCount={
                          group.accounts.filter((acc) =>
                            selectedAccountIds.has(acc.accountId),
                          ).length
                        }
                        totalCount={group.accounts.length}
                        onToggle={() => handleGroupToggle(group)}
                      />
                    }
                  >
                    {group.accounts.map((acc) => {
                      const isSelected = selectedAccountIds.has(acc.accountId);
                      return (
                        <Combobox.Option
                          key={acc.accountId}
                          value={acc.accountId}
                          active={isSelected}
                          pl="xl"
                        >
                          <AccountOptionItem
                            account={acc}
                            isSelected={isSelected}
                          />
                        </Combobox.Option>
                      );
                    })}
                  </Combobox.Group>
                );
              })}
            </Combobox.Options>
          </ScrollArea.Autosize>
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
}

interface WebsiteGroupHeaderProps {
  displayName: string;
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  totalCount: number;
  onToggle: () => void;
}

/**
 * Clickable website group header that toggles all accounts in the group.
 */
function WebsiteGroupHeader({
  displayName,
  allSelected,
  someSelected,
  selectedCount,
  totalCount,
  onToggle,
}: WebsiteGroupHeaderProps) {
  return (
    <Group
      gap="xs"
      wrap="nowrap"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      py={2}
    >
      <Checkbox
        size="xs"
        checked={allSelected}
        indeterminate={someSelected}
        onChange={() => {}} // Handled by group click
        tabIndex={-1}
        style={{ pointerEvents: 'none' }}
      />
      <Text size="xs" fw={600} style={{ flex: 1 }} tt="uppercase">
        {displayName}
      </Text>
      <Badge size="xs" variant="light" color="gray">
        {selectedCount}/{totalCount}
      </Badge>
    </Group>
  );
}

interface AccountOptionItemProps {
  account: AccountRecord;
  isSelected: boolean;
}

/**
 * Single account option in the dropdown with login state color indicator.
 */
function AccountOptionItem({ account, isSelected }: AccountOptionItemProps) {
  const loginColor = account.isLoggedIn
    ? 'green'
    : account.isPending
      ? 'yellow'
      : 'red';

  return (
    <Group gap="xs" wrap="nowrap">
      <Checkbox
        size="xs"
        checked={isSelected}
        onChange={() => {}} // Handled by Combobox onOptionSubmit
        tabIndex={-1}
        style={{ pointerEvents: 'none' }}
      />
      <IconCircleFilled
        size={8}
        style={{ flexShrink: 0 }}
        color={`var(--mantine-color-${loginColor}-filled)`}
      />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" truncate>
          {account.name}
        </Text>
      </Box>
      {account.username && (
        <Text size="xs" c="dimmed" truncate>
          {account.username}
        </Text>
      )}
    </Group>
  );
}
