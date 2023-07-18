import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { IWebsiteInfoDto, SettingsDto } from '@postybirb/types';
import { FormattedMessage } from 'react-intl';
import { useLocalStorage } from 'react-use';
import settingsApi from '../../../api/settings.api';
import { ArrayHelper } from '../../../helpers/array.helper';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';
import { AccountStore } from '../../../stores/account.store';
import { useStore } from '../../../stores/use-store';
import AccountLoginCard from '../account-login-card/account-login-card';

type AccountLoginContainerProps = {
  availableWebsites: IWebsiteInfoDto[];
  settings: SettingsDto;
};

function filterWebsites(
  availableWebsites: IWebsiteInfoDto[],
  hiddenWebsites: string[],
  filters: { showHidden: boolean }
): DisplayableWebsiteLoginInfo[] {
  let filteredWebsites = availableWebsites;
  if (!filters.showHidden) {
    filteredWebsites = filteredWebsites.filter(
      (w) => !hiddenWebsites.includes(w.id)
    );
  }

  return filteredWebsites.map((w) => ({
    ...w,
    isHidden: !hiddenWebsites.includes(w.id),
  }));
}

export function AccountLoginContainer(
  props: AccountLoginContainerProps
): JSX.Element {
  const [isHiddenFilterOn, setHiddenFilter] = useLocalStorage(
    'show-hidden-accounts',
    false
  );

  // eslint-disable-next-line react/destructuring-assignment
  const { settings } = props.settings;

  const { state: accounts } = useStore(AccountStore);
  const { availableWebsites } = props;

  const websites = filterWebsites(availableWebsites, settings.hiddenWebsites, {
    showHidden: isHiddenFilterOn || false,
  });

  const groups = ArrayHelper.unique(
    accounts.flatMap((account) => account.groups)
  );

  return (
    <div className="account-login-container">
      <div className="account-login-filters">
        <div>
          <EuiTitle size="xs">
            <h1>
              <FormattedMessage id="filters" defaultMessage="Filters" />
            </h1>
          </EuiTitle>
        </div>
        <EuiFilterGroup compressed>
          <EuiFilterButton
            style={{ borderRadius: 0 }}
            aria-label="Show hidden accounts filter"
            onClick={() => setHiddenFilter(!isHiddenFilterOn)}
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
            color={isHiddenFilterOn ? 'primary' : undefined}
            hasActiveFilters={isHiddenFilterOn}
            onClick={() => setHiddenFilter(true)}
          >
            <FormattedMessage id="on" defaultMessage="On" />
          </EuiFilterButton>
          <EuiFilterButton
            style={{ borderRadius: 0 }}
            aria-label="Show hidden accounts filter off"
            hasActiveFilters={!isHiddenFilterOn}
            color={!isHiddenFilterOn ? 'primary' : undefined}
            onClick={() => setHiddenFilter(false)}
          >
            <FormattedMessage id="off" defaultMessage="Off" />
          </EuiFilterButton>
        </EuiFilterGroup>
      </div>
      <EuiSpacer />
      <div className="account-login-list">
        {websites.map((website) => (
          <AccountLoginCard
            key={website.id}
            website={website}
            groups={groups}
            instances={accounts
              .filter((account) => account.website === website.id)
              .sort((a, b) => a.name.localeCompare(b.name))}
            onHide={(websiteInfo) => {
              let hiddenWebsites = [...settings.hiddenWebsites];
              if (settings.hiddenWebsites.includes(websiteInfo.id)) {
                // Show
                hiddenWebsites = [...settings.hiddenWebsites].filter(
                  (w) => w !== websiteInfo.id
                );
              } else {
                // Hide
                hiddenWebsites.push(websiteInfo.id);
              }

              // eslint-disable-next-line react/destructuring-assignment
              const updatedSettings = { ...props.settings };
              updatedSettings.settings = {
                ...updatedSettings.settings,
                hiddenWebsites,
              };

              settingsApi.update(updatedSettings.id, updatedSettings);
            }}
          />
        ))}
      </div>
    </div>
  );
}
