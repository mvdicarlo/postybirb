/* eslint-disable react/no-unused-prop-types */
import {
  EuiCard,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSpacer,
} from '@elastic/eui';
import { ISettingsOptions, IWebsiteInfoDto } from '@postybirb/types';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { AccountFilterState } from '../../../models/app-states/account-filter-state';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';

type AccountLoginFiltersProps = {
  availableWebsites: IWebsiteInfoDto[];
  settings: ISettingsOptions;
  filterState: AccountFilterState;
  onFilterUpdate: (state: AccountFilterState) => void;
  onHide: (website: DisplayableWebsiteLoginInfo) => void;
};

type FilterDropdownProps = Omit<AccountLoginFiltersProps, 'onFilterUpdate'>;

function ShowHiddenWebsitesFilterDropdown(props: FilterDropdownProps) {
  const { availableWebsites, filterState, settings, onHide } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const button = (
    <EuiFilterButton
      style={{ borderRadius: 0 }}
      iconType="arrowDown"
      badgeColor="success"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      isSelected={isPopoverOpen}
      numFilters={settings.hiddenWebsites?.length}
      hasActiveFilters={filterState.showHiddenWebsites}
      numActiveFilters={settings.hiddenWebsites?.length}
    >
      <FormattedMessage id="hidden" defaultMessage="Hidden" />
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
    >
      <EuiSelectable
        allowExclusions
        searchable
        searchProps={{
          placeholder: 'Filter list',
          compressed: true,
        }}
        aria-label="Composers"
        options={availableWebsites.map((w) => ({
          key: w.id,
          label: w.displayName,
          checked: settings.hiddenWebsites.includes(w.id) ? 'on' : 'off',
          data: w,
        }))}
        onChange={(_, __, changedOption) => {
          onHide({
            ...changedOption.data,
            isHidden: changedOption.checked === 'on',
          });
        }}
      >
        {(list, search) => (
          <div style={{ width: 300 }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}

function ShowHiddenWebsitesFilter(props: AccountLoginFiltersProps) {
  const { filterState, onFilterUpdate } = props;
  return (
    <EuiFilterGroup compressed>
      <EuiFilterButton
        style={{ borderRadius: 0, width: 120 }}
        aria-label="Show hidden websites filter"
        onClick={() =>
          onFilterUpdate({
            ...filterState,
            showHiddenWebsites: !filterState.showHiddenWebsites,
          })
        }
      >
        <FormattedMessage
          id="account.login.hidden-filter"
          defaultMessage="Show hidden"
        />
      </EuiFilterButton>
      <EuiFilterButton
        style={{ borderRadius: 0 }}
        withNext
        aria-label="Show hidden websites filter on"
        color={filterState.showHiddenWebsites ? 'primary' : undefined}
        hasActiveFilters={filterState.showHiddenWebsites}
        onClick={() =>
          onFilterUpdate({
            ...filterState,
            showHiddenWebsites: true,
          })
        }
      >
        <FormattedMessage id="on" defaultMessage="On" />
      </EuiFilterButton>
      <EuiFilterButton
        style={{ borderRadius: 0 }}
        aria-label="Show hidden websites filter off"
        hasActiveFilters={!filterState.showHiddenWebsites}
        color={!filterState.showHiddenWebsites ? 'primary' : undefined}
        onClick={() =>
          onFilterUpdate({
            ...filterState,
            showHiddenWebsites: false,
          })
        }
      >
        <FormattedMessage id="off" defaultMessage="Off" />
      </EuiFilterButton>
      <ShowHiddenWebsitesFilterDropdown {...props} />
    </EuiFilterGroup>
  );
}

function ShowWebsitesWithoutAccountsFilter(props: AccountLoginFiltersProps) {
  const { filterState, onFilterUpdate } = props;
  return (
    <EuiFilterGroup compressed>
      <EuiFilterButton
        style={{ borderRadius: 0, width: 120 }}
        aria-label="Show empty websites filter"
        onClick={() =>
          onFilterUpdate({
            ...filterState,
            showWebsitesWithoutAccounts:
              !filterState.showWebsitesWithoutAccounts,
          })
        }
      >
        <FormattedMessage
          id="account.login.empty-filter"
          defaultMessage="Show empty"
        />
      </EuiFilterButton>
      <EuiFilterButton
        style={{ borderRadius: 0 }}
        withNext
        aria-label="Show empty websites filter on"
        color={filterState.showWebsitesWithoutAccounts ? 'primary' : undefined}
        hasActiveFilters={filterState.showWebsitesWithoutAccounts}
        onClick={() =>
          onFilterUpdate({
            ...filterState,
            showWebsitesWithoutAccounts: true,
          })
        }
      >
        <FormattedMessage id="on" defaultMessage="On" />
      </EuiFilterButton>
      <EuiFilterButton
        style={{ borderRadius: 0 }}
        aria-label="Show empty websites filter off"
        hasActiveFilters={!filterState.showWebsitesWithoutAccounts}
        color={!filterState.showWebsitesWithoutAccounts ? 'primary' : undefined}
        onClick={() =>
          onFilterUpdate({
            ...filterState,
            showWebsitesWithoutAccounts: false,
          })
        }
      >
        <FormattedMessage id="off" defaultMessage="Off" />
      </EuiFilterButton>
    </EuiFilterGroup>
  );
}

export function AccountLoginFilters(props: AccountLoginFiltersProps) {
  return (
    <EuiCard
      hasBorder
      className="postybirb__account-login-filters"
      title={<FormattedMessage id="filters" defaultMessage="Filters" />}
      titleSize="xs"
      layout="horizontal"
    >
      <div>
        <ShowHiddenWebsitesFilter {...props} />
      </div>
      <EuiSpacer size="s" />
      <div>
        <ShowWebsitesWithoutAccountsFilter {...props} />
      </div>
    </EuiCard>
  );
}
