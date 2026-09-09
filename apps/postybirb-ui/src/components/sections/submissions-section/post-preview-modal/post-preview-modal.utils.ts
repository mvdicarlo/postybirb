import {
    type AccountId,
    type IUnitOfWork,
    type UnitOfWorkId,
    UnitOfWorkState,
} from '@postybirb/types';
import type { UnitOfWorkEvictions } from '../../../../api/posting.api';
import type { SubmissionRecord } from '../../../../stores/records';

export function buildSelectablePostingUnits(
  submission: Pick<SubmissionRecord, 'submissionId' | 'files' | 'options' | 'activeUnitsOfWork' | 'createdAt' | 'updatedAt'>,
): IUnitOfWork[] {
  return submission.options.filter((option) => !option.isDefault).flatMap((option) => {
    const files = submission.files.length === 0
      ? [undefined]
      : submission.files.filter((file) => !file.metadata.ignoredWebsites.includes(option.accountId));
    return files.map((file) => {
      const previous = submission.activeUnitsOfWork.find((unit) =>
        unit.accountId === option.accountId && unit.fileId === file?.id,
      );
      return {
        ...previous,
        id: JSON.stringify([submission.submissionId, option.accountId, file?.id ?? null]),
        submissionId: submission.submissionId,
        accountId: option.accountId,
        fileId: file?.id,
        fileHash: file?.hash,
        postId: previous?.postId ?? '',
        createdAt: previous?.createdAt ?? new Date(submission.createdAt).toISOString(),
        updatedAt: previous?.updatedAt ?? new Date(submission.updatedAt).toISOString(),
        attempt: previous?.attempt ?? 0,
        evicted: false,
        state: previous?.state ?? UnitOfWorkState.NEW,
      };
    });
  });
}

export interface PostPreviewAccount {
  id: AccountId;
  name: string;
  website: string;
  websiteDisplayName: string;
}

export interface PostPreviewAccountGroup {
  accountId: AccountId;
  account?: PostPreviewAccount;
  units: IUnitOfWork[];
}

export interface PostPreviewWebsiteGroup {
  website: string;
  websiteDisplayName: string;
  accounts: PostPreviewAccountGroup[];
}

export interface UnitSelectionState {
  checked: boolean;
  indeterminate: boolean;
}

export function buildUnitOfWorkEvictions(
  units: IUnitOfWork[],
  selectedUnitIds: ReadonlySet<UnitOfWorkId>,
): UnitOfWorkEvictions {
  const evictions: UnitOfWorkEvictions = {};

  for (const unit of units) {
    if (!selectedUnitIds.has(unit.id)) continue;

    if (!unit.fileId) {
      evictions[unit.accountId] = [];
      continue;
    }

    const hasAccountSelection = Object.hasOwn(evictions, unit.accountId);
    const selectedFiles = evictions[unit.accountId];
    if (hasAccountSelection && selectedFiles.length === 0) continue;

    if (!selectedFiles) {
      evictions[unit.accountId] = [unit.fileId];
    } else if (!selectedFiles.includes(unit.fileId)) {
      selectedFiles.push(unit.fileId);
    }
  }

  return evictions;
}

export function groupUnitsByWebsite(
  units: IUnitOfWork[],
  accounts: ReadonlyMap<AccountId, PostPreviewAccount>,
): PostPreviewWebsiteGroup[] {
  const websites = new Map<string, PostPreviewWebsiteGroup>();

  for (const unit of units) {
    const account = accounts.get(unit.accountId);
    const website = account?.website ?? `unknown:${unit.accountId}`;
    let websiteGroup = websites.get(website);

    if (!websiteGroup) {
      websiteGroup = {
        website,
        websiteDisplayName: account?.websiteDisplayName || account?.website || '',
        accounts: [],
      };
      websites.set(website, websiteGroup);
    }

    let accountGroup = websiteGroup.accounts.find(
      (group) => group.accountId === unit.accountId,
    );
    if (!accountGroup) {
      accountGroup = {
        accountId: unit.accountId,
        account,
        units: [],
      };
      websiteGroup.accounts.push(accountGroup);
    }
    accountGroup.units.push(unit);
  }

  return [...websites.values()]
    .map((websiteGroup) => ({
      ...websiteGroup,
      accounts: websiteGroup.accounts.sort((left, right) =>
        (left.account?.name ?? left.accountId).localeCompare(
          right.account?.name ?? right.accountId,
        ),
      ),
    }))
    .sort((left, right) =>
      (left.websiteDisplayName || left.website).localeCompare(
        right.websiteDisplayName || right.website,
      ),
    );
}

export function getUnitSelectionState(
  selectedUnitIds: ReadonlySet<UnitOfWorkId>,
  units: IUnitOfWork[],
): UnitSelectionState {
  const selectedCount = units.filter((unit) =>
    selectedUnitIds.has(unit.id),
  ).length;

  return {
    checked: units.length > 0 && selectedCount === units.length,
    indeterminate: selectedCount > 0 && selectedCount < units.length,
  };
}

export function updateUnitSelection(
  selectedUnitIds: ReadonlySet<UnitOfWorkId>,
  units: IUnitOfWork[],
  selected: boolean,
): Set<UnitOfWorkId> {
  const next = new Set(selectedUnitIds);
  for (const unit of units) {
    if (selected) {
      next.add(unit.id);
    } else {
      next.delete(unit.id);
    }
  }
  return next;
}