import {
  EuiCard,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import { ISettingsOptions, IWebsiteInfoDto } from '@postybirb/types';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';
import { AccountFilterState } from '../../../hooks/account/use-accounts';

type AccountLoginFiltersProps = {
  availableWebsites: IWebsiteInfoDto[];
  settings: ISettingsOptions;
  filterState: AccountFilterState;
  onFilterUpdate: (state: AccountFilterState) => void;
  onHide: (website: DisplayableWebsiteLoginInfo) => void;
};

function HiddenAccountButtonSelect(props: AccountLoginFiltersProps) {
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
      hasActiveFilters={filterState.showHiddenAccounts}
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

export function AccountLoginFilters(props: AccountLoginFiltersProps) {
  const { filterState, onFilterUpdate } = props;

  return (
    <EuiCard
      hasBorder
      className="postybirb__account-login-filters"
      title={<FormattedMessage id="filters" defaultMessage="Filters" />}
      titleSize="xs"
      layout="horizontal"
    >
      <EuiFilterGroup compressed>
        <EuiFilterButton
          style={{ borderRadius: 0 }}
          aria-label="Show hidden accounts filter"
          onClick={() =>
            onFilterUpdate({
              ...filterState,
              showHiddenAccounts: !filterState.showHiddenAccounts,
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
          aria-label="Show hidden accounts filter on"
          color={filterState.showHiddenAccounts ? 'primary' : undefined}
          hasActiveFilters={filterState.showHiddenAccounts}
          onClick={() =>
            onFilterUpdate({
              ...filterState,
              showHiddenAccounts: true,
            })
          }
        >
          <FormattedMessage id="on" defaultMessage="On" />
        </EuiFilterButton>
        <EuiFilterButton
          style={{ borderRadius: 0 }}
          aria-label="Show hidden accounts filter off"
          hasActiveFilters={!filterState.showHiddenAccounts}
          color={!filterState.showHiddenAccounts ? 'primary' : undefined}
          onClick={() =>
            onFilterUpdate({
              ...filterState,
              showHiddenAccounts: false,
            })
          }
        >
          <FormattedMessage id="off" defaultMessage="Off" />
        </EuiFilterButton>
        <HiddenAccountButtonSelect {...props} />
      </EuiFilterGroup>
    </EuiCard>
  );
}
